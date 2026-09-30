/*
 * vNext demand-driven support routing (issue #61 / Mission 005).
 *
 *   target miss → evaluator-attributed missingFunctions
 *     → ∩ providesFunctions → SUPPORT_DEMAND → probe → return to target
 *
 * Invariants under test:
 *   - demands exist ONLY for observed, verified, attributing failures;
 *   - unknown-cause failures keep missingFunctions = [] and never route;
 *   - support capabilities are demand-driven ONLY (no free-run);
 *   - support_attempt mints no milestone on ANY capability;
 *   - demands are per-pair bounded, self-cancelling, learner-isolated,
 *     and deterministic under replay;
 *   - the curriculum gate rejects dead/laundering support declarations.
 */
import assert from 'node:assert/strict';
import { CAPABILITIES, capabilityById } from '../src/vnext/capabilities.js';
import { projectLearnerState } from '../src/vnext/projection.js';
import { bindAttempt } from '../src/vnext/bind.js';
import { makeEvent, validateEvent } from '../src/vnext/evidence.js';
import { makeTask, emittedEventType } from '../src/vnext/contracts.js';
import { evaluateAttempt, contractAttributesFunctions } from '../src/vnext/evaluators.js';
import { planNext } from '../src/vnext/planner.js';
import { nextMissionTask, runMissionTrace } from '../src/vnext/mission-runner.js';
import { checkCurriculum } from '../src/vnext/curriculum-checks.js';
import { makePolicy } from '../src/vnext/policy.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { FIXTURES, MISSION_MEET_AT_TIME, TASKS_MEET_AT_TIME } from '../src/vnext/fixtures.js';
import { createMissionSession } from '../src/vnext/ui-session.js';
import { createMemoryEventStore, createMemoryRunStore } from '../src/vnext/store-memory.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const LEARNER = 'learner.sup';
const TASKS = TASKS_MEET_AT_TIME;
const ALL_TASKS = FIXTURES.flatMap((f) => f.tasks);
const taskById = (id) => TASKS.find((t) => t.id === id);

const TARGET = 'reception.listen.understand_clock_time';
const SUPPORT = 'reception.listen.identify_spoken_number';
const NUM_FN = 'identify_spoken_number';
const HEAR = 'task.time.diagnostic.hear';   // attributing choice task (requires NUM_FN)
const PROBE = 'task.time.support.number_probe';

const roles = {
  targets: new Set(MISSION_MEET_AT_TIME.targetCapabilities),
  supports: new Set(MISSION_MEET_AT_TIME.supportCapabilities),
  prereqs: new Set(MISSION_MEET_AT_TIME.prerequisiteCapabilities)
};
const surface = new Set([
  ...MISSION_MEET_AT_TIME.targetCapabilities,
  ...MISSION_MEET_AT_TIME.carrierCapabilities,
  ...(MISSION_MEET_AT_TIME.prerequisiteCapabilities ?? []),
  ...MISSION_MEET_AT_TIME.supportCapabilities
]);
const scopedCaps = CAPABILITIES.filter((c) => surface.has(c.id));

/* Keep `now` just after the in-session events: at +48h a legitimately
 * due delayed check would (correctly) outrank a pending demand —
 * rule 2 retention before rule 3 support. These tests isolate demand
 * semantics, so they pin the clock inside the first session. */
const NOW = T0 + 10_000;
const plan = (events, opts = {}) =>
  planNext(LEARNER, events, {
    capabilities: scopedCaps, tasks: ALL_TASKS, riskPriors: RISK_PRIORS,
    now: opts.now ?? NOW, roles, ...opts
  });
const select = (events, opts = {}) =>
  nextMissionTask({
    learnerId: LEARNER, mission: MISSION_MEET_AT_TIME, tasks: TASKS,
    capabilities: CAPABILITIES, events, riskPriors: RISK_PRIORS,
    now: opts.now ?? NOW, ...opts
  });

let seq = 0;
/* A bound failure on an attributing choice task. `missing` is the
 * evaluator report; observed/overrides let tests forge weaker or
 * forged evidence without bypassing the binder. */
