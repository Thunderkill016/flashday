import assert from 'node:assert/strict';
import {
  detectStorageBlocking,
  isIgnorableResetError,
  mapAuthError,
  matchRows,
  paginateRows,
  rowDocId,
  sortRows
} from '../cloud-compat.mjs';

// mapAuthError keeps authErrorMessage's recognised substrings.
const cases = [
  ['auth/invalid-credential', 'invalid login credentials'],
  ['auth/wrong-password', 'invalid login credentials'],
  ['auth/user-not-found', 'invalid login credentials'],
  ['auth/email-already-in-use', 'user already registered'],
  ['auth/account-exists-with-different-credential', 'user already registered'],
  ['auth/credential-already-in-use', 'user already registered'],
  ['auth/invalid-email', 'invalid email address'],
  ['auth/missing-email', 'invalid email address'],
  ['auth/weak-password', 'password should be at least'],
  ['auth/too-many-requests', 'too many requests'],
  ['auth/quota-exceeded', 'too many requests'],
  ['auth/network-request-failed', 'network request failed'],
  ['auth/user-disabled', 'user account disabled'],
  ['auth/requires-recent-login', 'requires recent login'],
  ['auth/unauthorized-domain', 'provider is not enabled'],
  ['auth/unauthorized-continue-uri', 'continue url not authorized'],
  ['auth/expired-action-code', 'action link expired'],
  ['auth/invalid-action-code', 'action link expired'],
  ['auth/web-storage-unsupported', 'web storage unsupported'],
  ['auth/popup-closed-by-user', 'sign-in popup']
];
for (const [code, expected] of cases) {
  const mapped = mapAuthError({ code, message: `Firebase: (${code}).` });
  assert.ok(mapped instanceof Error);
  assert.ok(mapped.message.toLowerCase().includes(expected), `${code} -> ${mapped.message}`);
}
assert.equal(mapAuthError(new Error('Email not confirmed')).message, 'Email not confirmed');

// Reset-endpoint enumeration shield: unknown accounts must not error.
assert.equal(isIgnorableResetError({ code: 'auth/user-not-found' }), true);
assert.equal(isIgnorableResetError({ code: 'auth/invalid-email' }), true);
assert.equal(isIgnorableResetError({ code: 'auth/too-many-requests' }), false);
assert.equal(isIgnorableResetError({ code: 'auth/network-request-failed' }), false);

// detectStorageBlocking: plain Node exposes neither storage API → blocked.
const bareStatus = await detectStorageBlocking();
assert.equal(bareStatus.blocked, true);
assert.equal(bareStatus.sessionStorage, false);
assert.equal(bareStatus.indexedDB, false);

// Fully writable storage → not blocked.
globalThis.sessionStorage = { setItem() {}, removeItem() {} };
globalThis.indexedDB = {
  open() {
    const request = {};
    queueMicrotask(() => request.onsuccess?.());
    return request;
  },
  deleteDatabase() {}
};
assert.deepEqual(await detectStorageBlocking(), {
  sessionStorage: true,
  indexedDB: true,
  blocked: false
});

// sessionStorage throwing (privacy mode) is flagged while IndexedDB stays ok.
globalThis.sessionStorage = {
  setItem() { throw new Error('denied'); },
  removeItem() {}
};
const partial = await detectStorageBlocking();
assert.equal(partial.sessionStorage, false);
assert.equal(partial.indexedDB, true);
assert.equal(partial.blocked, true);

// IndexedDB request erroring (private browsing) is flagged independently.
globalThis.sessionStorage = { setItem() {}, removeItem() {} };
globalThis.indexedDB = {
  open() {
    const request = {};
    queueMicrotask(() => request.onerror?.());
    return request;
  },
  deleteDatabase() {}
};
const idbBlocked = await detectStorageBlocking();
assert.equal(idbBlocked.sessionStorage, true);
assert.equal(idbBlocked.indexedDB, false);
assert.equal(idbBlocked.blocked, true);

delete globalThis.sessionStorage;
delete globalThis.indexedDB;

// rowDocId: explicit id wins, owner-keyed rows collapse to owner_id.
assert.equal(rowDocId({ id: 'a', owner_id: 'u' }), 'a');
assert.equal(rowDocId({ owner_id: 'u' }), 'u');
assert.equal(rowDocId({}), null);
assert.equal(rowDocId({}, 'u'), 'u');
assert.equal(rowDocId({ id: 7 }), '7');

// matchRows applies equality filters, stringifying both sides.
const rows = [
  { id: '1', deck_id: 'd1', owner_id: 'u1' },
  { id: '2', deck_id: 'd2', owner_id: 'u1' },
  { id: '3', deck_id: 'd1', owner_id: 'u2' }
];
assert.deepEqual(matchRows(rows, [{ column: 'deck_id', value: 'd1' }]).map((r) => r.id), ['1', '3']);
assert.deepEqual(
  matchRows(rows, [{ column: 'deck_id', value: 'd1' }, { column: 'owner_id', value: 'u1' }]).map((r) => r.id),
  ['1']
);

