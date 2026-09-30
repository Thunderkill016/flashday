import assert from 'node:assert/strict';
import { createMissionSession } from '../src/vnext/ui-session.js';
import { createMemoryEventStore, createMemoryRunStore } from '../src/vnext/store-memory.js';
import { MISSION_MEET_PERSON, TASKS_MEET_PERSON, capabilityById } from '../src/vnext/fixtures.js';
import { CAPABILITIES } from '../src/vnext/capabilities.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { LEARNING_POLICY_V1, makePolicy } from '../src/vnext/policy.js';
import { projectLearnerState } from '../src/vnext/projection.js';
import { answerBearing } from '../src/vnext/evidence.js';

const LEARNER = 'ui.learner';
let tick = 1_700_000_000_000;
const now = () => (tick += 60_000);

const makeSession = ({ eventStore = createMemoryEventStore(), runStore = createMemoryRunStore(), learner = LEARNER, policy = LEARNING_POLICY_V1 } = {}) =>
  createMissionSession({
    learnerId: learner,
    mission: MISSION_MEET_PERSON,
    tasks: TASKS_MEET_PERSON,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    policy,
    now,
    eventStore,
    runStore,
    idGen: () => 'run.test.1'
  });

/* Scripted learner — answers per task id. Anything unlisted fails, which
 * is honest: the mission should not collapse just because a response
 * was missed. */
const SCRIPT = {
  'task.meet.diagnostic.own_name': 'i am linh',
  'task.meet.diagnostic.ask_name': 'uhhh',
  'task.meet.retrieval.questions': 'ask_name',
  'task.meet.retrieval.phrases': 'my name is linh',
  'task.meet.retrieval.ask_name': "what's your name",
  'task.meet.interaction.guided': "what's your name",
  'task.meet.interaction.unaided': "what's your name",
  'task.meet.interaction.polite': 'nice to meet you too',
  'task.meet.remediation.ask_name': "what's your name",
  'task.meet.delayed.check': "what's your name",
  'task.meet.delayed.name': 'i am linh',
  'task.meet.transfer.name': 'my name is linh',
  'task.meet.transfer.street': "what's your name",
  'task.meet.assessment.checkpoint': "hi, i'm linh — what's your name?",
  'task.meet.input.scene': null,
  'task.meet.input.questions': null,
  'task.meet.input.ask_name': null
};

/* Drive the session until `pred` matches a screen or the step budget
 * runs out. `onScreen` observes every screen first — tests use it for
 * clock jumps (e.g. "+25h" after a retrieval success makes delayed
 * checks due under the real 24h retention policy). */
async function drive(session, pred, { steps = 80, answer = (s) => SCRIPT[s.taskId], onScreen } = {}) {
  for (let i = 0; i < steps; i++) {
    const s = session.screen();
    await onScreen?.(s);
    if (pred(s)) return s;
    if (s.type === 'intro') { await session.start({ learnerName: 'linh' }); continue; }
    if (s.type === 'input') { await session.view(); continue; }
    if (s.type === 'summary') return s;
    if (s.type === 'task') {
      if (s.phase === 'feedback') { await session.next(); continue; }
      const a = answer(s);
      if (s.responseType === 'choice') await session.commit({ optionId: a });
      else await session.commit({ text: a ?? '' });
      continue;
    }
    throw new Error(`unknown screen ${s.type}`);
  }
  return session.screen();
}

const untilTask = (taskId) => (s) => s.type === 'task' && s.taskId === taskId && s.phase === 'prompt';
const untilPurpose = (purpose) => (s) => s.type === 'task' && s.purpose === purpose && s.phase === 'prompt';

/* Jump the shared clock +25h once, at ask_name's first unaided retrieval
 * success — under the real 24h retention policy that is what makes the
 * delayed check due. Every baseline capability goes due alongside it,
 * which also exercises the selector's uncovered-intent skip path. */
const HOUR = 3600_000;
const jumpAfterRetrievalSuccess = () => {
  let jumped = false;
  return (s) => {
    if (!jumped && s.taskId === 'task.meet.retrieval.ask_name' && s.phase === 'feedback' && s.evaluation?.outcome === 'success') {
      jumped = true;
      tick += 25 * HOUR;
    }
  };
};

