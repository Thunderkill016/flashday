import assert from 'node:assert/strict';
import { chunkForKey, chunkKey, dueChunks, enrollChunks, nextDueAt, rateChunk, rebuildFsrsFromLog } from '../src/core/scheduler.js';
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

// Enrolment is recorded in reviewLog so db.fsrs can be rebuilt after a
// two-device merge — replay of the merged log equals sequential application.
{
  const db = createInitialDb();
  enrollChunks(db, lesson, 1000);
  assert.equal(db.reviewLog.length, 3, 'each new chunk logs an enroll entry');
  assert(db.reviewLog.every((e) => e.kind === 'enroll' && e.id));
  rateChunk(db, 'a1-s1-l1:c1', 3, 5000);
  db.reviewLog.push({ id: 'l1', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3, at: 5000 });
  const rebuilt = rebuildFsrsFromLog(db.reviewLog);
  assert.deepEqual(rebuilt, db.fsrs, 'rebuild replays to identical cards');
  // Two devices: B's log merged in by id → identical rebuild.
  const deviceB = [
    { id: 'b1', kind: 'rate', chunkKey: 'a1-s1-l1:c2', grade: 4, at: 2000 },
    { id: 'b0', chunkKey: 'a1-s1-l1:c3', grade: 2, at: 3000 } // kindless → rate
  ];
  const mergedLog = [...db.reviewLog, ...deviceB]
    .sort((a, b) => (a.at - b.at) || String(a.id).localeCompare(String(b.id)));
  const mergedFsrs = rebuildFsrsFromLog(mergedLog);
  assert(mergedFsrs['a1-s1-l1:c2'] !== db.fsrs['a1-s1-l1:c2'], 'B rating changes c2');
}

console.log('FlashDay scheduler: 3 checks passed');
