import assert from 'node:assert/strict';
import { DB_VERSION, appendLessonEvent, createInitialDb, hydrateDb } from '../src/core/evidence.js';

{
  const db = createInitialDb();
  assert.equal(db.version, DB_VERSION);
  assert.equal(DB_VERSION, 3);
  assert.deepEqual(db.lessonEvents, []);
  assert.deepEqual(db.fsrs, {});
}

{
  assert.deepEqual(hydrateDb(null), createInitialDb(), 'unknown input falls back to initial db');
  assert.deepEqual(hydrateDb('{junk'), createInitialDb());
  const hydrated = hydrateDb({ lessonEvents: [{ id: 'e1' }], fsrs: { k: {} }, profile: { x: 1 } });
  assert.equal(hydrated.lessonEvents.length, 1);
  assert.equal(hydrated.profile.x, 1);
}

{
  const db = createInitialDb();
  const first = appendLessonEvent(db, {
    lessonId: 'a1-s1-l1', contentVersion: 1, step: 'prepare', kind: 'drill',
    payload: { drillId: 'd1', correct: true },
    support: { hintViewed: true }
  }, 1000);
  const second = appendLessonEvent(db, {
    lessonId: 'a1-s1-l1', contentVersion: 1, step: 'read', kind: 'read',
    payload: { q1: 0 }, support: { translationViewed: true }
  }, 2000);
  assert.notEqual(first.id, second.id, 'each event gets a unique id');
  assert.equal(first.submittedAt, 1000);
  assert.equal(db.lessonEvents.length, 2);
  // Append-only: the later append must not mutate the earlier event.
  assert.deepEqual(db.lessonEvents[0], first);
  assert.equal(first.payload.drillId, 'd1');
  // The caller's payload is copied in — mutating the source can't leak in.
  const source = { q: 1 };
  const ev = appendLessonEvent(db, { lessonId: 'l', step: 'read', kind: 'read', payload: source });
  source.q = 99;
  assert.equal(ev.payload.q, 1, 'stored payload is a copy');
  assert.throws(() => appendLessonEvent(db, { lessonId: 'x', step: 's', kind: 'bogus' }), /Unknown lesson event kind/);
}

console.log('FlashDay evidence: 3 checks passed');
