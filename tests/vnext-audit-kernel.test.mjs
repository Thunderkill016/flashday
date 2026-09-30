/*
 * Mission 006 — INDEPENDENT adversarial audit of the vNext learning
 * kernel at PR #66 (support-routing layer + kernel invariants).
 *
 * Every block asserts DESIRED evidence semantics. A failure is a
 * confirmed defect, recorded in the audit report — the same assertions
 * become the permanent regression suite once fixes land.
 *
 * Attack classes (control-room command):
 *   A support-demand lifetime      D over-broad cancellation
 *   B multi-demand consume         E carrier-triggered demand
 *   C wrong-probe selection        F attribution coarseness
 *   G mastery laundering           H routing pathologies
 *   I curriculum-gate holes        J replay / persistence
 */
import assert from 'node:assert/strict';
import { CAPABILITIES, capabilityById } from '../src/vnext/capabilities.js';
import { projectLearnerState } from '../src/vnext/projection.js';
import { bindAttempt } from '../src/vnext/bind.js';
import { makeTask, canonicalFamilyId } from '../src/vnext/contracts.js';
import { planNext } from '../src/vnext/planner.js';
import { nextMissionTask } from '../src/vnext/mission-runner.js';
import { checkCurriculum } from '../src/vnext/curriculum-checks.js';
import { makePolicy } from '../src/vnext/policy.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { FIXTURES, MISSION_MEET_AT_TIME, TASKS_MEET_AT_TIME } from '../src/vnext/fixtures.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const DAY = 24 * 3600_000;
const LEARNER = 'learner.audit';
const TASKS = TASKS_MEET_AT_TIME;
const ALL_TASKS = FIXTURES.flatMap((f) => f.tasks);
const taskById = (id) => TASKS.find((t) => t.id === id);

const TARGET = 'reception.listen.understand_clock_time';
const SUPPORT = 'reception.listen.identify_spoken_number';
const NUM_FN = 'identify_spoken_number';
const HEAR = 'task.time.diagnostic.hear';        // requires [uct, num]
const HEAR_R = 'task.time.retrieval.hear';       // requires [uct, num]
const HEAR_D = 'task.time.delayed.hear';         // requires [uct] only
const PROBE = 'task.time.support.number_probe';  // support probe for num
const NOW = T0 + 10_000;

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

let seq = 0;
const failOn = (taskId, { at, missing = [NUM_FN], observed = true } = {}) => {
  const t = taskById(taskId);
  return bindAttempt(t, capabilityById(t.capabilityId), {
    id: `au.${++seq}`, learnerId: LEARNER, occurredAt: at,
    attempt: { observed, outcome: 'fail', response: 'wrong', latencyMs: 2000, attemptId: `au.${seq}` },
    evaluation: { missingFunctions: missing }
  });
};
const passOn = (taskId, { at } = {}) => {
  const t = taskById(taskId);
  return bindAttempt(t, capabilityById(t.capabilityId), {
    id: `au.${++seq}`, learnerId: LEARNER, occurredAt: at,
    attempt: { observed: true, outcome: 'success', response: 'three', latencyMs: 900, attemptId: `au.${seq}` }
  });
};
const probeAttempt = (outcome = 'success', { at, taskId = PROBE } = {}) => {
  const fixtureTask = taskById(taskId);
  const t = fixtureTask ?? syn.tasks.find((x) => x.id === taskId);
  const cap = fixtureTask ? capabilityById(t.capabilityId) : syn.capById.get(t.capabilityId);
  return bindAttempt(t, cap, {
    id: `au.${++seq}`, learnerId: LEARNER, occurredAt: at,
    attempt: { observed: true, outcome, response: 'ten', latencyMs: 800, attemptId: `au.${seq}` }
  });
};

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

/* ── Synthetic world: two target caps, one provider covering two
 *   functions, one probe per function — exercises every scoping rule
 *   the fixture's single-function route cannot reach. */
