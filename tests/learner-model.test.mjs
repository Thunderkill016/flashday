/*
 * A1-ARCH-001 regression suite: the evidence-driven learner model.
 * Covers the issue's required categories — separate memory states, canonical
 * legacy migration, revision-safe identity, deterministic replay,
 * aided-vs-unaided honesty, modality honesty, planner determinism, bounded
 * review queues, and the content adapter over all 30 lessons.
 */
import assert from 'node:assert/strict';
import {
  adaptCourse,
  adaptLesson,
  canDoIdFor,
  componentId,
  contentRev,
  normalizeTaskKey,
  parseTaskKey,
  unambiguousRev,
  revisionCount,
  skillTargetFor,
  taskKey,
  STEP_TASKS,
  TASK_KINDS
} from '../src/core/domain.js';
import { CHUNK_REVISION_HISTORY } from '../src/content/revisions.js';
import { projectLessonEvent, projectReviewEntry, projectAll } from '../src/core/evidence-projection.js';
import { deriveLearnerState } from '../src/core/learner-state.js';
import { planNext } from '../src/core/planner.js';
import {
  enrollTasks,
  rebuildFsrsFromLog,
  dueTasks,
  rateTask,
  reviewQueue,
  NEW_TASK_BUDGET
} from '../src/core/scheduler.js';
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

const tk = (chunkId, kind, l = lesson) => {
  const chunk = l.chunks.find((c) => c.id === chunkId);
  return taskKey(l.id, chunkId, kind, contentRev(chunk));
};

