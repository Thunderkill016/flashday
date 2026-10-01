/* §22 performance measurements for the promoted engine (mission 008C).
 *
 * One decision against a realistic A1 event log of size N is the unit
 * of interest — a live session appends ~1 event per learner action, so
 * every select() replays the full log. Measured stages:
 *
 *   generateCandidates   — projection + intent minting
 *   policyB              — selection over candidates
 *   validateDecision     — independent audit recompute
 *   selectNextTask B0    — the full production call (all of the above)
 *   selectNextTask SHADOW— reference + B0 + comparison (worst case)
 *
 * Median and ~p95 over repeated iterations; no SLA is asserted —
 * results are reported in the mission report. */
import { FIXTURES, capabilityById } from '../../src/vnext/fixtures.js';
import { CAPABILITIES } from '../../src/vnext/capabilities.js';
import { LEARNING_POLICY_V1 } from '../../src/vnext/policy.js';
import { RISK_PRIORS } from '../../src/vnext/risk-priors.js';
import { engineState, selectNextTask } from '../../src/vnext/next-for-you/selector.js';
import { generateCandidates } from '../../src/vnext/next-for-you/candidate-generator.js';
import { policyB, policyB1 } from '../../src/vnext/next-for-you/policies.js';
import { validateDecision } from '../../src/vnext/next-for-you/validator.js';
import { deriveCorrectionEpisodes } from '../../src/vnext/correction-episodes.js';
import { emptyContext } from '../../src/vnext/next-for-you/decision-context.js';
import { attemptEvent, observeEvent } from './scenarios.js';
import { nextMissionTask } from '../../src/vnext/mission-runner.js';
import { buildLearnerModel } from '../../src/vnext/learner-model.js';
import { projectLearnerState } from '../../src/vnext/projection.js';
import { deriveSupportLifecycle } from '../../src/vnext/planner.js';
import { decisionInputSnapshot } from '../../src/vnext/next-for-you/decision-log.js';
import { sha256 } from '../../src/vnext/next-for-you/canonical.js';
import { resolvePolicy } from '../../src/vnext/policy.js';

const MIN = 60_000;
const T0 = Date.parse('2026-02-01T09:00:00Z');
const TASKS = FIXTURES.flatMap((f) => f.tasks);
const MISSION = FIXTURES.find((f) => f.mission.id === 'mission.meet_at_a_time').mission;

/* Mint a synthetic log of ~target events by cycling the registry with
 * increasing timestamps — a long realistic learner history shape
 * (mixed observations and attempts across capabilities). */
export function synthEvents(target) {
  const events = [];
  const eliciting = TASKS.filter((t) => t.purpose !== 'input' && t.purpose !== 'notice');
  const exposing = TASKS.filter((t) => t.purpose === 'input' || t.purpose === 'notice');
  let at = T0;
  let i = 0;
  while (events.length < target) {
    const task = eliciting[i % eliciting.length];
    const cap = capabilityById(task.capabilityId);
    events.push(attemptEvent(task, cap, { at, outcome: i % 7 === 0 ? 'fail' : 'success' }));
    at += 5 * MIN;
    if (events.length < target && i % 3 === 0) {
      const ot = exposing[i % exposing.length];
      const oc = capabilityById(ot.capabilityId);
      events.push(observeEvent(ot, oc, { at }));
      at += MIN;
    }
    i += 1;
  }
  return events;
}

