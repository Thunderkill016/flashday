import assert from 'node:assert/strict';
import { chunkForKey, chunkKey, dueChunks, enrollChunks, nextDueAt, rateChunk } from '../src/core/scheduler.js';
import { createInitialDb } from '../src/core/evidence.js';

const lesson = {
  id: 'a1-s1-l1',
  chunks: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]
};

{
  const db = createInitialDb();
  const enrolled = enrollChunks(db, lesson, 1000);
  assert.equal(enrolled.length, 3);
  assert.deepEqual(enrolled.sort(), ['a1-s1-l1:c1', 'a1-s1-l1:c2', 'a1-s1-l1:c3']);
  const again = enrollChunks(db, lesson, 2000);
  assert.equal(again.length, 0, 're-enrolment is idempotent');
  assert.equal(Object.keys(db.fsrs).length, 3);
}

{
  const db = createInitialDb();
  enrollChunks(db, lesson, 1000);
  // New cards are due immediately.
  assert.equal(dueChunks(db, 1000).length, 3);
  rateChunk(db, 'a1-s1-l1:c1', 3, 1000); // Good
  rateChunk(db, 'a1-s1-l1:c2', 1, 1000); // Again
  const due = dueChunks(db, 1000 + 60 * 60 * 1000);
  assert(due.some((d) => d.key === 'a1-s1-l1:c2'), 'Again-rated card stays due soon');
  assert.equal(rateChunk(db, 'a1-s1-l1:c1', 0, 1000), null, 'invalid grade returns null');
  assert.equal(chunkKey('l', 'c'), 'l:c');
  // nextDueAt: earliest future due among enrolled chunks.
  assert.equal(typeof nextDueAt(db, 1000), 'number' , 'some cards still due later');
  const resolved = chunkForKey('a1-s1-l1:c2', [{ id: 'a1-s1-l1', chunks: [{ id: 'c2', target: 't' }] }]);
  assert.equal(resolved.chunk.target, 't');
  assert.equal(chunkForKey('nope:c', [{ id: 'a1-s1-l1', chunks: [] }]), null);
}

console.log('FlashDay scheduler: 2 checks passed');
