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
import { policyB } from '../../src/vnext/next-for-you/policies.js';
import { validateDecision } from '../../src/vnext/next-for-you/validator.js';
import { emptyContext } from '../../src/vnext/next-for-you/decision-context.js';
import { attemptEvent, observeEvent } from './scenarios.js';
import { nextMissionTask } from '../../src/vnext/mission-runner.js';

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
  const ref = time(() => nextMissionTask({
    learnerId: 'SIM', mission: MISSION, tasks: TASKS, capabilities: CAPABILITIES,
    events, riskPriors: RISK_PRIORS, now: base.now, policy: LEARNING_POLICY_V1
  }), iters);
  return { events: events.length, generate: gen, policyB: pol, validate: val, b0, shadow, reference: ref };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const n of [100, 500, 2000]) {
    const r = measure(n);
    console.log(`events=${r.events}`);
    for (const stage of ['generate', 'policyB', 'validate', 'b0', 'shadow', 'reference']) {
      const s = r[stage];
      console.log(`  ${stage.padEnd(10)} median ${s.median.toFixed(1)}ms  p95 ${s.p95.toFixed(1)}ms`);
    }
  }
}
