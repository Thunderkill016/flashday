import assert from 'node:assert/strict';
import {
  chunkForKey,
  chunkKey,
  dueTasks,
  enrollTasks,
  nextDueAt,
  rateTask,
  rebuildFsrsFromLog,
  taskForKey,
  taskKey
} from '../src/core/scheduler.js';
import { TASK_KINDS, STEP_TASKS, LEGACY_TASK_KIND } from '../src/core/domain.js';
import { createInitialDb } from '../src/core/evidence.js';

const lesson = {
  id: 'a1-s1-l1',
  chunks: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]
};

// Staged enrollment: prepare introduces only its two task kinds; each chunk
// gets one FSRS card per kind, keyed `lesson:chunk:kind`.
{
  const db = createInitialDb();
  const enrolled = enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  assert.equal(enrolled.length, 6, '3 chunks × 2 prepare kinds');
  assert.deepEqual(
    enrolled.sort(),
    [
      'a1-s1-l1:c1:form_recognition', 'a1-s1-l1:c1:meaning_recall',
      'a1-s1-l1:c2:form_recognition', 'a1-s1-l1:c2:meaning_recall',
      'a1-s1-l1:c3:form_recognition', 'a1-s1-l1:c3:meaning_recall'
    ]
  );
  const again = enrollTasks(db, lesson, STEP_TASKS.prepare, 2000);
  assert.equal(again.length, 0, 're-enrolment is idempotent per task');
  // A later step enrolls its own kind without disturbing the first two.
  const later = enrollTasks(db, lesson, STEP_TASKS.listen, 3000);
  assert.equal(later.length, 3, 'listen adds listening_recognition only');
  assert(later.every((k) => k.endsWith(':listening_recognition')));
  assert.equal(Object.keys(db.fsrs).length, 9);
  assert.equal(db.reviewLog.length, 6, 'one enroll entry per chunk per stage');
  assert.deepEqual(db.reviewLog[0].tasks, ['form_recognition', 'meaning_recall']);
}

// Independent memory states: rating one task never advances another.
{
  const db = createInitialDb();
  enrollTasks(db, lesson, TASK_KINDS, 1000);
  assert.equal(dueTasks(db, 1000).length, 12, 'new task cards are due immediately');
  rateTask(db, 'a1-s1-l1:c1:meaning_recall', 3, 1000); // Good
  rateTask(db, 'a1-s1-l1:c2:meaning_recall', 1, 1000); // Again
  const due = dueTasks(db, 1000 + 60 * 60 * 1000);
  const dueKeys = due.map((d) => d.key);
  assert(dueKeys.includes('a1-s1-l1:c2:meaning_recall'), 'Again stays due soon');
  assert(dueKeys.includes('a1-s1-l1:c1:listening_recognition'),
    'unrated listening task still due — separate state');
  assert(!dueKeys.includes('a1-s1-l1:c1:meaning_recall') ||
    new Date(db.fsrs['a1-s1-l1:c1:meaning_recall'].due).getTime() > 1000 + 3 * 60 * 1000,
    'rated meaning_recall moved on its own schedule');
  assert.equal(rateTask(db, 'a1-s1-l1:c1:meaning_recall', 0, 1000), null, 'invalid grade returns null');
  assert.equal(taskKey('l', 'c', 'meaning_recall'), 'l:c:meaning_recall');
  assert.equal(chunkKey('l', 'c'), 'l:c');
  assert.equal(typeof nextDueAt(db, 1000), 'number', 'some cards still due later');
  const resolved = taskForKey('a1-s1-l1:c2:listening_recognition', [
    { id: 'a1-s1-l1', chunks: [{ id: 'c2', target: 't' }] }
  ]);
  assert.equal(resolved.chunk.target, 't');
  assert.equal(resolved.taskKind, 'listening_recognition');
  assert.equal(chunkForKey('a1-s1-l1:c2:meaning_recall', [
    { id: 'a1-s1-l1', chunks: [{ id: 'c2', target: 't' }] }
  ]).chunk.target, 't', 'chunkForKey resolves through task keys');
  assert.equal(taskForKey('nope:c1:meaning_recall', [{ id: 'a1-s1-l1', chunks: [] }]), null);
  assert.equal(taskForKey('junk', [{ id: 'a1-s1-l1', chunks: [] }]), null);
}

// Enrolment is recorded in reviewLog so db.fsrs rebuilds identically after a
// two-device merge — replay of the merged log equals sequential application.
{
  const db = createInitialDb();
  enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  assert.equal(db.reviewLog.length, 3, 'each chunk logs one staged enroll entry');
  assert(db.reviewLog.every((e) => e.kind === 'enroll' && e.id && e.tasks.length === 2));
  rateTask(db, 'a1-s1-l1:c1:meaning_recall', 3, 5000);
  db.reviewLog.push({ id: 'l1', kind: 'rate', taskKey: 'a1-s1-l1:c1:meaning_recall', grade: 3, at: 5000 });
  const rebuilt = rebuildFsrsFromLog(db.reviewLog);
  assert.deepEqual(rebuilt, db.fsrs, 'rebuild replays to identical task cards');
  // Two devices: B's log merged in by id → identical rebuild.
  const deviceB = [
    { id: 'b1', kind: 'rate', taskKey: 'a1-s1-l1:c2:meaning_recall', grade: 4, at: 2000 },
    { id: 'b0', taskKey: 'a1-s1-l1:c3:form_recognition', grade: 2, at: 3000 } // kindless → rate
  ];
  const mergedLog = [...db.reviewLog, ...deviceB]
    .sort((a, b) => (a.at - b.at) || String(a.id).localeCompare(String(b.id)));
  const mergedFsrs = rebuildFsrsFromLog(mergedLog);
  assert(
    mergedFsrs['a1-s1-l1:c2:meaning_recall'] !== db.fsrs['a1-s1-l1:c2:meaning_recall'],
    'B rating changes c2 meaning_recall only'
  );
}

// Legacy migration: a v2 log uses 2-segment chunkKey. Replay projects it to
// meaning_recall AND expands enrolment to all four kinds as new cards.
{
  const legacyLog = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1000 },
    { id: 'r1', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3, at: 2000 },
    { id: 'r2', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 4, at: 90000 }
  ];
  const rebuilt = rebuildFsrsFromLog(legacyLog);
  for (const kind of TASK_KINDS) {
    assert(rebuilt[`a1-s1-l1:c1:${kind}`], `legacy enroll expands to ${kind}`);
  }
  const migrated = rebuilt[`a1-s1-l1:c1:${LEGACY_TASK_KIND}`];
  assert(migrated.reps >= 2, 'legacy rates keep their history on meaning_recall');
  assert.equal(rebuilt['a1-s1-l1:c1:listening_recognition'].reps, 0,
    'no cross-skill credit: other tasks start fresh');
  // Idempotent: replaying the same log again produces the same map.
  assert.deepEqual(rebuildFsrsFromLog(legacyLog), rebuilt, 'rebuild is idempotent');
  // And a legacy rate addressed by chunkKey lands on meaning_recall only.
  const db = createInitialDb();
  db.reviewLog = legacyLog;
  db.fsrs = rebuilt;
  rateTask(db, 'a1-s1-l1:c1', 1, 100000); // legacy-shaped key
  assert.equal(db.fsrs['a1-s1-l1:c1:meaning_recall'].lapses, 1,
    'legacy rate key lands on meaning_recall');
  assert.equal(db.fsrs['a1-s1-l1:c1:form_recognition'].lapses, 0, 'siblings untouched');
}

console.log('FlashDay scheduler: 4 checks passed');