const synCap = (id, providesFunctions = []) => ({
  version: 1, id, modality: 'listening',
  performance: `audit synthetic ${id}`,
  conditions: { partnerCooperative: true, topicFamiliar: true, speechRate: 'slow_clear', supportAllowed: [] },
  prerequisites: [], providesFunctions,
  criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: [] },
  language: { chunks: [], constructions: [], vocabulary: [] },
  evidence: { independentRequired: true, delayedRequired: true, transferRequired: true },
  vietnameseRiskProbes: []
});
const SIG = {
  communicativeFunction: 'audit_fn', cueTopology: 'audit_probe',
  setting: 'audit', register: 'neutral', channel: 'f2f',
  interlocutorRole: 'staff', relationship: 'service',
  responseTopology: 'mc_audit', lexicalDomain: 'audit'
};
const synTask = (cap, id, purpose, fns) => makeTask({
  id, missionId: 'mission.audit', capabilityId: cap.id, modality: cap.modality,
  purpose, promptFamily: canonicalFamilyId(cap.id, SIG), contextSignature: SIG,
  stimulus: { type: 'audio_line', languageComponents: ['audit'] },
  response: {
    type: 'choice', requiredFunctions: fns,
    options: [{ id: 'a', text: 'a', correct: true }, { id: 'b', text: 'b' }]
  },
  evaluation: { authority: 'deterministic', contractId: 'eval.choice.correct.v1' }
});

const T1 = synCap('reception.listen.audit_t1');
const T2 = synCap('reception.listen.audit_t2');
const CARRIER = synCap('reception.listen.audit_carrier');
const S = synCap('reception.listen.audit_substrate', ['fn_a', 'fn_b']);
/* 'retrieval' on purpose: a diagnostic task would be served by the
 * runner's phase-0 baseline sweep before the planner's demand rule can
 * fire — that ordering is correct, so these tasks must not claim the
 * diagnostic slot. */
const t1 = synTask(T1, 'task.audit.t1.probe', 'retrieval', ['fn_a']);
const t2 = synTask(T2, 'task.audit.t2.probe', 'diagnostic', ['fn_b']);
const t1r = synTask(T1, 'task.audit.t1.both', 'retrieval', ['fn_a', 'fn_b']);
const carrierTask = synTask(CARRIER, 'task.audit.carrier.probe', 'retrieval', ['fn_a']);
const probeA = synTask(S, 'task.audit.probe.a', 'support', ['fn_a']);
const probeB = synTask(S, 'task.audit.probe.b', 'support', ['fn_b']);

const syn = {
  caps: [T1, T2, CARRIER, S],
  capById: new Map([[T1.id, T1], [T2.id, T2], [CARRIER.id, CARRIER], [S.id, S]]),
  tasks: [t1, t2, t1r, carrierTask, probeA, probeB],
  mission: {
    id: 'mission.audit', revision: 1,
    targetCapabilities: [T1.id, T2.id],
    carrierCapabilities: [CARRIER.id],
    prerequisiteCapabilities: [],
    supportCapabilities: [S.id],
    taskIds: [t1.id, t2.id, t1r.id, carrierTask.id, probeA.id, probeB.id],
    assessmentPlan: { required: false }
  },
  roles: { targets: new Set([T1.id, T2.id]), supports: new Set([S.id]), prereqs: new Set() }
};
const synPlan = (events, opts = {}) =>
  planNext(LEARNER, events, {
    capabilities: syn.caps, tasks: syn.tasks, riskPriors: [],
    now: opts.now ?? NOW, roles: syn.roles, ...opts
  });
const synSelect = (events, opts = {}) =>
  nextMissionTask({
    learnerId: LEARNER, mission: syn.mission, tasks: syn.tasks,
    capabilities: syn.caps, events, riskPriors: [], now: opts.now ?? NOW, ...opts
  });
const synMiss = (task, fns, at) => bindAttempt(task, syn.capById.get(task.capabilityId), {
  id: `au.${++seq}`, learnerId: LEARNER, occurredAt: at,
  attempt: { observed: true, outcome: 'fail', response: 'b', latencyMs: 1500, attemptId: `au.${seq}` },
  evaluation: { missingFunctions: fns }
});
const synPass = (task, at) => bindAttempt(task, syn.capById.get(task.capabilityId), {
  id: `au.${++seq}`, learnerId: LEARNER, occurredAt: at,
  attempt: { observed: true, outcome: 'success', response: 'a', latencyMs: 900, attemptId: `au.${seq}` }
});