const failOn = (taskId, { at, missing = [NUM_FN], outcome = 'fail', observed = true, eventType } = {}) => {
  const t = taskById(taskId);
  return bindAttempt(t, capabilityById(t.capabilityId), {
    id: `sup.${++seq}`, learnerId: LEARNER, occurredAt: at, eventType,
    attempt: { observed, outcome, response: 'wrong', latencyMs: 2000, attemptId: `at.${seq}` },
    evaluation: { missingFunctions: missing }
  });
};
const probeAttempt = (outcome = 'success', { at, observed = true } = {}) => {
  const t = taskById(PROBE);
  return bindAttempt(t, capabilityById(SUPPORT), {
    id: `sup.${++seq}`, learnerId: LEARNER, occurredAt: at,
    attempt: { observed, outcome, response: 'ten', latencyMs: 800, attemptId: `at.${seq}` }
  });
};

let check = 0;
const ok = (name) => { check++; console.log(`  ✓ ${name}`); };

/* ── 1. Evaluator attribution signal ────────────────────────── */
{
  const hear = taskById(HEAR);
  const wrong = evaluateAttempt(hear, { optionId: 'four' });
  assert.equal(wrong.outcome, 'fail');
  assert.deepEqual(wrong.missingFunctions, ['understand_clock_time', 'identify_spoken_number'],
    'a choice miss attributes every function the option set operationalizes');
  const right = evaluateAttempt(hear, { optionId: 'three' });
  assert.equal(right.outcome, 'success');
  assert.deepEqual(right.missingFunctions, [], 'success claims no missing functions');

  const say = taskById('task.time.diagnostic.say');
  const partial = evaluateAttempt(say, { text: 'something unrelated' });
  assert.equal(partial.outcome, 'fail');
  assert.deepEqual(partial.missingFunctions, [],
    'free-text scoring cannot attribute a comprehension miss — unknown cause stays empty');

  assert.equal(contractAttributesFunctions('eval.choice.correct.v1'), true);
  assert.equal(contractAttributesFunctions('eval.required_functions.v1'), false);
  assert.equal(contractAttributesFunctions('eval.nonexistent.v9'), false);
  ok('evaluator attribution: choice miss → declared functions; text miss → []; unknown contract → no attribution');
}

/* ── 2. Binder bounds the signal to declared requiredFunctions ─ */
{
  const hear = taskById(HEAR);
  assert.throws(
    () => failOn(HEAR, { at: T0, missing: ['teleport_anywhere'] }),
    /requiredFunctions/,
    'a function the task never declared is forged provenance — binder must refuse'
  );
  assert.throws(
    () => bindAttempt(hear, capabilityById(TARGET), {
      id: 'sup.x', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 1, attemptId: 'x1' },
      evaluation: { missingFunctions: 'identify_spoken_number' }
    }),
    /list of function names/,
    'missingFunctions must be a list'
  );
  const stamped = failOn(HEAR, { at: T0, missing: [NUM_FN] });
  assert.deepEqual(stamped.evaluation.missingFunctions, [NUM_FN]);
  assert.equal(validateEvent(stamped).length, 0, 'stamped event is a valid evidence record');
  const malformed = { ...stamped, id: 'mv.1', evaluation: { ...stamped.evaluation, missingFunctions: [42] } };
  assert.ok(validateEvent(malformed).some((p) => p.includes('missingFunctions')),
    'validateEvent rejects non-string missingFunctions');
  ok('binder stamps missingFunctions ⊆ requiredFunctions; forged/malformed reports rejected');
}

/* ── 3. No demand without evidence; no free-run ─────────────── */
{
  const empty = plan([]);
  assert.notEqual(empty.kind, 'support_demand', 'a fresh learner with a declared support cap must NOT be routed to it');
  const unmissed = failOn(HEAR, { at: T0, missing: [] }); // evaluated fail, no attribution
  assert.notEqual(plan([unmissed]).kind, 'support_demand',
    'a failure with empty missingFunctions produces no demand — wrong formulation, not substrate');

  // Support cap must never surface through normal intents, even when it
  // is the only thing "left" for the planner to do.
  const allTaught = [
    bindAttempt(taskById('task.time.diagnostic.say'), capabilityById('production.speak.state_clock_time'), {
      id: 'sup.base', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'base.1' }
    })
  ];
  const p = plan(allTaught);
  assert.ok(p.capabilityId !== SUPPORT, `support cap received normal intent '${p.kind}' — free-running`);
  ok('declared support cap never free-runs: no demand without an attributing miss');
}