// ── 1. Content adapter: all 30 lessons adapt; malformed input fails loudly ──
{
  const adapted = adaptCourse(LESSONS);
  assert.equal(adapted.goals.length, 30);
  const live = [...adapted.components.values()].filter((c) => c.chunk !== null && !c.superseded && !c.ambiguous);
  const retired = [...adapted.components.values()].filter((c) => c.superseded);
  const ambiguousSlots = [...adapted.components.values()].filter((c) => c.ambiguous);
  assert(live.length >= 30 * 6, 'every chunk becomes a component');
  assert.equal(adapted.tasks.size, live.length * TASK_KINDS.length, 'one task per live component per kind');
  assert(retired.length > 0, 'ledger keeps superseded revisions resolvable (s1-l1 c7/c8 changed)');
  assert(retired.every((c) => c.chunk === null), 'superseded components carry no renderable text');
  assert(ambiguousSlots.length > 0, 'multi-revision slots register an ambiguous component (no tasks)');
  assert(ambiguousSlots.every((c) => c.id.split(':').length === 2 && c.chunk === null && !c.superseded),
    'ambiguous slot components are bare l:c ids, not schedulable phrases');
  for (const task of adapted.tasks.values()) {
    assert(TASK_KINDS.includes(task.taskKind));
    assert(skillTargetFor(task.taskKind), `task ${task.id} resolves a skill target`);
    assert(task.canDoId.startsWith('a1.cando.'));
    assert(task.id.includes('@'), 'task id carries the component revision');
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

// ── 2. Task identity: revision-aware; ambiguous legacy records PARK ──
{
  // The a1-s1-l1:c7 rewrite is the canonical counterexample: "How are you?"
  // and "My name is …" shared chunk id c7. The ledger records both phrases.
  const c7segs = CHUNK_REVISION_HISTORY['a1-s1-l1'].c7;
  assert.equal(c7segs.length, 2, 'c7 has two recorded revisions');
  const [oldRev, newRev] = [c7segs[0].rev, c7segs[1].rev];
  assert.notEqual(oldRev, newRev, 'text change produced a new revision');
  assert.equal(revisionCount('a1-s1-l1', 'c7'), 2);
  assert.equal(unambiguousRev('a1-s1-l1', 'c7'), null, 'multi-rev slot: no honest rev for a rev-less record');

  // Honest rule: a rev-less legacy key on a multi-revision slot cannot be
  // attributed to either phrase — it PARKS as `l:c:kind` (kept, never
  // presented), instead of guessing via commit timestamps.
  const parked = normalizeTaskKey('a1-s1-l1:c7');
  assert.equal(parked, 'a1-s1-l1:c7:meaning_recall', 'ambiguous legacy key parks rev-less');
  assert.equal(normalizeTaskKey('a1-s1-l1:c7'), parked, 'deterministic — no timestamp, ever');

  // Explicit rev-bearing keys carry the phrase identity in-band — they
  // resolve verbatim and stay distinct for the two different phrases.
  const oldKey = `a1-s1-l1:c7@${oldRev}:meaning_recall`;
  const newKey = `a1-s1-l1:c7@${newRev}:meaning_recall`;
  assert.notEqual(oldKey, newKey, 'old memory can never ride the new phrase');
  assert.equal(normalizeTaskKey(oldKey), oldKey, 'rev-bearing keys pass through verbatim');

  // Unchanged chunks have a single-revision ledger → rev-less resolves
  // unambiguously (only one phrase ever lived at that slot).
  assert.equal(revisionCount('a1-s1-l1', 'c1'), 1);
  const c1rev = unambiguousRev('a1-s1-l1', 'c1');
  assert(c1rev, 'single-rev chunk resolves');
  assert.equal(normalizeTaskKey('a1-s1-l1:c1'), `a1-s1-l1:c1@${c1rev}:meaning_recall`);
  const revless = normalizeTaskKey('a1-s1-l1:c1:listening_recognition');
  assert.equal(revless, `a1-s1-l1:c1@${c1rev}:listening_recognition`);
  assert.equal(normalizeTaskKey('junk'), null);
  assert.equal(normalizeTaskKey(''), null);
  // Unmanifested lessons keep the rev-less parked form — no ledger to
  // prove identity with.
  assert.equal(normalizeTaskKey('fake-l:c1'), 'fake-l:c1:meaning_recall');

  const parsed = parseTaskKey(taskKey('a1-s1-l2', 'c2', 'cued_production', contentRev({ target: 'x', meaning: 'y' })));
  assert.deepEqual(
    { lessonId: parsed.lessonId, chunkId: parsed.chunkId, taskKind: parsed.taskKind },
    { lessonId: 'a1-s1-l2', chunkId: 'c2', taskKind: 'cued_production' }
  );
  assert.equal(parsed.rev, contentRev({ target: 'x', meaning: 'y' }));
  assert.equal(parsed.componentId, componentId('a1-s1-l2', 'c2', contentRev({ target: 'x', meaning: 'y' })));
}

// ── 3. Separate memory states: rating one task leaves siblings untouched ──
{
  const db = createInitialDb();
  enrollTasks(db, lesson, TASK_KINDS, 1000);
  const before = JSON.parse(JSON.stringify(db.fsrs));
  rateTask(db, tk('c1', 'meaning_recall'), 4, 2000); // Easy
  for (const kind of TASK_KINDS) {
    const key = tk('c1', kind);
    if (kind === 'meaning_recall') {
      assert.notDeepEqual(db.fsrs[key], before[key], 'rated task advanced');
    } else {
      assert.deepEqual(db.fsrs[key], before[key], `${kind} untouched by meaning_recall rating`);
    }
  }
  // Rebuild must reproduce the same separation.
  db.reviewLog.push({ id: 'r1', kind: 'rate', taskKey: tk('c1', 'meaning_recall'), grade: 4, at: 2000 });
  assert.deepEqual(rebuildFsrsFromLog(db.reviewLog), db.fsrs, 'replay preserves per-task state');
}

// ── 4. Canonical migration: local hydrate ≡ cloud replay, byte-equivalent ──
{
  // A v2-era dataset: two-segment cache keys + the matching durable log.
  // (Consistent inputs — the v2 cache was built by replaying this same log.)
  const legacyLog = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1000 },
    { id: 'r1', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3, at: 2000 },
    { id: 'r2', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 4, at: 90000 },
    { id: 'e2', kind: 'enroll', chunkKey: 'a1-s1-l1:c2', at: 1100 },
    { id: 'r3', kind: 'rate', chunkKey: 'a1-s1-l1:c2', grade: 2, at: 3000 }
  ];
  const canonical = rebuildFsrsFromLog(legacyLog);
  // The v2 cache held the same cards under 2-segment keys.
  const v2Cache = {};
  for (const [key, card] of Object.entries(canonical)) {
    const bare = key.split('@')[0]; // l:c
    v2Cache[bare] = card;
  }
  const raw = {
    version: 2,
    lessonEvents: [{ id: 'e1', lessonId: 'a1-s1-l1', step: 'prepare', kind: 'drill', payload: {}, support: {}, submittedAt: 1 }],
    fsrs: v2Cache,
    reviewLog: legacyLog,
    profile: {}
  };
  const local = hydrateDb(raw).fsrs;
  const cloud = canonical; // cloud hydrate rebuilds from the merged log
  assert.deepEqual(
    Object.keys(local).sort(),
    Object.keys(cloud).sort(),
    'local hydrate and cloud replay produce identical task keys'
  );
  assert.deepEqual(local, cloud, 'identical cards — byte-equivalent task state');
  assert(local['a1-s1-l1:c1:meaning_recall'] === undefined || Object.keys(local).every((k) => k.includes('@')),
    'every task key carries its content revision');
  assert.equal(
    Object.keys(local).filter((k) => k.startsWith('a1-s1-l1:c1@')).length, 1,
    'legacy enroll → meaning_recall only — no invented sibling cards'
  );
  assert(local[Object.keys(local).find((k) => k.startsWith('a1-s1-l1:c1@'))].reps === 2,
    'legacy review history preserved');
  // Idempotent: hydrating twice changes nothing.
  assert.deepEqual(hydrateDb(hydrateDb(raw)).fsrs, local, 'hydrate is idempotent');
  // db.fsrs is a PURE derived cache: a stale cache key the log never
  // recorded must not leak into state — machine A (stale cache) and
  // machine B (no cache) hydrate the same log to the same state.
  const stale = { ...raw, fsrs: { ...v2Cache, 'a1-s1-l2:c1': v2Cache['a1-s1-l1:c1'] } };
  const staleHydrated = hydrateDb(stale).fsrs;
  assert.deepEqual(staleHydrated, local,
    'stale cache changes nothing — the log alone determines state');
  const emptyCache = hydrateDb({ ...raw, fsrs: {} }).fsrs;
  assert.deepEqual(emptyCache, local, 'no cache at all produces the same state');
}