let check = 0;
const failures = [];
const attack = (name, fn) => {
  try { fn(); check++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
};

/* ── A. Demand bound must be per remediation EPISODE, not lifetime ──
 * miss → probe (consumed) → target recovers on a task that REQUIRES
 * the function → 30 days later the same substrate fails again.
 * The pair must be eligible for a fresh demand episode — a loop bound
 * that survives demonstrated recovery is a lifetime ban. */
attack('A: recovered pair gets a fresh demand episode weeks later', () => {
  const evts = [
    failOn(HEAR, { at: T0 }),
    probeAttempt('success', { at: T0 + 1000 }),
    passOn(HEAR_R, { at: T0 + 2000 }),               // success on task requiring NUM_FN — real recovery
    failOn(HEAR_R, { at: T0 + 30 * DAY })            // same substrate forgotten
  ];
  const p = plan(evts, { now: T0 + 30 * DAY + 60_000 });
  assert.equal(p.kind, 'support_demand',
    `substrate gap re-evidenced after recovery must re-route — got '${p.kind}' (pair bound is lifetime-scoped)`);
  assert.equal(p.demand.missingFunction, NUM_FN);
});

/* A-bis: WITHOUT demonstrated recovery the bound still holds — the
 * same miss streak cannot re-issue (anti-oscillation preserved). */
attack('A2: unrecovered pair stays bounded — no oscillation', () => {
  const evts = [
    failOn(HEAR, { at: T0 }),
    probeAttempt('success', { at: T0 + 1000 }),
    failOn(HEAR_R, { at: T0 + 2000 })
  ];
  assert.notEqual(plan(evts).kind, 'support_demand',
    'spent pair re-issued inside the same unresolved episode — bound broken');
});

/* ── B. One probe consumes only the demands it actually tests ──
 * t1 misses fn_a, t2 misses fn_b — both provided by S. A probe that
 * exercises ONLY fn_a must not resolve the fn_b demand. */
attack('B: probe for fn_a must not consume the pending fn_b demand', () => {
  const evts = [
    synMiss(t1, ['fn_a'], T0),
    synMiss(t2, ['fn_b'], T0 + 1000),
    probeAttempt('success', { at: T0 + 2000, taskId: probeA.id })
  ];
  const p = synPlan(evts);
  assert.equal(p.kind, 'support_demand',
    'fn_b demand vanished although no evidence tested fn_b — provider-wide consumption');
  assert.equal(p.demand.missingFunction, 'fn_b');
  assert.equal(p.demand.targetCapabilityId, T2.id);
});

/* ── C. The selected probe must exercise the demanded function ──
 * Demand names fn_b; S owns probeA(fn_a) + probeB(fn_b). Selection
 * must pick probeB — a probe that does not test the missing function
 * serves the wrong evidence. */
attack('C: selector must serve the probe that covers the missing function', () => {
  const sel = synSelect([synMiss(t2, ['fn_b'], T0)]);
  assert.equal(sel.status, 'ready');
  assert.equal(sel.taskId, probeB.id,
    `demand for fn_b was served ${sel.taskId} — capability-scoped pick, not function-scoped`);
});

/* C2: a demand with no covering probe is unservable-but-nonfatal. */
attack('C2: uncovered demand is skipped non-fatally, never blocks the mission', () => {
  const missionNoB = { ...syn.mission, taskIds: syn.mission.taskIds.filter((id) => id !== probeB.id) };
  const sel = nextMissionTask({
    learnerId: LEARNER, mission: missionNoB,
    tasks: syn.tasks.filter((t) => t.id !== probeB.id),
    capabilities: syn.caps, events: [synMiss(t2, ['fn_b'], T0)], now: NOW
  });
  assert.notEqual(sel.status, 'blocked', `unservable demand froze the mission: ${sel.reason}`);
  assert.notEqual(sel.taskId, probeA.id, 'wrong-probe substitute served for an uncovered demand');
});

/* ── D. Cancellation must be function-scoped ──
 * A success cancels a pending demand only when the succeeding task
 * itself requires that function — otherwise nothing demonstrated the
 * substrate recovered. delayed.hear requires uct but NOT num. */
attack('D: target success not exercising the missing fn must not cancel its demand', () => {
  const evts = [
    failOn(HEAR, { at: T0 }),
    passOn(HEAR_D, { at: T0 + 1000 })   // success on same cap, task lacks NUM_FN
  ];
  const p = plan(evts);
  assert.equal(p.kind, 'support_demand',
    `an unrelated success cancelled the demand — got '${p.kind}'; cancellation is capability-wide`);
});
attack('D2: success on a task that DOES require the fn cancels the demand', () => {
  const evts = [failOn(HEAR, { at: T0 }), passOn(HEAR_R, { at: T0 + 1000 })];
  assert.notEqual(plan(evts).kind, 'support_demand',
    'demonstrated recovery left a stale demand pending');
});

/* ── E. Carrier-origin demand: INTENDED AND SAFE ──
 * A verified attributing miss on a carrier task is the same class of
 * evidence as a target miss; the provider must still be mission-
 * declared and the function mission-required. Suppressing it would
 * hide real substrate observations. Asserted: it routes, bounded. */
attack('E: carrier miss with declared provider routes demand (documented intent)', () => {
  const p = synPlan([synMiss(carrierTask, ['fn_a'], T0)]);
  assert.equal(p.kind, 'support_demand',
    'carrier-origin substrate evidence produced no demand — check whether routing is target-only');
  assert.equal(p.demand.targetCapabilityId, CARRIER.id, 'provenance must name the carrier honestly');
});

/* ── F. Attribution coarseness bound ──
 * A miss on a task declaring [fn_a, fn_b] attributes BOTH; each
 * resolves independently and the fn_a probe must not discharge fn_b. */
attack('F: multi-function attribution stays bounded and independently served', () => {
  const evts = [
    synMiss(t1r, ['fn_a', 'fn_b'], T0),
    probeAttempt('success', { at: T0 + 1000, taskId: probeA.id })
  ];
  const p = synPlan(evts);
  assert.equal(p.kind, 'support_demand', 'fn_b demand must outlive the fn_a probe');
  assert.equal(p.demand.missingFunction, 'fn_b');
});

/* ── G. Mastery laundering — support evidence mints nothing ── */
attack('G: support success + failed target retry mints zero claims anywhere', () => {
  const evts = [
    failOn(HEAR, { at: T0 }),
    probeAttempt('success', { at: T0 + 1000 }),
    failOn(HEAR_R, { at: T0 + 2000 })
  ];
  const { byCapability } = projectLearnerState(LEARNER, evts, CAPABILITIES, ALL_TASKS);
  for (const capId of [TARGET, SUPPORT]) {
    for (const m of ['supported', 'independent', 'retained', 'transferred', 'fluent']) {
      assert.equal(byCapability.get(capId).milestones[m], false, `${capId} minted ${m} via support path`);
    }
  }
});
attack('G2: stale-revision miss cannot mint a demand', () => {
  const stale = failOn(HEAR, { at: T0 });
  stale.taskRevision = 99;
  assert.notEqual(plan([stale]).kind, 'support_demand', 'unregistered revision issued a demand');
});
attack('G3: attemptId boundary is task-scoped — no cross-task support leak', () => {
  const hintedFail = bindAttempt(taskById(HEAR), capabilityById(TARGET), {
    id: `au.${++seq}`, learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 1, attemptId: 'shared.1' },
    support: { hint: true }, evaluation: { missingFunctions: [NUM_FN] }
  });
  /* Same attemptId, DIFFERENT task: the hint must not contaminate —
   * the clean success mints honest INDEPENDENT. */
  const cleanOtherTask = bindAttempt(taskById(HEAR_R), capabilityById(TARGET), {
    id: `au.${++seq}`, learnerId: LEARNER, occurredAt: T0 + 1000,
    attempt: { observed: true, outcome: 'success', response: 'three', latencyMs: 1, attemptId: 'shared.1' },
    evaluation: { missingFunctions: [] }
  });
  assert.equal(
    projectLearnerState(LEARNER, [hintedFail, cleanOtherTask], CAPABILITIES, ALL_TASKS)
      .byCapability.get(TARGET).milestones.independent,
    true, 'task-scoped union wrongly leaked a hint onto a different task'
  );
  /* Same attemptId, SAME task: a hinted retry cannot launder itself —
   * the union applies within the attempt boundary. */
  const cleanSameTask = bindAttempt(taskById(HEAR), capabilityById(TARGET), {
    id: `au.${++seq}`, learnerId: LEARNER, occurredAt: T0 + 2000,
    attempt: { observed: true, outcome: 'success', response: 'three', latencyMs: 1, attemptId: 'shared.1' },
    evaluation: { missingFunctions: [] }
  });
  assert.equal(
    projectLearnerState(LEARNER, [hintedFail, cleanSameTask], CAPABILITIES, ALL_TASKS)
      .byCapability.get(TARGET).milestones.independent,
    false, 'hinted attempt minted INDEPENDENT after a clean retry under the same attemptId'
  );
});

