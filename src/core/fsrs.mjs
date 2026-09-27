/*
 * FlashDay memory-timing layer backed by upstream ts-fsrs.
 *
 * Responsibility boundary:
 * - FSRS owns WHEN a Unit x Mode memory is due.
 * - google/bespoke still owns the language/card model and card ranking.
 * - Review events remain the durable source of truth; fsrsProgress is a cache.
 *
 * Upstream: open-spaced-repetition/ts-fsrs v5.4.2 (FSRS v6), MIT.
 */
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

export const FSRS_SOURCE = 'open-spaced-repetition/ts-fsrs@v5.4.2';
export const FSRS_ALGORITHM = 'FSRS-6';
export const FSRS_PROGRESS_VERSION = 1;

// Fuzz is deliberately disabled because FlashDay rebuilds scheduler state from
// append-only review events. Replay must produce the same due dates every time.
export const FSRS_PARAMETERS = Object.freeze({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m']
});

const scheduler = fsrs(FSRS_PARAMETERS);
const VALID_MODES = new Set(['listen', 'speak', 'read', 'write']);

export function taskKey(unitId, mode) {
  return `${String(unitId)}::${String(mode)}`;
}

export function ratingFromBespokeScore(score) {
  const value = Number(score);
  if (value === 1) return Rating.Again;
  if (value === 2) return Rating.Hard;
  if (value === 3) return Rating.Good;
  if (value === 4) return Rating.Easy;
  return null;
}

