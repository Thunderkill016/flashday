/*
 * Learner evidence store: the durable, append-only record of submitted work.
 * Drafts live in session.js; only submitted attempts land here (rule 2).
 */
import { normalizeTaskKey } from './domain.js';

// v3: FSRS card identity moved from chunk (`lesson:chunk`) to retrieval task
// (`lesson:chunk:taskKind`). The cache map is key-normalized on hydrate;
// the durable reviewLog is never rewritten (docs/adr/learning-core-v3.md).
export const DB_VERSION = 3;

export const LESSON_EVENT_KINDS = Object.freeze(['drill', 'read', 'listen', 'write', 'speak']);

export function createInitialDb() {
  return { version: DB_VERSION, lessonEvents: [], fsrs: {}, reviewLog: [], profile: {} };
}

// v2→v3 cache migration: legacy 2-segment keys become `…:meaning_recall`
// (their honest nearest task). A task-keyed entry always wins a collision.
// Idempotent — re-running on an already-normalized map changes nothing.
function migrateFsrsKeys(raw) {
  const migrated = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return migrated;
  for (const [key, card] of Object.entries(raw)) {
    const normalized = normalizeTaskKey(key);
    if (!normalized) continue;
    const isLegacy = key !== normalized;
    if (isLegacy && migrated[normalized] !== undefined) continue;
    migrated[normalized] = card;
  }
  return migrated;
}

export function hydrateDb(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lessonEvents)) {
    return createInitialDb();
  }
  return {
    version: DB_VERSION,
    lessonEvents: raw.lessonEvents,
    fsrs: migrateFsrsKeys(raw.fsrs),
    reviewLog: Array.isArray(raw.reviewLog) ? raw.reviewLog : [],
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
