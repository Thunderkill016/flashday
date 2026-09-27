/*
 * FSRS scheduler over retrieval tasks (A1-ARCH-001, docs/adr/learning-core-v3.md).
 *
 * Card identity is a RetrievalTask: `${lessonId}:${chunkId}@${rev}:${taskKind}`
 * — a chunk carries independent memory states per ability AND per content
 * revision (recognition ≠ recall ≠ listening ≠ production, and an edited
 * phrase is a different component, not the same memory).
 *
 * Canonical rule: the append-only reviewLog is the durable truth and the
 * ONLY path to task state — enroll entries create task cards, rate entries
 * advance exactly one. db.fsrs is a rebuildable cache; local hydrate and
 * cloud hydrate both rebuild from the same merged log, so they converge.
 *
 * Legacy compatibility: 2-segment `lesson:chunk` keys normalize to the
 * `meaning_recall` task (the old card asked VI→EN recall). A rev-less key
 * resolves to a revision ONLY when the slot is unambiguous (single-revision
 * ledger); on a multi-revision slot the key stays rev-less and is parked —
 * commit timestamps never prove which phrase the learner saw.
 */
import { createEmptyCard, fsrs } from 'ts-fsrs';
import {
  FSRS_PARAMETERS,
  Rating,
  State,
  deserializeCard,
  ratingFromBespokeScore,
  serializeCard
} from './fsrs.mjs';
import {
  TASK_KINDS,
  STEP_TASKS,
  componentKey,
  contentRev,
  normalizeTaskKey,
  parseTaskKey,
  taskKey,
  LEGACY_TASK_KIND
} from './domain.js';

const scheduler = fsrs(FSRS_PARAMETERS);

export { taskKey, componentKey, parseTaskKey, TASK_KINDS, STEP_TASKS };

export function chunkKey(lessonId, chunkId) {
  return componentKey(lessonId, chunkId);
}

function cardMap(db) {
  if (!db.fsrs || typeof db.fsrs !== 'object' || Array.isArray(db.fsrs)) db.fsrs = {};
  return db.fsrs;
}