function dateOrUndefined(value) {
  if (value == null || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function serializeCard(card) {
  if (!card) return null;
  return {
    due: new Date(card.due).toISOString(),
    stability: Number(card.stability || 0),
    difficulty: Number(card.difficulty || 0),
    elapsed_days: Number(card.elapsed_days || 0),
    scheduled_days: Number(card.scheduled_days || 0),
    learning_steps: Number(card.learning_steps || 0),
    reps: Number(card.reps || 0),
    lapses: Number(card.lapses || 0),
    state: Number(card.state ?? State.New),
    last_review: card.last_review ? new Date(card.last_review).toISOString() : null
  };
}

export function deserializeCard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const due = dateOrUndefined(raw.due);
  if (!due) return null;
  return {
    due,
    stability: Number(raw.stability || 0),
    difficulty: Number(raw.difficulty || 0),
    elapsed_days: Number(raw.elapsed_days || 0),
    scheduled_days: Number(raw.scheduled_days || 0),
    learning_steps: Number(raw.learning_steps || 0),
    reps: Number(raw.reps || 0),
    lapses: Number(raw.lapses || 0),
    state: Number(raw.state ?? State.New),
    last_review: dateOrUndefined(raw.last_review)
  };
}

function emptyProgress() {
  return {
    version: FSRS_PROGRESS_VERSION,
    source: FSRS_SOURCE,
    algorithm: FSRS_ALGORITHM,
    parameters: { ...FSRS_PARAMETERS },
    cards: {}
  };
}

export function normalizeProgress(raw) {
  const progress = emptyProgress();
  if (!raw || typeof raw !== 'object') return progress;
  const cards = raw.cards && typeof raw.cards === 'object' ? raw.cards : {};
  for (const [key, value] of Object.entries(cards)) {
    const card = deserializeCard(value);
    if (card) progress.cards[key] = serializeCard(card);
  }
  return progress;
}

function applyOne(progress, unitId, mode, score, nowMs) {
  if (!VALID_MODES.has(String(mode))) return null;
  const grade = ratingFromBespokeScore(score);
  if (grade == null) return null;
  const now = new Date(Number(nowMs));
  if (Number.isNaN(now.getTime())) return null;
  const key = taskKey(unitId, mode);
  const existing = deserializeCard(progress.cards[key]);
  const card = existing || createEmptyCard(now);
  const result = scheduler.next(card, now, grade);
  progress.cards[key] = serializeCard(result.card);
  return {
    key,
    unitId: String(unitId),
    mode: String(mode),
    grade,
    card: progress.cards[key],
    log: result.log
  };
}

export function rebuildProgressFromEvents(events = []) {
  const progress = emptyProgress();
  const ordered = [...(Array.isArray(events) ? events : [])]
    .filter((event) => VALID_MODES.has(String(event?.mode)) && Number.isFinite(Number(event?.answeredAt)))
    .sort((a, b) => Number(a.answeredAt) - Number(b.answeredAt));

  for (const event of ordered) {
    for (const unitId of Array.isArray(event.unitIds) ? event.unitIds : []) {
      applyOne(progress, unitId, event.mode, event.ratings?.[unitId], Number(event.answeredAt));
    }
  }
  return progress;
}

// Older FlashDay/Bespoke snapshots can contain RatingState history even when the
// append-only event log was not yet available. Use those ratings once as a
// migration source rather than silently resetting every Unit x Mode to New.
export function eventsFromBespokeProgress(bespokeProgress) {
  const synthetic = [];
  const ratingsByUnit = bespokeProgress?.ratings && typeof bespokeProgress.ratings === 'object'
    ? bespokeProgress.ratings
    : {};
  let index = 0;
  for (const [unitId, ratings] of Object.entries(ratingsByUnit)) {
    for (const rating of Array.isArray(ratings) ? ratings : []) {
      const mode = String(rating?.mode || '');
      const score = Number(rating?.score);
      const seconds = Number(rating?.time);
      if (!VALID_MODES.has(mode) || ratingFromBespokeScore(score) == null || !Number.isFinite(seconds)) continue;
      synthetic.push({
        id: `legacy-bespoke-${index++}`,
        mode,
        unitIds: [String(unitId)],
        ratings: { [unitId]: score },
        answeredAt: seconds * 1000
      });
    }
  }
  return synthetic.sort((a, b) => a.answeredAt - b.answeredAt);
}

function sourceEventsForDb(db) {
  const events = Array.isArray(db?.events) ? db.events : [];
  if (events.length) return events;
  return eventsFromBespokeProgress(db?.bespokeProgress);
}

export function ensureProgress(db) {
  if (!db || typeof db !== 'object') throw new Error('FlashDay DB is required');
  const hasCache = db.fsrsProgress && typeof db.fsrsProgress === 'object';
  db.fsrsProgress = hasCache ? normalizeProgress(db.fsrsProgress) : rebuildProgressFromEvents(sourceEventsForDb(db));
  db.scheduler = 'bespoke-language-policy+fsrs6';
  db.schedulerSource = `${FSRS_SOURCE} + google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e`;
  return db.fsrsProgress;
}

export function rebuildDbProgress(db) {
  db.fsrsProgress = rebuildProgressFromEvents(sourceEventsForDb(db));
  db.scheduler = 'bespoke-language-policy+fsrs6';
  db.schedulerSource = `${FSRS_SOURCE} + google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e`;
  return db.fsrsProgress;
}

export function applyRatings(db, mode, ratings = {}, nowMs = Date.now()) {
  const progress = ensureProgress(db);
  const updates = [];
  for (const [unitId, score] of Object.entries(ratings || {})) {
    const update = applyOne(progress, unitId, mode, score, nowMs);
    if (update) updates.push(update);
  }
  db.scheduler = 'bespoke-language-policy+fsrs6';
  db.schedulerSource = `${FSRS_SOURCE} + google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e`;
  return updates;
}

export function storedCard(db, unitId, mode) {
  const progress = ensureProgress(db);
  return deserializeCard(progress.cards[taskKey(unitId, mode)]);
}

export function hasState(db, unitId, mode) {
  return Boolean(storedCard(db, unitId, mode));
}

export function retrievability(db, unitId, mode, nowMs = Date.now()) {
  const card = storedCard(db, unitId, mode);
  if (!card || card.state === State.New) return null;
  try {
    return Number(scheduler.get_retrievability(card, new Date(Number(nowMs)), false));
  } catch (_error) {
    return null;
  }
}

export function taskState(db, unitId, mode, nowMs = Date.now()) {
  const card = storedCard(db, unitId, mode);
  if (!card) {
    return { unitId: String(unitId), mode: String(mode), key: taskKey(unitId, mode), isNew: true, isDue: false, dueAt: null, retrievability: null, card: null };
  }
  const dueAt = new Date(card.due).getTime();
  return {
    unitId: String(unitId),
    mode: String(mode),
    key: taskKey(unitId, mode),
    isNew: false,
    isDue: dueAt <= Number(nowMs),
    dueAt,
    retrievability: retrievability(db, unitId, mode, nowMs),
    card: serializeCard(card)
  };
}

export function rankDueTasks(db, tasks = [], nowMs = Date.now()) {
  return tasks
    .map((task) => taskState(db, task.unitId, task.mode, nowMs))
    .filter((task) => !task.isNew && task.isDue)
    .sort((a, b) => {
      const ar = Number.isFinite(a.retrievability) ? a.retrievability : 1;
      const br = Number.isFinite(b.retrievability) ? b.retrievability : 1;
      if (ar !== br) return ar - br;
      return Number(a.dueAt || 0) - Number(b.dueAt || 0);
    });
}

export function newTasks(db, tasks = []) {
  return tasks.filter((task) => !hasState(db, task.unitId, task.mode));
}

export function nextDueAt(db, tasks = []) {
  const values = tasks
    .map((task) => storedCard(db, task.unitId, task.mode))
    .filter(Boolean)
    .map((card) => new Date(card.due).getTime())
    .filter(Number.isFinite);
  return values.length ? Math.min(...values) : null;
}

export function stats(db, tasks = [], nowMs = Date.now()) {
  const states = tasks.map((task) => taskState(db, task.unitId, task.mode, nowMs));
  return {
    due: states.filter((state) => state.isDue).length,
    scheduled: states.filter((state) => !state.isNew).length,
    new: states.filter((state) => state.isNew).length,
    nextDueAt: nextDueAt(db, tasks)
  };
}

export { Rating, State };

// The legacy FlashDay runtime is UMD/global-based. Publish a narrow browser
// contract while keeping this file as a real ESM dependency on upstream ts-fsrs.
globalThis.FlashDayFsrs = {
  FSRS_SOURCE,
  FSRS_ALGORITHM,
  FSRS_PARAMETERS,
  Rating,
  State,
  taskKey,
  ratingFromBespokeScore,
  serializeCard,
  deserializeCard,
  normalizeProgress,
  rebuildProgressFromEvents,
  eventsFromBespokeProgress,
  ensureProgress,
  rebuildDbProgress,
  applyRatings,
  storedCard,
  hasState,
  retrievability,
  taskState,
  rankDueTasks,
  newTasks,
  nextDueAt,
  stats
};
