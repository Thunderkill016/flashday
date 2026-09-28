/*
 * vNext headless engine — capability graph, evidence model, projection,
 * Vietnamese risk priors, deterministic planner (issue #42).
 *
 * These tests pin the non-negotiable distinctions from the spec:
 *   aided success        != independent success
 *   immediate success    != retention
 *   same-prompt repeat   != transfer
 *   modality A evidence  != modality B learned
 *   population risk      != individual weakness
 *   replay               == same learner state
 */
import assert from 'node:assert/strict';
import {
  CAPABILITIES,
  capabilityById,
  validateGraph
} from '../src/vnext/capabilities.js';
import { makeEvent } from '../src/vnext/evidence.js';
import {
  RETENTION_DELAY_MS,
  projectLearnerState
} from '../src/vnext/projection.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { planNext } from '../src/vnext/planner.js';

const T0 = Date.parse('2026-01-05T09:00:00Z');
const HOUR = 3600_000;
let seq = 0;

function ev(capabilityId, over = {}) {
  return makeEvent({
    id: `e${++seq}`,
    learnerId: 'learner-test',
    capabilityId,
    taskId: `t.${capabilityId}`,
    taskRevision: 1,
    eventType: 'production_attempt',
    modality: capabilityById(capabilityId).modality,
    occurredAt: T0 + seq * 1000,
    context: {
      missionId: 'm.baseline',
      practicedOrTransfer: 'practiced',
      promptFamily: 'p.practiced',
      partnerType: 'tutor'
    },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900 },
    ...over
  });
}

const stateOf = (log, id) => projectLearnerState(log, CAPABILITIES).byCapability.get(id);

// ── Graph sanity ─────────────────────────────────────────────
{
  const problems = validateGraph(CAPABILITIES);
  assert.deepEqual(problems, [], `graph must be valid: ${problems.join(' | ')}`);
  assert.ok(CAPABILITIES.length >= 12, 'spec asks for 12+ capabilities');
  const modalities = new Set(CAPABILITIES.map((c) => c.modality));
  for (const m of ['listening', 'spoken_interaction', 'spoken_production', 'reading', 'writing']) {
    assert.ok(modalities.has(m), `modality covered: ${m}`);
  }
  console.log('✓ graph: 12+ capabilities, all modalities, acyclic prerequisites');
}