// sortRows orders ISO timestamps lexicographically, ascending and descending.
const unsorted = [
  { id: 'b', answered_at: '2026-09-02T00:00:00.000Z' },
  { id: 'a', answered_at: '2026-09-01T00:00:00.000Z' },
  { id: 'c', answered_at: '2026-09-03T00:00:00.000Z' }
];
assert.deepEqual(
  sortRows(unsorted, [{ column: 'answered_at', ascending: true }]).map((r) => r.id),
  ['a', 'b', 'c']
);
assert.deepEqual(
  sortRows(unsorted, [{ column: 'answered_at', ascending: false }]).map((r) => r.id),
  ['c', 'b', 'a']
);
assert.deepEqual(sortRows(unsorted, []), unsorted);

// paginateRows: range is inclusive like PostgREST, limit takes the head.
assert.deepEqual(paginateRows([1, 2, 3, 4], { from: 1, to: 2 }, null), [2, 3]);
assert.deepEqual(paginateRows([1, 2, 3, 4], null, 2), [1, 2]);
assert.deepEqual(paginateRows([1, 2, 3, 4], null, null), [1, 2, 3, 4]);

console.log('cloud-compat tests passed');

// Transaction retry simulation: two stale devices must preserve both histories.
{
  const { createRequire } = await import('node:module');
  const C = createRequire(import.meta.url)('../flashday-cloud.js');
  const { writeProgressTransaction, PROGRESS_MAX_JSON_BYTES } = await import('../cloud-compat.mjs');
  let stored = { created_at: '2026-01-01T00:00:00.000Z', payload: {} };
  let revision = 0;
  let conflicts = 0;
  const fs = {
    db: {},
    async runTransaction(_db, action) {
      for (;;) {
        const version = revision;
        const snapshot = structuredClone(stored);
        let pending;
        const result = await action({
          get: async () => ({ exists: () => true, data: () => snapshot }),
          set: (_target, record) => { pending = record; }
        });
        if (version !== revision) { conflicts++; continue; }
        stored = pending; revision++;
        return result;
      }
    }
  };
  const target = { id: 'owner' };
  await Promise.all(['device-a','device-b'].map(id => writeProgressTransaction(fs,target,{
    created_at:'2099-01-01T00:00:00.000Z',
    payload:{transferAttempts:[{id}],comprehensionChecks:[{id}],
      encounters:[{id:'shared',at:id==='device-a'?10:20,kinds:[id]}],
      fsrsProgress:{stale:id}}
  },'owner',C.mergeProgressPayload)));
  assert.ok(conflicts > 0, 'fixture must exercise a conflicting transaction retry');
  assert.deepEqual(stored.payload.transferAttempts.map(a=>a.id).sort(),['device-a','device-b']);
  assert.equal(stored.payload.comprehensionChecks.length,2);
  assert.deepEqual(stored.payload.encounters[0].kinds.sort(),['device-a','device-b']);
  assert.equal(stored.payload.encounters[0].at,10);
  assert.equal(stored.payload.fsrsProgress,null);
  assert.equal(stored.created_at,'2026-01-01T00:00:00.000Z');
  const before = structuredClone(stored);
  await assert.rejects(writeProgressTransaction(fs,target,{payload:{huge:'x'.repeat(PROGRESS_MAX_JSON_BYTES)}},'owner',C.mergeProgressPayload),/vượt giới hạn/);
  assert.deepEqual(stored,before,'size rejection must not overwrite stored history');
}

// Cursor pages must have bounded reads and stable order, even with equal times.
{
  const { readFirestorePage } = await import('../cloud-compat.mjs');
  const documents = Array.from({length:1201},(_,i)=>({id:String(i).padStart(4,'0'),data:()=>({id:String(i),created_at:'same-time'})}));
  let reads = 0;
  const fs = {
    documentId:()=> '__name__', orderBy:field=>({order:field}),
    startAfter:cursor=>({after:cursor.id}), limit:size=>({limit:size}),
    query:(_ref,...constraints)=>constraints,
    getDocs:async constraints=>{
      assert.equal(constraints.find(c=>c.order).order,'__name__');
      const start=constraints.find(c=>c.after)?.after;
      const cap=constraints.find(c=>c.limit)?.limit;
      assert.ok(cap,'every page must have a server-side limit');
      const docs=documents.filter(doc=>start==null||doc.id>start).slice(0,cap);
      reads+=docs.length;
      return {docs};
    }
  };
  let cursor=null; const ids=[];
  for (;;) {
    const page=await readFirestorePage(fs,{},[],cursor,500);
    ids.push(...page.data.map(row=>row.id));
    if(page.data.length<500)break;
    cursor=page.cursor;
  }
  assert.equal(ids.length,1201);
  assert.equal(new Set(ids).size,1201);
  assert.equal(reads,1201,'subsequent pages must not reread previous documents');
}

{
  const {assertAccountOwner}=await import('../cloud-compat.mjs');
  assert.doesNotThrow(()=>assertAccountOwner('alice','alice'));
  for(const [expected,current] of [['alice','bob'],['alice',null],[null,'bob']]) {
    assert.throws(()=>assertAccountOwner(expected,current),error=>error.code==='SESSION_CHANGED');
  }
}
