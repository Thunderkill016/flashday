/*
 * A1-ARCH-001 regression suite: the evidence-driven learner model.
 * Covers the issue's required categories — separate memory states, legacy
 * migration, deterministic replay, aided-vs-unaided honesty, modality
 * honesty, planner determinism, and the content adapter over all 30 lessons.
 */
import assert from 'node:assert/strict';
import {
  adaptCourse,
  adaptLesson,
  canDoIdFor,
  normalizeTaskKey,
  parseTaskKey,
  skillTargetFor,
  STEP_TASKS,
  TASK_KINDS
} from '../src/core/domain.js';
import { projectLessonEvent, projectReviewEntry, projectAll } from '../src/core/evidence-projection.js';
import { deriveLearnerState } from '../src/core/learner-state.js';
import { planNext } from '../src/core/planner.js';
import { enrollTasks, rebuildFsrsFromLog, dueTasks, rateTask } from '../src/core/scheduler.js';
import { createInitialDb, hydrateDb, appendLessonEvent, DB_VERSION } from '../src/core/evidence.js';
import { createSession } from '../src/core/session.js';
import { LESSONS } from '../src/content/a1/index.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

const lesson = {
  id: 'a1-s1-l1',
  stage: 1,
  order: 1,
  kind: 'lesson',
  contentVersion: 2,
  canDo: 'Chào người mới gặp, nói tên và nơi mình đến từ, và hỏi lại người kia.',
  chunks: [
    { id: 'c1', target: 'Hello', meaning: 'Xin chào', example: 'Hello, Mai.', exampleVi: 'Chào Mai.' },
    { id: 'c2', target: 'I’m …', meaning: 'Tôi là …', example: 'I’m Nam.', exampleVi: 'Tôi là Nam.' }
  ]
};

const lessons = [
  lesson,
  { id: 'a1-s1-l2', stage: 1, order: 2, kind: 'lesson', contentVersion: 1, canDo: 'x'.repeat(12), chunks: lesson.chunks }
];

// ── 1. Content adapter: all 30 lessons adapt; malformed input fails loudly ──
{
  const adapted = adaptCourse(LESSONS);
  assert.equal(adapted.goals.length, 30);
  const componentCount = adapted.components.size;
  assert(componentCount >= 30 * 6, 'every chunk becomes a component');
  assert.equal(adapted.tasks.size, componentCount * TASK_KINDS.length, 'one task per component per kind');
  for (const task of adapted.tasks.values()) {
    assert(TASK_KINDS.includes(task.taskKind));
    assert(skillTargetFor(task.taskKind), `task ${task.id} resolves a skill target`);
    assert(task.canDoId.startsWith('a1.cando.'));
  }
  assert.equal(canDoIdFor('a1-s1-l1'), 'a1.cando.a1-s1-l1');
  const one = adaptLesson(lesson);
  assert.equal(one.components.length, 2);
  assert.equal(one.tasks.length, 8, '2 chunks × 4 task kinds');

  // Malformed lessons must throw — never invent targets silently.
  assert.throws(() => adaptLesson({ id: 'x1', canDo: 'ok', chunks: [] }), /adaptLesson/);
  assert.throws(() => adaptLesson({ ...lesson, chunks: [{ id: 'bad-id', target: 't', meaning: 'm' }] }), /chunk id/);
  assert.throws(() => adaptLesson({ ...lesson, chunks: [lesson.chunks[0], lesson.chunks[0]] }), /duplicate/);
  assert.throws(() => adaptLesson({ ...lesson, chunks: [{ id: 'c9', target: 't', meaning: 'm' }] }), /c1–c8/);
}

// ── 2. Task identity + key normalization ──
{
  assert.equal(normalizeTaskKey('a1-s1-l1:c1'), 'a1-s1-l1:c1:meaning_recall', 'legacy key → legacy task');
  assert.equal(normalizeTaskKey('a1-s1-l1:c1:listening_recognition'), 'a1-s1-l1:c1:listening_recognition');
  assert.equal(normalizeTaskKey('junk'), null);
  assert.equal(normalizeTaskKey(''), null);
  const parsed = parseTaskKey('a1-s1-l1:c2:cued_production');
  assert.deepEqual(
    { lessonId: parsed.lessonId, chunkId: parsed.chunkId, taskKind: parsed.taskKind },
    { lessonId: 'a1-s1-l1', chunkId: 'c2', taskKind: 'cued_production' }
  );
}

