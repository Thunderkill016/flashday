/*
 * vNext headless vertical slice (issue #47): mission "meet a new
 * person", target capability interaction.ask_name.
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
import {
  FIXTURES,
  MISSION_MEET_PERSON, TASKS_MEET_PERSON,
  MISSION_MEET_AT_TIME, TASKS_MEET_AT_TIME
} from '../src/vnext/fixtures.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const LEARNER = 'learner.slice';
const TASKS = TASKS_MEET_PERSON;
const taskById = (id) => TASKS.find((t) => t.id === id);
/* The runner's registry mirrors production: the whole curriculum's
 * tasks so evidence bound under ANY mission's contract verifies. */
const ALL_TASKS = FIXTURES.flatMap((f) => f.tasks);

const stateOf = (log, capId) =>
  projectLearnerState(LEARNER, log, CAPABILITIES, TASKS).byCapability.get(capId);

let seq = 0;
const nextId = () => `slice.${++seq}`;

/* Scripted learner: can say her own name (baseline pass — skipping
 * teaching for it is itself an asserted behavior) but cannot yet ASK
 * the question. Carriers rehearse opportunistically — they see input
 * and a comprehension check, never a baseline probe. Each entry is a
 * QUEUE of acts for one task id; every selector visit pops the next
 * act. This is how "feedback then retry" becomes two distinct steps on
 * the same remediation task. */
const SCRIPT = {
  'task.meet.diagnostic.own_name': [[{ attempt: { observed: true, outcome: 'success', response: "I'm Linh", latencyMs: 1300, attemptId: 'd.name' } }]],
  'task.meet.diagnostic.ask_name': [[{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 5000, attemptId: 'd.ask' } }]],
  // Carrier rehearsal: comprehensible input, then a comprehension check
  // — the carrier's only eliciting unit.
  'task.meet.input.scene': [[{ observe: 'exposure' }]],
  'task.meet.input.questions': [[{ observe: 'exposure' }]],
  'task.meet.retrieval.questions': [[{ attempt: { observed: true, outcome: 'success', response: 'ask_name', latencyMs: 900, attemptId: 'r.iq' } }]],
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
  // say_own_name is a claim-bearing target too: its delayed re-check
  // and held-out transfer must also pass before the mission closes.
  'task.meet.delayed.name': [[{ attempt: { observed: true, outcome: 'success', response: "I'm Linh", latencyMs: 1200, attemptId: 'dr.name' } }]],
  'task.meet.transfer.name': [[{ attempt: { observed: true, outcome: 'success', response: 'My name is Linh', latencyMs: 1500, attemptId: 'tr.name' } }]],
  'task.meet.transfer.street': [[{ attempt: { observed: true, outcome: 'success', response: "I'm Sam — and you? … What's your name?", latencyMs: 1600, attemptId: 'tr.ask' } }]],
  // The polite-return carrier is rehearsed once the exchange exists.
  'task.meet.interaction.polite': [[{ attempt: { observed: true, outcome: 'success', response: 'Nice to meet you too', latencyMs: 900, attemptId: 'i.pol' } }]],
  // 008E: say_own_name's own fresh assessment — the claim-bearing cap's
  // post-transfer sample, in a context the teaching path never rehearses.
  'task.meet.assessment.name_signup': [[{ attempt: { observed: true, outcome: 'success', response: 'My name is Linh', latencyMs: 1600, attemptId: 'ck.name' } }]],
  'task.meet.assessment.checkpoint': [[{ attempt: { observed: true, outcome: 'success', response: 'full exchange', latencyMs: 1900, attemptId: 'ck.ask' } }]]
};