/* ── H. Routing pathologies ── */
attack('H: pending demand never starves due retrieval', () => {
  /* Due check lives on a DIFFERENT capability — a miss on the same cap
   * would legitimately suppress its own due check (a failed outcome is
   * remediation evidence, not a reschedule). */
  const taught = passOn('task.time.retrieval.say', { at: T0 }); // speak cap → independent
  const miss = failOn(HEAR, { at: T0 + 1000 });                 // listen cap → demand
  const laggedNow = T0 + 8 * DAY; // beyond retention.minLagMs (24h)
  const p = plan([taught, miss], { now: laggedNow });
  assert.equal(p.kind, 'delayed_retrieval',
    `pending demand outranked a due delayed check — got '${p.kind}'`);
});
attack('H2: multiple demands surface in deterministic canonical order', () => {
  const evts = [synMiss(t2, ['fn_b'], T0), synMiss(t1, ['fn_a'], T0 + 500)];
  const fwd = synPlan(evts);
  const rev = synPlan([...evts].reverse());
  assert.equal(fwd.kind, 'support_demand');
  assert.equal(fwd.demand.missingFunction, 'fn_b', 'issue order must follow occurredAt, not arrival');
  assert.equal(rev.demand.missingFunction, fwd.demand.missingFunction, 'arrival order changed routing');
});
attack('H3: cross-mission scope — undeclared provider cannot route', () => {
  const rolesNoSupport = { ...syn.roles, supports: new Set() };
  const p = planNext(LEARNER, [synMiss(t1, ['fn_a'], T0)], {
    capabilities: syn.caps, tasks: syn.tasks, riskPriors: [], now: NOW, roles: rolesNoSupport
  });
  assert.notEqual(p.kind, 'support_demand', 'a mission without the declaration surfaced substrate work');
});