// ── 3. Separate memory states: rating one task leaves siblings untouched ──
{
  const db = createInitialDb();
  enrollTasks(db, lesson, TASK_KINDS, 1000);
  const before = JSON.parse(JSON.stringify(db.fsrs));
  rateTask(db, 'a1-s1-l1:c1:meaning_recall', 4, 2000); // Easy
  for (const kind of TASK_KINDS) {
    const key = `a1-s1-l1:c1:${kind}`;
    if (kind === 'meaning_recall') {
      assert.notDeepEqual(db.fsrs[key], before[key], 'rated task advanced');
    } else {
      assert.deepEqual(db.fsrs[key], before[key], `${kind} untouched by meaning_recall rating`);
    }
  }
  // Rebuild must reproduce the same separation.
  db.reviewLog.push({ id: 'r1', kind: 'rate', taskKey: 'a1-s1-l1:c1:meaning_recall', grade: 4, at: 2000 });
  assert.deepEqual(rebuildFsrsFromLog(db.reviewLog), db.fsrs, 'replay preserves per-task state');
}

// ── 4. DB v2 → v3 migration: fsrs cache key normalization is lossless ──
{
  const legacyCard = {
    due: new Date(5000).toISOString(), stability: 1.2, difficulty: 5,
    elapsed_days: 1, scheduled_days: 1, learning_steps: 0,
    reps: 2, lapses: 0, state: 2, last_review: new Date(4000).toISOString()
  };
  const raw = {
    version: 2,
    lessonEvents: [{ id: 'e1', lessonId: 'a1-s1-l1', step: 'prepare', kind: 'drill', payload: {}, support: {}, submittedAt: 1 }],
    fsrs: { 'a1-s1-l1:c1': legacyCard, 'a1-s1-l1:c2:meaning_recall': legacyCard },
    reviewLog: [{ id: 'l1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 100 }],
    profile: { name: 'x' }
  };
  const db = hydrateDb(raw);
  assert.equal(db.version, DB_VERSION);
  assert.equal(DB_VERSION, 3, 'schema bumped to v3');
  assert.equal(db.fsrs['a1-s1-l1:c1:meaning_recall'].reps, 2, 'legacy card survives on meaning_recall');
  assert.equal(db.fsrs['a1-s1-l1:c1'], undefined, '2-segment key removed from cache');
  assert.equal(db.fsrs['a1-s1-l1:c2:meaning_recall'].reps, 2, 'already-tasked keys pass through');
  assert.equal(db.reviewLog.length, 1, 'durable log untouched by cache migration');
  assert.deepEqual(hydrateDb(db).fsrs, db.fsrs, 'hydrate is idempotent');
  // And nothing about the learner's review history was guessed across skills:
  assert.equal(db.fsrs['a1-s1-l1:c1:listening_recognition'], undefined,
    'no invented cards — other tasks enroll only via real enrol events');
}

// ── 5. Deterministic replay: merge order must not change outcome ──
{
  const deviceA = [
    { id: 'a-en', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', tasks: ['meaning_recall', 'listening_recognition'], at: 100 },
    { id: 'a-r1', kind: 'rate', taskKey: 'a1-s1-l1:c1:meaning_recall', grade: 3, at: 500 },
    { id: 'a-r2', kind: 'rate', taskKey: 'a1-s1-l1:c1:listening_recognition', grade: 2, at: 900 }
  ];
  const deviceB = [
    { id: 'b-r1', kind: 'rate', taskKey: 'a1-s1-l1:c1:meaning_recall', grade: 4, at: 700 },
    { id: 'b-r2', kind: 'rate', taskKey: 'a1-s1-l1:c2:meaning_recall', grade: 1, at: 300 }
  ];
  const ab = rebuildFsrsFromLog([...deviceA, ...deviceB]);
  const ba = rebuildFsrsFromLog([...deviceB, ...deviceA]);
  const shuffled = rebuildFsrsFromLog([deviceB[1], deviceA[2], deviceB[0], deviceA[1], deviceA[0]]);
  assert.deepEqual(ab, ba, 'merge order irrelevant');
  assert.deepEqual(ab, shuffled, 'canonical (at,id) ordering makes any shuffle identical');
  assert(ab['a1-s1-l1:c1:meaning_recall'].reps === 2, 'both devices’ ratings replayed');
  assert.equal(ab['a1-s1-l1:c1:listening_recognition'].reps, 1);
}

// ── 6. Evidence honesty: aided flags and modality boundaries ──
{
  const ev = (over) => ({
    id: over.id || 'e1', lessonId: 'a1-s1-l1', contentVersion: 2, kind: 'listen',
    step: 'listen', submittedAt: 1, payload: { correct: 3, total: 3 }, support: {}, ...over
  });
  const clean = projectLessonEvent(ev({}), lesson);
  assert.equal(clean.aided, false);
  assert.equal(clean.skillTargetId, 'reception.listening');
  assert.equal(clean.outcome, 'success');
  const aided = projectLessonEvent(ev({ id: 'e2', support: { transcriptViewed: true } }), lesson);
  assert.equal(aided.aided, true, 'transcript use = aided listening evidence');
  const modelled = projectLessonEvent(
    ev({ id: 'e3', kind: 'write', step: 'write', payload: { responseText: 'hi', checklist: [true, false] }, support: { modelRevealed: true } }),
    lesson
  );
  assert.equal(modelled.aided, true, 'model reveal = aided production');
  assert.equal(modelled.skillTargetId, 'production.writing');
  assert.equal(modelled.outcome, 'submitted', 'write submits are artifacts, not scores');

  // Counterexample honesty: a perfect quiz NEVER mints production evidence.
  const drill = projectLessonEvent(
    ev({ id: 'e4', kind: 'drill', step: 'prepare', payload: { correct: 5, total: 5 } }),
    lesson
  );
  assert.equal(drill.skillTargetId, 'lexical.form_recognition');
  assert.notEqual(drill.skillTargetId, 'production.speaking', 'recognition ≠ speaking');
  assert.notEqual(drill.skillTargetId, 'production.writing', 'recognition ≠ writing');

  // Review entries project to their task — and only their task.
  const rated = projectReviewEntry({ id: 'r1', kind: 'rate', taskKey: 'a1-s1-l1:c1:listening_recognition', grade: 4, at: 5, response: 'x' });
  assert.equal(rated.taskId, 'a1-s1-l1:c1:listening_recognition');
  assert.equal(rated.skillTargetId, 'reception.listening');
  const legacyRated = projectReviewEntry({ id: 'r2', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 1, at: 5 });
  assert.equal(legacyRated.taskId, 'a1-s1-l1:c1:meaning_recall', 'legacy grade lands on nearest task');
  assert.equal(legacyRated.outcome, 'again');
  assert.equal(projectReviewEntry({ id: 'e', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1 }), null,
    'enroll entries are pool facts, not ability evidence');

  // No pronunciation target exists — transcript matching cannot produce one.
  assert.equal(skillTargetFor('pronunciation'), null);
  const all = projectAll({ lessonEvents: [ev({})], reviewLog: [] }, new Map([[lesson.id, lesson]]));
  assert.equal(all.length, 1);
  assert.equal(all[0].confidence, null, 'no source gives a confidence score yet');
}

// ── 7. LearnerState derivation ──
{
  const db = createInitialDb();
  enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  db.reviewLog.push({ id: 'r1', kind: 'rate', taskKey: 'a1-s1-l1:c1:meaning_recall', grade: 3, at: 2000 });
  rateTask(db, 'a1-s1-l1:c1:meaning_recall', 3, 2000);
  const state = deriveLearnerState(db, [lesson], 3000);
  const task = state.tasks['a1-s1-l1:c1:meaning_recall'];
  assert.equal(task.attempts, 1);
  assert.equal(task.lastGrade, 3);
  assert.equal(task.lastAided, false);
  assert.equal(task.isNew, false, 'a rated card is no longer New');
  const sibling = state.tasks['a1-s1-l1:c1:form_recognition'];
  assert.equal(sibling.attempts, 0, 'sibling has no evidence');
  assert.equal(sibling.isNew, true);
  // Same inputs → identical derived state (rebuildable anywhere).
  assert.deepEqual(deriveLearnerState(db, [lesson], 3000), state, 'derivation is deterministic');
}

// ── 8. Planner: order, determinism, evidence-driven choices ──
{
  const session = createSession({ storage: memoryStorage() });
  const emptyDb = createInitialDb();
  assert.equal(planNext({ db: emptyDb, session, lessons, now: 1 }).kind, 'next');
  assert.equal(planNext({ db: emptyDb, session, lessons, now: 1 }).lessonId, 'a1-s1-l1');

  // Determinism: same inputs → identical action object.
  const a = planNext({ db: emptyDb, session, lessons, now: 1 });
  const b = planNext({ db: emptyDb, session, lessons, now: 1 });
  assert.deepEqual(a, b, 'same state + now → same action');

  // Due retrieval tasks outrank new curriculum.
  const db = createInitialDb();
  enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  const plan = planNext({ db, session, lessons, now: 2000 });
  assert.equal(plan.kind, 'review', 'due tasks beat next lesson');
  assert.equal(plan.dueCount, 4, '2 chunks × 2 staged kinds');
  assert.equal(plan.taskKind, 'form_recognition', 'oldest-due, then task id order');

  // Resume still beats due review — in-flight work is never stranded.
  session.setLast({ lessonId: 'a1-s1-l2', step: 'listen' });
  session.setDraft('a1-s1-l2', { contentVersion: 1, step: 'listen', answers: { listen: { q1: 1 } } });
  const resumed = planNext({ db, session, lessons, now: 2000 });
  assert.equal(resumed.kind, 'resume', 'draft resume outranks due review');
  assert.equal(resumed.lessonId, 'a1-s1-l2');

  // Remediation: a partial quiz with nothing due and no draft → remediate.
  const db2 = createInitialDb();
  appendLessonEvent(db2, {
    lessonId: 'a1-s1-l1', contentVersion: 2, step: 'read', kind: 'read',
    payload: { correct: 2, total: 4 }, support: {}
  }, 5000);
  const freshSession = createSession({ storage: memoryStorage() });
  const remed = planNext({ db: db2, session: freshSession, lessons, now: 6000 });
  assert.equal(remed.kind, 'remediate', 'unresolved weak step → remediation');
  assert.equal(remed.step, 'read');
  // A later full pass retires the weakness.
  appendLessonEvent(db2, {
    lessonId: 'a1-s1-l1', contentVersion: 2, step: 'read', kind: 'read',
    payload: { correct: 4, total: 4 }, support: {}
  }, 7000);
  const after = planNext({ db: db2, session: freshSession, lessons, now: 8000 });
  assert.notEqual(after.kind, 'remediate', 'fixed weakness no longer remediates');
  assert.equal(after.kind, 'finish', 'then the in-progress lesson finishes');

  // Due beats remediation.
  const db3 = createInitialDb();
  appendLessonEvent(db3, {
    lessonId: 'a1-s1-l1', contentVersion: 2, step: 'read', kind: 'read',
    payload: { correct: 1, total: 4 }, support: {}
  }, 5000);
  enrollTasks(db3, lesson, STEP_TASKS.prepare, 1000);
  const dueWins = planNext({ db: db3, session: freshSession, lessons, now: 6000 });
  assert.equal(dueWins.kind, 'review', 'due retrieval outranks remediation');
}

// ── 9. Legacy rate entries and new task entries interleave safely ──
{
  const db = createInitialDb();
  db.reviewLog = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 100 },
    { id: 'old', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3, at: 500 },
    { id: 'new', kind: 'rate', taskKey: 'a1-s1-l1:c1:listening_recognition', grade: 4, at: 600 }
  ];
  db.fsrs = rebuildFsrsFromLog(db.reviewLog);
  assert.equal(db.fsrs['a1-s1-l1:c1:meaning_recall'].reps, 1, 'legacy rate → meaning_recall only');
  assert.equal(db.fsrs['a1-s1-l1:c1:listening_recognition'].reps, 1, 'new task rate → its own card');
  assert.equal(db.fsrs['a1-s1-l1:c1:form_recognition'].reps, 0);
  assert.equal(dueTasks(db, 1000000).length >= 3, true, 'remaining tasks still due');
}

console.log('FlashDay learner model: 9 checks passed');
