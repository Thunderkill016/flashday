import assert from 'node:assert/strict';
import {
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
  ['auth/weak-password', 'password should be at least'],
  ['auth/too-many-requests', 'too many requests'],
  ['auth/unauthorized-domain', 'provider is not enabled'],
  ['auth/expired-action-code', 'reset link expired']
];
for (const [code, expected] of cases) {
  const mapped = mapAuthError({ code, message: `Firebase: (${code}).` });
  assert.ok(mapped instanceof Error);
  assert.ok(mapped.message.toLowerCase().includes(expected), `${code} -> ${mapped.message}`);
}
assert.equal(mapAuthError(new Error('Email not confirmed')).message, 'Email not confirmed');

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
