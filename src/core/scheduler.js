/*
 * Thin wrapper over fsrs.mjs for lesson chunk cards. A lesson's chunks enter
 * the review pool when the learner submits the prepare step (checkpoints have
 * none, so they enrol on the first submitted step) — card identity is
 * `${lessonId}:${chunk.id}` so replays and re-enrolment are idempotent.
 *
 * Card state lives in db.fsrs as { [chunkKey]: serializedCard }; the
 * append-only lessonEvents remain the durable truth (fsrs is a cache).
 */
import { createEmptyCard, fsrs } from 'ts-fsrs';
import {
  FSRS_PARAMETERS,
  Rating,
  deserializeCard,
  ratingFromBespokeScore,
  serializeCard
} from './fsrs.mjs';

const scheduler = fsrs(FSRS_PARAMETERS);

export function chunkKey(lessonId, chunkId) {
  return `${String(lessonId)}:${String(chunkId)}`;
}

function cardMap(db) {
  if (!db.fsrs || typeof db.fsrs !== 'object' || Array.isArray(db.fsrs)) db.fsrs = {};
  return db.fsrs;
}

// reviewLog entry kinds — 'enroll' records that a chunk entered the pool
// (the durable fact; db.fsrs is just a replayable cache of it), 'rate' is a
// grading event. Entries written before kinds existed normalize to 'rate'.
function logId() {
  try {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  } catch (_error) {}
  return `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Idempotent: existing chunk keys are left untouched. Each NEW enrolment is
// appended to db.reviewLog so a multi-device merge can replay the same state.
export function enrollChunks(db, lesson, now = Date.now()) {
  const cards = cardMap(db);
  if (!Array.isArray(db.reviewLog)) db.reviewLog = [];
  const enrolled = [];
  for (const chunk of Array.isArray(lesson?.chunks) ? lesson.chunks : []) {
    const key = chunkKey(lesson.id, chunk.id);
    if (cards[key]) continue;
    cards[key] = serializeCard(createEmptyCard(new Date(Number(now))));
    db.reviewLog.push({ id: logId(), kind: 'enroll', chunkKey: key, at: Number(now) });
    enrolled.push(key);
  }
  return enrolled;
}

// Deterministic replay: enrollment creates the card, ratings advance it.
// Sorting by (at, id) makes a merged two-device log replay identically to
// sequential application. Returns a fresh fsrs card map (callers assign it).
export function rebuildFsrsFromLog(reviewLog, enrolledKeys = []) {
  const cards = {};
  const enroll = (key, at) => {
    if (key && !cards[key]) cards[key] = serializeCard(createEmptyCard(new Date(Number(at) || Date.now())));
  };
  for (const key of Array.isArray(enrolledKeys) ? enrolledKeys : []) enroll(key, Date.now());
  const ordered = [...(Array.isArray(reviewLog) ? reviewLog : [])]
    .filter((entry) => entry?.chunkKey)
    .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0) || String(a.id || '').localeCompare(String(b.id || '')));
  for (const entry of ordered) {
    const kind = entry.kind === 'enroll' ? 'enroll' : 'rate';
    if (kind === 'enroll') {
      enroll(entry.chunkKey, entry.at);
      continue;
    }
    const rating = ratingFromBespokeScore(entry.grade);
    if (rating == null) continue;
    const at = new Date(Number(entry.at) || Date.now());
    const card = deserializeCard(cards[entry.chunkKey]) || createEmptyCard(at);
    cards[entry.chunkKey] = serializeCard(scheduler.next(card, at, rating).card);
  }
  return cards;
}

export function dueChunks(db, now = Date.now()) {
  const nowMs = Number(now);
  return Object.entries(cardMap(db))
    .map(([key, raw]) => ({ key, card: deserializeCard(raw) }))
    .filter((entry) => entry.card && new Date(entry.card.due).getTime() <= nowMs)
    .sort((a, b) => new Date(a.card.due) - new Date(b.card.due));
}

// Earliest future due time across enrolled chunks (null when none scheduled).
export function nextDueAt(db, now = Date.now()) {
  const nowMs = Number(now);
  const upcoming = Object.values(cardMap(db))
    .map(deserializeCard)
    .filter(Boolean)
    .map((card) => new Date(card.due).getTime())
    .filter((due) => due > nowMs);
  return upcoming.length ? Math.min(...upcoming) : null;
}

// chunkKey is `${lessonId}:${chunkId}` — resolve back to the lesson's chunk.
export function chunkForKey(key, lessons) {
  const sep = String(key).indexOf(':');
  const lessonId = String(key).slice(0, sep);
  const chunkId = String(key).slice(sep + 1);
  const lesson = (Array.isArray(lessons) ? lessons : []).find((l) => String(l?.id) === lessonId);
  const chunk = lesson?.chunks?.find((c) => String(c.id) === chunkId) || null;
  return chunk ? { lesson, chunk } : null;
}

export function rateChunk(db, key, grade, now = Date.now()) {
  const cards = cardMap(db);
  const rating = Rating[grade] != null && typeof grade === 'string'
    ? Rating[grade]
    : ratingFromBespokeScore(grade);
  if (rating == null) return null;
  const nowDate = new Date(Number(now));
  const card = deserializeCard(cards[key]) || createEmptyCard(nowDate);
  const result = scheduler.next(card, nowDate, rating);
  cards[key] = serializeCard(result.card);
  return { key, rating, card: cards[key], log: result.log };
}