// ── 5. Deterministic replay: merge order must not change outcome ──
{
  const deviceA = [
    { id: 'a-en', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', tasks: [tk('c1', 'meaning_recall'), tk('c1', 'listening_recognition')], at: 100 },
    { id: 'a-r1', kind: 'rate', taskKey: tk('c1', 'meaning_recall'), grade: 3, at: 500 },
    { id: 'a-r2', kind: 'rate', taskKey: tk('c1', 'listening_recognition'), grade: 2, at: 900 }
  ];
  const deviceB = [
    { id: 'b-r1', kind: 'rate', taskKey: tk('c1', 'meaning_recall'), grade: 4, at: 700 },
    { id: 'b-r2', kind: 'rate', taskKey: tk('c2', 'meaning_recall'), grade: 1, at: 300 }
  ];
  const ab = rebuildFsrsFromLog([...deviceA, ...deviceB]);
  const ba = rebuildFsrsFromLog([...deviceB, ...deviceA]);
  const shuffled = rebuildFsrsFromLog([deviceB[1], deviceA[2], deviceB[0], deviceA[1], deviceA[0]]);
  assert.deepEqual(ab, ba, 'merge order irrelevant');
  assert.deepEqual(ab, shuffled, 'canonical (at,id) ordering makes any shuffle identical');
  assert(ab[tk('c1', 'meaning_recall')].reps === 2, 'both devices’ ratings replayed');
  assert.equal(ab[tk('c1', 'listening_recognition')].reps, 1);
}

// ── 6. Evidence honesty: aided flags, modality boundaries, component ids ──
{
  const ev = (over) => ({
    id: over.id || 'e1', lessonId: 'a1-s1-l1', contentVersion: 2, kind: 'listen',
    step: 'listen', submittedAt: 1790530000000, payload: { correct: 3, total: 3 }, support: {}, ...over
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

  // componentIds are real KnowledgeComponent ids — resolvable in the domain
  // registry. Events stamped for an OLDER contentVersion go through the
  // ledger: single-revision chunks emit their rev'd id; multi-revision
  // chunks emit the bare slot id (the event cannot prove which phrase was
  // on screen) — it resolves to the registry's ambiguous slot. Events
  // stamped for the CURRENT version provably saw the live text → live rev.
  const registry = adaptCourse(LESSONS).components;
  const realLesson = LESSONS.find((l) => l.id === 'a1-s1-l1');
  for (const evId of ['e1', 'e2']) {
    const projected = projectLessonEvent(ev({ id: evId }), realLesson);
    for (const id of projected.componentIds) {
      assert(registry.has(id), `componentId ${id} resolves in adaptCourse registry`);
    }
  }
  // s1-l5:c1 is multi-revision — an event stamped for a DIFFERENT content
  // version cannot prove which phrase it saw → bare slot `l:c`.
  const s1l5 = LESSONS.find((l) => l.id === 'a1-s1-l5');
  const oldVersion = projectLessonEvent(
    ev({ id: 'ec7', lessonId: 'a1-s1-l5', contentVersion: s1l5.contentVersion + 1 }),
    s1l5
  ).componentIds.find((id) => id === 'a1-s1-l5:c1');
  assert.equal(oldVersion, 'a1-s1-l5:c1', 'stale-version event on multi-rev slot projects the ambiguous bare id');
  assert.equal(registry.get(oldVersion)?.ambiguous, true,
    'bare slot id resolves to the ambiguous component — honest, never guessed');
  // Same slot, CURRENT-version event: the learner provably saw the live
  // text — attribute to the live revision, not the ambiguous slot.
  const currentRef = projectLessonEvent(
    ev({ id: 'ec8', lessonId: 'a1-s1-l5', contentVersion: s1l5.contentVersion }),
    s1l5
  ).componentIds.find((id) => id.startsWith('a1-s1-l5:c1'));
  assert(currentRef?.startsWith('a1-s1-l5:c1@'), 'current-version event attributes to the live rev');
  assert.equal(registry.get(currentRef)?.ambiguous, false, 'live rev component is not ambiguous');

  // Counterexample honesty: a perfect quiz NEVER mints production evidence.
  const drill = projectLessonEvent(
    ev({ id: 'e4', kind: 'drill', step: 'prepare', payload: { correct: 5, total: 5 } }),
    lesson
  );
  assert.equal(drill.skillTargetId, 'lexical.form_recognition');
  assert.notEqual(drill.skillTargetId, 'production.speaking', 'recognition ≠ speaking');
  assert.notEqual(drill.skillTargetId, 'production.writing', 'recognition ≠ writing');

  // Review entries project to their task — and only their task — with
  // provenance split into OBSERVED attempt vs SELF-REPORTED grade.
  const rated = projectReviewEntry({
    id: 'r1', kind: 'rate', taskKey: tk('c1', 'listening_recognition'),
    grade: 4, at: 5, attempt: 'nghĩa là …', attempted: true,
    attemptScore: 0.4, revealed: true, aided: false
  });
  assert.equal(rated.taskId, tk('c1', 'listening_recognition'));
  assert.equal(rated.skillTargetId, 'reception.listening');
  assert.equal(rated.aided, false, 'observable pre-reveal attempt = unaided retrieval');
  assert.equal(rated.componentIds.length, 1);
  assert(registry.has(rated.componentIds[0]) ||
    rated.componentIds[0] === `a1-s1-l1:c1@${contentRev(lesson.chunks[0])}`,
    'review componentId is the domain component id');

  // THE COUNTEREXAMPLE: wrong attempt → reveal → self-grade Easy must
  // record BOTH facts honestly — observed weak attempt AND self-claimed
  // easy — never laundered into unaided success.
  const inflated = projectReviewEntry({
    id: 'r1b', kind: 'rate', taskKey: tk('c1', 'meaning_recall'),
    grade: 4, at: 7, attempt: 'wrong words here', attempted: true,
    attemptScore: 0.2, revealed: true, aided: false
  });
  assert.equal(inflated.attempted, true);
  assert.equal(inflated.attemptScore, 0.2, 'observed attempt quality stays on record');
  assert.equal(inflated.outcome, 'easy', 'the self-grade is recorded as given');
  assert.equal(inflated.selfReported, true, 'the grade is self-report, not observed ability');
  assert.equal(inflated.aided, false, 'aided only answers "was an attempt observed"');

  // Self-report: graded with no frozen attempt after the answer was shown.
  const selfReport = projectReviewEntry({
    id: 'r2', kind: 'rate', taskKey: tk('c1', 'meaning_recall'),
    grade: 3, at: 6, attempt: '', attempted: false, attemptScore: null, revealed: true, aided: true
  });
  assert.equal(selfReport.aided, true, 'no observable attempt + revealed answer = aided');
  assert.equal(selfReport.selfReported, true);

  // Records too old to carry provenance → null, never a guessed false.
  const ancient = projectReviewEntry({ id: 'r3', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 1, at: 5 });
  assert.equal(ancient.aided, null, 'absent provenance is unknown, not false');
  assert.equal(ancient.attempted, null);
  assert.equal(ancient.taskId, normalizeTaskKey('a1-s1-l1:c1'), 'legacy grade lands on nearest task');
  assert.equal(ancient.outcome, 'again');
  assert.equal(projectReviewEntry({ id: 'e', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1 }), null,
    'enroll entries are pool facts, not ability evidence');

  // No pronunciation target exists — transcript matching cannot produce one.
  assert.equal(skillTargetFor('pronunciation'), null);
  const all = projectAll({ lessonEvents: [ev({})], reviewLog: [] }, new Map([[lesson.id, lesson]]));
  assert.equal(all.length, 1);
  assert.equal(all[0].confidence, null, 'no source gives a confidence score yet');
}

// ── 7. LearnerState derivation + superseded revisions ──
{
  const db = createInitialDb();
  enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  db.reviewLog.push({ id: 'r1', kind: 'rate', taskKey: tk('c1', 'meaning_recall'), grade: 3, at: 2000, attempted: true, revealed: true, aided: false });
  rateTask(db, tk('c1', 'meaning_recall'), 3, 2000);
  const state = deriveLearnerState(db, [lesson], 3000);
  const task = state.tasks[tk('c1', 'meaning_recall')];
  assert.equal(task.attempts, 1);
  assert.equal(task.lastGrade, 3);
  assert.equal(task.lastAided, false);
  assert.equal(task.isNew, false, 'a rated card is no longer New');
  const sibling = state.tasks[tk('c1', 'form_recognition')];
  assert.equal(sibling.attempts, 0, 'sibling has no evidence');
  assert.equal(sibling.isNew, true);
  // Same inputs → identical derived state (rebuildable anywhere).
  assert.deepEqual(deriveLearnerState(db, [lesson], 3000), state, 'derivation is deterministic');

  // A card on the OLD revision of a rewritten chunk is superseded — kept in
  // state, never presented, never counted as current-task progress.
  const legacyState = createInitialDb();
  const oldRev = CHUNK_REVISION_HISTORY['a1-s1-l1'].c7[0].rev; // the retired phrase
  const oldTaskId = `a1-s1-l1:c7@${oldRev}:meaning_recall`;
  const staleCard = {
    due: new Date(1).toISOString(), stability: 5, difficulty: 5,
    elapsed_days: 1, scheduled_days: 10, learning_steps: 0,
    reps: 3, lapses: 0, state: 2, last_review: new Date(1790510000000).toISOString()
  };
  legacyState.fsrs[oldTaskId] = staleCard;
  // …and a rev-less legacy card on the same multi-revision slot: parked.
  const parkedId = 'a1-s1-l1:c7:meaning_recall';
  legacyState.fsrs[parkedId] = { ...staleCard };
  const derived = deriveLearnerState(legacyState, LESSONS, Date.now());
  assert.equal(derived.tasks[oldTaskId].superseded, true,
    'old-revision card is superseded — the phrase it learned was edited');
  assert.equal(derived.tasks[parkedId].ambiguous, true,
    'rev-less record on a multi-revision slot is ambiguous — parked, not guessed');
  const queue = reviewQueue(legacyState, LESSONS, Date.now());
  assert.equal(queue.due.length + queue.fresh.length, 0,
    'superseded and ambiguous work is never presented');
  assert.equal(queue.orphaned, 2, 'both are counted, not deleted');
}

// ── 8. Planner: order, determinism, new cards never hijack the loop ──
{
  const session = createSession({ storage: memoryStorage() });
  const emptyDb = createInitialDb();
  assert.equal(planNext({ db: emptyDb, session, lessons, now: 1 }).kind, 'next');
  assert.equal(planNext({ db: emptyDb, session, lessons, now: 1 }).lessonId, 'a1-s1-l1');

  // Determinism: same inputs → identical action object.
  const a = planNext({ db: emptyDb, session, lessons, now: 1 });
  const b = planNext({ db: emptyDb, session, lessons, now: 1 });
  assert.deepEqual(a, b, 'same state + now → same action');

  // THE REGRESSION: freshly enrolled New cards are introductions, not due
  // work — a submitted prepare step must NOT trap the learner in review.
  const db = createInitialDb();
  enrollTasks(db, lesson, STEP_TASKS.prepare, 1000);
  const plan = planNext({ db, session, lessons, now: 2000 });
  assert.equal(plan.kind, 'next', 'New cards never block curriculum');
  assert.equal(plan.lessonId, 'a1-s1-l1');

  // SCHEDULED (previously exercised) due tasks DO outrank new curriculum.
  rateTask(db, tk('c1', 'meaning_recall'), 1, 2000); // Again → due soon
  const dueFirst = planNext({ db, session, lessons, now: 2000 + 20 * 60 * 1000 });
  assert.equal(dueFirst.kind, 'review', 'scheduled-due tasks beat next lesson');
  assert.equal(dueFirst.reason, 'due-tasks');
  assert.equal(dueFirst.taskKind, 'meaning_recall');

  // Resume still beats due review — in-flight work is never stranded.
  session.setLast({ lessonId: 'a1-s1-l2', step: 'listen' });
  session.setDraft('a1-s1-l2', { contentVersion: 1, step: 'listen', answers: { listen: { q1: 1 } } });
  const resumed = planNext({ db, session, lessons, now: 2000 + 20 * 60 * 1000 });
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
  rateTask(db3, tk('c1', 'meaning_recall'), 1, 2000);
  const dueWins = planNext({ db: db3, session: freshSession, lessons, now: 2000 + 20 * 60 * 1000 });
  assert.equal(dueWins.kind, 'review', 'due retrieval outranks remediation');

  // Tail fallback: curriculum exhausted + only new tasks → introduce them.
  const db4 = createInitialDb();
  for (const l of lessons) {
    appendLessonEvent(db4, {
      lessonId: l.id, contentVersion: 1, step: 'prepare', kind: 'drill',
      payload: { correct: 4, total: 4 }, support: {}
    }, 5000);
  }
  // every step attempted → nothing next/finish; but new cards exist
  for (const l of lessons) {
    for (const step of ['read', 'listen', 'write', 'speak']) {
      appendLessonEvent(db4, {
        lessonId: l.id, contentVersion: 1, step, kind: step === 'prepare' ? 'drill' : step,
        payload: { correct: 4, total: 4 }, support: {}
      }, 6000);
    }
  }
  enrollTasks(db4, lesson, STEP_TASKS.prepare, 1000);
  const tail = planNext({ db: db4, session: freshSession, lessons, now: 9000 });
  assert.equal(tail.kind, 'review', 'curriculum done → new-task introduction');
  assert.equal(tail.reason, 'new-tasks');
}

// ── 9. Legacy and new entries interleave; queue stays bounded ──
{
  const db = createInitialDb();
  db.reviewLog = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1', at: 1790510000000 },
    { id: 'old', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3, at: 1790510000000 + 500 },
    { id: 'new', kind: 'rate', taskKey: tk('c1', 'listening_recognition'), grade: 4, at: 1790530000000 }
  ];
  db.fsrs = rebuildFsrsFromLog(db.reviewLog);
  const legacyTask = normalizeTaskKey('a1-s1-l1:c1');
  assert.equal(db.fsrs[legacyTask].reps, 1, 'legacy rate → meaning_recall only');
  assert.equal(db.fsrs[tk('c1', 'listening_recognition')].reps, 1, 'new task rate → its own card');
  assert.equal(db.fsrs[tk('c1', 'form_recognition')]?.reps ?? 0, 0, 'unexercised kinds have no card');

  // Bounded queue: a whole lesson's staged tasks never flood one session.
  const big = createInitialDb();
  enrollTasks(big, lesson, TASK_KINDS, 1000); // 2 chunks × 4 kinds = 8 new
  const q = reviewQueue(big, lessons, 2000);
  assert(q.fresh.length <= NEW_TASK_BUDGET, 'fresh introductions are capped');
  const perComponent = new Set(q.fresh.map((f) => f.resolved.componentKey));
  assert.equal(perComponent.size, q.fresh.length, 'sibling bury: ≤1 new task per component per session');
  assert.equal(q.due.length, 0, 'nothing scheduled-due yet');
  assert.equal(q.freshPending, 8);
  assert(q.fresh.every((f) => f.parsed.taskKind === 'form_recognition'),
    'recognition ability introduced before recall/production');
}

// ── 10. Rebuild is deterministic even for corrupt timestamps ──
{
  // A record with a missing/garbage `at` must replay identically every
  // run — never at wall-clock "now".
  const corrupt = [
    { id: 'e1', kind: 'enroll', chunkKey: 'a1-s1-l1:c1' },
    { id: 'r1', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 3 },
    { id: 'r2', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 4, at: 'garbage' }
  ];
  const first = rebuildFsrsFromLog(corrupt);
  const second = rebuildFsrsFromLog(corrupt);
  assert.deepEqual(first, second, 'same input → same state on every run');
  const key = Object.keys(first)[0];
  assert.equal(first[key].reps, 2);
  assert(Number.isFinite(new Date(first[key].due).getTime()), 'card parses');
  assert(new Date(first[key].due).getTime() < Date.now(),
    'corrupt timestamp → epoch-anchored schedule, not wall clock');
  // And sort order: epoch-0 entries sort first, ties break by id.
  const mixed = [
    { id: 'late', kind: 'rate', chunkKey: 'a1-s1-l1:c1', grade: 2, at: 5000 },
    { id: 'early-noat', kind: 'enroll', chunkKey: 'a1-s1-l1:c1' }
  ];
  assert.deepEqual(rebuildFsrsFromLog(mixed), rebuildFsrsFromLog([...mixed].reverse()),
    'order in the array never matters');
}

console.log('FlashDay learner model: 10 checks passed');
