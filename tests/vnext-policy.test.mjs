/*
 * vNext learning policy (issue #52) — thresholds are versioned data,
 * not engine constants. Engine = what happened; policy = how much is
 * enough. Every derived state and claim carries policyVersion.
 *
 *   resolvePolicy   — registry + fail-closed validation
 *   projection      — retention lag comes from policy, not a constant
 *   planner         — remediation trigger is policy-configured
 *   evaluateClaim   — claim thresholds + policyVersion stamping
 */
import assert from 'node:assert/strict';
import { CAPABILITIES } from '../src/vnext/capabilities.js';
import { projectLearnerState, RETENTION_DELAY_MS } from '../src/vnext/projection.js';
import { planNext } from '../src/vnext/planner.js';
import { bindAttempt } from '../src/vnext/bind.js';
import { LEARNING_POLICY_V1, makePolicy, resolvePolicy, validatePolicy } from '../src/vnext/policy.js';
import { evaluateClaim, runPilotLearner } from '../src/vnext/pilot-harness.js';
import { MISSION_MEET_PERSON, TASKS_MEET_PERSON } from '../src/vnext/fixtures.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const ASK = 'interact.ask_name';
const TASKS = TASKS_MEET_PERSON;
const taskById = (id) => TASKS.find((t) => t.id === id);
const capById = (id) => CAPABILITIES.find((c) => c.id === id);

let seq = 0;
const ev = (taskId, { outcome = 'success', at = T0, support = null, eventType } = {}) =>
  bindAttempt(taskById(taskId), capById(taskById(taskId).capabilityId), {
    id: `pol.${++seq}`, learnerId: 'l.pol', occurredAt: at, eventType,
    attempt: { observed: true, outcome, response: 'r', latencyMs: 900, attemptId: `pol.a.${seq}` },
    support
  });

/* ── 1. policy registry: v1 resolves, unknown/garbage fails closed ── */
{
  assert.equal(resolvePolicy().version, 'vnext.policy.v1');
  assert.equal(resolvePolicy('vnext.policy.v1'), LEARNING_POLICY_V1);
  assert.equal(resolvePolicy(LEARNING_POLICY_V1), LEARNING_POLICY_V1);
  assert.throws(() => resolvePolicy('vnext.policy.v99'), /unknown policy/);
  assert.throws(() => resolvePolicy({ version: 'x' }), /invalid learning policy/);
  assert.throws(() => makePolicy('bad', { retention: { minLagMs: -1 } }), /invalid policy/);
  assert.equal(validatePolicy(LEARNING_POLICY_V1).length, 0);
  assert.ok(validatePolicy({ version: 'v', remediation: { minConsecutiveFailures: 0 } }).length >= 2);
  const custom = makePolicy('vnext.policy.test.strict', { remediation: { minConsecutiveFailures: 2 } });
  assert.equal(custom.remediation.minConsecutiveFailures, 2);
  assert.throws(() => { custom.retention.minLagMs = 1; }, TypeError, 'policy objects are frozen');
}

/* ── 2. retention lag is policy data — same events, different horizon ── */
{
  const events = [
    ev('task.meet.diagnostic.ask_name', { outcome: 'fail', at: T0 }),
    ev('task.meet.remediation.ask_name', { outcome: 'success', at: T0 + 1000, eventType: 'retry' }),
    // Second unaided success 30h after the first — retained only if lag ≤30h.
    ev('task.meet.delayed.check', { outcome: 'success', at: T0 + 1000 + 30 * HOUR })
  ];
  const strict48 = makePolicy('vnext.policy.test.48h', { retention: { minLagMs: 48 * HOUR } });
  const relaxed = makePolicy('vnext.policy.test.20h', { retention: { minLagMs: 20 * HOUR } });
  assert.equal(projectLearnerState('l.pol', events, CAPABILITIES, TASKS).byCapability.get(ASK).milestones.retained, true, 'default 24h horizon');
  assert.equal(projectLearnerState('l.pol', events, CAPABILITIES, TASKS, { policy: strict48 }).byCapability.get(ASK).milestones.retained, false, '48h horizon not yet met');
  assert.equal(projectLearnerState('l.pol', events, CAPABILITIES, TASKS, { policy: relaxed }).byCapability.get(ASK).milestones.retained, true);
  // Explicit retentionDelayMs is still the strongest override (tests).
  assert.equal(projectLearnerState('l.pol', events, CAPABILITIES, TASKS, { policy: strict48, retentionDelayMs: HOUR }).byCapability.get(ASK).milestones.retained, true);
}

