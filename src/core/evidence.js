/*
 * Learner evidence store: the durable, append-only record of submitted work.
 * Drafts live in session.js; only submitted attempts land here (rule 2).
 */
import { rebuildFsrsFromLog } from './scheduler.js';

// v3: FSRS card identity moved from chunk (`lesson:chunk`) to retrieval task
// (`lesson:chunk@rev:taskKind`). The durable reviewLog is never rewritten;
// task state is rebuilt from it (docs/adr/learning-core-v3.md).
export const DB_VERSION = 3;

export const LESSON_EVENT_KINDS = Object.freeze(['drill', 'read', 'listen', 'write', 'speak']);

export function createInitialDb() {
  return { version: DB_VERSION, lessonEvents: [], fsrs: {}, reviewLog: [], profile: {} };
}

// Canonical task state: ONE path, everywhere — `db.fsrs` is a pure derived
// cache, rebuilt from the durable reviewLog on every hydrate. The stored
// `fsrs` map is NEVER consulted: a stale or hand-edited cache cannot alter
// learner state, and two devices holding the same log produce byte-equal
// state. Keys that exist only in a stale cache are not durable evidence —
// they are dropped, not guessed (reviewLog has existed since the first
// persisted schema, so anything absent from it was never recorded work).
export function hydrateDb(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lessonEvents)) {
    return createInitialDb();
  }
  const reviewLog = Array.isArray(raw.reviewLog) ? raw.reviewLog : [];
  return {
    version: DB_VERSION,
    lessonEvents: raw.lessonEvents,
    fsrs: rebuildFsrsFromLog(reviewLog),
    reviewLog,
    profile: raw.profile && typeof raw.profile === 'object' ? raw.profile : {}
  };
}

function eventId() {
  try {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  } catch (_error) {}
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Append-only: the event is pushed onto db.lessonEvents; existing events are
// never mutated. `support` records which aids were viewed (translation,
// transcript, model) so later analysis stays honest about what was seen.
export function appendLessonEvent(db, { lessonId, contentVersion, step, kind, payload, support }, now = Date.now()) {
  if (!db || typeof db !== 'object') throw new Error('FlashDay DB is required');
  if (!LESSON_EVENT_KINDS.includes(kind)) throw new Error(`Unknown lesson event kind: ${kind}`);
  if (!Array.isArray(db.lessonEvents)) db.lessonEvents = [];
  const event = {
    id: eventId(),
    lessonId: String(lessonId),
    contentVersion: Number(contentVersion) || 0,
    step: String(step),
    kind,
    payload: payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : {},
    support: support && typeof support === 'object' ? JSON.parse(JSON.stringify(support)) : {},
    submittedAt: Number(now) || Date.now()
  };
  db.lessonEvents.push(event);
  return event;
}