/* ── I. Curriculum gate — every declared route must be servable ── */
attack('I: gate flags a provided function no probe covers', () => {
  const missionNoB = { ...syn.mission, taskIds: syn.mission.taskIds.filter((id) => id !== probeB.id) };
  const probs = checkCurriculum({
    capabilities: syn.caps, missions: [missionNoB],
    tasks: syn.tasks.filter((t) => t.id !== probeB.id)
  });
  assert.ok(probs.some((p) => p.includes('fn_b') || p.includes('covers')),
    `mission declares fn_b support with no probe that tests it — gate passed: ${JSON.stringify(probs)}`);
});
attack('I2: gate flags a probe testing a function the cap does not provide', () => {
  const liar = synTask(S, 'task.audit.probe.liar', 'support', ['fn_ghost']);
  const m = { ...syn.mission, taskIds: [...syn.mission.taskIds, liar.id] };
  const probs = checkCurriculum({ capabilities: syn.caps, missions: [m], tasks: [...syn.tasks, liar] });
  assert.ok(probs.some((p) => p.includes('fn_ghost') || p.includes('providesFunctions')),
    `probe exercises fn_ghost the cap never provides — gate passed`);
});
attack('I3: deterministic provider pick under ambiguity', () => {
  const S2 = synCap('reception.listen.audit_substrate_2', ['fn_a', 'fn_b']);
  const roles2 = { ...syn.roles, supports: new Set([S.id, S2.id]) };
  const caps2 = [...syn.caps, S2];
  const run = () => planNext(LEARNER, [synMiss(t1r, ['fn_a', 'fn_b'], T0)], {
    capabilities: caps2, tasks: syn.tasks, riskPriors: [], now: NOW, roles: roles2
  }).demand?.supportCapabilityId;
  assert.equal(run(), run(), 'provider selection is not deterministic');
  assert.equal(run(), S.id, 'max-coverage provider must win — both cover 2 fns, id breaks the tie');
});

