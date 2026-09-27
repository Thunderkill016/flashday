import assert from 'node:assert/strict';
import { SESSION_VERSION, createSession, restoreDraft } from '../src/core/session.js';
import { DB_BASE_KEY, DB_OWNER_KEY } from '../src/core/namespace.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m)
  };
}

{
  const storage = memoryStorage();
  const session = createSession({ storage });
  session.setLast({ lessonId: 'a1-s1-l1', step: 'read' });
  session.setDraft('a1-s1-l1', { contentVersion: 1, answers: { prepare: { d1: 2 } } });
  assert.deepEqual(session.save(), { ok: true });
  assert.equal(storage.dump()[`${DB_BASE_KEY}:lesson-session`] != null, true, 'session persists under the dbKey-derived key');

  const reloaded = createSession({ storage });
  assert.deepEqual(reloaded.getLast(), { lessonId: 'a1-s1-l1', step: 'read' });
  assert.equal(reloaded.getDraft('a1-s1-l1').answers.prepare.d1, 2);
  assert.equal(reloaded.getDraft('a1-s1-l1').support.translationViewed, false, 'draft gets normalized support defaults');
}

{
  // Namespaced: with an owner marker the session key follows the account.
  const storage = memoryStorage();
  storage.setItem(DB_OWNER_KEY, 'alice');
  const session = createSession({ storage });
  session.setLast({ lessonId: 'x', step: 'prepare' });
  session.save();
  assert.equal(storage.dump()[`${DB_BASE_KEY}:u:alice:lesson-session`] != null, true);
}

{
  // Storage exceptions are returned, never swallowed silently.
  const storage = {
    getItem: () => null,
    setItem: () => { throw new Error('quota'); },
    removeItem: () => {}
  };
  const session = createSession({ storage });
  session.setDraft('l', { step: 'write' });
  const result = session.save();
  assert.equal(result.ok, false);
  assert.equal(result.error.message, 'quota');
}

{
  const session = createSession({ storage: memoryStorage() });
  session.setDraft('l', { contentVersion: 2, answers: { read: { q1: 0 } } });
  const draft = session.getDraft('l');
  assert.equal(restoreDraft(draft, 2).status, 'applied');
  const stale = restoreDraft(draft, 3);
  assert.equal(stale.status, 'stale', 'contentVersion mismatch must not replay answers');
  assert.equal(restoreDraft(null, 3).status, 'none');
  session.clearDraft('l');
  assert.equal(session.getDraft('l'), null);
}

assert.equal(SESSION_VERSION, 1);
console.log('FlashDay session: 4 checks passed');
