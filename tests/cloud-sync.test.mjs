import assert from 'node:assert/strict';
import { createCloudSync, lessonEventFromRow, lessonEventRow, mergeProgressPayload } from '../src/core/cloud.js';
import { createInitialDb, hydrateDb, appendLessonEvent } from '../src/core/evidence.js';
import { createPersistentStore } from '../src/core/store.js';
import { dbKey } from '../src/core/namespace.js';
import { enrollChunks, rebuildFsrsFromLog, rateChunk } from '../src/core/scheduler.js';

// In-memory stand-ins for localStorage and the supabase-shaped client —
// same surface the real firebase-client exposes: from(t).upsert/select/
// eq/maybeSingle/pageAfter, returning {data,error}.
function memStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

function fakeClient(uid, { gate } = {}) {
  const tables = { lesson_events: new Map(), learning_progress: new Map() };
  return {
    tables,
    from(table) {
      const map = tables[table];
      return {
        upsert(rows, { ignoreDuplicates = false } = {}) {
          const written = [];
          for (const row of [].concat(rows)) {
            const id = String(row.id ?? row.owner_id);
            if (table === 'learning_progress') {
              const existing = map.get(id);
              map.set(id, {
                ...row, id,
                created_at: existing?.created_at || 'iso',
                payload: mergeProgressPayload(existing?.payload || {}, row.payload || {})
              });
              written.push(map.get(id));
              continue;
            }
            if (ignoreDuplicates && map.has(id)) continue;
            map.set(id, { created_at: 'iso', ...row, id });
            written.push(map.get(id));
          }
          return Promise.resolve({ data: written, error: null });
        },
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          await gate?.();
          return { data: map.get(uid) || null, error: null };
        },
        async pageAfter(cursor, size) {
          await gate?.();
          const all = [...map.values()];
          const start = cursor ? Number(cursor) + 1 : 0;
          const data = all.slice(start, start + size);
          return { data, cursor: data.length ? start + data.length - 1 : cursor, error: null };
        }
      };
    }
  };
}

function makeStore(storage) {
  return createPersistentStore({
    storage, key: () => dbKey(storage), hydrate: hydrateDb, fallback: createInitialDb
  });
}

const drillEvent = (id) => ({
  lessonId: 'a1-s1-l1', contentVersion: 1, step: 'prepare', kind: 'drill',
  payload: { correct: 3, total: 4 }, support: {}, id
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
async function until(fn, tries = 50) {
  for (let i = 0; i < tries; i++) {
    if (fn()) return true;
    await flush();
  }
  return fn();
}

// window/localStorage globals the sync module touches
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.document = { visibilityState: 'visible' };
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) { this.type = type; Object.assign(this, init); }
};

// (a) push uploads only new event ids; a second push uploads nothing.
{
  const storage = memStorage();
  const store = makeStore(storage);
  const client = fakeClient('u1');
  const statuses = [];
  const sync = createCloudSync({ client, store, storage, onStatus: (s) => statuses.push(s) });
  sync.connect({ id: 'u1' });
  assert(await until(() => client.tables.learning_progress.has('u1')),
    'hydrate completes and upserts progress');
  store.transact((db) => appendLessonEvent(db, drillEvent('e1'), 1000));
  await sync.pushIncremental('test');
  assert.equal(client.tables.lesson_events.size, 1);
  const row = [...client.tables.lesson_events.values()][0];
  assert.equal(row.lesson_id, 'a1-s1-l1');
  assert.equal(row.owner_id, 'u1');
  const wrote = client.tables.lesson_events.size;
  await sync.pushIncremental('test');
  assert.equal(client.tables.lesson_events.size, wrote, 'second push uploads nothing new');
  store.transact((db) => appendLessonEvent(db, drillEvent('e2'), 2000));
  await sync.pushIncremental('test');
  assert.equal(client.tables.lesson_events.size, wrote + 1, 'only the new event goes up');
  // learning_progress payload: reviewLog + profile only.
  const progress = client.tables.learning_progress.get('u1');
  assert(progress.payload.reviewLog !== undefined);
  assert.equal(progress.payload.lessonEvents, undefined);
  assert.equal(progress.payload.fsrs, undefined);
  assert(statuses.includes('saved'));
  sync.disconnect();
}

