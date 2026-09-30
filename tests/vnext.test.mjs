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
import { EVENT_TYPES_FOR_PURPOSE, effectiveAllowedSupport } from '../src/vnext/contracts.js';
import {
  RETENTION_DELAY_MS,
  projectLearnerState
} from '../src/vnext/projection.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { planNext } from '../src/vnext/planner.js';

const T0 = Date.parse('2026-01-05T09:00:00Z');
const HOUR = 3600_000;
const LEARNER = 'learner-test';
let seq = 0;

/* The projection only credits events VERIFIED against the registered
 * task registry — test events must look exactly like binder output.
 * ev() therefore maintains a synthetic registry: every attempt event
 * registers (or reuses) a TaskContract matching the semantics it
 * claims, and carries the same binding the binder would stamp.
 * effectiveSupportAllowed mirrors the capability's own conditions —
 * these synthetic tasks do not narrow policy. */
const PURPOSE_FOR_TYPE = {};
for (const [purpose, types] of Object.entries(EVENT_TYPES_FOR_PURPOSE)) {
  for (const t of types) PURPOSE_FOR_TYPE[t] ??= purpose;
}
const FAMILY_FOR_CONTEXT = { practiced: 'practiced', transfer: 'fresh_transfer', assessment: 'fresh_assessment' };
const TEST_CAPS = new Map(CAPABILITIES.map((c) => [c.id, c]));
const TEST_TASKS = new Map();

function ev(capabilityId, over = {}) {
  const cap = TEST_CAPS.get(capabilityId) ?? capabilityById(capabilityId);
  const e = makeEvent({
    id: `e${++seq}`,
    learnerId: LEARNER,
    capabilityId,
    taskId: `t.obs.${capabilityId}`,
    taskRevision: 1,
    eventType: 'production_attempt',
    modality: cap.modality,
    occurredAt: T0 + seq * 1000,
    context: {
      missionId: 'm.baseline',
      practicedOrTransfer: 'practiced',
      promptFamily: 'p.practiced',
      partnerType: 'tutor'
    },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900 },
    evaluation: { authority: 'deterministic', contractId: 'test.eval.v1' },
    ...over
  });
  const purpose = PURPOSE_FOR_TYPE[e.eventType];
  if (!purpose) return e; // observations carry no credit — unbound is fine
  const familyClass = FAMILY_FOR_CONTEXT[e.context.practicedOrTransfer] ?? 'practiced';
  const targetCap = TEST_CAPS.get(e.capabilityId);
  const taskId = ['t', e.capabilityId, e.eventType, e.context.promptFamily, e.context.missionId, e.evaluation.authority].join('::');
  if (!TEST_TASKS.has(taskId)) {
    TEST_TASKS.set(taskId, {
      id: taskId,
      revision: e.taskRevision,
      missionId: e.context.missionId,
      capabilityId: e.capabilityId,
      modality: e.modality,
      purpose,
      promptFamily: e.context.promptFamily,
      freshness: { required: familyClass !== 'practiced', familyClass },
      supportPolicy: { allowed: targetCap?.conditions?.supportAllowed ?? [] },
      evaluation: { authority: e.evaluation.authority, contractId: e.evaluation.contractId },
      // validateTask() runs on the registry entry during verification —
      // purpose-specific requirements must be met here too.
      ...(purpose === 'transfer' ? { transfer: { changedDimensions: ['wording'] } } : {}),
      ...(purpose === 'assessment' ? {
        assessment: { capabilitySample: [e.capabilityId], allowedLanguageRange: 'declared_target_range', answerRevealDuringAttempt: false }
      } : {})
    });
  }
  const task = TEST_TASKS.get(taskId);
  e.taskId = taskId;
  e.binding = {
    purpose: task.purpose,
    familyClass,
    freshnessRequired: task.freshness.required,
    effectiveSupportAllowed: effectiveAllowedSupport(targetCap, task)
  };
  return e;
}

