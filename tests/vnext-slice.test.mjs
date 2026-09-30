/*
 * vNext headless vertical slice (issue #47): mission "meet a new
 * person", target capability interact.ask_name.
 *
 * A synthetic learner is driven end-to-end by the mission runner —
 * nextMissionTask picks concrete registered tasks, bindAttempt/
 * bindObservation mint real events, projectLearnerState derives state.
 * Nothing mutates learner state directly; nothing is fake-bound.
 *
 *   baseline fail → input → retrieval → supported interaction
 *   → feedback → retry → INDEPENDENT → 24h delayed → RETAINED
 *   → changed-context transfer → TRANSFERRED → fresh assessment
 *
 * Wall-clock time is never used — every timestamp is explicit.
 */
import assert from 'node:assert/strict';
import { CAPABILITIES, capabilityById } from '../src/vnext/capabilities.js';
import { projectLearnerState, RETENTION_DELAY_MS } from '../src/vnext/projection.js';
import { bindAttempt, bindObservation } from '../src/vnext/bind.js';
import { makeEvent } from '../src/vnext/evidence.js';
import { nextMissionTask, runMissionTrace } from '../src/vnext/mission-runner.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { MISSION_MEET_PERSON, TASKS_MEET_PERSON } from '../src/vnext/fixtures.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const LEARNER = 'learner.slice';
const TASKS = TASKS_MEET_PERSON;
const taskById = (id) => TASKS.find((t) => t.id === id);

const stateOf = (log, capId) =>
  projectLearnerState(LEARNER, log, CAPABILITIES, TASKS).byCapability.get(capId);

let seq = 0;
const nextId = () => `slice.${++seq}`;

/* Scripted learner: understands greetings, identity questions and can
 * say her own name (baseline passes — skipping teaching for them is
 * itself an asserted behavior) but cannot yet ASK the question. Each
 * entry is a QUEUE of acts for one task id; every selector visit pops
 * the next act. This is how "feedback then retry" becomes two distinct
 * steps on the same remediation task. */
const SCRIPT = {
  'task.meet.diagnostic.opening': [[{ attempt: { observed: true, outcome: 'success', response: 'Hello!', latencyMs: 900, attemptId: 'd.greet' } }]],
  'task.meet.diagnostic.listen': [[{ attempt: { observed: true, outcome: 'success', response: 'greeting', latencyMs: 800, attemptId: 'd.listen' } }]],
  'task.meet.diagnostic.identity_q': [[{ attempt: { observed: true, outcome: 'success', response: 'name question', latencyMs: 1100, attemptId: 'd.iq' } }]],
  'task.meet.diagnostic.own_name': [[{ attempt: { observed: true, outcome: 'success', response: "I'm Linh", latencyMs: 1300, attemptId: 'd.name' } }]],
  'task.meet.diagnostic.ask_name': [[{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 5000, attemptId: 'd.ask' } }]],
  // Support-capability baselines — the learner already has both, so no
  // teaching should ever be routed to them (pre-existing, not learned).
  'task.meet.diagnostic.repair': [[{ attempt: { observed: true, outcome: 'success', response: 'Sorry?', latencyMs: 800, attemptId: 'd.rep' } }]],
  'task.meet.diagnostic.polite': [[{ attempt: { observed: true, outcome: 'success', response: 'Nice to meet you too', latencyMs: 800, attemptId: 'd.pol' } }]],
  'task.meet.input.ask_name': [[{ observe: 'exposure' }]],
  // Retrieval succeeds but only with a hint — supported, not independent.
  'task.meet.retrieval.ask_name': [[{
    attempt: { observed: true, outcome: 'success', response: "What's … name?", latencyMs: 2400, attemptId: 'r.ask' },
    support: { hint: true }
  }]],
  // Guided interaction: model answer revealed AND production imperfect.
  'task.meet.interaction.guided': [[{
    attempt: { observed: true, outcome: 'partial', response: 'What your name?', latencyMs: 3200, attemptId: 'g.ask' },
    support: { modelAnswer: true }
  }]],
  'task.meet.remediation.ask_name': [
    [{ observe: 'feedback', attempt: { attemptId: 'g.ask' }, feedback: { given: true, target: 'question word order' } }],
    [{ eventType: 'retry', attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 1100, attemptId: 'rem.ask' } }]
  ],
  'task.meet.delayed.check': [[{ attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 1400, attemptId: 'dr.ask' } }]],
  'task.meet.transfer.street': [[{ attempt: { observed: true, outcome: 'success', response: "I'm Sam — and you? … What's your name?", latencyMs: 1600, attemptId: 'tr.ask' } }]],
  'task.meet.assessment.checkpoint': [[{ attempt: { observed: true, outcome: 'success', response: 'full exchange', latencyMs: 1900, attemptId: 'ck.ask' } }]]
};