/* ── 4. Attributing miss → SUPPORT_DEMAND → provider cap ────── */
{
  const miss = failOn(HEAR, { at: T0, missing: [NUM_FN] });
  const p = plan([miss]);
  assert.equal(p.kind, 'support_demand');
  assert.equal(p.capabilityId, SUPPORT);
  assert.equal(p.demand.targetCapabilityId, TARGET);
  assert.equal(p.demand.targetTaskId, HEAR);
  assert.equal(p.demand.missingFunction, NUM_FN);
  assert.equal(p.demand.sourceEventId, miss.id, 'demand carries provenance to the failing event');

  // The miss ALSO attributed understand_clock_time — no provider exists
  // for it, so exactly one demand must exist for the pair that resolves.
  const both = failOn(HEAR, { at: T0 + 1000, missing: ['understand_clock_time', NUM_FN] });
  const p2 = plan([both]);
  assert.equal(p2.kind, 'support_demand');
  assert.equal(p2.demand.missingFunction, NUM_FN, 'only the function with a provider routes');

  const noProvider = failOn(HEAR, { at: T0 + 2000, missing: ['understand_clock_time'] });
  assert.notEqual(plan([noProvider]).kind, 'support_demand',
    'a missing function with no declared provider issues no demand');
  ok('attributing miss on a provided function → SUPPORT_DEMAND with target/task provenance');
}

/* ── 5. Only verified, observed, attributing evidence routes ── */
{
  // Forged: event claims the missing function but was never bound —
  // wrong contract stamp makes verifyEventTask refuse it.
  const forged = makeEvent({
    id: 'fg.sup', learnerId: LEARNER, occurredAt: T0,
    eventType: 'recognition_attempt', taskId: HEAR, taskRevision: 1,
    capabilityId: TARGET, modality: 'listening',
    attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 1, attemptId: 'fg' },
    context: { missionId: 'mission.meet_at_a_time', promptFamily: 'forged.family', practicedOrTransfer: 'practiced' },
    evaluation: { authority: 'deterministic', contractId: 'eval.choice.correct.v1', missingFunctions: [NUM_FN] },
    binding: { purpose: 'diagnostic', familyClass: 'practiced', freshnessRequired: false, effectiveSupportAllowed: [] }
  });
  assert.notEqual(plan([forged]).kind, 'support_demand', 'unverifiable evidence cannot mint a demand');

  // Unobserved (self-reported) failure — same evidence bar as milestones.
  const selfReport = failOn(HEAR, { at: T0 + 1000, observed: false });
  assert.notEqual(plan([selfReport]).kind, 'support_demand', 'unobserved misses route nothing');

  // Attributing function on a NON-attributing contract: a hand-bound
  // required_functions task whose stamped signal the planner must
  // refuse — the contract cannot justify the diagnosis.
  const textTask = makeTask({
    id: 'task.synth.text', missionId: 'mission.meet_at_a_time',
    capabilityId: TARGET, modality: 'listening', purpose: 'retrieval',
    promptFamily: taskById(HEAR).promptFamily, contextSignature: taskById(HEAR).contextSignature,
    stimulus: { type: 'audio_line', languageComponents: ['x'] },
    response: { type: 'text', requiredFunctions: [NUM_FN] },
    evaluation: { authority: 'deterministic', contractId: 'eval.required_functions.v1' }
  });
  const nonAttributing = bindAttempt(textTask, capabilityById(TARGET), {
    id: 'sup.na', learnerId: LEARNER, occurredAt: T0 + 2000,
    attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 1, attemptId: 'na.1' },
    evaluation: { missingFunctions: [NUM_FN] }
  });
  const p = planNext(LEARNER, [nonAttributing], {
    capabilities: scopedCaps, tasks: [...ALL_TASKS, textTask],
    riskPriors: RISK_PRIORS, now: NOW, roles
  });
  assert.notEqual(p.kind, 'support_demand',
    'a stamped signal on a non-attributing contract is never trusted');
  ok('demands require verified + observed + attributing-contract failures');
}

