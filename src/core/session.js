/*
 * Device-local lesson session: drafts (unsubmitted work) and the "where was
 * I" pointer. Deliberately NOT in the persistent store — drafts never become
 * evidence, and restoring a draft must never create a record (rule 2).
 */
import { dbKey } from './namespace.js';

export const SESSION_VERSION = 1;

function emptyDraft() {
  return {
    contentVersion: null,
    step: null,
    answers: { prepare: {}, read: {}, listen: {} },
    write: {},
    speak: {},
    support: { translationViewed: false, transcriptViewed: false, modelRevealed: false },
    updatedAt: 0
  };
}

function normalizeDraft(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = emptyDraft();
  const draft = {
    ...base,
    ...raw,
    answers: { ...base.answers, ...(raw.answers && typeof raw.answers === 'object' ? raw.answers : {}) },
    write: raw.write && typeof raw.write === 'object' ? raw.write : {},
    speak: raw.speak && typeof raw.speak === 'object' ? raw.speak : {},
    support: { ...base.support, ...(raw.support && typeof raw.support === 'object' ? raw.support : {}) }
  };
  draft.updatedAt = Number(draft.updatedAt) || 0;
  return draft;
}

export function createSession({ storage, keyResolver }) {
  if (!storage || typeof storage.getItem !== 'function') throw new Error('Storage adapter is required');
  const resolveKey = typeof keyResolver === 'function'
    ? keyResolver
    : () => `${dbKey(storage)}:lesson-session`;

  let state = { version: SESSION_VERSION, last: null, drafts: {} };

  function load() {
    try {
      const raw = storage.getItem(resolveKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        state = {
          version: SESSION_VERSION,
          last: parsed?.last && typeof parsed.last === 'object' ? parsed.last : null,
          drafts: parsed?.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {}
        };
      }
    } catch (_error) {
      state = { version: SESSION_VERSION, last: null, drafts: {} };
    }
    return state;
  }

  function save() {
    try {
      storage.setItem(resolveKey(), JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      // Storage failures are returned, never swallowed silently — a draft the
      // learner believes is saved but isn't is worse than an honest error.
      return { ok: false, error };
    }
  }

  function getLast() {
    return state.last;
  }

  function setLast({ lessonId, step }) {
    state.last = { lessonId: String(lessonId), step: String(step) };
  }

  function getDraft(lessonId) {
    return normalizeDraft(state.drafts[String(lessonId)]);
  }

  function setDraft(lessonId, patch) {
    const key = String(lessonId);
    const current = normalizeDraft(state.drafts[key]) || emptyDraft();
    const next = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) };
    if (patch?.answers || patch?.write || patch?.speak || patch?.support) {
      next.answers = { ...current.answers, ...(patch.answers || {}) };
      next.write = { ...current.write, ...(patch.write || {}) };
      next.speak = { ...current.speak, ...(patch.speak || {}) };
      next.support = { ...current.support, ...(patch.support || {}) };
    }
    next.updatedAt = Date.now();
    state.drafts[key] = next;
    return next;
  }

  function clearDraft(lessonId) {
    delete state.drafts[String(lessonId)];
  }

  load();
  return { load, getLast, setLast, getDraft, setDraft, clearDraft, save };
}

// A draft written against different content must not replay its answers —
// 'stale' tells the caller to show the shell but discard the responses.
export function restoreDraft(draft, currentContentVersion) {
  if (!draft) return { status: 'none', draft: null };
  if (Number(draft.contentVersion) !== Number(currentContentVersion)) {
    return { status: 'stale', draft };
  }
  return { status: 'applied', draft };
}
