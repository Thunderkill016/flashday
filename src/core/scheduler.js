/*
 * FSRS scheduler over retrieval tasks (A1-ARCH-001, docs/adr/learning-core-v3.md).
 *
 * Card identity is a RetrievalTask: `${lessonId}:${chunkId}:${taskKind}` —
 * a chunk carries independent memory states per ability (recognition ≠
 * recall ≠ listening ≠ production). Enrollment is staged by the modality
 * actually exercised (domain.js STEP_TASKS); the append-only reviewLog is
 * the durable truth and db.fsrs is a rebuildable cache of it.
 *
 * Legacy compatibility: 2-segment `lesson:chunk` keys in the log or cache
 * normalize to the `meaning_recall` task — the old card asked VI→EN recall.
 * History is never rewritten; normalization happens at read/replay time.
 */
import { createEmptyCard, fsrs } from 'ts-fsrs';
import {
  FSRS_PARAMETERS,
  Rating,
  deserializeCard,
  ratingFromBespokeScore,
  serializeCard
} from './fsrs.mjs';
import {
  TASK_KINDS,
  STEP_TASKS,
  componentKey,
  normalizeTaskKey,
  parseTaskKey,
  taskKey
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

// The task kinds one enroll entry covers. Entries written before staged
// enrollment had no `tasks` field — the component was the whole card, so it
// honestly expands to all kinds (each kind then schedules independently).
function entryKinds(entry) {
  const listed = Array.isArray(entry?.tasks)
    ? entry.tasks.filter((k) => TASK_KINDS.includes(k))
    : [];
  return listed.length ? listed : TASK_KINDS;
}

// Idempotent per (component, task kind): only kinds not already scheduled
// enroll. Returns the newly created task keys.
export function enrollTasks(db, lesson, kinds, now = Date.now()) {
  const cards = cardMap(db);
  if (!Array.isArray(db.reviewLog)) db.reviewLog = [];
  const wanted = (Array.isArray(kinds) ? kinds : TASK_KINDS).filter((k) => TASK_KINDS.includes(k));
  const enrolled = [];
  for (const chunk of Array.isArray(lesson?.chunks) ? lesson.chunks : []) {
    const missing = wanted.filter(
      (kind) => !cards[taskKey(lesson.id, chunk.id, kind)]
    );
    if (!missing.length) continue;
    for (const kind of missing) {
      const key = taskKey(lesson.id, chunk.id, kind);
      cards[key] = serializeCard(createEmptyCard(new Date(Number(now))));
      enrolled.push(key);
    }
    db.reviewLog.push({
      id: logId(),
      kind: 'enroll',
      chunkKey: componentKey(lesson.id, chunk.id),
      tasks: missing,
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
// replay identically to sequential application. Returns a fresh card map
// keyed by taskKey (callers assign it to db.fsrs).
export function rebuildFsrsFromLog(reviewLog, enrolledKeys = []) {
  const cards = {};
  const enroll = (key, at) => {
    const normalized = normalizeTaskKey(key);
    if (normalized && !cards[normalized]) {
      cards[normalized] = serializeCard(createEmptyCard(new Date(Number(at) || Date.now())));
    }
  };
  for (const key of Array.isArray(enrolledKeys) ? enrolledKeys : []) enroll(key, Date.now());
  const ordered = [...(Array.isArray(reviewLog) ? reviewLog : [])]
    .filter((entry) => entry?.chunkKey || entry?.taskKey)
    .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0) || String(a.id || '').localeCompare(String(b.id || '')));
  for (const entry of ordered) {
    const kind = entry.kind === 'enroll' ? 'enroll' : 'rate';
    if (kind === 'enroll') {
      for (const taskKind of entryKinds(entry)) enroll(`${entry.chunkKey}:${taskKind}`, entry.at);
      continue;
    }
    const rating = ratingFromBespokeScore(entry.grade);
    if (rating == null) continue;
    const key = normalizeTaskKey(entry.taskKey ?? entry.chunkKey);
    if (!key) continue;
    const at = new Date(Number(entry.at) || Date.now());
    const card = deserializeCard(cards[key]) || createEmptyCard(at);
    cards[key] = serializeCard(scheduler.next(card, at, rating).card);
  }
  return cards;
}

// Due retrieval tasks, sorted oldest-due first then task id — a stable,
// deterministic order the planner and the review queue can share.
export function dueTasks(db, now = Date.now()) {
  const nowMs = Number(now);
  return Object.entries(cardMap(db))
    .map(([key, raw]) => ({ key: normalizeTaskKey(key) || key, parsed: parseTaskKey(key), card: deserializeCard(raw) }))
    .filter((entry) => entry.parsed && entry.card && new Date(entry.card.due).getTime() <= nowMs)
    .sort((a, b) => new Date(a.card.due) - new Date(b.card.due) || String(a.key).localeCompare(String(b.key)));
}

export function dueChunks(db, now = Date.now()) {
  return dueTasks(db, now);
}

// Earliest future due time across enrolled tasks (null when none scheduled).
export function nextDueAt(db, now = Date.now()) {
  const nowMs = Number(now);
  const upcoming = Object.values(cardMap(db))
    .map(deserializeCard)
    .filter(Boolean)
    .map((card) => new Date(card.due).getTime())
    .filter((due) => due > nowMs);
  return upcoming.length ? Math.min(...upcoming) : null;
}

// taskKey → { lesson, chunk, taskKind } — or null when the content moved.
export function taskForKey(key, lessons) {
  const parsed = parseTaskKey(key);
  if (!parsed) return null;
  const lesson = (Array.isArray(lessons) ? lessons : []).find((l) => String(l?.id) === parsed.lessonId);
  const chunk = lesson?.chunks?.find((c) => String(c.id) === parsed.chunkId) || null;
  return chunk ? { lesson, chunk, taskKind: parsed.taskKind, taskId: key } : null;
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