/* ── 6. Selector serves the probe, then returns to the target ── */
{
  // Consume the mission's declared diagnostics so the planner rules run.
  const diagSay = bindAttempt(taskById('task.time.diagnostic.say'), capabilityById('production.speak.state_clock_time'), {
    id: 'sup.ds', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'three o clock', latencyMs: 900, attemptId: 'ds.1' }
  });
  const miss = failOn(HEAR, { at: T0 + 1000 });

  const sel1 = select([diagSay, miss]);
  assert.equal(sel1.status, 'ready');
  assert.equal(sel1.taskId, PROBE, `expected the support probe, got ${sel1.taskId} (${sel1.reason})`);
  assert.equal(sel1.purpose, 'support');

  const probe = probeAttempt('success', { at: T0 + 2000 });
  const sel2 = select([diagSay, miss, probe]);
  assert.equal(sel2.status, 'ready');
  assert.notEqual(sel2.taskId, PROBE, 'the probe was consumed — serving it again immediately is a loop');
  const capAfter = taskById(sel2.taskId).capabilityId;
  assert.notEqual(capAfter, SUPPORT, 'no further support work after the demand is spent');
  assert.equal(capAfter, TARGET, `demand must hand back to the failing target, got ${capAfter} via ${sel2.taskId}`);
  ok('probe served once, then selection returns to the failing target capability');
}

/* ── 7. Support evidence mints nothing — on EITHER capability ── */
{
  const miss = failOn(HEAR, { at: T0 });
  const probe = probeAttempt('success', { at: T0 + 1000 });
  const { byCapability } = projectLearnerState(LEARNER, [miss, probe], CAPABILITIES, ALL_TASKS);

  const support = byCapability.get(SUPPORT);
  assert.equal(support.milestones.independent, false, 'support_attempt minted INDEPENDENT on the substrate cap');
  assert.equal(support.milestones.supported, false, 'support_attempt minted SUPPORTED on the substrate cap');
  assert.equal(support.milestones.retained, false);
  assert.equal(support.milestones.transferred, false);
  const target = byCapability.get(TARGET);
  assert.equal(target.milestones.independent, false, 'substrate success laundered into target independence');
  assert.equal(target.milestones.supported, false, 'substrate success laundered into target SUPPORTED');
  ok('support_attempt is remediation context — zero milestones on support or target');
}

/* ── 8. Demand lifecycle: consume, cancel, bound ────────────── */
{
  // One probe cycle spends the pair — a later identical miss re-routes
  // nowhere (maxCyclesPerPair = 1 in policy v1).
  const miss1 = failOn(HEAR, { at: T0 });
  const probeFail = probeAttempt('fail', { at: T0 + 1000 });
  const miss2 = failOn('task.time.retrieval.hear', { at: T0 + 2000 });
  assert.equal(plan([miss1, probeFail, miss2]).kind === 'support_demand', false,
    'a spent (target,function) pair must not re-issue — bounded remediation, not a loop');

  // Self-cancellation: the target succeeds on its own before the probe
  // runs — the pending demand is stale and must die.
  const miss3 = failOn(HEAR, { at: T0 });
  const recovered = bindAttempt(taskById('task.time.retrieval.hear'), capabilityById(TARGET), {
    id: 'sup.rec', learnerId: LEARNER, occurredAt: T0 + 500,
    attempt: { observed: true, outcome: 'success', response: 'three', latencyMs: 900, attemptId: 'rec.1' }
  });
  assert.notEqual(plan([miss3, recovered]).kind, 'support_demand',
    'target self-recovery cancels the pending demand — no stale routing');

  // Policy knob: two cycles allowed → the second miss re-issues once.
  const pol2 = makePolicy('v.test.two-cycles', { supportDemand: { maxCyclesPerPair: 2 } });
  const evts = [miss1, probeFail, miss2];
  const again = plan(evts, { policy: pol2 });
  assert.equal(again.kind, 'support_demand', 'a second allowed cycle should re-issue the demand');
  const miss3b = failOn('task.time.retrieval.hear', { at: T0 + 3000 });
  const spent = plan([...evts, probeAttempt('fail', { at: T0 + 2500 }), miss3b], { policy: pol2 });
  assert.notEqual(spent.kind, 'support_demand', 'cycle bound is hard — the third miss cannot re-issue');

  // Stale substrate work cannot satisfy a demand issued AFTER it:
  // a probe that ran before the miss never consumes the pending demand
  // (the miss proves the substrate is still unreliable).
  const staleProbe = probeAttempt('success', { at: T0 });
  const laterMiss = failOn(HEAR, { at: T0 + 1000 });
  assert.equal(plan([staleProbe, laterMiss]).kind, 'support_demand',
    'prior-mission substrate evidence must not consume a fresh demand');

  // Re-delivered evidence (sync retry writes the same event twice) must
  // not double-issue — pending is keyed per (target, function).
  const dup = plan([miss1, { ...miss1 }, { ...miss1 }]);
  assert.equal(dup.kind, 'support_demand');
  assert.equal(dup.demand.missingFunction, NUM_FN);
  ok('demand lifecycle: probe consumes (pass or fail), target recovery cancels, pair bound prevents loops');
}