const allTasks = () => [...TEST_TASKS.values()];
const stateOf = (log, id) => projectLearnerState(LEARNER, log, CAPABILITIES, allTasks()).byCapability.get(id);
const planFor = (log, opts) => planNext(LEARNER, log, { tasks: allTasks(), ...opts });

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
  const cap = 'interaction.greet';
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

  // repeat does not hand over the answer, but interaction.greet declares
  // supportAllowed: [] — using a replay still violates its conditions,
  // so it cannot pass as an unaided independent attempt (see §9g for the
  // positive repeat_once case).
  const repeatOnly = stateOf([
    ev(cap, { support: { repeat: true, repeatCount: 1 } })
  ], cap);
  assert.equal(repeatOnly.state, 'SUPPORTED', 'a replayed prompt is support unless the capability allows it');

  // self-reported (unobserved) success cannot prove independence.
  const selfReported = stateOf([ev(cap, { attempt: { observed: false, outcome: 'success', response: 'x', latencyMs: null } })], cap);
  assert.equal(selfReported.milestones.independent, false, 'unobserved success is not independent evidence');
  console.log('✓ aided/self-reported success cannot become INDEPENDENT');
}

// ── 2. Immediate success can never become RETAINED ───────────
{
  const cap = 'production.speak.say_own_name';
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
  const cap = 'interaction.greet';
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
    ev('reception.listen.identity_question_basic', { modality: 'spoken_production' })
  ], 'reception.listen.identity_question_basic');
  assert.equal(wrongModality.state, 'NOT_SEEN', 'a speaking event cannot teach listening');

  // Evidence is per-capability: learning to say your name does not make
  // you able to hear the question.
  const log = [
    ev('production.speak.say_own_name', { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev('production.speak.say_own_name'),
    ev('production.speak.say_own_name', { occurredAt: T0 + 30 * HOUR })
  ];
  const projection = projectLearnerState(LEARNER, log, CAPABILITIES, allTasks());
  assert.equal(projection.byCapability.get('production.speak.say_own_name').state, 'RETAINED');
  assert.equal(projection.byCapability.get('reception.listen.identity_question_basic').state, 'NOT_SEEN',
    'producing the answer never marks the listening prerequisite known');
  console.log('✓ modality isolation: speaking evidence cannot mark listening learned');
}

// ── 5. Population priors cannot mutate learner state ─────────
{
  const empty = projectLearnerState(LEARNER, [], CAPABILITIES, allTasks());
  const before = empty.byCapability.get('interaction.ask_name');
  assert.equal(before.state, 'NOT_SEEN');
  assert.deepEqual(before.milestones.independent, false);

  // Priors are diagnostic hints: they may schedule probes via the planner
  // but a fresh learner's evidence state is untouched by them.
  for (const prior of RISK_PRIORS) {
    assert.equal(prior.learnerStateEffect, 'none_without_observed_evidence');
  }
  const plan = planFor([], { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 });
  assert.notEqual(plan.kind, 'remediate', 'no remediation without evidence of failure');
  assert.ok(['diagnostic_probe', 'expose'].includes(plan.kind), `fresh learner gets input or a probe, got ${plan.kind}`);
  console.log('✓ risk priors schedule diagnostics only — never mark weakness');
}

// ── 6. Replay determinism ────────────────────────────────────
{
  const cap = 'interaction.greet';
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
  const a = projectLearnerState(LEARNER, log, CAPABILITIES, allTasks());
  const b = projectLearnerState(LEARNER, log, CAPABILITIES, allTasks());
  assert.deepEqual(a, b, 'same log → identical projection');
  // A prefix replay reproduces the intermediate state exactly.
  const prefix = projectLearnerState(LEARNER, log.slice(0, 3), CAPABILITIES, allTasks());
  assert.equal(prefix.byCapability.get(cap).state, 'INDEPENDENT');
  const full = projectLearnerState(LEARNER, [...log.slice(0, 3), ...log.slice(3)], CAPABILITIES, allTasks());
  assert.equal(full.byCapability.get(cap).state, 'TRANSFERRED');
  console.log('✓ replay is deterministic; prefixes reproduce intermediate states');
}

// ── 7. Vertical slice: baseline fail → input → retrieval → supported
//        interaction → feedback → retry → independent → delayed →
//        changed-context transfer — planner routes every step ──
// R7: capabilities have no DAG prerequisites — a baseline fail routes
// to teaching THE CAPABILITY ITSELF (expose), never to a "prerequisite
// walk". The second capability here only demonstrates earliest-due
// ordering between two independent evidence timelines.
{
  const cap = 'interaction.greet';
  const pre = 'reception.listen.greeting_basic';
  const opts = { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 };
  const log = [];
  const at = (offsetMs) => T0 + offsetMs;

  // Baseline probe: cold attempt fails. A failed baseline is diagnostic —
  // the planner must route to TEACHING the failed capability itself,
  // not to retrying something that was never taught.
  log.push(ev(cap, {
    eventType: 'interaction_turn',
    occurredAt: at(0),
    attempt: { observed: true, outcome: 'fail', response: '...', latencyMs: 4000 }
  }));
  assert.equal(stateOf(log, cap).state, 'EXPOSED', 'a baseline fail still means the capability was encountered');
  let plan = planFor(log, opts);
  assert.equal(plan.capabilityId, cap, 'planner teaches the failed capability — there is no prerequisite to walk to');
  assert.ok(['diagnostic_probe', 'expose'].includes(plan.kind), `teach the cap, got ${plan.kind}`);

  // Meaningful input on the failed capability.
  log.push(ev(cap, {
    eventType: 'exposure',
    occurredAt: at(1_000),
    attempt: { observed: true, outcome: null, response: null, latencyMs: null }
  }));

  // Guided retrieval with a hint — supported, not independent.
  log.push(ev(cap, {
    eventType: 'recall_attempt',
    occurredAt: at(2_000),
    support: { hint: true, translation: false, transcript: false, modelAnswer: false, repeat: false }
  }));
  assert.equal(stateOf(log, cap).state, 'SUPPORTED');
  assert.equal(planFor(log, opts).kind, 'independent_attempt', 'supported work earns an unaided run');

  // A second, independent capability learned EARLIER anchors the
  // earliest-due ordering later on — no dependency between the two.
  log.push(ev(pre, { eventType: 'exposure', occurredAt: at(100), attempt: { observed: true, outcome: null, response: null, latencyMs: null } }));
  log.push(ev(pre, { eventType: 'recall_attempt', occurredAt: at(200) }));
  assert.equal(stateOf(log, pre).state, 'INDEPENDENT');

  // Supported interaction on the failing capability — still SUPPORTED,
  // not yet independent.
  log.push(ev(cap, {
    eventType: 'interaction_turn',
    occurredAt: at(4_000),
    support: { hint: false, translation: false, transcript: false, modelAnswer: true, repeat: false }
  }));
  assert.equal(stateOf(log, cap).state, 'SUPPORTED', 'model-aided turn is supported work');
  assert.equal(planFor(log, opts).capabilityId, cap);

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
  // Earliest-due wins: the capability learned first is due first.
  plan = planFor(log, { ...opts, now: at(6_000) + RETENTION_DELAY_MS });
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
  plan = planFor(log, { ...opts, now: at(6_000) + RETENTION_DELAY_MS + HOUR });
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
  plan = planFor(log, { ...opts, now: at(6_000) + RETENTION_DELAY_MS + 2 * HOUR });
  assert.equal(plan.kind, 'transfer');
  assert.equal(plan.capabilityId, cap);
  log.push(ev(cap, {
    eventType: 'transfer_attempt',
    occurredAt: at(6_000) + RETENTION_DELAY_MS + 2 * HOUR,
    context: { missionId: 'm.street', practicedOrTransfer: 'transfer', promptFamily: 'p.street', partnerType: 'stranger' }
  }));
  assert.equal(stateOf(log, cap).state, 'TRANSFERRED', 'ability used outside the practiced prompt');

  // A second novel context widens transfer — and TRANSFERRED is the v0
  // ceiling. FLUENT is reserved: hesitation + intelligibility + repairs +
  // stability need a dedicated contract, not a latency threshold.
  log.push(ev(cap, {
    eventType: 'transfer_attempt',
    occurredAt: at(6_000) + RETENTION_DELAY_MS + 3 * HOUR,
    context: { missionId: 'm.shop', practicedOrTransfer: 'transfer', promptFamily: 'p.shop', partnerType: 'clerk' }
  }));
  assert.equal(stateOf(log, cap).state, 'TRANSFERRED', 'transfer count alone never promotes to FLUENT');
  assert.equal(stateOf(log, pre).state, 'TRANSFERRED', 'per-capability granularity — pre lacks a second context');
  console.log('✓ vertical slice: baseline fail → input → retrieval → supported → feedback → retry → INDEPENDENT → RETAINED → TRANSFERRED');
}

// ── 8. Planner gates introductions on prerequisites ──────────
{
  // interaction.ask_name requires reception.listen.identity_question_basic +
  // production.speak.say_own_name — with a fresh learner the planner must walk the
  // prereq first, never jump to the unmet capability.
  const log = [
    ev('reception.listen.identity_question_basic', { eventType: 'exposure', attempt: { observed: true, outcome: null, response: null, latencyMs: null } }),
    ev('reception.listen.identity_question_basic')
  ];
  const plan = planFor(log, { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 + HOUR });
  assert.notEqual(plan.capabilityId, 'interaction.ask_name', 'unmet prerequisites block introduction');
  assert.ok(
    ['delayed_retrieval', 'transfer', 'expose', 'diagnostic_probe', 'independent_attempt', 'resume', 'retry'].includes(plan.kind),
    `planner emits a known action kind, got ${plan.kind}`
  );
  console.log('✓ planner: prerequisites gate introductions');
}

// ── 9. Architect-review invariants (PR #43 blockers) ──────────
{
  // a. A non-attempt event may carry an outcome field — it is context,
  //    not performance, and must never advance state.
  for (const type of ['exposure', 'support_use', 'feedback']) {
    const s = stateOf([
      ev('interaction.greet', { eventType: type })
    ], 'interaction.greet');
    assert.equal(s.state, 'EXPOSED', `${type} with outcome:success is contact, not INDEPENDENT`);
    assert.equal(s.milestones.independent, false);
  }

  // b. Canonical order is (occurredAt, id) — arrival order of the same
  //    event set can never change the projection or the plan.
  const eFail = ev('interaction.greet', {
    id: 'zz-fail',
    occurredAt: T0,
    eventType: 'interaction_turn',
    attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 100 }
  });
  const eOk = ev('interaction.greet', { id: 'aa-ok', occurredAt: T0, eventType: 'interaction_turn' });
  const optsB = { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 };
  assert.deepEqual(
    projectLearnerState(LEARNER, [eFail, eOk], CAPABILITIES, allTasks()),
    projectLearnerState(LEARNER, [eOk, eFail], CAPABILITIES, allTasks()),
    'same-timestamp events replay identically regardless of arrival order'
  );
  assert.deepEqual(planFor([eFail, eOk], optsB), planFor([eOk, eFail], optsB));

  // c. A projection is always scoped to one learner — foreign events are
  //    dropped, never merged.
  const mixed = [
    ev('interaction.greet'),
    ev('interaction.greet', { learnerId: 'learner-other', eventType: 'delayed_retrieval', occurredAt: T0 + 50 * HOUR })
  ];
  const mine = projectLearnerState(LEARNER, mixed, CAPABILITIES, allTasks());
  assert.equal(mine.generatedFrom, 1, 'foreign learner events do not enter the projection');
  assert.equal(mine.byCapability.get('interaction.greet').state, 'INDEPENDENT',
    "another learner's delayed success cannot inflate my retention");

  // d. A failed due check is remediation, not another due check — the
  //    planner must not reschedule delayed_retrieval forever.
  const failedCheck = [
    ev('interaction.greet'),
    ev('interaction.greet', {
      eventType: 'delayed_retrieval',
      occurredAt: T0 + 50 * HOUR,
      attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 1200 }
    })
  ];
  const afterFail = planFor(failedCheck, { capabilities: CAPABILITIES, riskPriors: RISK_PRIORS, now: T0 + 60 * HOUR });
  assert.equal(afterFail.kind, 'retry', 'failed delayed retrieval routes to remediation');
  assert.equal(afterFail.capabilityId, 'interaction.greet');

  // e. FLUENT is reserved — v0 has no fluency rule. Even two novel
  //    transfers answered faster than the independent baseline cannot
  //    auto-promote: "responded quicker" is not hesitation +
  //    intelligibility + repairs + stability evidence.
  const fastTransfers = [
    ev('interaction.greet'),
    ev('interaction.greet', { occurredAt: T0 + 50 * HOUR }),
    ev('interaction.greet', {
      eventType: 'transfer_attempt',
      occurredAt: T0 + 52 * HOUR,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100 },
      context: { missionId: 'm1', practicedOrTransfer: 'transfer', promptFamily: 'p.new1', partnerType: 'stranger' }
    }),
    ev('interaction.greet', {
      eventType: 'transfer_attempt',
      occurredAt: T0 + 54 * HOUR,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 80 },
      context: { missionId: 'm2', practicedOrTransfer: 'transfer', promptFamily: 'p.new2', partnerType: 'clerk' }
    })
  ];
  const sFast = stateOf(fastTransfers, 'interaction.greet');
  assert.equal(sFast.state, 'TRANSFERRED', 'no automatic path into FLUENT exists');
  assert.equal(sFast.milestones.fluent, false);
  assert.deepEqual(sFast.transferPromptFamilies, ['p.new1', 'p.new2'], 'the transfers are still recorded');

  // f. A family rehearsed WITH support is still rehearsed — a later
  //    'transfer' attempt on it cannot be re-sold as a novel context.
  const aidedPractice = [
    ev('interaction.greet', {
      support: { hint: true, translation: false, transcript: false, modelAnswer: false, repeat: false },
      context: { missionId: 'm.baseline', practicedOrTransfer: 'practiced', promptFamily: 'p.aided', partnerType: 'tutor' }
    }),
    ev('interaction.greet'),
    ev('interaction.greet', {
      eventType: 'transfer_attempt',
      occurredAt: T0 + 50 * HOUR,
      context: { missionId: 'm.cafe', practicedOrTransfer: 'transfer', promptFamily: 'p.aided', partnerType: 'stranger' }
    })
  ];
  const sAided = stateOf(aidedPractice, 'interaction.greet');
  assert.equal(sAided.milestones.transferred, false,
    'a support-rehearsed prompt family is not novel transfer context');
  console.log('✓ review invariants: attempt-only credit, order-free replay, learner isolation, no due-loop, honest fluency, practiced ≠ novel');
}

