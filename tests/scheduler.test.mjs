import assert from 'node:assert/strict';
import {
  chunkForKey,
  chunkKey,
  dueTasks,
  enrollTasks,
  nextDueAt,
  rateTask,
  rebuildFsrsFromLog,
  reviewQueue,
  taskForKey,
  taskKey,
  NEW_TASK_BUDGET
} from '../src/core/scheduler.js';
import {
  TASK_KINDS,
  STEP_TASKS,
  LEGACY_TASK_KIND,
  contentRev,
  normalizeTaskKey
} from '../src/core/domain.js';
import { createInitialDb } from '../src/core/evidence.js';

const lesson = {
  id: 'a1-s1-l1',
  chunks: [
    { id: 'c1', target: 'Hello', meaning: 'Xin chào' },
    { id: 'c2', target: 'I’m …', meaning: 'Tôi là …' },
    { id: 'c3', target: 'What’s your name?', meaning: 'Tên bạn là gì?' }
  ]
};

const tk = (chunkId, kind) => {
  const chunk = lesson.chunks.find((c) => c.id === chunkId);
  return taskKey(lesson.id, chunkId, kind, contentRev(chunk));
};

// Staged enrollment: prepare introduces only its two task kinds; each chunk
// gets one FSRS card per kind, keyed `lesson:chunk@rev:kind`.
{
  const db = createInitialDb();
  const enrolled = enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  assert.equal(enrolled.length, 6, '3 chunks × 2 prepare kinds');
  assert.deepEqual(
    enrolled.sort(),
    [
      tk('c1', 'form_recognition'), tk('c1', 'meaning_recall'),
      tk('c2', 'form_recognition'), tk('c2', 'meaning_recall'),
      tk('c3', 'form_recognition'), tk('c3', 'meaning_recall')
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
  // Enrol entries store the FULL task ids — replay never guesses the rev.
  assert.deepEqual(
    db.reviewLog[0].tasks,
    [tk('c1', 'form_recognition'), tk('c1', 'meaning_recall')]
  );
}

// Independent memory states: rating one task never advances another.
// due() holds only exercised work — New cards wait in the bounded queue.
{
  const db = createInitialDb();
  enrollTasks(db, lesson, TASK_KINDS, 1000);
  assert.equal(dueTasks(db, 1000).length, 0,
    'brand-new tasks are introductions, not overdue review');
  const queue = reviewQueue(db, [lesson], 1000);
  assert.equal(queue.due.length, 0);
  assert.equal(queue.freshPending, 12, '3 chunks × 4 kinds await introduction');
  assert(queue.fresh.length <= NEW_TASK_BUDGET, 'introductions are bounded');
  assert(queue.fresh.length <= 3, 'sibling bury: at most one new task per component');
  rateTask(db, tk('c1', 'meaning_recall'), 3, 1000); // Good
  rateTask(db, tk('c2', 'meaning_recall'), 1, 1000); // Again
  const due = dueTasks(db, 1000 + 60 * 60 * 1000, [lesson]);
  const dueKeys = due.map((d) => d.key);
  assert(dueKeys.includes(tk('c2', 'meaning_recall')), 'Again stays due soon');
  assert(!dueKeys.includes(tk('c1', 'meaning_recall')) ||
    new Date(db.fsrs[tk('c1', 'meaning_recall')].due).getTime() > 1000 + 3 * 60 * 1000,
    'rated meaning_recall moved on its own schedule');
  // Unrated siblings stay out of `due` — they are still New.
  assert(!dueKeys.includes(tk('c1', 'listening_recognition')),
    'unrated sibling is an introduction, not overdue');
  assert.equal(rateTask(db, tk('c1', 'meaning_recall'), 0, 1000), null, 'invalid grade returns null');
  assert.equal(taskKey('l', 'c', 'meaning_recall', 'abcdef12'), 'l:c@abcdef12:meaning_recall');
  assert.equal(chunkKey('l', 'c'), 'l:c');
  assert.equal(typeof nextDueAt(db, 1000), 'number', 'rated cards still due later');
  const resolved = taskForKey(tk('c2', 'listening_recognition'), [lesson]);
  assert.equal(resolved.chunk.target, 'I’m …');
  assert.equal(resolved.taskKind, 'listening_recognition');
  assert.equal(resolved.superseded, false);
  assert.equal(chunkForKey(tk('c2', 'meaning_recall'), [lesson]).chunk.target, 'I’m …',
    'chunkForKey resolves through task keys');
  assert.equal(taskForKey('nope:c1:meaning_recall', [lesson]), null);
  assert.equal(taskForKey('junk', [lesson]), null);
}

// Enrolment is recorded in reviewLog so db.fsrs rebuilds identically after a
// two-device merge — replay of the merged log equals sequential application.
{
  const db = createInitialDb();
  enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  assert.equal(db.reviewLog.length, 3, 'each chunk logs one staged enroll entry');
  assert(db.reviewLog.every((e) => e.kind === 'enroll' && e.id && e.tasks.length === 2));
  rateTask(db, tk('c1', 'meaning_recall'), 3, 5000);
  db.reviewLog.push({ id: 'l1', kind: 'rate', taskKey: tk('c1', 'meaning_recall'), grade: 3, at: 5000 });
  const rebuilt = rebuildFsrsFromLog(db.reviewLog);
  assert.deepEqual(rebuilt, db.fsrs, 'rebuild replays to identical task cards');
  // Two devices: B's log merged in by id → identical rebuild.
  const deviceB = [
    { id: 'b1', kind: 'rate', taskKey: tk('c2', 'meaning_recall'), grade: 4, at: 2000 },
    { id: 'b0', taskKey: tk('c3', 'form_recognition'), grade: 2, at: 3000 } // kindless → rate
  ];
  const mergedLog = [...db.reviewLog, ...deviceB]
    .sort((a, b) => (a.at - b.at) || String(a.id).localeCompare(String(b.id)));
  const mergedFsrs = rebuildFsrsFromLog(mergedLog);
  assert(
    mergedFsrs[tk('c2', 'meaning_recall')] !== db.fsrs[tk('c2', 'meaning_recall')],
    'B rating changes c2 meaning_recall only'
  );
}

// Legacy migration — the canonical rule is identical for local hydrate and
// cloud replay: a v2 chunk card projects to exactly ONE meaning_recall task.
// It must NOT expand to all four kinds (that would invent exercised memory
// for modalities the learner may never have touched).
{
  const legacyLog = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1000 },
    { id: 'r1', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3, at: 2000 },
    { id: 'r2', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 4, at: 90000 }
  ];
  const rebuilt = rebuildFsrsFromLog(legacyLog);
  const c1Rev = normalizeTaskKey('a1-s1-l1:c1').split('@')[1].split(':')[0];
  const legacyTask = `a1-s1-l1:c1@${c1Rev}:${LEGACY_TASK_KIND}`;
  assert.equal(rebuilt[legacyTask].reps, 2, 'legacy rates keep their history on meaning_recall');
  const taskKeys = Object.keys(rebuilt).filter((k) => k.startsWith('a1-s1-l1:c1@'));
  assert.deepEqual(taskKeys, [legacyTask],
    'legacy enroll creates exactly one task — no invented sibling cards');
  // Idempotent: replaying the same log again produces the same map.
  assert.deepEqual(rebuildFsrsFromLog(legacyLog), rebuilt, 'rebuild is idempotent');
  // And a legacy rate addressed by chunkKey lands on meaning_recall only.
  const db = createInitialDb();
  db.reviewLog = legacyLog;
  db.fsrs = rebuilt;
  rateTask(db, 'a1-s1-l1:c1', 1, 100000); // legacy-shaped key
  assert.equal(db.fsrs[legacyTask].lapses, 1, 'legacy rate key lands on meaning_recall');
}