/* ── 9. Replay determinism + learner isolation ──────────────── */
{
  const miss = failOn(HEAR, { at: T0 });
  const say = bindAttempt(taskById('task.time.diagnostic.say'), capabilityById('production.speak.state_clock_time'), {
    id: 'sup.say', learnerId: LEARNER, occurredAt: T0 + 500,
    attempt: { observed: true, outcome: 'fail', response: 'umm', latencyMs: 2000, attemptId: 'say.1' }
  });
  const evts = [miss, say];
  assert.deepEqual(plan(evts), plan([...evts].reverse()), 'arrival order must not change the plan');

  const foreign = [
    miss,
    { ...probeAttempt('success', { at: T0 + 1000 }), learnerId: 'learner.other' }
  ];
  const mine = plan(foreign);
  assert.equal(mine.kind, 'support_demand', "another learner's probe must not consume MY demand");
  const foreignDemand = planNext('learner.other', foreign, {
    capabilities: scopedCaps, tasks: ALL_TASKS, riskPriors: RISK_PRIORS, now: NOW, roles
  });
  assert.notEqual(foreignDemand.kind, 'support_demand', "my miss must not mint THEIR demand");
  ok('same evidence any order → same plan; demands are learner-isolated');
}

/* ── 10. Support caps excluded from every normal intent ──────── */
{
  // Drive the whole mission trace; assert the probe is only ever served
  // via demand and the support cap never mints a milestone.
  let demandSeen = 0;
  const { trace, events } = runMissionTrace({
    learnerId: LEARNER,
    mission: MISSION_MEET_AT_TIME,
    tasks: TASKS,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    maxSteps: 12,
    nowAt: (s) => T0 + s * 1000,
    act: (task, { step }) => {
      const at = T0 + step * 1000;
      const base = { id: `tr.${step}`, learnerId: LEARNER, occurredAt: at };
      if (task.id === HEAR) {
        demandSeen++;
        return [{
          ...base, attempt: { observed: true, outcome: 'fail', response: 'four', latencyMs: 2000, attemptId: `tr.${step}` },
          evaluation: { missingFunctions: [NUM_FN] }
        }];
      }
      if (task.id === PROBE) {
        return [{ ...base, attempt: { observed: true, outcome: 'success', response: 'ten', latencyMs: 600, attemptId: `tr.${step}` } }];
      }
      return task.purpose === 'input' || task.purpose === 'notice'
        ? [{ ...base, observe: 'exposure', attempt: { attemptId: `tr.${step}` } }]
        : [{ ...base, attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: `tr.${step}` } }];
    }
  });
  assert.ok(demandSeen >= 1, 'the diagnostic miss never ran');
  const probeSteps = trace.filter((t) => t.taskId === PROBE);
  assert.equal(probeSteps.length, 1, `probe served ${probeSteps.length} times — demand must be single-shot per pair`);
  /* Declared diagnostics run first (phase 0), so the probe interposes
   * right after the baseline block — never before the miss, never late
   * after unrelated teaching. */
  const probeIdx = trace.findIndex((t) => t.taskId === PROBE);
  const hearIdx = trace.findIndex((t) => t.taskId === HEAR);
  assert.ok(probeIdx > hearIdx, 'probe was served before the miss it answers');
  assert.ok(
    trace.slice(hearIdx + 1, probeIdx).every((t) => t.purpose === 'diagnostic' || t.taskId == null),
    `non-diagnostic work slipped between the miss and its probe: ${trace.map((t) => `${t.step}:${t.taskId}`).join(' ')}`
  );
  for (const t of trace.filter((t) => t.taskId && t.taskId !== PROBE)) {
    const task = taskById(t.taskId);
    assert.notEqual(task.capabilityId, SUPPORT, 'support cap surfaced outside its demand route');
  }
  /* `exposed` is honest — the learner did encounter the substrate.
   * What support work may never mint is a claim: supported,
   * independent, retained, transferred, fluent. */
  const final = projectLearnerState(LEARNER, events, CAPABILITIES, ALL_TASKS).byCapability.get(SUPPORT);
  for (const m of ['supported', 'independent', 'retained', 'transferred', 'fluent']) {
    assert.equal(final.milestones[m], false, `support probe minted ${m} on the substrate cap`);
  }
  ok('mission trace: probe interposes after the miss exactly once; substrate never earns claims');
}