// (b) two-device merge: remote has device B's log; local has A's; hydrate →
// merged reviewLog and fsrs equal sequential replay of both logs.
{
  const storage = memStorage();
  const store = makeStore(storage);
  const lesson = { id: 'a1-s1-l1', chunks: [{ id: 'c1' }] };

  // Device B already pushed: one event + enroll + rate in the cloud.
  const client = fakeClient('u2');
  client.tables.lesson_events.set('b1', lessonEventRow(drillEvent('b1'), 'u2'));
  const remoteLog = [
    { id: 'r1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1000 },
    { id: 'r2', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 2, at: 2000 }
  ];
  client.tables.learning_progress.set('u2', {
    payload: { version: 2, reviewLog: remoteLog, profile: {} }
  });

  // Local device A: same lesson enrolled (earlier) + a different rating.
  store.transact((db) => {
    appendLessonEvent(db, drillEvent('a1'), 3000);
    enrollChunks(db, lesson, 500);
    rateChunk(db, 'a1-s1-l1:c1', 4, 4000);
    db.reviewLog.push({ id: 'a-rate', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 4, at: 4000 });
  });

  const sync = createCloudSync({ client, store, storage, onStatus: () => {} });
  sync.connect({ id: 'u2' });
  assert(await until(() => store.getState().lessonEvents.length === 2
    ), 'hydrate merged remote event');

  const merged = store.getState();
  assert.equal(merged.lessonEvents.length, 2, 'remote event merged in');
  // Sequential reference: replay the union of both devices' log entries.
  const reference = rebuildFsrsFromLog([
    ...remoteLog,
    { id: 'a-enroll', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 500 },
    { id: 'a-rate', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 4, at: 4000 }
  ]);
  assert.deepEqual(merged.fsrs, reference);
  // And the local-only event went up post-hydrate.
  assert(await until(() => client.tables.lesson_events.size === 2), 'local event pushed');
  sync.disconnect();
}

// (c) fence: disconnect mid-hydrate → the stale store is never replaced.
{
  const storage = memStorage();
  const store = makeStore(storage);
  store.transact((db) => appendLessonEvent(db, drillEvent('local-only'), 100));
  const resolvers = [];
  const gate = () => new Promise((resolve) => resolvers.push(resolve));
  const client = fakeClient('u3', { gate });
  client.tables.lesson_events.set('remote-1', lessonEventRow(drillEvent('remote-1'), 'u3'));
  const sync = createCloudSync({ client, store, storage, onStatus: () => {} });
  sync.connect({ id: 'u3' });
  await flush(); // gated calls are now in flight
  sync.disconnect(); // identity generation invalidated mid-flight
  resolvers.splice(0).forEach((resolve) => resolve());
  await flush(); await flush(); await flush();
  assert.equal(store.getState().lessonEvents.length, 1, 'no stale write after disconnect');
  assert.equal(store.getState().lessonEvents[0].submittedAt, 100);
}

// (d) payload-size guard warns (never throws) past 700KB.
{
  const storage = memStorage();
  const store = makeStore(storage);
  const client = fakeClient('u4');
  const sync = createCloudSync({ client, store, storage, onStatus: () => {} });
  sync.connect({ id: 'u4' });
  assert(await until(() => client.tables.learning_progress.has('u4')));
  const big = 'x'.repeat(720 * 1024);
  store.transact((db) => { db.profile = { note: big }; });
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (msg) => warnings.push(msg);
  await sync.pushIncremental('test');
  console.warn = originalWarn;
  assert(warnings.some((w) => String(w).includes('exceeds')), 'warns past 700KB');
  sync.disconnect();
}

console.log('FlashDay cloud sync: 4 checks passed');