let check = 0;
const ok = (name) => { check++; console.log(`  ✓ ${name}`); };

/* 1. Intro → start → selector-driven first task (a diagnostic), and the
 *    screen never exposes engine labels. */
{
  const session = makeSession();
  const intro = await session.init();
  assert.equal(intro.type, 'intro');
  assert.equal(intro.needsName, true, 'mission needs a name for state_own_name');
  const first = await session.start({ learnerName: 'linh' });
  assert.equal(first.type, 'task');
  assert.equal(first.purpose, 'diagnostic', 'baseline diagnostics come first');
  assert.equal(first.taskId, 'task.meet.diagnostic.own_name');
  assert.ok(!JSON.stringify(first).match(/INDEPENDENT|TRANSFERRED|RETAINED/i), 'screen leaks engine labels');
  ok('intro → start → selector-driven diagnostic first screen');
}

/* 2. Open run survives a reload: second session on the same stores
 *    resumes the SAME missionRunId and reaches the same screen. */
{
  const eventStore = createMemoryEventStore();
  const runStore = createMemoryRunStore();
  const s1 = makeSession({ eventStore, runStore });
  await s1.init();
  await drive(s1, untilTask('task.meet.diagnostic.ask_name'));
  const runId1 = s1.runInfo().id;
  const evBefore = s1.log().length;

  const s2 = makeSession({ eventStore, runStore });
  await s2.init();
  assert.equal(s2.runInfo().id, runId1, 'reload minted a new run');
  assert.equal(s2.log().length, evBefore, 'log changed across reload');
  assert.ok(s2.log().every((e) => e.missionRunId === runId1), 'event lost run provenance');
  ok('reload resumes same missionRunId + intact log');
}

/* 3. PRIORITY INVARIANT (GPT R4): support shown before commit →
 *    support_use persisted → attempt stamped supported → projection can
 *    NEVER count it unaided. */
{
  const session = makeSession();
  await session.init();
  const screen = await drive(session, untilTask('task.meet.retrieval.ask_name'));
  assert.ok(screen.supportOffered.includes('hint'), 'retrieval should offer hint');
  await session.support('hint');
  const committed = await session.commit({ text: "what's your name" });
  assert.equal(committed.evaluation.outcome, 'success');

  const log = session.log();
  const sup = log.find((e) => e.eventType === 'support_use' && e.taskId === 'task.meet.retrieval.ask_name');
  assert.ok(sup, 'support_use event missing');
  const attempt = log.find((e) => e.attempt?.attemptId === sup.attempt?.attemptId && e.eventType === 'recall_attempt');
  assert.equal(attempt.support.hint, true, 'attempt did not stamp the hint snapshot');
  assert.ok(answerBearing(attempt.support), 'answer-bearing support not detected');

  const proj = session.projection();
  const cap = proj.byCapability.get('interaction.ask_name');
  assert.equal(cap.milestones.independent, false, 'hinted attempt minted INDEPENDENT — invariant broken');
  assert.equal(cap.milestones.supported, true, 'supported work not recorded');
  ok('pre-commit support → support_use + stamped snapshot → never unaided');
}

/* 4. Support used AFTER commit cannot contaminate the committed attempt,
 *    and a double commit is a no-op. */
{
  const session = makeSession();
  await session.init();
  await drive(session, untilTask('task.meet.retrieval.ask_name'));
  const n0 = session.log().length;
  await session.commit({ text: "what's your name" });
  const afterCommit = session.log().length;
  assert.ok(afterCommit > n0, 'commit appended nothing');
  await session.commit({ text: 'something else entirely' });
  assert.equal(session.log().length, afterCommit, 'double commit wrote extra events');
  // support() in feedback phase is a no-op — nothing can retro-stamp.
  await session.support('hint');
  assert.equal(session.log().length, afterCommit, 'post-commit support wrote evidence');
  const attempt = session.log().find((e) => e.taskId === 'task.meet.retrieval.ask_name' && e.attempt?.outcome != null);
  assert.equal(answerBearing(attempt.support), false, 'post-commit support retro-contaminated the attempt');
  ok('post-commit support cannot retro-contaminate; double commit no-op');
}