/* ── 11. Demand with no servable probe is non-fatal ──────────── */
{
  const noProbeMission = {
    ...MISSION_MEET_AT_TIME,
    taskIds: MISSION_MEET_AT_TIME.taskIds.filter((id) => id !== PROBE)
  };
  const diagSay = bindAttempt(taskById('task.time.diagnostic.say'), capabilityById('production.speak.state_clock_time'), {
    id: 'sup.ds2', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'ds2.1' }
  });
  const miss = failOn(HEAR, { at: T0 + 1000 });
  const sel = nextMissionTask({
    learnerId: LEARNER, mission: noProbeMission, tasks: TASKS.filter((t) => t.id !== PROBE),
    capabilities: CAPABILITIES, events: [diagSay, miss], riskPriors: RISK_PRIORS, now: NOW
  });
  assert.equal(sel.status, 'ready', `an unservable support demand blocked the mission: ${sel.reason}`);
  assert.notEqual(sel.taskId, PROBE);
  ok('unservable demand → skipped intent, mission continues — support backlog is never fatal');
}

/* ── 12. Curriculum gate: support declarations must be real ─── */
{
  const numCap = capabilityById(SUPPORT);
  const probeTask = taskById(PROBE);
  const base = { capabilities: CAPABILITIES, missions: [MISSION_MEET_AT_TIME], tasks: TASKS };
  assert.deepEqual(checkCurriculum(base), [], 'live support declaration should pass');

  // Dead paper support: provides nothing any mission task needs.
  const fakeCap = { ...numCap, id: 'reception.listen.fake_substrate', providesFunctions: ['levitation'] };
  const mDead = { ...MISSION_MEET_AT_TIME, id: 'mission.x', supportCapabilities: ['reception.listen.fake_substrate'] };
  const probs = checkCurriculum({ capabilities: [...CAPABILITIES, fakeCap], missions: [mDead], tasks: TASKS });
  assert.ok(probs.some((p) => p.includes('provides no function')), 'dead providesFunctions declaration passed the gate');
  assert.ok(probs.some((p) => p.includes('no support-purpose probe')), 'support cap without a probe task passed the gate');

  // Laundering: a support cap owning a claim-bearing task.
  const thief = makeTask({
    ...probeTask, id: 'task.time.support.thief', purpose: 'retrieval',
    evaluation: { authority: 'deterministic', contractId: 'eval.choice.correct.v1' }
  });
  const mThief = { ...MISSION_MEET_AT_TIME, id: 'mission.y', taskIds: [...MISSION_MEET_AT_TIME.taskIds, thief.id] };
  const probs2 = checkCurriculum({ ...base, missions: [mThief], tasks: [...TASKS, thief] });
  assert.ok(probs2.some((p) => p.includes('non-support task')), 'claim-bearing task on a support cap passed');

  // Support task on a non-support cap — a probe planted on a target.
  const stray = makeTask({ ...probeTask, id: 'task.time.support.stray', capabilityId: TARGET });
  const mStray = { ...MISSION_MEET_AT_TIME, id: 'mission.z', taskIds: [...MISSION_MEET_AT_TIME.taskIds, stray.id] };
  const probs3 = checkCurriculum({ ...base, missions: [mStray], tasks: [...TASKS, stray] });
  assert.ok(probs3.some((p) => p.includes('non-support capability')), 'support probe on a target cap passed');

  // Role overlap.
  const mOverlap = {
    ...MISSION_MEET_AT_TIME, id: 'mission.w',
    carrierCapabilities: [...MISSION_MEET_AT_TIME.carrierCapabilities, SUPPORT]
  };
  const probs4 = checkCurriculum({ ...base, missions: [mOverlap] });
  assert.ok(probs4.some((p) => p.includes('exactly one mission role')), 'dual-role support passed');
  ok('gate rejects: dead providesFunctions, probe-less support, claim-bearing probe, misplaced probe, role overlap');
}

