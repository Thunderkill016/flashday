import assert from 'node:assert/strict';
import {
  DB_BASE_KEY,
  DB_OWNER_KEY,
  claimDbNamespace,
  dbKey,
  releaseDbNamespace,
} from '../src/core/namespace.js';

assert.equal(DB_BASE_KEY, 'flashday-a1', 'rebuild uses a fresh storage key');
assert.equal(DB_OWNER_KEY, 'flashday:db-owner');

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

{
  // Per-account local namespaces. Guest/preview data lives at the base
  // key; signing in claims it into the uid slot and empties the shared pool
  // so a second account on the same browser can never inherit it.
  const storage = memoryStorage();
  assert.strictEqual(dbKey(storage), DB_BASE_KEY, 'no owner marker → shared guest key');
  storage.setItem(DB_BASE_KEY, JSON.stringify({ lessonEvents: [{ id: 'a-only' }] }));
  claimDbNamespace(storage, 'alice');
  assert.strictEqual(dbKey(storage), `${DB_BASE_KEY}:u:alice`, 'marker routes reads to the uid namespace');
  assert.deepStrictEqual(
    JSON.parse(storage.getItem(`${DB_BASE_KEY}:u:alice`)).lessonEvents,
    [{ id: 'a-only' }],
    'guest work claimed into the account'
  );
  assert.strictEqual(storage.getItem(DB_BASE_KEY), null, 'shared pool cleared after claim');
  // A second account must not see alice's claimed data.
  claimDbNamespace(storage, 'bob');
  assert.strictEqual(dbKey(storage), `${DB_BASE_KEY}:u:bob`);
  assert.strictEqual(storage.getItem(`${DB_BASE_KEY}:u:bob`), null, 'bob gets a clean namespace — no alice leftovers');
  assert(storage.getItem(`${DB_BASE_KEY}:u:alice`) != null, "alice's namespace is untouched");
  // Sign-out returns to the (now empty) shared pool.
  releaseDbNamespace(storage);
  assert.strictEqual(dbKey(storage), DB_BASE_KEY);
  assert.strictEqual(storage.getItem(DB_BASE_KEY), null, 'sign-out lands on an empty guest pool, not alice data');
}

{
  // If the uid namespace already exists, the guest pool is left alone.
  const storage = memoryStorage();
  storage.setItem(DB_BASE_KEY, 'guest-data');
  storage.setItem(`${DB_BASE_KEY}:u:alice`, 'alice-data');
  claimDbNamespace(storage, 'alice');
  assert.strictEqual(storage.getItem(DB_BASE_KEY), 'guest-data', 'existing uid namespace → guest pool untouched');
  assert.strictEqual(storage.getItem(`${DB_BASE_KEY}:u:alice`), 'alice-data');
}

{
  // A throwing storage must not crash the namespace helpers.
  const broken = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.strictEqual(dbKey(broken), DB_BASE_KEY);
  assert.strictEqual(claimDbNamespace(broken, 'alice'), DB_BASE_KEY);
  releaseDbNamespace(broken);
}

console.log('FlashDay namespace: 3 checks passed');