function time(fn, iters = 21) {
  const samples = [];
  for (let i = 0; i < iters; i += 1) {
    const t0 = process.hrtime.bigint();
    fn();
    samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p95 = samples[Math.floor(samples.length * 0.95)];
  return { median, p95 };
}

export function measure(target, iters = 21) {
  const events = synthEvents(target);
  const base = {
    learnerId: 'SIM', mission: MISSION, tasks: TASKS, capabilities: CAPABILITIES,
    events, riskPriors: RISK_PRIORS, policy: LEARNING_POLICY_V1,
    selection: {}, decisionContext: emptyContext('ep.perf', 'ses.perf'), now: T0 + 1e12
  };
  const state = engineState(base);
  const input = { ...base };
  const gen = time(() => generateCandidates(state), iters);
  const candidates = generateCandidates(state);
  const pol = time(() => policyB({ ...state, candidates }), iters);
  const decision = policyB({ ...state, candidates });
  const val = time(() => validateDecision(decision, {
    events, tasks: TASKS, capabilities: CAPABILITIES, roles: state.roles, mission: MISSION,
    learnerId: 'SIM', now: base.now, policy: LEARNING_POLICY_V1, selection: {}, decisionContext: base.decisionContext
  }), iters);
  const b0 = time(() => selectNextTask({ ...input, mode: 'b0' }), iters);
  const shadow = time(() => selectNextTask({ ...input, mode: 'shadow_b0' }), iters);
  /* 008F: B1 = B0 + episode derivation + gate; shadow_b1 = worst case
   * (reference + B0 + B1 + classifier + both validations). */
  const b1 = time(() => selectNextTask({ ...input, mode: 'b1' }), iters);
  const shadowB1 = time(() => selectNextTask({ ...input, mode: 'shadow_b1' }), iters);
  const ref = time(() => nextMissionTask({
    learnerId: 'SIM', mission: MISSION, tasks: TASKS, capabilities: CAPABILITIES,
    events, riskPriors: RISK_PRIORS, now: base.now, policy: LEARNING_POLICY_V1
  }), iters);
  return { events: events.length, generate: gen, policyB: pol, validate: val, b0, shadow, b1, shadowB1, reference: ref };
}

/* 008D P2 — stage-level breakdown inside one B0 select. The composite
 * "b0" number splits into: learner-model replay, projection replay,
 * support-lifecycle replay, the canonical input digest, candidate
 * generation (contains the first three + candidacy minting), policy
 * ordering, and the independent validator (which re-derives state —
 * by design, see §21). */
export function profileStages(target, iters = 15) {
  const events = synthEvents(target);
  const base = {
    learnerId: 'SIM', mission: MISSION, tasks: TASKS, capabilities: CAPABILITIES,
    events, riskPriors: RISK_PRIORS, policy: LEARNING_POLICY_V1,
    selection: {}, decisionContext: emptyContext('ep.perf', 'ses.perf'), now: T0 + 1e12
  };
  const state = engineState(base);
  const pol = resolvePolicy(LEARNING_POLICY_V1);
  const stages = {
    learnerModel: time(() => buildLearnerModel({
      learnerId: 'SIM', events, capabilities: CAPABILITIES, tasks: TASKS, policy: pol, now: base.now, roles: state.roles
    }), iters),
    projection: time(() => projectLearnerState('SIM', events, CAPABILITIES, TASKS, { policy: pol }), iters),
    supportLifecycle: time(() => deriveSupportLifecycle('SIM', events, { capabilities: CAPABILITIES, tasks: TASKS, roles: state.roles, policy: pol }), iters),
    digest: time(() => sha256(decisionInputSnapshot({ ...state })), iters),
    generate: time(() => generateCandidates(state), iters),
    policyB: null,
    validate: null,
    /* 008F stages: episode replay is the only net-new derivation B1
     * pays for; b1/shadowB1 measure the full select paths. */
    episodes: time(() => deriveCorrectionEpisodes({
      learnerId: 'SIM', events, capabilities: CAPABILITIES, tasks: TASKS, policy: pol, now: base.now
    }), iters),
    b0: time(() => selectNextTask({ ...base, mode: 'b0' }), iters),
    shadow: time(() => selectNextTask({ ...base, mode: 'shadow_b0' }), iters),
    b1: time(() => selectNextTask({ ...base, mode: 'b1' }), iters),
    shadowB1: time(() => selectNextTask({ ...base, mode: 'shadow_b1' }), iters),
    reference: time(() => nextMissionTask({
      learnerId: 'SIM', mission: MISSION, tasks: TASKS, capabilities: CAPABILITIES,
      events, riskPriors: RISK_PRIORS, now: base.now, policy: LEARNING_POLICY_V1
    }), iters)
  };
  const candidates = generateCandidates(state);
  stages.policyB = time(() => policyB({ ...state, candidates }), iters);
  const decision = policyB({ ...state, candidates });
  stages.validate = time(() => validateDecision(decision, {
    events, tasks: TASKS, capabilities: CAPABILITIES, roles: state.roles, mission: MISSION,
    learnerId: 'SIM', now: base.now, policy: LEARNING_POLICY_V1, selection: {}, decisionContext: base.decisionContext
  }), iters);
  return { events: events.length, stages };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stageOnly = process.argv.includes('--stages');
  for (const n of [100, 500, 2000]) {
    const r = measure(n);
    console.log(`events=${r.events}`);
    for (const stage of ['generate', 'policyB', 'validate', 'b0', 'shadow', 'b1', 'shadowB1', 'reference']) {
      const s = r[stage];
      console.log(`  ${stage.padEnd(10)} median ${s.median.toFixed(1)}ms  p95 ${s.p95.toFixed(1)}ms`);
    }
    if (stageOnly || n === 2000) {
      const p = profileStages(n);
      console.log('  — stage breakdown —');
      for (const [k, s] of Object.entries(p.stages)) {
        console.log(`    ${k.padEnd(16)} median ${s.median.toFixed(1)}ms  p95 ${s.p95.toFixed(1)}ms`);
      }
    }
  }
}
