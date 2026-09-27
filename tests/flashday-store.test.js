import assert from 'node:assert/strict';
import { createPersistentStore } from '../src/core/store.js';
import { createInitialDb, hydrateDb, DB_VERSION } from '../src/core/evidence.js';
import { DB_BASE_KEY } from '../src/core/namespace.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: (key) => data.get(key)
  };
}

const KEY = DB_BASE_KEY;
let checks = 0;

{
  const initial = createInitialDb();
  initial.lessonEvents.push({ id: 'ev_1', lessonId: 'l1', step: 'read', kind: 'read', submittedAt: 1100 });
  const storage = memoryStorage({ [KEY]: JSON.stringify(initial) });
  const store = createPersistentStore({ storage, key: KEY, hydrate: hydrateDb, fallback: createInitialDb });

  // Simulate another runtime path writing a newer snapshot after this store
  // was created. A transaction must start from the latest persisted DB,
  // never from the store's older in-memory snapshot.
  const runtimeSnapshot = hydrateDb(JSON.parse(storage.getItem(KEY)));
  runtimeSnapshot.lessonEvents.push({ id: 'ev_2', lessonId: 'l1', step: 'write', kind: 'write', submittedAt: 1200 });
  storage.setItem(KEY, JSON.stringify(runtimeSnapshot));

  store.transact((db) => { db.profile.target = 'a1'; });
  const saved = JSON.parse(storage.getItem(KEY));
  assert.deepEqual(saved.lessonEvents.map((event) => event.id), ['ev_1', 'ev_2']);
  assert.equal(saved.profile.target, 'a1');
  checks++;
}

{
  const storage = memoryStorage();
  const store = createPersistentStore({ storage, key: KEY, hydrate: hydrateDb, fallback: createInitialDb });
  store.transact((db) => { db.lessonEvents.push({ id: 'e1', submittedAt: 1001 }); });
  const before = storage.getItem(KEY);
  assert.throws(() => store.transact(() => { throw new Error('stop'); }), /stop/);
  assert.equal(storage.getItem(KEY), before, 'failed transaction must not overwrite persisted state');
  checks++;
}

{
  const storage = memoryStorage({ [KEY]: '{broken json' });
  const store = createPersistentStore({ storage, key: KEY, hydrate: hydrateDb, fallback: createInitialDb });
  assert.equal(store.getState().version, DB_VERSION, 'malformed storage must fall back to a valid DB');
  checks++;
}

{
  const storage = memoryStorage({ [KEY]: JSON.stringify(createInitialDb()) });
  const store = createPersistentStore({ storage, key: KEY, hydrate: hydrateDb, fallback: createInitialDb });
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  store.transact((db) => { db.lessonEvents.push({ id: 'e1' }); });
  unsubscribe();
  store.transact((db) => { db.lessonEvents.push({ id: 'e2' }); });
  assert.equal(notifications, 1, 'subscription should observe committed state changes only while active');
  checks++;
}

console.log(`FlashDay state integrity: ${checks} persistent-store checks passed`);
