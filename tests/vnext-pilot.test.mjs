/*
 * vNext pilot harness (issue #50) — cohort of scripted learners through
 * the full contract stack across four deterministic sessions:
 *
 *   day0   baseline → teach → independent
 *   day1   +25h  delayed check → held-out transfer → fresh assessment
 *   day2   +50h  delayed check (second horizon)
 *   day3   +75h  delayed check (72h retention probe — reported, never claimed on)
 *   day4   +100h delayed check (post-horizon probe)
 *
 * Sessions are spaced 25h apart so a delayed check scheduled by ANY
 * event inside the previous session is always due at the next session's
 * first step — no epsilon drift between `due` and `now`.
 *
 * Learner scripts only report observed reality (outcomes, latency,
 * support used); every event is still minted by bindAttempt/
 * bindObservation under the real task contracts. Claims are recomputed
 * from primitive verified evidence — engine milestones are outputs,
 * never inputs (R2 research on issue #49).
 */
import assert from 'node:assert/strict';
import { CAPABILITIES } from '../src/vnext/capabilities.js';
import { RETENTION_DELAY_MS } from '../src/vnext/projection.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { MISSION_MEET_PERSON, TASKS_MEET_PERSON } from '../src/vnext/fixtures.js';
import { runPilot, runPilotLearner, evaluateClaim } from '../src/vnext/pilot-harness.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const ASK = 'interact.ask_name';
const TASKS = TASKS_MEET_PERSON;

const SESSIONS = [
  { name: 'day0', startMs: T0,            stepMs: 1000 },
  { name: 'day1', startMs: T0 + 25 * HOUR,  stepMs: 1000 },
  { name: 'day2', startMs: T0 + 50 * HOUR,  stepMs: 1000 },
  { name: 'day3', startMs: T0 + 75 * HOUR,  stepMs: 1000 },
  { name: 'day4', startMs: T0 + 100 * HOUR, stepMs: 1000 }
];

/* Outcomes scripted by `ctx.call` — the Nth time THIS task was served
 * in THIS run (counted by the harness, reset every run). A delayed
 * check only runs when due, so which session serves the Nth call is
 * the engine's decision; the script only decides what the learner does. */

/* Per-learner scripted reality. `script` maps taskId → (ctx) => specs;
 * anything unscripted is a routine correct response — every capability
 * a learner has no scripted failure for is simply something they can do. */
const learner = (id, script) => {
  let n = 0;
  const aid = (tag) => `${id}.${tag}.${++n}`;
  const ok = (resp = 'ok', lat = 900, extra = {}) =>
    [{ attempt: { observed: true, outcome: 'success', response: resp, latencyMs: lat, attemptId: aid('a') }, ...extra }];
  return {
    id,
    act: (task, ctx) => (script[task.id]?.(ctx, { aid, ok }) ?? ok())
  };
};

/* Shared day-0 path for learners who CANNOT yet ask the question:
 * baseline fail → input → hinted retrieval → guided partial+model
 * → remediation feedback+retry → INDEPENDENT. Later-session behavior
 * differs per archetype via `overrides`. */
const struggling = (id, overrides = {}) => learner(id, {
  'task.meet.diagnostic.ask_name': () =>
    [{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 5000, attemptId: `${id}.d.ask` } }],
  'task.meet.input.ask_name': () => [{ observe: 'exposure' }],
  'task.meet.retrieval.ask_name': (ctx, { aid }) => [{
    attempt: { observed: true, outcome: 'success', response: "What's … name?", latencyMs: 2400, attemptId: aid('r') },
    support: { hint: true }
  }],
  'task.meet.interaction.guided': (ctx, { aid }) => [{
    attempt: { observed: true, outcome: 'partial', response: 'What your name?', latencyMs: 3200, attemptId: aid('g') },
    support: { modelAnswer: true }
  }],
  'task.meet.remediation.ask_name': (ctx, { aid }) => [
    { observe: 'feedback', attempt: { attemptId: aid('fb') }, feedback: { given: true, target: 'question word order' } },
    { eventType: 'retry', attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 1100, attemptId: aid('rem') } }
  ],
  'task.meet.delayed.check': (ctx, { aid }) =>
    [{ eventType: 'delayed_retrieval', attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 1400, attemptId: aid('dr') } }],
  'task.meet.transfer.street': (ctx, { aid }) =>
    [{ attempt: { observed: true, outcome: 'success', response: "I'm Sam — and you? … What's your name?", latencyMs: 1600, attemptId: aid('tr') } }],
  'task.meet.assessment.checkpoint': (ctx, { aid }) =>
    [{ attempt: { observed: true, outcome: 'success', response: 'full exchange', latencyMs: 1900, attemptId: aid('ck') } }],
  ...overrides
});