// In-session work happens at T0+seconds; the delayed check and beyond
// land after the 24h retention window measured from first INDEPENDENT.
// Steps 1–12 are the baseline + teaching + remediation phase; the jump
// begins at the delayed step so the remediation success stays anchored
// at T0 — otherwise its occurredAt lands after the jump and the
// capability is never due during the trace.
const STEP_TIME = (step) => {
  if (step <= 12) return T0 + step * 1000;
  if (step === 13) return T0 + 10_000 + RETENTION_DELAY_MS + HOUR;
  if (step === 14) return T0 + 10_000 + RETENTION_DELAY_MS + 2 * HOUR;
  return T0 + 10_000 + RETENTION_DELAY_MS + 3 * HOUR;
};

const runSlice = () => {
  const queues = {};
  return runMissionTrace({
    learnerId: LEARNER,
    mission: MISSION_MEET_PERSON,
    tasks: TASKS,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    nowAt: STEP_TIME,
    act: (task, { step }) => {
      const q = queues[task.id] ?? (queues[task.id] = [...(SCRIPT[task.id] ?? [])]);
      return (q.shift() ?? []).map((s, i) => ({
        id: nextId(), learnerId: LEARNER, occurredAt: STEP_TIME(step) + i * 500, ...s
      }));
    }
  });
};

// ── The slice: full mission loop for interact.ask_name ───────
const { trace, events } = runSlice();
const row = (step) => trace[step - 1];
{
  const taskSeq = trace.filter((t) => t.taskId).map((t) => t.taskId);
  assert.deepEqual(taskSeq, [
    'task.meet.diagnostic.opening',
    'task.meet.diagnostic.listen',
    'task.meet.diagnostic.identity_q',
    'task.meet.diagnostic.own_name',
    'task.meet.diagnostic.ask_name',
    'task.meet.diagnostic.repair',
    'task.meet.diagnostic.polite',
    'task.meet.input.ask_name',
    'task.meet.retrieval.ask_name',
    'task.meet.interaction.guided',
    'task.meet.remediation.ask_name', // feedback step
    'task.meet.remediation.ask_name', // retry step
    'task.meet.delayed.check',
    'task.meet.transfer.street',
    'task.meet.assessment.checkpoint'
  ], `slice should walk the declared learning loop in order:\n${trace.map((t) => `${t.step}: ${t.taskId} [${t.beforeState}→${t.afterState}] ${t.reason}`).join('\n')}`);

  // State checkpoints (spec §6).
  assert.equal(row(5).afterState, 'EXPOSED', 'baseline fail → EXPOSED');
  assert.equal(row(9).afterState, 'SUPPORTED', 'hinted retrieval → SUPPORTED');
  assert.equal(row(10).afterState, 'SUPPORTED', 'model-aided partial → SUPPORTED');
  assert.equal(row(12).afterState, 'INDEPENDENT', 'clean unaided retry → INDEPENDENT');
  assert.equal(row(13).afterState, 'RETAINED', '24h+ delayed success → RETAINED');
  assert.equal(row(14).afterState, 'TRANSFERRED', 'changed-context success → TRANSFERRED');
  assert.equal(row(15).afterState, 'TRANSFERRED', 'fresh assessment does not change transfer state');
  const final = stateOf(events, 'interact.ask_name');
  assert.equal(final.milestones.fluent, false, 'FLUENT unreachable in v0');
  assert.ok(!final.transferPromptFamilies.includes('assess.meet.exchange.v1'),
    'assessment family is not a transfer context');

  // Same-session success is never retention — the delayed check only
  // became selectable after RETENTION_DELAY_MS (its occurredAt proves it).
  const delayedEvent = events.find((e) => e.taskId === 'task.meet.delayed.check');
  assert.ok(delayedEvent.occurredAt >= events.find((e) => e.taskId === 'task.meet.remediation.ask_name' && e.attempt?.outcome === 'success').occurredAt + RETENTION_DELAY_MS,
    'delayed retrieval ran only after the retention window');

  // Every event is binder-produced; every step explains itself.
  for (const e of events) assert.ok(e.binding?.purpose, `${e.id} is contract-bound`);
  for (const t of trace.filter((t) => t.taskId)) assert.ok(t.reason?.length, `step ${t.step} explains its task`);
  console.log('✓ slice: baseline fail → input → retrieval → supported → feedback → retry → INDEPENDENT → RETAINED → TRANSFERRED → fresh assessment');
}