// ── 1. Aided success can never become INDEPENDENT ────────────
{
  const cap = 'interact.greet';
  const hinted = stateOf([
    ev(cap, { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev(cap, {
      support: { hint: true, translation: false, transcript: false, modelAnswer: false, repeat: false }
    })
  ], cap);
  assert.equal(hinted.state, 'SUPPORTED', 'hint-aided success is supported work');
  assert.equal(hinted.milestones.independent, false);

  for (const flag of ['translation', 'transcript', 'modelAnswer']) {
    const s = stateOf([
      ev(cap, { support: { hint: false, translation: false, transcript: false, modelAnswer: false, repeat: false, [flag]: true } })
    ], cap);
    assert.equal(s.state, 'SUPPORTED', `${flag}-aided success stays SUPPORTED`);
  }

  // repeat-only support does not supply the answer — unaided in spirit.
  const repeatOnly = stateOf([
    ev(cap, { support: { hint: false, translation: false, transcript: false, modelAnswer: false, repeat: true } })
  ], cap);
  assert.equal(repeatOnly.state, 'INDEPENDENT', 'a repeated prompt is not answer-bearing support');

  // self-reported (unobserved) success cannot prove independence.
  const selfReported = stateOf([ev(cap, { attempt: { observed: false, outcome: 'success', response: 'x', latencyMs: null } })], cap);
  assert.equal(selfReported.milestones.independent, false, 'unobserved success is not independent evidence');
  console.log('✓ aided/self-reported success cannot become INDEPENDENT');
}

// ── 2. Immediate success can never become RETAINED ───────────
{
  const cap = 'speak.say_own_name';
  const log = [
    ev(cap, { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev(cap, { occurredAt: T0 + HOUR }),
    ev(cap, { occurredAt: T0 + 2 * HOUR }) // two successes, one hour apart
  ];
  const s = stateOf(log, cap);
  assert.equal(s.milestones.independent, true);
  assert.equal(s.milestones.retained, false, 'same-session success is not retention');
  assert.equal(s.state, 'INDEPENDENT');

  const retained = stateOf([
    ...log,
    ev(cap, { eventType: 'delayed_retrieval', occurredAt: T0 + HOUR + RETENTION_DELAY_MS })
  ], cap);
  assert.equal(retained.milestones.retained, true, 'success after the delay earns RETAINED');
  assert.equal(retained.state, 'RETAINED');
  console.log('✓ immediate success cannot become RETAINED; delayed success can');
}

// ── 3. Same-prompt repetition is not TRANSFERRED ─────────────
{
  const cap = 'interact.greet';
  // Flagged 'transfer' but the SAME promptFamily as the practiced one —
  // replaying the rehearsed prompt must not count as transfer.
  const s = stateOf([
    ev(cap),
    ev(cap, { occurredAt: T0 + 50 * HOUR }),
    ev(cap, {
      eventType: 'transfer_attempt',
      occurredAt: T0 + 52 * HOUR,
      context: { missionId: 'm.cafe', practicedOrTransfer: 'transfer', promptFamily: 'p.practiced', partnerType: 'stranger' }
    })
  ], cap);
  assert.equal(s.milestones.retained, true);
  assert.equal(s.milestones.transferred, false, 'replaying the practiced prompt is not transfer');
  assert.equal(s.state, 'RETAINED');

  const transferred = stateOf([
    ev(cap),
    ev(cap, { occurredAt: T0 + 50 * HOUR }), // retained first
    ev(cap, {
      eventType: 'transfer_attempt',
      occurredAt: T0 + 52 * HOUR,
      context: { missionId: 'm.cafe', practicedOrTransfer: 'transfer', promptFamily: 'p.novel', partnerType: 'stranger' }
    })
  ], cap);
  assert.equal(transferred.milestones.transferred, true, 'novel context/prompt is real transfer evidence');
  assert.equal(transferred.state, 'TRANSFERRED');
  console.log('✓ same-prompt repeat is not TRANSFERRED; changed context is');
}

// ── 4. One modality cannot mark another as learned ───────────
{
  // A spoken-production event filed against a listening capability gets
  // zero credit — the modality must match the capability's declared one.
  const wrongModality = stateOf([
    ev('listen.identity_question_basic', { modality: 'spoken_production' })
  ], 'listen.identity_question_basic');
  assert.equal(wrongModality.state, 'NOT_SEEN', 'a speaking event cannot teach listening');

  // Evidence is per-capability: learning to say your name does not make
  // you able to hear the question.
  const log = [
    ev('speak.say_own_name', { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev('speak.say_own_name'),
    ev('speak.say_own_name', { occurredAt: T0 + 30 * HOUR })
  ];
  const projection = projectLearnerState(log, CAPABILITIES);
  assert.equal(projection.byCapability.get('speak.say_own_name').state, 'RETAINED');
  assert.equal(projection.byCapability.get('listen.identity_question_basic').state, 'NOT_SEEN',
    'producing the answer never marks the listening prerequisite known');
  console.log('✓ modality isolation: speaking evidence cannot mark listening learned');
}

// ── 5. Population priors cannot mutate learner state ─────────
{
  const empty = projectLearnerState([], CAPABILITIES);
  const before = empty.byCapability.get('interact.ask_name');
  assert.equal(before.state, 'NOT_SEEN');
  assert.deepEqual(before.milestones.independent, false);

  // Priors are diagnostic hints: they may schedule probes via the planner
  // but a fresh learner's evidence state is untouched by them.
  for (const prior of RISK_PRIORS) {
    assert.equal(prior.learnerStateEffect, 'none_without_observed_evidence');
  }
  const plan = planNext([], { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 });
  assert.notEqual(plan.kind, 'remediate', 'no remediation without evidence of failure');
  assert.ok(['diagnostic_probe', 'expose'].includes(plan.kind), `fresh learner gets input or a probe, got ${plan.kind}`);
  console.log('✓ risk priors schedule diagnostics only — never mark weakness');
}

// ── 6. Replay determinism ────────────────────────────────────
{
  const cap = 'interact.greet';
  const log = [
    ev(cap, { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev(cap, { support: { hint: true, translation: false, transcript: false, modelAnswer: false, repeat: false } }),
    ev(cap),
    ev(cap, { eventType: 'delayed_retrieval', occurredAt: T0 + 40 * HOUR }),
    ev(cap, {
      eventType: 'transfer_attempt',
      occurredAt: T0 + 60 * HOUR,
      context: { missionId: 'm2', practicedOrTransfer: 'transfer', promptFamily: 'p.novel', partnerType: 'stranger' }
    })
  ];
  const a = projectLearnerState(log, CAPABILITIES);
  const b = projectLearnerState(log, CAPABILITIES);
  assert.deepEqual(a, b, 'same log → identical projection');
  // A prefix replay reproduces the intermediate state exactly.
  const prefix = projectLearnerState(log.slice(0, 3), CAPABILITIES);
  assert.equal(prefix.byCapability.get(cap).state, 'INDEPENDENT');
  const full = projectLearnerState([...log.slice(0, 3), ...log.slice(3)], CAPABILITIES);
  assert.equal(full.byCapability.get(cap).state, 'TRANSFERRED');
  console.log('✓ replay is deterministic; prefixes reproduce intermediate states');
}

// ── 7. Vertical slice: baseline fail → input → retrieval → supported
//        interaction → feedback → retry → independent → delayed →
//        changed-context transfer — planner routes every step ──
{
  const cap = 'interact.greet';
  const pre = 'listen.greeting_basic';
  const opts = { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 };
  const log = [];
  const at = (offsetMs) => T0 + offsetMs;

  // Baseline probe: cold attempt fails. A failed baseline is diagnostic —
  // the planner must route to TEACHING (the unmet prerequisite), not to
  // retrying something that was never taught.
  log.push(ev(cap, {
    eventType: 'interaction_turn',
    occurredAt: at(0),
    attempt: { observed: true, outcome: 'fail', response: '...', latencyMs: 4000 }
  }));
  assert.equal(stateOf(log, cap).state, 'EXPOSED', 'a baseline fail still means the capability was encountered');
  let plan = planNext(log, opts);
  assert.equal(plan.capabilityId, pre, 'planner walks to the unmet prerequisite');
  assert.ok(['diagnostic_probe', 'expose'].includes(plan.kind), `teach the prereq, got ${plan.kind}`);
  assert.equal(stateOf(log, pre).state, 'NOT_SEEN');

  // Meaningful input on the prerequisite.
  log.push(ev(pre, {
    eventType: 'exposure',
    occurredAt: at(1_000),
    attempt: { observed: true, outcome: null, response: null, latencyMs: null }
  }));
  assert.equal(stateOf(log, pre).state, 'EXPOSED');
  assert.equal(planNext(log, opts).kind, 'resume', 'an open encounter resumes before anything else');

  // Guided retrieval with a hint — supported, not independent.
  log.push(ev(pre, {
    eventType: 'recall_attempt',
    occurredAt: at(2_000),
    support: { hint: true, translation: false, transcript: false, modelAnswer: false, repeat: false }
  }));
  assert.equal(stateOf(log, pre).state, 'SUPPORTED');
  assert.equal(planNext(log, opts).kind, 'independent_attempt', 'supported work earns an unaided run');

  // Unaided recall — prerequisite is now INDEPENDENT.
  log.push(ev(pre, { eventType: 'recall_attempt', occurredAt: at(3_000) }));
  assert.equal(stateOf(log, pre).state, 'INDEPENDENT');
  plan = planNext(log, opts);
  assert.equal(plan.capabilityId, cap, 'prereq learned → target capability becomes eligible');
  assert.ok(['diagnostic_probe', 'expose'].includes(plan.kind), `introduce the target, got ${plan.kind}`);

  // Supported interaction on the target capability.
  log.push(ev(cap, {
    eventType: 'interaction_turn',
    occurredAt: at(4_000),
    support: { hint: false, translation: false, transcript: false, modelAnswer: true, repeat: false }
  }));
  assert.equal(stateOf(log, cap).state, 'SUPPORTED', 'model-aided turn is supported work');
  assert.equal(planNext(log, opts).capabilityId, cap);

  // Feedback lands as its own event; the retry is unaided and clean.
  log.push(ev(cap, {
    eventType: 'feedback',
    occurredAt: at(5_000),
    attempt: { observed: true, outcome: null, response: null, latencyMs: null },
    feedback: { given: true, target: 'stress on greeting' }
  }));
  log.push(ev(cap, { eventType: 'interaction_turn', occurredAt: at(6_000) }));
  assert.equal(stateOf(log, cap).state, 'INDEPENDENT', 'unaided retry earns INDEPENDENT');

  // Once the retention window opens, the delayed check is the next work.
  // Earliest-due wins: the prerequisite learned first is due first.
  plan = planNext(log, { ...opts, now: at(6_000) + RETENTION_DELAY_MS });
  assert.equal(plan.kind, 'delayed_retrieval', 'after independence the next work is a delayed check');
  assert.equal(plan.capabilityId, pre, 'the earlier-learned capability is due first');

  // Both due capabilities re-test and survive the delay.
  log.push(ev(pre, { eventType: 'delayed_retrieval', occurredAt: at(6_000) + RETENTION_DELAY_MS }));
  log.push(ev(cap, {
    eventType: 'delayed_retrieval',
    occurredAt: at(6_000) + RETENTION_DELAY_MS + 1000
  }));
  assert.equal(stateOf(log, cap).state, 'RETAINED', 'survived the delay');
  assert.equal(stateOf(log, pre).state, 'RETAINED');

  // Retained abilities get sent into changed contexts — pre first.
  plan = planNext(log, { ...opts, now: at(6_000) + RETENTION_DELAY_MS + HOUR });
  assert.equal(plan.kind, 'transfer', 'retained ability is sent into a changed context');
  assert.equal(plan.capabilityId, pre);

  log.push(ev(pre, {
    eventType: 'transfer_attempt',
    occurredAt: at(6_000) + RETENTION_DELAY_MS + HOUR,
    context: { missionId: 'm.street', practicedOrTransfer: 'transfer', promptFamily: 'p.street', partnerType: 'stranger' }
  }));
  assert.equal(stateOf(log, pre).state, 'TRANSFERRED');

  // Changed-context success for the target: new mission, new prompt
  // family, a stranger — ability used outside the practiced prompt.
  plan = planNext(log, { ...opts, now: at(6_000) + RETENTION_DELAY_MS + 2 * HOUR });
  assert.equal(plan.kind, 'transfer');
  assert.equal(plan.capabilityId, cap);
  log.push(ev(cap, {
    eventType: 'transfer_attempt',
    occurredAt: at(6_000) + RETENTION_DELAY_MS + 2 * HOUR,
    context: { missionId: 'm.street', practicedOrTransfer: 'transfer', promptFamily: 'p.street', partnerType: 'stranger' }
  }));
  assert.equal(stateOf(log, cap).state, 'TRANSFERRED', 'ability used outside the practiced prompt');

  // A second novel context demonstrates stable transfer → FLUENT.
  log.push(ev(cap, {
    eventType: 'transfer_attempt',
    occurredAt: at(6_000) + RETENTION_DELAY_MS + 3 * HOUR,
    context: { missionId: 'm.shop', practicedOrTransfer: 'transfer', promptFamily: 'p.shop', partnerType: 'clerk' }
  }));
  assert.equal(stateOf(log, cap).state, 'FLUENT', 'repeated transfer across contexts earns fluency');
  assert.equal(stateOf(log, pre).state, 'TRANSFERRED', 'per-capability granularity — pre lacks a second context');
  console.log('✓ vertical slice: baseline fail → input → retrieval → supported → feedback → retry → INDEPENDENT → RETAINED → TRANSFERRED → FLUENT');
}

// ── 8. Planner gates introductions on prerequisites ──────────
{
  // interact.ask_name requires listen.identity_question_basic +
  // speak.say_own_name — with a fresh learner the planner must walk the
  // prereq first, never jump to the unmet capability.
  const log = [
    ev('listen.identity_question_basic', { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev('listen.identity_question_basic')
  ];
  const plan = planNext(log, { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 + HOUR });
  assert.notEqual(plan.capabilityId, 'interact.ask_name', 'unmet prerequisites block introduction');
  assert.ok(
    ['delayed_retrieval', 'transfer', 'expose', 'diagnostic_probe', 'independent_attempt', 'resume', 'retry'].includes(plan.kind),
    `planner emits a known action kind, got ${plan.kind}`
  );
  console.log('✓ planner: prerequisites gate introductions');
}

console.log('vNext headless engine: all checks passed');