const COHORT = [
  /* 1. Fast — clean unaided retrieval on day0; every later probe passes. */
  learner('learner.fast', {
    'task.meet.diagnostic.ask_name': (ctx, { aid }) =>
      [{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 4000, attemptId: aid('d') } }],
    'task.meet.input.ask_name': () => [{ observe: 'exposure' }],
    'task.meet.retrieval.ask_name': (ctx, { aid }) =>
      [{ attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 1500, attemptId: aid('r') } }]
  }),

  /* 2. Support-dependent — the full remediate-then-succeed path. */
  struggling('learner.dependent'),

  /* 3. Forgetful — the first two delayed checks fail; every later one
   *    passes. Fail → remediate → requalify, twice, then resolution. */
  struggling('learner.forgetful', {
    'task.meet.delayed.check': (ctx, { aid }) => [{
      eventType: 'delayed_retrieval',
      attempt: {
        observed: true, outcome: ctx.call > 2 ? 'success' : 'fail',
        response: ctx.call > 2 ? "What's your name?" : '…', latencyMs: 3800, attemptId: aid('dr')
      }
    }]
  }),

  /* 4. Baseline-able — already knows everything; nothing is FlashDay's. */
  learner('learner.able', {}),

  /* 5. Oscillator — delayed fail, transfer fail, assessment fail, each
   *    remediated and re-passed; then the retention-horizon probes keep
   *    failing so the claim must stay open instead of collapsing to
   *    LEARNED. Delayed outcomes: fail, pass, fail, fail … */
  struggling('learner.osc', {
    'task.meet.delayed.check': (ctx, { aid }) => [{
      eventType: 'delayed_retrieval',
      attempt: {
        observed: true, outcome: ctx.call === 2 ? 'success' : 'fail',
        response: ctx.call === 2 ? "What's your name?" : '…', latencyMs: 3600, attemptId: aid('dr')
      }
    }],
    'task.meet.transfer.street': (ctx, { aid }) => [{
      attempt: {
        observed: true, outcome: ctx.call > 1 ? 'success' : 'fail',
        response: ctx.call > 1 ? "I'm Sam — and you?" : '…', latencyMs: 2600, attemptId: aid('tr')
      }
    }],
    'task.meet.assessment.checkpoint': (ctx, { aid }) => [{
      attempt: {
        observed: true, outcome: ctx.call > 1 ? 'success' : 'fail',
        response: ctx.call > 1 ? 'full exchange' : 'partial exchange', latencyMs: 2400, attemptId: aid('ck')
      }
    }]
  })
];

const PILOT = { learners: COHORT, mission: MISSION_MEET_PERSON, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS, targetCapabilities: [ASK] };

/* ── 1. cohort run — every learner terminates, claims evaluate ── */
{
  const report = runPilot(PILOT);
  assert.equal(report.learners.length, 5);
  for (const r of report.learners) {
    assert.ok(r.events.length > 0, `${r.learnerId} produced no events`);
    assert.ok(r.trace.length > 0, `${r.learnerId} empty trace`);
    assert.ok(r.claims[ASK], `${r.learnerId} missing claim`);
    assert.equal(r.events.every((e) => e.learnerId === r.learnerId), true, `${r.learnerId} leaked a foreign event`);
    assert.equal(r.events.every((e) => e.binding?.purpose != null), true, `${r.learnerId} has an unbound event`);
  }
}