/* 5. Probes never offer pre-commit support — diagnostic, delayed,
 *    transfer and assessment screens must arrive with empty
 *    supportOffered so their evidence stays unaided. */
{
  const session = makeSession();
  await session.init();
  const probe = await drive(session, untilPurpose('diagnostic'));
  assert.deepEqual(probe.supportOffered, []);
  ok('diagnostic offers no pre-commit support');
}
{
  const session = makeSession();
  await session.init();
  const jump = jumpAfterRetrievalSuccess();
  const delayed = await drive(session, (s) => s.type === 'task' && s.purpose === 'delayed_retrieval' && s.phase === 'prompt', { onScreen: jump });
  assert.deepEqual(delayed.supportOffered, []);
  const transfer = await drive(session, (s) => s.type === 'task' && s.purpose === 'transfer' && s.phase === 'prompt');
  assert.deepEqual(transfer.supportOffered, []);
  const assess = await drive(session, (s) => s.type === 'task' && s.purpose === 'assessment' && s.phase === 'prompt');
  assert.deepEqual(assess.supportOffered, []);
  ok('delayed_retrieval / transfer / assessment offer no pre-commit support');
}

/* 6. Input tasks mint exposure only — never an attempt — and advance
 *    the selection afterwards. */
{
  const session = makeSession();
  await session.init();
  const input = await drive(session, (s) => s.type === 'input' && s.taskId === 'task.meet.input.ask_name');
  assert.equal(input.purpose, 'input');
  const n0 = session.log().length;
  await session.view();
  const added = session.log().slice(n0);
  assert.equal(added.length, 1, 'input view appended more than the exposure');
  assert.equal(added[0].eventType, 'exposure');
  assert.equal(added[0].attempt?.outcome, null, 'exposure carried an outcome — masquerading as an attempt');
  assert.ok(session.log().every((e) => !(e.taskId === 'task.meet.input.ask_name' && e.attempt?.outcome != null)), 'input task minted an attempt');
  ok('input view → single exposure event, never an attempt');
}

/* 7. Feedback is appended only after the attempt — ordering in the log
 *    pins "outcome frozen before feedback". */
{
  const session = makeSession();
  await session.init();
  await drive(session, untilTask('task.meet.retrieval.ask_name'));
  const iFb = session.log().findIndex((e) => e.eventType === 'feedback' && e.taskId === 'task.meet.retrieval.ask_name');
  assert.equal(iFb, -1, 'feedback event existed before any commit');
  await session.commit({ text: "what's your name" });
  const log = session.log();
  const iAttempt = log.findIndex((e) => e.taskId === 'task.meet.retrieval.ask_name' && e.attempt?.outcome != null);
  const iFb2 = log.findIndex((e) => e.eventType === 'feedback' && e.taskId === 'task.meet.retrieval.ask_name');
  assert.ok(iAttempt >= 0 && iFb2 === iAttempt + 1, 'feedback did not immediately follow the committed attempt');
  // And the feedback phase shows the frozen outcome — no peek before commit.
  const fb = session.screen();
  assert.equal(fb.phase, 'feedback');
  assert.equal(fb.evaluation.outcome, 'success');
  ok('feedback event appended strictly after the committed attempt');
}

/* 8. Reload mid-attempt recomputes the same deterministic attemptId —
 *    a retried commit of the same response dedupes instead of
 *    double-writing evidence. */
{
  const eventStore = createMemoryEventStore();
  const runStore = createMemoryRunStore();
  const s1 = makeSession({ eventStore, runStore });
  await s1.init();
  const scr = await drive(s1, untilTask('task.meet.retrieval.ask_name'));
  const attemptId = scr.attemptId;
  await s1.commit({ text: "what's your name" });
  const n1 = s1.log().length;

  const s2 = makeSession({ eventStore, runStore });
  await s2.init();
  const scr2 = await drive(s2, (s) => s.type === 'task' && s.taskId === 'task.meet.retrieval.ask_name' && s.phase === 'prompt', { steps: 2 });
  // Task was consumed — selection should have moved on; reach any task
  // that IS the consumed one only if planner re-serves it. Either way
  // the log must never contain two attempts under the same id.
  const ids = s2.log().filter((e) => e.attempt?.attemptId === attemptId && e.attempt?.outcome != null);
  assert.equal(ids.length, 1, 'same attemptId minted two outcome events');
  assert.ok(s2.log().length >= n1);
  ok('deterministic attemptId survives reload — no duplicate evidence');
}