/* ── 13. UI session: wrong choice → probe interposes → return ── */
{
  const session = createMissionSession({
    learnerId: LEARNER,
    mission: MISSION_MEET_AT_TIME,
    tasks: TASKS,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    now: (() => { let t = T0; return () => (t += 60_000); })(),
    eventStore: createMemoryEventStore(),
    runStore: createMemoryRunStore(),
    idGen: () => 'run.sup.1'
  });
  await session.init();
  await session.start({ learnerName: 'linh' });

  // First screen must be the declared diagnostic on the hear target.
  const s1 = session.screen();
  assert.equal(s1.taskId, HEAR, `first screen should be the declared diagnostic, got ${s1.taskId}`);
  assert.equal(s1.responseType, 'choice');
  const committed = await session.commit({ optionId: 'four' }); // wrong — "three o'clock" was the line
  assert.equal(committed.evaluation.outcome, 'fail');
  await session.next();

  /* The second declared diagnostic still owns phase 0 — the demand
   * interposes as soon as the baseline block finishes. */
  const s1b = session.screen();
  assert.equal(s1b.taskId, 'task.time.diagnostic.say');
  await session.commit({ text: "it's three o'clock" });
  await session.next();

  const s2 = session.screen();
  assert.equal(s2.taskId, PROBE, `the attributing miss should interpose the probe, got ${s2.taskId}`);
  assert.equal(s2.purpose, 'support');
  assert.equal(emittedEventType('support', s2.responseType), 'support_attempt');
  const probeScreen = await session.commit({ optionId: 'ten' });
  assert.equal(probeScreen.evaluation.outcome, 'success');
  const probeEvt = session.log().find((e) => e.taskId === PROBE && e.attempt?.outcome);
  assert.equal(probeEvt.eventType, 'support_attempt', 'probe commit must mint support_attempt, not a claim type');
  assert.equal(probeEvt.evaluation.missingFunctions.length, 0);
  await session.next();

  const s3 = session.screen();
  assert.notEqual(s3.taskId, PROBE, 'demand spent — probe must not repeat');
  const s3Cap = TASKS.find((t) => t.id === s3.taskId)?.capabilityId;
  assert.notEqual(s3Cap, SUPPORT, 'still on the substrate cap after the probe was consumed');

  // Diagnostic attribution on the event the UI committed.
  const missEvt = session.log().find((e) => e.taskId === HEAR && e.attempt?.outcome === 'fail');
  assert.deepEqual(missEvt.evaluation.missingFunctions, ['understand_clock_time', 'identify_spoken_number']);
  // The substrate's honest state: seen, never credited.
  const sub = session.projection().byCapability.get(SUPPORT);
  assert.equal(sub.milestones.independent, false);
  ok('end-to-end: UI commit stamps attribution → probe interposes once → back to the mission path');
}

console.log(`vnext-support-demand: ${check} checks — PASS`);