// In-session work happens at T0+seconds; the delayed checks and beyond
// land after the 24h retention window measured from first INDEPENDENT.
// Steps 1–10 are the baseline + carrier rehearsal + teaching +
// remediation phase; the jump begins at the first delayed step so the
// remediation success stays anchored at T0 — otherwise its occurredAt
// lands after the jump and the capability is never due during the trace.
const STEP_TIME = (step) => {
  if (step <= 10) return T0 + step * 1000;
  return T0 + 10_000 + RETENTION_DELAY_MS + (step - 10) * HOUR;
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

// ── The slice: full mission loop for interaction.ask_name ───────
const { trace, events } = runSlice();
const row = (step) => trace[step - 1];
{
  const taskSeq = trace.filter((t) => t.taskId).map((t) => t.taskId);
  assert.deepEqual(taskSeq, [
    'task.meet.diagnostic.own_name',  // target baseline probes first
    'task.meet.diagnostic.ask_name',
    'task.meet.input.ask_name',       // failed target gets teaching first (R7: no prereq gating)
    'task.meet.retrieval.ask_name',
    'task.meet.interaction.guided',
    'task.meet.remediation.ask_name', // feedback step
    'task.meet.remediation.ask_name', // retry step
    'task.meet.input.scene',          // carriers rehearse after target work: input, no baseline
    'task.meet.input.questions',
    'task.meet.retrieval.questions',  // carrier comprehension check
    'task.meet.delayed.name',         // say_own_name due first (independent at step 1)
    'task.meet.delayed.check',
    'task.meet.transfer.name',
    'task.meet.transfer.street',
    'task.meet.interaction.polite',   // carrier rehearsal once the exchange exists
    'task.meet.assessment.name_signup', // 008E: say_own_name's fresh assessment, post-transfer
    'task.meet.assessment.checkpoint'
  ], `slice should walk the declared learning loop in order:\n${trace.map((t) => `${t.step}: ${t.taskId} [${t.beforeState}→${t.afterState}] ${t.reason}`).join('\n')}`);

  // State checkpoints (spec §6).
  assert.equal(row(2).afterState, 'EXPOSED', 'baseline fail → EXPOSED');
  assert.equal(row(4).afterState, 'SUPPORTED', 'hinted retrieval → SUPPORTED');
  assert.equal(row(5).afterState, 'SUPPORTED', 'model-aided partial → SUPPORTED');
  assert.equal(row(7).afterState, 'INDEPENDENT', 'clean unaided retry → INDEPENDENT');
  assert.equal(row(10).afterState, 'INDEPENDENT', 'carrier comprehension check passes opportunistically');
  assert.equal(row(11).afterState, 'RETAINED', 'say_own_name delayed success → RETAINED');
  assert.equal(row(12).afterState, 'RETAINED', '24h+ delayed success → RETAINED');
  assert.equal(row(13).afterState, 'TRANSFERRED', 'say_own_name changed-context success → TRANSFERRED');
  assert.equal(row(14).afterState, 'TRANSFERRED', 'changed-context success → TRANSFERRED');
  assert.equal(row(15).afterState, 'INDEPENDENT', 'carrier polite return rehearses opportunistically');
  assert.equal(row(16).afterState, 'TRANSFERRED', 'say_own_name fresh assessment does not change transfer state');
  assert.equal(row(17).afterState, 'TRANSFERRED', 'fresh assessment does not change transfer state');
  const final = stateOf(events, 'interaction.ask_name');
  assert.equal(final.milestones.fluent, false, 'FLUENT unreachable in v0');
  assert.ok(!final.transferPromptFamilies.includes(taskById('task.meet.assessment.checkpoint').promptFamily),
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
  //    serves an input/retrieval/interaction/remediation task to a
  //    capability whose diagnostic already passed. Delayed/transfer
  //    tasks are claim-path sampling, not teaching, so a baseline-passed
  //    claim target (say_own_name) may still receive those. Carriers
  //    are deliberately rehearsed — their input/retrieval tasks are
  //    the mission's context work, not a baseline-skipping violation.
  const TEACHING = new Set(['input', 'notice', 'retrieval', 'production', 'interaction', 'remediation']);
  const baselinePassed = new Set(['production.speak.say_own_name']);
  for (const t of trace.filter((t) => t.taskId)) {
    const task = taskById(t.taskId);
    if (baselinePassed.has(task.capabilityId)) {
      assert.ok(!TEACHING.has(task.purpose),
        `baseline-passed ${task.capabilityId} must never receive a teaching task, got ${task.id} [${task.purpose}]`);
    }
  }
  // And no carrier ever receives a diagnostic or fresh-transfer task —
  // that is the point of the role.
  for (const t of trace.filter((t) => t.taskId)) {
    const task = taskById(t.taskId);
    if (MISSION_MEET_PERSON.carrierCapabilities.includes(task.capabilityId)) {
      assert.ok(task.purpose !== 'diagnostic' && task.purpose !== 'transfer' && task.purpose !== 'assessment',
        `carrier ${task.capabilityId} received a ${task.purpose} task — roles must hold`);
    }
  }
  console.log('✓ baseline pass skips teaching; carriers never get probes, transfer or certification');

  // Prefix of the slice where ask_name just reached INDEPENDENT.
  const throughIndependent = events.slice(0, row(10).eventCount);
  // …and where it just reached RETAINED.
  const throughRetained = events.slice(0, row(12).eventCount);
  const cap = capabilityById('interaction.ask_name');

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
  //    delayed check. say_own_name's delayed check is already consumed
  //    (RETAINED), so the due-retrieval rule cannot outrank remediation.
  const nameDelayed = bindAttempt(taskById('task.meet.delayed.name'), capabilityById('production.speak.say_own_name'), {
    id: 'fdr.n', learnerId: LEARNER, occurredAt: T0 + 10_000 + RETENTION_DELAY_MS + HOUR,
    attempt: { observed: true, outcome: 'success', response: "I'm Linh", latencyMs: 1200, attemptId: 'fdr.n' }
  });
  const delayedFail = bindAttempt(taskById('task.meet.delayed.check'), cap, {
    id: 'fdr.a', learnerId: LEARNER, occurredAt: T0 + 10_000 + RETENTION_DELAY_MS + HOUR,
    attempt: { observed: true, outcome: 'fail', response: 'umm', latencyMs: 3000, attemptId: 'fdr.1' }
  });
  const sel3 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: [...throughIndependent, nameDelayed, delayedFail],
    riskPriors: RISK_PRIORS, now: T0 + 10_000 + RETENTION_DELAY_MS + 2 * HOUR
  });
  assert.equal(sel3.status, 'ready');
  assert.equal(sel3.taskId, 'task.meet.remediation.ask_name',
    `failed delayed check must route to remediation, got ${sel3.taskId} (${sel3.reason})`);
  assert.equal(sel3.purpose, 'remediation');
  console.log('✓ failed delayed retrieval routes to remediation, not another delayed check');

  // 4. Missing transfer tasks → blocked, never a practiced-task
  //    substitute. (The carrier's polite rehearsal is also stripped —
  //    otherwise it is legitimately serveable and the mission is not
  //    blocked at all, which is correct but not what this proves.)
  const noTransferMission = {
    ...MISSION_MEET_PERSON,
    taskIds: MISSION_MEET_PERSON.taskIds.filter((id) => !id.startsWith('task.meet.transfer.') && id !== 'task.meet.interaction.polite')
  };
  const sel4 = nextMissionTask({
    learnerId: LEARNER, mission: noTransferMission, tasks: TASKS,
    capabilities: CAPABILITIES, events: throughRetained,
    riskPriors: RISK_PRIORS, now: T0 + 10_000 + RETENTION_DELAY_MS + 2 * HOUR
  });
  assert.equal(sel4.status, 'blocked', 'retained ability with no transfer task must block, not substitute');
  assert.match(sel4.reason, /transfer/);
  assert.match(sel4.reason, /say_own_name|ask_name/);
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
  assert.equal(sel7a.taskId, 'task.meet.transfer.name',
    'say_own_name reached RETAINED before ask_name — its transfer is served first');

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
  const diagV2 = { ...taskById('task.meet.diagnostic.own_name'), revision: 2 };
  const v1Diag = bindAttempt(taskById('task.meet.diagnostic.own_name'), capabilityById('production.speak.say_own_name'), {
    id: 'rv.a', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'hi', latencyMs: 800, attemptId: 'rv.1' }
  });
  const sel9 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: [...TASKS, diagV2],
    capabilities: CAPABILITIES, events: [v1Diag], riskPriors: RISK_PRIORS, now: T0 + 1000
  });
  assert.equal(sel9.status, 'ready');
  assert.equal(sel9.taskId, 'task.meet.diagnostic.own_name');
  assert.equal(sel9.taskRevision, 2, 'v1 evidence does not consume the v2 contract — v2 is still due');

  // 10. Only VERIFIED events mark a task consumed. A well-formed raw
  //     event whose stamped semantics fail registry verification cannot
  //     hide an unrun baseline.
  const forged = makeEvent({
    id: 'fg.1', learnerId: LEARNER, occurredAt: T0, eventType: 'checkpoint',
    taskId: 'task.meet.diagnostic.own_name', taskRevision: 1,
    capabilityId: 'production.speak.say_own_name', modality: 'spoken_production',
    attempt: { observed: true, outcome: 'success', response: 'x', latencyMs: 100, attemptId: 'fg.1' },
    context: { missionId: 'mission.meet_new_person', promptFamily: 'meet.opening.baseline.v1', practicedOrTransfer: 'practiced' },
    evaluation: { authority: 'deterministic', contractId: 'eval.required_functions.v1' },
    binding: { purpose: 'diagnostic', familyClass: 'practiced', freshnessRequired: false, effectiveSupportAllowed: [] }
  });
  const sel10 = nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_PERSON, tasks: TASKS,
    capabilities: CAPABILITIES, events: [forged], riskPriors: RISK_PRIORS, now: T0 + 1000
  });
  assert.equal(sel10.taskId, 'task.meet.diagnostic.own_name',
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

  const invalidV2 = { ...taskById('task.meet.diagnostic.own_name'), revision: 2, purpose: 'fluency' };
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
      'task.meet.retrieval.questions',
      'task.meet.diagnostic.own_name',
      'task.meet.diagnostic.ask_name',
      'task.meet.input.ask_name',
      'task.meet.transfer.street',
      'task.meet.assessment.checkpoint'
    ]
  };
  const capAsk = capabilityById('interaction.ask_name');
  const leanLog = [
    bindAttempt(taskById('task.meet.retrieval.questions'), capabilityById('reception.listen.identity_question_basic'), {
      id: 'lm.a', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'lm.iq' }
    }),
    bindAttempt(taskById('task.meet.diagnostic.own_name'), capabilityById('production.speak.say_own_name'), {
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
  assert.match(sel12.reason, /interaction\.ask_name.*expose/, 'the uncovered expose intent is named');
  assert.notEqual(sel12.taskId, 'task.meet.transfer.street');
  assert.notEqual(sel12.taskId, 'task.meet.assessment.checkpoint');
  console.log('✓ expose/resume fallback never drifts into remediation, delayed, transfer or assessment');
}

// ── Cross-mission slice: M3 meet_at_a_time on an M1-graduate ───
// R7: capabilities carry no DAG prerequisites — earlier edges were
// lesson order disguised as dependency. What DOES cross missions is
// evidence: a carrier already INDEPENDENT from M1 must not be
// re-taught, and that only works when the runner's registry resolves
// tasks declared by OTHER missions.
{
  const TASKS3 = TASKS_MEET_AT_TIME;
  /* ask_name arrives INDEPENDENT via an M1 task binding — verifying it
   * inside M3 is the registry fix's whole point (a current-mission-only
   * registry would reject the binding and re-teach the carrier). */
  const seeds = [
    bindAttempt(taskById('task.meet.retrieval.ask_name'), capabilityById('interaction.ask_name'), {
      id: 'm3.s1', learnerId: LEARNER, occurredAt: T0 - 2 * HOUR,
      attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 900, attemptId: 'm3.si' }
    })
  ];
  const SCRIPT3 = {
    'task.time.diagnostic.hear': [[{ attempt: { observed: true, outcome: 'fail', response: 'four', latencyMs: 3000, attemptId: 'd.hr' } }]],
    'task.time.diagnostic.say': [[{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 4000, attemptId: 'd.sy' } }]],
    'task.time.retrieval.greeting': [[{ attempt: { observed: true, outcome: 'success', response: 'greeting', latencyMs: 800, attemptId: 'r.gr' } }]],
    'task.time.input.scene': [[{ observe: 'exposure' }]],
    'task.time.retrieval.greet': [[{ attempt: { observed: true, outcome: 'success', response: 'Hi!', latencyMs: 700, attemptId: 'r.gt' } }]],
    'task.time.input.clock': [[{ observe: 'exposure' }]],
    'task.time.retrieval.hear': [[{ attempt: { observed: true, outcome: 'success', response: 'half_four', latencyMs: 900, attemptId: 'r.hr' } }]],
    'task.time.retrieval.say': [[{ attempt: { observed: true, outcome: 'success', response: "It's three o'clock", latencyMs: 1000, attemptId: 'r.sy' } }]],
    'task.time.interaction.guided': [[{ attempt: { observed: true, outcome: 'success', response: "It's two o'clock", latencyMs: 1200, attemptId: 'g.sy' }, support: { modelAnswer: true } }]],
    'task.time.interaction.unaided': [[{ attempt: { observed: true, outcome: 'success', response: "It's two o'clock", latencyMs: 1100, attemptId: 'u.sy' } }]],
    'task.time.delayed.hear': [[{ attempt: { observed: true, outcome: 'success', response: 'six', latencyMs: 1000, attemptId: 'dr.hr' } }]],
    'task.time.delayed.say': [[{ attempt: { observed: true, outcome: 'success', response: 'At three', latencyMs: 1000, attemptId: 'dr.sy' } }]],
    'task.time.transfer.clinic': [[{ attempt: { observed: true, outcome: 'success', response: 'half_ten', latencyMs: 1400, attemptId: 'tr.hr' } }]],
    'task.time.transfer.event': [[{ attempt: { observed: true, outcome: 'success', response: 'At six', latencyMs: 1300, attemptId: 'tr.sy' } }]],
    'task.time.assessment.hear': [[{ attempt: { observed: true, outcome: 'success', response: 'nine', latencyMs: 1200, attemptId: 'ck.hr' } }]],
    'task.time.assessment.checkpoint': [[{ attempt: { observed: true, outcome: 'success', response: "Hi, it's three o'clock. What's your name?", latencyMs: 1600, attemptId: 'ck.sy' } }]]
  };
  const STEP3 = (step) => {
    if (step <= 8) return T0 + step * 1000;
    return T0 + 8_000 + RETENTION_DELAY_MS + (step - 8) * HOUR;
  };
  const queues = {};
  const { trace: trace3 } = runMissionTrace({
    learnerId: LEARNER,
    mission: MISSION_MEET_AT_TIME,
    /* The registry is the whole curriculum — carried M1 evidence must
     * verify or the ask_name carrier would look NOT_SEEN and get
     * re-taught; routing stays scoped to mission.taskIds. */
    tasks: ALL_TASKS,
    capabilities: CAPABILITIES,
    events: seeds,
    riskPriors: RISK_PRIORS,
    nowAt: STEP3,
    act: (task, { step }) => {
      const q = queues[task.id] ?? (queues[task.id] = [...(SCRIPT3[task.id] ?? [])]);
      return (q.shift() ?? []).map((s, i) => ({
        id: nextId(), learnerId: LEARNER, occurredAt: STEP3(step) + i * 500, ...s
      }));
    }
  });
  const seq3 = trace3.filter((t) => t.taskId).map((t) => t.taskId);
  assert.deepEqual(seq3, [
    'task.time.diagnostic.hear',   // targets probe baseline first
    'task.time.diagnostic.say',
    'task.time.input.clock',       // failed targets get teaching
    'task.time.retrieval.hear',
    'task.time.retrieval.say',
    'task.time.retrieval.greeting',// greeting_basic carrier rehearses
    'task.time.input.scene',       // greet carrier introduced: input, no baseline
    'task.time.retrieval.greet',
    'task.time.delayed.hear',      // after the retention jump
    'task.time.delayed.say',
    'task.time.transfer.clinic',
    'task.time.transfer.event',
    'task.time.assessment.hear',   // fresh comprehension sample
    'task.time.assessment.checkpoint' // fresh spoken sample incl. M1 carriers
  ], `M3 should walk the same evidence chain:\n${trace3.map((t) => `${t.step}: ${t.taskId} [${t.beforeState}→${t.afterState}] ${t.reason}`).join('\n')}`);

  const rows3 = (s) => trace3[s - 1];
  assert.equal(rows3(1).afterState, 'EXPOSED', 'baseline fail → EXPOSED');
  assert.equal(rows3(4).afterState, 'INDEPENDENT', 'unaided retrieval → INDEPENDENT');
  assert.equal(rows3(6).afterState, 'INDEPENDENT', 'greeting carrier rehearses to INDEPENDENT');
  assert.equal(rows3(8).afterState, 'INDEPENDENT', 'greet carrier rehearses opportunistically');
  assert.equal(rows3(10).afterState, 'RETAINED', '24h+ delayed → RETAINED');
  assert.equal(rows3(11).afterState, 'TRANSFERRED');
  assert.equal(rows3(14).afterState, 'TRANSFERRED', 'assessment does not move state');
  /* The seeded M1 ask_name is already INDEPENDENT — a carrier with
   * carried mastery is never re-taught: its M3 task stays unrouted,
   * which is only possible if the M1-bound event verified inside this
   * mission's registry. */
  assert.ok(!seq3.includes('task.time.interaction.ask_name'),
    'carried INDEPENDENT carrier must not be re-served — registry must verify M1-bound evidence');
  // Carriers receive no probes/certification in M3 either.
  for (const t of trace3.filter((t) => t.taskId)) {
    const task = TASKS3.find((x) => x.id === t.taskId);
    if (MISSION_MEET_AT_TIME.carrierCapabilities.includes(task.capabilityId)) {
      assert.ok(!['diagnostic', 'transfer', 'assessment'].includes(task.purpose),
        `carrier ${task.capabilityId} got a claim-bearing ${task.purpose} task`);
    }
  }
  // The lazy support cap is never routed — no demand mechanism exists.
  assert.ok(!seq3.some((id) => TASKS3.find((x) => x.id === id)?.capabilityId === 'reception.listen.identify_spoken_number'),
    'support cap must stay lazy — nothing may route to it');
  // Once the seeded M1 evidence goes stale, its due re-checks are
  // cross-mission backlog — they cannot freeze M3's terminal state.
  const last3 = trace3[trace3.length - 1];
  assert.equal(last3.status, 'idle',
    `uncoverable intents on non-target caps must end the mission 'idle', not 'blocked': ${last3.reason}`);
  assert.ok(last3.reason.includes('backlog'),
    `the backlog must stay visible in the terminal reason: ${last3.reason}`);
  console.log('✓ M3 cross-mission slice: M1 evidence verifies via registry, mastered carrier not re-taught, backlog never blocks');
}

console.log('vNext slice: all checks passed');