/* ── 3. remediation trigger is policy — consecutiveFailures is the fact ── */
{
  const events = [
    ev('task.meet.remediation.ask_name', { outcome: 'success', at: T0, eventType: 'retry' }), // taught
    ev('task.meet.delayed.check', { outcome: 'fail', at: T0 + HOUR }),
    ev('task.meet.delayed.check', { outcome: 'fail', at: T0 + 2 * HOUR })
  ];
  const slot = projectLearnerState('l.pol', events, CAPABILITIES, TASKS).byCapability.get(ASK);
  assert.equal(slot.consecutiveFailures, 2, 'engine reports the fact — two consecutive failures');
  assert.equal(slot.lastAttemptOutcome, 'fail');

  const twoStrikes = makePolicy('vnext.policy.test.rem2', { remediation: { minConsecutiveFailures: 2 } });
  const caps = CAPABILITIES.filter((c) => c.id === ASK);
  // After ONE failure under a 2-strike policy, no remediation intent.
  const oneFail = events.slice(0, 2);
  const plan1 = planNext('l.pol', oneFail, { capabilities: caps, tasks: TASKS, now: T0 + 90 * 60 * 1000, policy: twoStrikes });
  assert.notEqual(plan1.kind, 'retry', 'one failure under minConsecutiveFailures=2 must not remediate');
  const plan2 = planNext('l.pol', events, { capabilities: caps, tasks: TASKS, now: T0 + 90 * 60 * 1000, policy: twoStrikes });
  assert.equal(plan2.kind, 'retry');
  assert.equal(plan2.capabilityId, ASK);
  // Default v1 remediates on a single failure.
  assert.equal(planNext('l.pol', oneFail, { capabilities: caps, tasks: TASKS, now: T0 + 90 * 60 * 1000 }).kind, 'retry');
}

/* ── 4. every derived state + claim carries policyVersion ── */
{
  const proj = projectLearnerState('l.pol', [], CAPABILITIES, TASKS, { policy: makePolicy('vnext.policy.test.pv', {}) });
  assert.equal(proj.policyVersion, 'vnext.policy.test.pv');
  const claim = evaluateClaim('l.pol', [], CAPABILITIES, TASKS, ASK, { policy: makePolicy('vnext.policy.test.pv2', {}) });
  assert.equal(claim.policyVersion, 'vnext.policy.test.pv2');
}

/* ── 5. claim thresholds move with policy, same events ── */
{
  const HOUR = 3600_000;
  const SESSIONS = [
    { name: 'd0', startMs: T0, stepMs: 1000 },
    { name: 'd1', startMs: T0 + 25 * HOUR, stepMs: 1000 },
    { name: 'd2', startMs: T0 + 50 * HOUR, stepMs: 1000 }
  ];
  let n = 0;
  const able = {
    id: 'l.able',
    act: (task) => {
      const aid = `l.able.${++n}`;
      if (task.id === 'task.meet.input.ask_name') return [{ observe: 'exposure' }];
      if (task.id === 'task.meet.diagnostic.ask_name') {
        return [{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 4000, attemptId: aid } }];
      }
      return [{ attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: aid } }];
    }
  };
  const run = runPilotLearner({
    learner: able, mission: MISSION_MEET_PERSON, tasks: TASKS, capabilities: CAPABILITIES, sessions: SESSIONS
  });
  const lenient = makePolicy('vnext.policy.test.lenient', {
    independent: { successfulUnaidedRetrievals: 1, minDistinctSessions: 1 },
    claim: { requireDelayedSuccess: false, requireTransferSuccess: false, requireAssessmentSuccess: false }
  });
  const strict = makePolicy('vnext.policy.test.strict', {
    independent: { successfulUnaidedRetrievals: 99 },
    claim: { blockOnUnresolvedContradiction: true }
  });
  const c1 = evaluateClaim('l.able', run.events, CAPABILITIES, TASKS, ASK, { policy: lenient });
  const c2 = evaluateClaim('l.able', run.events, CAPABILITIES, TASKS, ASK, { policy: strict });
  assert.equal(c1.policyVersion, 'vnext.policy.test.lenient');
  assert.equal(c2.policyVersion, 'vnext.policy.test.strict');
  // Same evidence, different thresholds → different claim outcomes,
  // each stamped with its own policy version.
  assert.equal(c1.learnedByFlashday, true, `lenient gaps: ${c1.gaps.join('|')}`);
  assert.equal(c2.learnedByFlashday, false, 'strict demand of 99 unaided retrievals must not pass on this run');
}

console.log('vnext-policy: registry fail-closed, retention/remediation/claim thresholds versioned — PASS');