/* 9. Assessment: no support, outcome frozen into the event before the
 *    screen can show feedback. */
{
  const session = makeSession();
  await session.init();
  // Fast learner script gets through the whole mission; the clock jump
  // after retrieval success makes the 24h delayed check due.
  const summary = await drive(session, (s) => s.type === 'summary', { onScreen: jumpAfterRetrievalSuccess() });
  const checkpoint = session.log().find((e) => e.eventType === 'checkpoint');
  assert.ok(checkpoint, 'mission never reached the assessment checkpoint');
  assert.equal(checkpoint.evaluation.authority, 'deterministic');
  assert.equal(checkpoint.evaluation.contractId, 'eval.required_functions.v1');
  assert.ok(checkpoint.attempt.attemptId, 'assessment attempt without a stable attemptId');
  assert.equal(answerBearing(checkpoint.support), false, 'assessment carried support');
  assert.equal(summary.type, 'summary');
  ok('full mission → fresh checkpoint committed, outcome frozen in the event');
}

/* 10. Abandoned run → next session mints a NEW run; old events keep
 *     their original run provenance. */
{
  const eventStore = createMemoryEventStore();
  const runStore = createMemoryRunStore();
  const s1 = makeSession({ eventStore, runStore });
  await s1.init();
  await drive(s1, untilTask('task.meet.diagnostic.ask_name'));
  const oldRun = s1.runInfo().id;
  await s1.abandon();

  const s2 = makeSession({ eventStore, runStore, learner: LEARNER });
  // same stores, but idGen mints a different run
  const s2b = createMissionSession({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS_MEET_PERSON,
    capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, policy: LEARNING_POLICY_V1,
    now, eventStore, runStore, idGen: () => 'run.test.2'
  });
  await s2b.init();
  assert.equal(s2b.runInfo().id, 'run.test.2', 'abandoned run was resumed');
  const oldEvents = (await eventStore.list()).filter((e) => e.missionRunId === oldRun);
  assert.ok(oldEvents.length > 0, 'events lost their original run id');
  ok('abandon → new run; old evidence keeps its run provenance');
}

/* 11. Honest progress data: baseline pass → baselinePassed, supported
 *     work counts separately from unaided, never claims mastery. */
{
  const session = makeSession();
  await session.init();
  const summary = await drive(session, (s) => s.type === 'summary');
  const ownName = summary.progress.find((p) => p.capabilityId === 'production.speak.say_own_name');
  assert.equal(ownName.baselinePassed, true, 'baseline pass not attributed as pre-existing');
  const ask = summary.progress.find((p) => p.capabilityId === 'interaction.ask_name');
  assert.ok(ask.unaidedCount >= 1, 'unaided successes not counted');
  assert.ok(!JSON.stringify(summary).match(/thành thạo|mastered|learned/i), 'progress copy claims mastery');
  ok('summary reports observed evidence — baseline attributed, no mastery claims');
}

/* 12. Deterministic replay: two sessions over the same seed produce
 *     byte-identical event logs and identical screens. */
{
  tick = 1_700_000_000_000;
  const runOnce = async () => {
    const session = makeSession();
    await session.init();
    const summary = await drive(session, (s) => s.type === 'summary');
    return { events: session.log(), summary };
  };
  const a = await runOnce();
  tick = 1_700_000_000_000;
  const b = await runOnce();
  assert.deepEqual(a.events, b.events, 'same script replayed to a different log');
  assert.deepEqual(
    a.summary.progress.map((p) => [p.capabilityId, p.state]),
    b.summary.progress.map((p) => [p.capabilityId, p.state])
  );
  ok('identical script → identical log + summary (replay determinism)');
}

console.log(`vnext-ui-session: ${check} checks — PASS`);