/* ── J. Replay / persistence ── */
attack('J: duplicate event delivery never changes demand state', () => {
  const miss = synMiss(t1, ['fn_a'], T0);
  const probe = probeAttempt('success', { at: T0 + 1000, taskId: probeA.id });
  const once = synPlan([miss, probe]);
  const dupped = synPlan([miss, { ...miss }, probe, { ...probe }, { ...miss }]);
  assert.deepEqual(dupped.kind, once.kind, 'resynced duplicates changed the plan');
  assert.deepEqual(dupped.demand ?? null, once.demand ?? null);
});
attack('J2: JSON persistence round-trip replays identically', () => {
  const evts = [synMiss(t1, ['fn_a'], T0), probeAttempt('success', { at: T0 + 1000, taskId: probeA.id })];
  const revived = JSON.parse(JSON.stringify(evts));
  assert.deepEqual(synPlan(revived), synPlan(evts), 'serialize→parse changed routing');
});
attack('J3: foreign learner cannot issue or consume demands', () => {
  const miss = synMiss(t1, ['fn_a'], T0);
  const foreignProbe = { ...probeAttempt('success', { at: T0 + 1000, taskId: probeA.id }), learnerId: 'learner.other' };
  const p = synPlan([miss, foreignProbe]);
  assert.equal(p.kind, 'support_demand', "another learner's probe consumed my demand");
});

/* ── Simulation: the 8 long-horizon cases ── */
attack('SIM-1 gap→support→recovery→same gap 30d later re-routes', () => {
  const evts = [
    failOn(HEAR, { at: T0 }),
    probeAttempt('success', { at: T0 + 1000 }),
    passOn(HEAR_R, { at: T0 + 2000 }),
    failOn(HEAR_R, { at: T0 + 30 * DAY })
  ];
  assert.equal(plan(evts, { now: T0 + 30 * DAY + 60_000 }).kind, 'support_demand');
});
attack('SIM-4 recurring forgetful learner — every recovered episode re-arms', () => {
  const evts = [];
  for (let d = 0; d < 3; d++) {
    const base = T0 + d * 30 * DAY;
    evts.push(failOn(HEAR_R, { at: base }));
    evts.push(probeAttempt('success', { at: base + 1000 }));
    evts.push(passOn(HEAR_R, { at: base + 2000 }));
  }
  evts.push(failOn(HEAR_R, { at: T0 + 90 * DAY }));
  assert.equal(plan(evts, { now: T0 + 90 * DAY + 60_000 }).kind, 'support_demand',
    'fourth episode could not route — history permanently bans the substrate');
});
attack('SIM-5 support-dependent learner stays bounded, never loops', () => {
  const evts = [
    failOn(HEAR, { at: T0 }),
    probeAttempt('fail', { at: T0 + 1000 }),
    failOn(HEAR_R, { at: T0 + 2000 })
  ];
  const p = plan(evts);
  assert.notEqual(p.kind, 'support_demand', 'failed probe re-issued endlessly');
});
attack('SIM-7 carrier-only weakness still gets substrate repair', () => {
  const p = synPlan([synMiss(carrierTask, ['fn_a'], T0)]);
  assert.equal(p.kind, 'support_demand');
  assert.equal(p.demand.targetCapabilityId, CARRIER.id);
});

console.log(`\nvnext-audit-kernel: ${check} checks pass, ${failures.length} CONFIRMED DEFECTS`);
for (const f of failures) console.log(`  DEFECT — ${f}`);
process.exit(failures.length ? 1 : 0);