// Staged enroll entries written by the first task-aware build stored bare
// kind names — replay must still resolve them through the ledger.
{
  const midLog = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', tasks: ['meaning_recall'], at: 1000 }
  ];
  const rebuilt = rebuildFsrsFromLog(midLog);
  const keys = Object.keys(rebuilt);
  assert.equal(keys.length, 1);
  assert(keys[0].endsWith(':meaning_recall'), 'bare-kind task list resolves to a full task id');
  assert(keys[0].includes('@'), 'resolved id carries the content revision');
}

// Regression (issue #30 round-3): a parked card can be chronologically due
// yet must never surface as due work — the review queue cannot serve it.
// dueTasks/nextDueAt must filter superseded AND ambiguous, not just New.
{
  const parkedLesson = {
    id: 'test-parked', // no ledger entries — rev-less keys here stay parked
    chunks: [{ id: 'c1', target: 'Hi', meaning: 'Chào' }]
  };
  const live = `test-parked:c1@${contentRev(parkedLesson.chunks[0])}:meaning_recall`;
  const supersededKey = 'test-parked:c1@deadbeef:meaning_recall'; // rev ≠ live text
  const ambiguousKey = 'test-parked:c1:meaning_recall';           // rev-less → parked
  const log = [
    { id: 'a', kind: 'rate', taskKey: ambiguousKey, grade: 1, at: 1000 },
    { id: 's', kind: 'rate', taskKey: supersededKey, grade: 1, at: 1000 },
    { id: 'l', kind: 'rate', taskKey: live, grade: 1, at: 1000 }
  ];
  const db = createInitialDb();
  db.fsrs = rebuildFsrsFromLog(log);
  const soon = 1000 + 5 * 60 * 1000;
  assert.deepEqual(dueTasks(db, soon, [parkedLesson]).map((e) => e.key), [live],
    'ambiguous + superseded dues stay parked; exposed due = 1');
  // A rev-less key is provably ambiguous WITHOUT lesson context — excluded
  // even when lessons are omitted; supersession needs the lesson.
  assert.deepEqual(dueTasks(db, soon).map((e) => e.key).sort(), [live, supersededKey].sort(),
    'rev-less key excluded without lessons; superseded needs lesson context');
  const dbParkedOnly = createInitialDb();
  dbParkedOnly.fsrs = rebuildFsrsFromLog([log[0], log[1]]);
  assert.equal(nextDueAt(dbParkedOnly, soon, [parkedLesson]), null,
    'parked-only cards surface no next-review timestamp');
  // Parked card due SOONER than live work: nextDueAt must skip it and
  // report the live card's timestamp, never the parked one.
  const dbMixed = createInitialDb();
  dbMixed.fsrs = rebuildFsrsFromLog([
    { id: 'a', kind: 'rate', taskKey: ambiguousKey, grade: 1, at: 1000 }, // due ~1min
    { id: 'l', kind: 'rate', taskKey: live, grade: 4, at: 1000 }          // due ~days
  ]);
  const liveDue = new Date(dbMixed.fsrs[live].due).getTime();
  const parkedDue = new Date(dbMixed.fsrs[ambiguousKey].due).getTime();
  assert(parkedDue < liveDue, 'fixture: parked card is the earlier due');
  assert.equal(nextDueAt(dbMixed, 1000, [parkedLesson]), liveDue,
    'nextDueAt skips the earlier parked card');
}

console.log('FlashDay scheduler: 6 checks passed');