// ── Negative paths (spec §7) ─────────────────────────────────
{
  // 1. Baseline pass skips unnecessary teaching — the trace above never
  //    serves an input/retrieval/interaction task to a capability whose
  //    diagnostic already passed.
  const taught = new Set(['listen.greeting_basic', 'listen.identity_question_basic', 'speak.say_own_name', 'interact.greet']);
  for (const t of trace.filter((t) => t.taskId)) {
    const task = taskById(t.taskId);
    if (taught.has(task.capabilityId)) {
      assert.equal(task.purpose, 'diagnostic',
        `baseline-passed ${task.capabilityId} must never receive a teaching task, got ${task.id}`);
    }
  }
  console.log('✓ baseline pass skips teaching — passed capabilities only ever see their diagnostic');

  // Prefix of the slice where ask_name just reached INDEPENDENT.
  const throughIndependent = events.slice(0, row(12).eventCount);
  // …and where it just reached RETAINED.
  const throughRetained = events.slice(0, row(13).eventCount);
  const cap = capabilityById('interact.ask_name');

  // 2. Support-aided retry inside the same attempt boundary cannot
  //    launder into INDEPENDENT — sticky provenance holds.
  const hinted = bindAttempt(taskById('task.meet.retrieval.ask_name'), cap, {
    id: 'st.a', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 2000, attemptId: 'sticky.1' },
    support: { hint: true }
  });
  const cleanRetry = bindAttempt(taskById('task.meet.retrieval.ask_name'), cap, {
    id: 'st.b', learnerId: LEARNER, occurredAt: T0 + 5_000, eventType: 'retry',
    attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 900, attemptId: 'sticky.1' }
  });
  assert.equal(stateOf([hinted, cleanRetry], cap.id).state, 'SUPPORTED',
    'hint revealed inside the attempt survives the retry');
  console.log('✓ aided retry inside one attempt boundary stays SUPPORTED');

  // 3. Failed delayed retrieval routes to remediation, never to another
  //    delayed check.
  const delayedFail = bindAttempt(taskById('task.meet.delayed.check'), cap, {
    id: 'fdr.a', learnerId: LEARNER, occurredAt: T0 + 10_000 + RETENTION_DELAY_MS + HOUR,
    attempt: { observed: true, outcome: 'fail', response: 'umm', latencyMs: 3000, attemptId: 'fdr.1' }
  });
  const sel3 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: [...throughIndependent, delayedFail],
    riskPriors: RISK_PRIORS, now: T0 + 10_000 + RETENTION_DELAY_MS + 2 * HOUR
  });
  assert.equal(sel3.status, 'ready');
  assert.equal(sel3.taskId, 'task.meet.remediation.ask_name',
    `failed delayed check must route to remediation, got ${sel3.taskId} (${sel3.reason})`);
  assert.equal(sel3.purpose, 'remediation');
  console.log('✓ failed delayed retrieval routes to remediation, not another delayed check');

  // 4. Missing transfer task → blocked, never a practiced-task
  //    substitute.
  const noTransferMission = {
    ...MISSION_MEET_PERSON,
    taskIds: MISSION_MEET_PERSON.taskIds.filter((id) => id !== 'task.meet.transfer.street')
  };
  const sel4 = nextMissionTask({
    learnerId: LEARNER, mission: noTransferMission, tasks: TASKS,
    capabilities: CAPABILITIES, events: throughRetained,
    riskPriors: RISK_PRIORS, now: T0 + 10_000 + RETENTION_DELAY_MS + 2 * HOUR
  });
  assert.equal(sel4.status, 'blocked', 'retained ability with no transfer task must block, not substitute');
  assert.match(sel4.reason, /transfer/);
  assert.match(sel4.reason, /interact\.ask_name/);
  console.log('✓ missing transfer task → blocked with an explicit reason, never a substitute');

  // 5. Fresh assessment is gated on TRANSFERRED and even when bound it
  //    cannot mint the transfer milestone.
  assert.equal(sel4.status, 'blocked'); // assessment is declared but gated
  const assessed = bindAttempt(taskById('task.meet.assessment.checkpoint'), cap, {
    id: 'as.a', learnerId: LEARNER, occurredAt: T0 + 10_000 + RETENTION_DELAY_MS + 3 * HOUR,
    attempt: { observed: true, outcome: 'success', response: 'full exchange', latencyMs: 900, attemptId: 'as.1' }
  });
  const s5 = stateOf([...throughRetained, assessed], cap.id);
  assert.equal(s5.milestones.transferred, false, 'assessment success is not transfer evidence');
  assert.equal(s5.state, 'RETAINED');
  console.log('✓ fresh assessment cannot substitute for transfer — gated and non-crediting');

  // 6. Revision mismatch: an event bound under v1 does not verify against
  //    a registry that only carries v2.
  const taskV2 = { ...taskById('task.meet.retrieval.ask_name'), revision: 2 };
  const boundV1 = bindAttempt(taskById('task.meet.retrieval.ask_name'), cap, {
    id: 'rev.a', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'rev.1' }
  });
  const sRev = projectLearnerState(LEARNER, [boundV1], CAPABILITIES, [taskV2]).byCapability.get(cap.id);
  assert.equal(sRev.milestones.independent, false,
    'v1-bound evidence does not verify against a registry that only holds v2');
  console.log('✓ task revision mismatch is never selected or credited');

  // 7. Selector replay is deterministic — event arrival order cannot
  //    change the choice.
  const at28h = T0 + 10_000 + RETENTION_DELAY_MS + 4 * HOUR;
  const sel7a = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: throughRetained, riskPriors: RISK_PRIORS, now: at28h
  });
  const sel7b = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: [...throughRetained].reverse(), riskPriors: RISK_PRIORS, now: at28h
  });
  assert.deepEqual(sel7a, sel7b, 'same evidence in any order → same selected task');
  assert.equal(sel7a.taskId, 'task.meet.transfer.street');

  // 8. Foreign learner events cannot shift the selection.
  const foreign = bindAttempt(taskById('task.meet.retrieval.ask_name'), cap, {
    id: 'fx.a', learnerId: 'learner-other', occurredAt: T0 + HOUR,
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'fx.1' }
  });
  const sel8 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: [...throughRetained, foreign], riskPriors: RISK_PRIORS, now: at28h
  });
  assert.deepEqual(sel8, sel7a, "another learner's evidence never changes my next task");
  console.log('✓ selector replay is deterministic and learner-isolated');
}