/* ── 2. fast learner — full claim ── */
{
  const run = runPilotLearner({ learner: COHORT[0], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  const claim = evaluateClaim(run.learnerId, run.events, CAPABILITIES, TASKS, ASK);
  assert.equal(claim.acquisitionSource, 'FLASHDAY');
  assert.equal(claim.learnedByFlashday, true, `gaps: ${claim.gaps.join(' | ')}`);
  assert.equal(claim.retained24h, true);
  assert.equal(claim.retained72h, true, 'day3 probe should certify 72h retention');
  assert.equal(claim.transferred, true);
  assert.equal(claim.assessmentStatus, 'pass');
  assert.equal(claim.needsRelearning, false);
  assert.equal(claim.integrity.transferredMatchesPrimitives, true);
  assert.equal(claim.integrity.independentMatchesPrimitives, true);
}

/* ── 3. dependent learner — supported → independent → full claim ── */
{
  const run = runPilotLearner({ learner: COHORT[1], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  const claim = evaluateClaim(run.learnerId, run.events, CAPABILITIES, TASKS, ASK);
  assert.equal(claim.learnedByFlashday, true, `gaps: ${claim.gaps.join(' | ')}`);
  assert.equal(claim.remediationEpisodes >= 1, true, 'supported path must record remediation');
  assert.ok(claim.unaidedSuccesses >= 2);
}

/* ── 4. forgetful — delayed fail ×2 resolves; contradiction rule ── */
{
  const run = runPilotLearner({ learner: COHORT[2], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  const delayed = run.events.filter((e) => e.capabilityId === ASK && e.eventType === 'delayed_retrieval');
  assert.equal(delayed.filter((e) => e.attempt?.outcome === 'fail').length, 2, 'expected two delayed failures');
  const claim = evaluateClaim(run.learnerId, run.events, CAPABILITIES, TASKS, ASK);
  assert.equal(claim.learnedByFlashday, true, `gaps: ${claim.gaps.join(' | ')}`);
  assert.equal(claim.needsRelearning, false, 'a repaired failure is resolved, not open');
  assert.equal(claim.remediationEpisodes >= 2, true, 'two delayed failures should produce ≥2 remediation episodes');
}

/* ── 5. baseline-able — PREEXISTING, never claimable ── */
{
  const run = runPilotLearner({ learner: COHORT[3], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  const taught = run.trace.filter((t) =>
    ['task.meet.input.ask_name', 'task.meet.retrieval.ask_name', 'task.meet.interaction.guided', 'task.meet.remediation.ask_name'].includes(t.taskId));
  assert.equal(taught.length, 0, 'a baseline passer must never receive teaching tasks');
  const claim = evaluateClaim(run.learnerId, run.events, CAPABILITIES, TASKS, ASK);
  assert.equal(claim.acquisitionSource, 'PREEXISTING');
  assert.equal(claim.baselineMastered, true);
  assert.equal(claim.learnedByFlashday, false, 'FlashDay must never claim preexisting ability');
  assert.equal(claim.transferred, true, 'confirmation work still runs — milestones still true');
  assert.equal(claim.retained24h, true);
}

/* ── 6. oscillator — needsRelearning, claim stays open ── */
{
  const run = runPilotLearner({ learner: COHORT[4], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  const transfers = run.events.filter((e) => e.capabilityId === ASK && e.eventType === 'transfer_attempt');
  assert.equal(transfers[0]?.attempt?.outcome, 'fail', 'first transfer should fail');
  assert.equal(transfers[transfers.length - 1]?.attempt?.outcome, 'success', 'transfer retry must still be able to pass — novelty not burned');
  const checkpoints = run.events.filter((e) => e.capabilityId === ASK && e.eventType === 'checkpoint');
  assert.equal(checkpoints.length >= 2, true, 'failed assessment must be re-probed, not dead-ended');
  const claim = evaluateClaim(run.learnerId, run.events, CAPABILITIES, TASKS, ASK);
  assert.equal(claim.transferred, true, 'milestone is historical evidence — stays true');
  assert.equal(claim.learnedByFlashday, false, 'open 72h contradiction must block the claim');
  assert.equal(claim.needsRelearning, true);
  assert.equal(claim.retained24h, true, 'day2 delayed pass is real retained-24h evidence');
  assert.equal(claim.retained72h, false, 'the +73h probe failed — horizon reported honestly');
  assert.equal(claim.assessmentStatus, 'pass');
  assert.equal(claim.integrity.transferredMatchesPrimitives, true);
}

/* ── 7. cohort summary — no vanity metrics, integrity clean ── */
{
  const report = runPilot(PILOT);
  const s = report.summary;
  assert.equal(s.claimsEligible, 4, 'baseline-mastered learner excluded from eligible claims');
  assert.equal(s.claimsSatisfied, 3, 'fast + dependent + forgetful learn; oscillator does not');
  assert.equal(s.claimRate, 0.75);
  assert.equal(s.baselineMastered, 1);
  assert.equal(s.needsRelearning, 1);
  assert.deepEqual(s.integrityFailures, [], 'zero invalid promotions across the cohort');
}

/* ── 8. deterministic replay — identical inputs, identical report ── */
{
  const a = runPilot({ ...PILOT, learners: [COHORT[1]] });
  const b = runPilot({ ...PILOT, learners: [COHORT[1]] });
  assert.deepEqual(a.learners[0].claims, b.learners[0].claims);
  assert.equal(a.learners[0].events.length, b.learners[0].events.length);
  assert.deepEqual(
    a.learners[0].trace.map((t) => [t.taskId, t.purpose, t.status]),
    b.learners[0].trace.map((t) => [t.taskId, t.purpose, t.status])
  );
}

/* ── 9. learner isolation — one learner's events cannot feed another's claim ── */
{
  const fast = runPilotLearner({ learner: COHORT[0], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  // A second learner with the fast learner's events sees nothing.
  const foreign = evaluateClaim('learner.stranger', fast.events, CAPABILITIES, TASKS, ASK);
  assert.equal(foreign.learnedByFlashday, false);
  assert.equal(foreign.acquisitionSource, 'FLASHDAY', 'no events at all — nothing preexisting');
  assert.equal(foreign.transferred, false);
}

/* ── 10. forged evidence cannot mint a claim ── */
{
  const run = runPilotLearner({ learner: COHORT[0], mission: PILOT.mission, tasks: TASKS, capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, sessions: SESSIONS });
  const forged = [...run.events, {
    id: 'forged.1', learnerId: 'learner.fast', capabilityId: ASK,
    taskId: 'task.meet.transfer.street', taskRevision: 99,
    eventType: 'transfer_attempt', modality: 'spoken_interaction',
    occurredAt: T0 + 99 * HOUR,
    context: { missionId: 'mission.meet_new_person', practicedOrTransfer: 'transfer', promptFamily: 'meet.ask_name.street.v1' },
    attempt: { observed: true, outcome: 'success', latencyMs: 100, attemptId: 'f.1' },
    evaluation: { authority: 'deterministic', contractId: 'eval.required_functions.v1' },
    binding: { purpose: 'transfer', familyClass: 'fresh_transfer', freshnessRequired: true, effectiveSupportAllowed: [] }
  }];
  // Wrong-revision event is unverifiable — it is neither proof nor contradiction.
  const claim = evaluateClaim('learner.fast', forged, CAPABILITIES, TASKS, ASK);
  const clean = evaluateClaim('learner.fast', run.events, CAPABILITIES, TASKS, ASK);
  assert.deepEqual(claim, clean, 'forged event changed the claim');
}

console.log('vnext-pilot: cohort claims, baseline attribution, contradiction resolution, re-probe, replay & isolation — PASS');
