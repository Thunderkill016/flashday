/*
 * Thin wrapper over fsrs.mjs for lesson chunk cards. A lesson's chunks enter
 * the review pool when the learner submits the prepare step — card identity
 * is `${lessonId}:${chunk.id}` so replays and re-enrolment are idempotent.
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

// Idempotent: existing chunk keys are left untouched.
export function enrollChunks(db, lesson, now = Date.now()) {
  const cards = cardMap(db);
  const enrolled = [];
  for (const chunk of Array.isArray(lesson?.chunks) ? lesson.chunks : []) {
    const key = chunkKey(lesson.id, chunk.id);
    if (cards[key]) continue;
    cards[key] = serializeCard(createEmptyCard(new Date(Number(now))));
    enrolled.push(key);
  }
  return enrolled;
}

export function dueChunks(db, now = Date.now()) {
  const nowMs = Number(now);
  return Object.entries(cardMap(db))
    .map(([key, raw]) => ({ key, card: deserializeCard(raw) }))
    .filter((entry) => entry.card && new Date(entry.card.due).getTime() <= nowMs)
    .sort((a, b) => new Date(a.card.due) - new Date(b.card.due));
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