// reviewLog kinds — 'enroll' records that retrieval tasks entered the pool
// (the durable fact; db.fsrs replays it), 'rate' is a grading event.
// Entries predating kinds normalize to 'rate'; 2-segment keys normalize to
// the legacy task kind.
function logId() {
  try {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  } catch (_error) {}
  return `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Task keys one enroll entry covers. New entries store full revision-aware
// task ids. Entries written before staged enrollment stored bare task kinds
// against a 2-segment chunkKey — each resolves through the ledger only when
// the slot is unambiguous (see normalizeTaskKey). Entries with NO `tasks` at all are the oldest legacy
// form: one chunk card → exactly one `meaning_recall` task (canonical —
// same projection as the cache migrator in evidence.js).
function entryTaskKeys(entry) {
  const listed = Array.isArray(entry?.tasks) ? entry.tasks : [];
  const keys = listed.map((task) => {
    const raw = String(task).includes(':')
      ? String(task)
      : `${entry.chunkKey}:${task}`;
    return normalizeTaskKey(raw);
  }).filter(Boolean);
  if (keys.length) return keys;
  const legacy = normalizeTaskKey(entry?.chunkKey);
  return legacy ? [legacy] : [];
}

function isNewCard(card) {
  return Number(card?.state ?? State.New) === State.New && Number(card?.reps || 0) === 0;
}

// Idempotent per (component, task kind): only kinds not already scheduled
// enroll. `tasks` in the log entry stores the full revision-aware task ids
// so replay never has to guess which phrase was enrolled. Returns the newly
// created task keys.
export function enrollTasks(db, lesson, kinds, now = Date.now()) {
  const cards = cardMap(db);
  if (!Array.isArray(db.reviewLog)) db.reviewLog = [];
  const wanted = (Array.isArray(kinds) ? kinds : TASK_KINDS).filter((k) => TASK_KINDS.includes(k));
  const enrolled = [];
  for (const chunk of Array.isArray(lesson?.chunks) ? lesson.chunks : []) {
    if (typeof chunk?.target !== 'string' || !chunk.target.trim() ||
        typeof chunk?.meaning !== 'string' || !chunk.meaning.trim()) {
      // A chunk without its full retrieval artifact would fingerprint to a
      // phantom rev and mint cards no real component owns — fail loudly.
      throw new Error(`enrollTasks ${lesson?.id}: chunk ${chunk?.id} has no target/meaning text`);
    }
    const rev = contentRev(chunk);
    const missingKeys = wanted
      .map((kind) => taskKey(lesson.id, chunk.id, kind, rev))
      .filter((key) => !cards[key]);
    if (!missingKeys.length) continue;
    for (const key of missingKeys) {
      cards[key] = serializeCard(createEmptyCard(new Date(Number(now))));
      enrolled.push(key);
    }
    db.reviewLog.push({
      id: logId(),
      kind: 'enroll',
      chunkKey: componentKey(lesson.id, chunk.id),
      tasks: missingKeys,
      at: Number(now)
    });
  }
  return enrolled;
}

// Back-compat wrapper: enroll every task kind for the lesson's chunks
// (checkpoint and legacy callers want the whole component).
export function enrollChunks(db, lesson, now = Date.now()) {
  return enrollTasks(db, lesson, TASK_KINDS, now);
}

// Deterministic replay: enrollment creates task cards, ratings advance the
// addressed task only. Sorting by (at, id) makes a merged two-device log
// replay identically to sequential application — and an entry with a
// missing/garbage timestamp replays at EPOCH ZERO, never at "now": the
// function must return the same map for the same input on every run.
// Returns a fresh card map keyed by taskKey (callers assign it to db.fsrs).
const REPLAY_EPOCH_MS = 0;
function replayTime(at) {
  const ms = Number(at);
  return Number.isFinite(ms) ? ms : REPLAY_EPOCH_MS;
}

export function rebuildFsrsFromLog(reviewLog, enrolledKeys = []) {
  const cards = {};
  const enroll = (key, at) => {
    const normalized = normalizeTaskKey(key);
    if (normalized && !cards[normalized]) {
      cards[normalized] = serializeCard(createEmptyCard(new Date(replayTime(at))));
    }
  };
  for (const key of Array.isArray(enrolledKeys) ? enrolledKeys : []) enroll(key, REPLAY_EPOCH_MS);
  const ordered = [...(Array.isArray(reviewLog) ? reviewLog : [])]
    .filter((entry) => entry?.chunkKey || entry?.taskKey)
    .sort((a, b) => replayTime(a.at) - replayTime(b.at) || String(a.id || '').localeCompare(String(b.id || '')));
  for (const entry of ordered) {
    const kind = entry.kind === 'enroll' ? 'enroll' : 'rate';
    if (kind === 'enroll') {
      for (const key of entryTaskKeys(entry)) enroll(key, entry.at);
      continue;
    }
    const rating = ratingFromBespokeScore(entry.grade);
    if (rating == null) continue;
    const key = normalizeTaskKey(entry.taskKey ?? entry.chunkKey);
    if (!key) continue;
    const at = new Date(replayTime(entry.at));
    const card = deserializeCard(cards[key]) || createEmptyCard(at);
    cards[key] = serializeCard(scheduler.next(card, at, rating).card);
  }
  return cards;
}

// Retrieval tasks that are SCHEDULED and due — i.e. memory already exercised
// at least once (Learning/Review/Relearning). Brand-new task introductions
// (State.New) are NOT here; they surface through reviewQueue's bounded
// fresh bucket so a fresh lesson can't flood the review wall.
//
// `lessons` is required to recognize parked cards: a superseded or
// ambiguous task (rev-less key on a multi-revision slot) can be
// chronologically due yet must never count — the review queue will never
// present it, so reporting it as "due" strands the learner.
export function dueTasks(db, now = Date.now(), lessons = null) {
  const nowMs = Number(now);
  return Object.entries(cardMap(db))
    .map(([key, raw]) => {
      const normalized = normalizeTaskKey(key) || key;
      return { key: normalized, parsed: parseTaskKey(normalized), card: deserializeCard(raw) };
    })
    .filter((entry) => entry.parsed && entry.card && !isNewCard(entry.card) && new Date(entry.card.due).getTime() <= nowMs)
    // Ambiguous keys are knowable without lesson context — a rev-less
    // normalized key is by construction unpresentable.
    .filter((entry) => entry.parsed.rev != null)
    .filter((entry) => {
      if (!lessons) return true;
      const resolved = taskForKey(entry.key, lessons);
      return resolved && !resolved.superseded && !resolved.ambiguous;
    })
    .sort((a, b) => new Date(a.card.due) - new Date(b.card.due) || String(a.key).localeCompare(String(b.key)));
}

export function dueChunks(db, now = Date.now(), lessons = null) {
  return dueTasks(db, now, lessons);
}

// How many brand-new task introductions can sit in one review session, and
// one-per-component sibling bury: after `prepare`, each chunk has two New
// tasks — the queue serves the first, the sibling waits for a later visit.
export const NEW_TASK_BUDGET = 8;

// Introduction scaffold order: comprehension before recall before
// production — a learner should meet "can you read it" before "can you
// write it".
const TASK_INTRO_ORDER = Object.freeze({
  form_recognition: 0,
  listening_recognition: 1,
  meaning_recall: 2,
  cued_production: 3
});

// The review queue a learner actually faces: scheduled-due work first
// (spaced memory outranks), then a bounded slice of new-task introductions.
// Superseded components (phrase edited since the memory formed) stay in
// state but are never presented — counted in `orphaned` for observability.
export function reviewQueue(db, lessons, now = Date.now()) {
  const nowMs = Number(now);
  const due = [];
  const fresh = [];
  const seenComponents = new Set();
  let freshPending = 0;
  let orphaned = 0;
  const entries = Object.entries(cardMap(db))
    .map(([key, raw]) => ({ key, card: deserializeCard(raw) }))
    .filter((entry) => entry.card)
    .sort((a, b) => new Date(a.card.due) - new Date(b.card.due) || String(a.key).localeCompare(String(b.key)));
  // Fresh introductions serve the easiest ability of each component first
  // (recognition → recall → production), not alphabetical accident.
  const pendingFresh = entries
    .filter(({ card }) => isNewCard(card))
    .map((entry) => ({ ...entry, resolved: taskForKey(entry.key, lessons) }))
    .filter((entry) => {
      if (entry.resolved && !entry.resolved.superseded && !entry.resolved.ambiguous) return true;
      orphaned++;
      return false;
    })
    .sort((a, b) =>
      String(a.resolved.componentKey).localeCompare(String(b.resolved.componentKey)) ||
      (TASK_INTRO_ORDER[a.resolved.taskKind] ?? 9) -
        (TASK_INTRO_ORDER[b.resolved.taskKind] ?? 9)
    );
  const parsedCache = new Map();
  for (const { key, card } of entries) {
    const cardAt = new Date(card.due).getTime();
    const parsed = parsedCache.get(key) ?? parseTaskKey(key);
    parsedCache.set(key, parsed);
    if (isNewCard(card)) continue;
    const resolved = taskForKey(key, lessons);
    if (!resolved || resolved.superseded || resolved.ambiguous) {
      orphaned++;
      continue;
    }
    if (cardAt <= nowMs) due.push({ key, parsed, card, resolved });
  }
  for (const entry of pendingFresh) {
    freshPending++;
    if (seenComponents.has(entry.resolved.componentKey)) continue;
    if (fresh.length >= NEW_TASK_BUDGET) continue;
    seenComponents.add(entry.resolved.componentKey);
    fresh.push({ key: entry.key, parsed: parseTaskKey(entry.key), card: entry.card, resolved: entry.resolved });
  }
  return { due, fresh, freshPending, orphaned };
}

// Earliest future due time across SCHEDULED, PRESENTABLE tasks (null when
// none). New tasks are introductions, not scheduled work; superseded and
// ambiguous cards are parked — none of them may surface a "next review"
// timestamp the queue can never honor.
export function nextDueAt(db, now = Date.now(), lessons = null) {
  const nowMs = Number(now);
  const upcoming = Object.entries(cardMap(db))
    .map(([key, raw]) => ({ key: normalizeTaskKey(key) || key, card: deserializeCard(raw) }))
    .filter((entry) => entry.card)
    .filter((entry) => !isNewCard(entry.card))
    .filter((entry) => parseTaskKey(entry.key)?.rev != null)
    .filter((entry) => {
      if (!lessons) return true;
      const resolved = taskForKey(entry.key, lessons);
      return resolved && !resolved.superseded && !resolved.ambiguous;
    })
    .map((entry) => new Date(entry.card.due).getTime())
    .filter((due) => due > nowMs);
  return upcoming.length ? Math.min(...upcoming) : null;
}

// taskKey → { lesson, chunk, taskKind, componentKey, rev, superseded,
// ambiguous } — or null when the component is gone entirely. A key whose
// rev predates the current text resolves `superseded`: the memory is real
// but the phrase it belongs to is retired. A rev-less key resolves
// `ambiguous`: the durable record cannot prove which phrase it exercised
// (or none are recorded), so it is parked — never presented.
export function taskForKey(key, lessons) {
  const parsed = parseTaskKey(key);
  if (!parsed) return null;
  const lesson = (Array.isArray(lessons) ? lessons : []).find((l) => String(l?.id) === parsed.lessonId);
  const chunk = lesson?.chunks?.find((c) => String(c.id) === parsed.chunkId) || null;
  if (!chunk) return null;
  const liveRev = contentRev(chunk);
  const superseded = parsed.rev != null && parsed.rev !== liveRev;
  const ambiguous = parsed.rev == null;
  return {
    lesson,
    chunk,
    taskKind: parsed.taskKind,
    taskId: key,
    componentKey: parsed.componentKey,
    rev: parsed.rev || liveRev,
    superseded,
    ambiguous
  };
}

export function chunkForKey(key, lessons) {
  const resolved = taskForKey(key, lessons);
  return resolved ? { lesson: resolved.lesson, chunk: resolved.chunk } : null;
}

export function rateTask(db, key, grade, now = Date.now()) {
  const cards = cardMap(db);
  const normalized = normalizeTaskKey(key);
  if (!normalized) return null;
  const rating = Rating[grade] != null && typeof grade === 'string'
    ? Rating[grade]
    : ratingFromBespokeScore(grade);
  if (rating == null) return null;
  const nowDate = new Date(Number(now));
  const card = deserializeCard(cards[normalized]) || createEmptyCard(nowDate);
  const result = scheduler.next(card, nowDate, rating);
  cards[normalized] = serializeCard(result.card);
  return { key: normalized, rating, card: cards[normalized], log: result.log };
}

export function rateChunk(db, key, grade, now = Date.now()) {
  return rateTask(db, key, grade, now);
}

// Re-exported so cache migrators resolve rev-less keys through the same
// single code path (canonical rule — one normalization, everywhere).
export { normalizeTaskKey, LEGACY_TASK_KIND };