// ── Orchestration trust boundaries (review round 2, spec §7) ─────────
{
  // 9. Consumption is revision-scoped and the selector is
  //    revision-aware: evidence bound under v1 never consumes the v2
  //    contract; selection resolves to the highest registered revision.
  const diagV2 = { ...taskById('task.meet.diagnostic.opening'), revision: 2 };
  const v1Diag = bindAttempt(taskById('task.meet.diagnostic.opening'), capabilityById('interact.greet'), {
    id: 'rv.a', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'hi', latencyMs: 800, attemptId: 'rv.1' }
  });
  const sel9 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: [...TASKS, diagV2],
    capabilities: CAPABILITIES, events: [v1Diag], riskPriors: RISK_PRIORS, now: T0 + 1000
  });
  assert.equal(sel9.status, 'ready');
  assert.equal(sel9.taskId, 'task.meet.diagnostic.opening');
  assert.equal(sel9.taskRevision, 2, 'v1 evidence does not consume the v2 contract — v2 is still due');

  // 10. Only VERIFIED events mark a task consumed. A well-formed raw
  //     event whose stamped semantics fail registry verification cannot
  //     hide an unrun baseline.
  const forged = makeEvent({
    id: 'fg.1', learnerId: LEARNER, occurredAt: T0, eventType: 'checkpoint',
    taskId: 'task.meet.diagnostic.opening', taskRevision: 1,
    capabilityId: 'interact.greet', modality: 'spoken_interaction',
    attempt: { observed: true, outcome: 'success', response: 'x', latencyMs: 100, attemptId: 'fg.1' },
    context: { missionId: 'mission.meet_new_person', promptFamily: 'meet.opening.baseline.v1', practicedOrTransfer: 'practiced' },
    evaluation: { authority: 'deterministic', contractId: 'eval.required_functions.v1' },
    binding: { purpose: 'diagnostic', familyClass: 'practiced', freshnessRequired: false, effectiveSupportAllowed: [] }
  });
  const sel10 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: [forged], riskPriors: RISK_PRIORS, now: T0 + 1000
  });
  assert.equal(sel10.taskId, 'task.meet.diagnostic.opening',
    'an unverifiable event must not consume the baseline diagnostic');
  console.log('✓ selection is revision-scoped and only verified evidence consumes a task');

  // 11. Mission integrity fails closed: a declared taskId absent from
  //     the registry (or resolving to an invalid contract) blocks the
  //     whole selection instead of being silently dropped.
  const ghostMission = { ...MISSION_MEET_PERSON, taskIds: [...MISSION_MEET_PERSON.taskIds, 'task.meet.ghost'] };
  const sel11a = nextMissionTask({
    learnerId: LEARNER, mission: ghostMission, tasks: TASKS,
    capabilities: CAPABILITIES, events: [], riskPriors: RISK_PRIORS, now: T0
  });
  assert.equal(sel11a.status, 'blocked');
  assert.match(sel11a.reason, /task\.meet\.ghost.*absent/, 'missing declared task blocks the mission');

  const invalidV2 = { ...taskById('task.meet.diagnostic.opening'), revision: 2, purpose: 'fluency' };
  const sel11b = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: [...TASKS, invalidV2],
    capabilities: CAPABILITIES, events: [], riskPriors: RISK_PRIORS, now: T0
  });
  assert.equal(sel11b.status, 'blocked');
  assert.match(sel11b.reason, /invalid/, 'a declared task failing validateTask blocks the mission');
  console.log('✓ missing or invalid declared tasks fail closed — never silently skipped');

  // 12. expose/resume fallback is bounded to input/notice →
  //     retrieval/production/interaction: a capability with its input
  //     consumed but no eliciting task can never drift into transfer or
  //     assessment tasks.
  const leanMission = {
    ...MISSION_MEET_PERSON,
    taskIds: [
      'task.meet.diagnostic.identity_q',
      'task.meet.diagnostic.own_name',
      'task.meet.diagnostic.ask_name',
      'task.meet.input.ask_name',
      'task.meet.transfer.street',
      'task.meet.assessment.checkpoint'
    ]
  };
  const capAsk = capabilityById('interact.ask_name');
  const leanLog = [
    bindAttempt(taskById('task.meet.diagnostic.identity_q'), capabilityById('listen.identity_question_basic'), {
      id: 'lm.a', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'lm.iq' }
    }),
    bindAttempt(taskById('task.meet.diagnostic.own_name'), capabilityById('speak.say_own_name'), {
      id: 'lm.b', learnerId: LEARNER, occurredAt: T0 + 1000,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'lm.on' }
    }),
    bindAttempt(taskById('task.meet.diagnostic.ask_name'), capAsk, {
      id: 'lm.c', learnerId: LEARNER, occurredAt: T0 + 2000,
      attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 4000, attemptId: 'lm.d' }
    }),
    bindObservation(taskById('task.meet.input.ask_name'), capAsk, {
      id: 'lm.d', learnerId: LEARNER, occurredAt: T0 + 3000, eventType: 'exposure'
    })
  ];
  const sel12 = nextMissionTask({
    learnerId: LEARNER, mission: leanMission, tasks: TASKS,
    capabilities: CAPABILITIES, events: leanLog, riskPriors: RISK_PRIORS, now: T0 + 9000
  });
  assert.equal(sel12.status, 'blocked', 'no eliciting task left → blocked, not a semantic leap');
  assert.match(sel12.reason, /interact\.ask_name.*expose/, 'the uncovered expose intent is named');
  assert.notEqual(sel12.taskId, 'task.meet.transfer.street');
  assert.notEqual(sel12.taskId, 'task.meet.assessment.checkpoint');
  console.log('✓ expose/resume fallback never drifts into remediation, delayed, transfer or assessment');
}

console.log('vNext slice: all checks passed');