// ── 10. Support conditions are enforced, not decorative ──────
{
  // g. interaction.greet allows no support at all — a replayed prompt is a
  //    condition violation, so the success can only reach SUPPORTED.
  const violated = stateOf([
    ev('interaction.greet', { support: { repeat: true, repeatCount: 1 } })
  ], 'interaction.greet');
  assert.equal(violated.state, 'SUPPORTED', 'repeat on a no-support capability is not independent evidence');

  // h. A capability that declares repeat_once accepts ONE recorded replay
  //    — and only with provenance. A bare repeat flag or a count of two
  //    fails the declared condition.
  const repeatOnceCap = {
    ...capabilityById('interaction.greet'),
    id: 'test.repeat_once_allowed',
    prerequisites: [],
    conditions: { partnerCooperative: true, topicFamiliar: true, speechRate: 'slow_clear', supportAllowed: ['repeat_once'] }
  };
  const projR = (log) => projectLearnerState(LEARNER, log, [repeatOnceCap], allTasks()).byCapability.get('test.repeat_once_allowed');
  TEST_CAPS.set(repeatOnceCap.id, repeatOnceCap);
  const evR = (over) => ev('interaction.greet', { ...over, capabilityId: 'test.repeat_once_allowed' });

  assert.equal(projR([evR({})]).state, 'INDEPENDENT', 'clean unaided success still earns INDEPENDENT');
  assert.equal(projR([evR({ support: { repeat: true, repeatCount: 1 } })]).state, 'INDEPENDENT',
    'one recorded replay satisfies repeat_once');
  assert.equal(projR([evR({ support: { repeat: true } })]).state, 'SUPPORTED',
    'a bare repeat flag cannot prove "once" — provenance required');
  assert.equal(projR([evR({ support: { repeat: true, repeatCount: 2 } })]).state, 'SUPPORTED',
    'two replays exceed repeat_once');
  console.log('✓ support conditions enforced: violated conditions cap at SUPPORTED; repeat_once needs counted provenance');
}

console.log('vNext headless engine: all checks passed');
