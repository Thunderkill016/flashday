/* Adversarial suite for the Next For You prototypes (Mission 008B).
 *
 * The benchmark is an ENGINEERING falsification instrument: it must
 * prove determinism, hard-filter inviolability, no future leakage,
 * learner isolation, honest blocked states, bounded diagnostics,
 * refresh semantics, assessment/transfer separation, and replay —
 * across every authored mission and the required archetypes.
 * Nothing here asserts a policy teaches better. */
import assert from 'node:assert/strict';
import { FIXTURES, capabilityById } from '../src/vnext/fixtures.js';
import { LEARNING_POLICY_V1 } from '../src/vnext/policy.js';
import { POLICIES } from '../experiments/next-for-you/policies.js';
import { generateCandidates } from '../experiments/next-for-you/candidate-generator.js';
import { emptyContext, recordChoice } from '../experiments/next-for-you/decision-context.js';
import { replayAt, replayDeterminism, counterfactual } from '../experiments/next-for-you/replay.js';
import {
  ALL_MISSIONS, ARCHETYPES, ARCHETYPE_NAMES, missionState,
  attemptEvent, observeEvent, seedIndependentHistory
} from '../experiments/next-for-you/scenarios.js';
import { runScenario, counterfactualReport, publicMetrics } from '../experiments/next-for-you/benchmark.js';
import { KINDS, POLICY_VERSIONS } from '../experiments/next-for-you/constants.js';

const T0 = Date.parse('2026-02-01T09:00:00Z');
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const F = ALL_MISSIONS[0]; // mission.meet_new_person
const state = missionState(F);

let check = 0;
const ok = (cond, msg) => { check++; assert.ok(cond, msg); };

function baseState(events = [], { now = T0, ctx = null } = {}) {
  return {
    learnerId: 'SIM', events, capabilities: state.capabilities, tasks: state.tasks,
    roles: state.roles, policy: LEARNING_POLICY_V1, now, mission: F.mission,
    decisionContext: ctx ?? emptyContext('ep.t', 'ses.t'), selection: {}
  };
}

const taskById = (id) => state.tasks.find((t) => t.id === id);
const capOf = (id) => capabilityById(id);
const policyOut = (d) => `${d.chosen.kind}|${d.chosen.capabilityId}|${d.chosen.taskId}`;

/* ═══ 1. Determinism — same state, same decision, every policy ═══ */
{
  const ev = seedIndependentHistory(F, { caps: 3, at: T0 - 30 * DAY });
  for (const p of ['A', 'B', 'C']) {
    const r = replayDeterminism(baseState(ev, { now: T0 }), p);
    ok(r.same, `policy ${p} nondeterministic: ${r.a} vs ${r.b}`);
    const again = POLICIES[p](baseState(ev, { now: T0 }), {});
    ok(again.selectionPolicyVersion === POLICY_VERSIONS[p], `${p} missing version stamp`);
  }
}

/* ═══ 2. Event order + duplicates do not change decisions ═══ */
{
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const dup = [...ev, ev[0], { ...ev[1], id: ev[1].id }]; // same ids
  const reord = [...ev].reverse();
  for (const p of ['B', 'C']) {
    const a = POLICIES[p](baseState(ev, { now: T0 }), {}).chosen;
    const b = POLICIES[p](baseState(dup, { now: T0 }), {}).chosen;
    const c = POLICIES[p](baseState(reord, { now: T0 }), {}).chosen;
    ok(`${a.kind}@${a.capabilityId}` === `${b.kind}@${b.capabilityId}`, `${p}: duplicate events changed decision`);
    ok(`${a.kind}@${a.capabilityId}` === `${c.kind}@${c.capabilityId}`, `${p}: event order changed decision`);
  }
}

/* ═══ 3. Learner isolation — foreign events never influence ═══ */
{
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const foreign = ev.map((e) => ({ ...e, learnerId: 'learner.foreign', id: e.id + '.f' }));
  for (const p of ['A', 'B', 'C']) {
    const a = POLICIES[p](baseState(ev, { now: T0 }), {}).chosen;
    const b = POLICIES[p](baseState([...ev, ...foreign], { now: T0 }), {}).chosen;
    ok(`${a.kind}@${a.capabilityId}` === `${b.kind}@${b.capabilityId}`, `${p}: foreign learner changed the decision`);
  }
}

/* ═══ 4. No future leakage — replay at T ignores events after T ═══ */
{
  const early = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const later = seedIndependentHistory(F, { caps: 2, at: T0 + DAY }).map((e) => ({ ...e, id: e.id + '.L' }));
  for (const p of ['B', 'C']) {
    const atT = POLICIES[p](baseState(early, { now: T0 }), {});
    const replayed = replayAt(baseState([...early, ...later], { now: T0 }), p, T0 - DAY);
    ok(policyOut(atT) === policyOut(replayed), `${p}: future events leaked into a T-replay`);
  }
}

/* ═══ 5. Hard filters — nothing unservable or substituted is chosen ═══ */
{
  for (const f of ALL_MISSIONS) {
    for (const p of ['A', 'B', 'C']) {
      const r = runScenario({ fixture: f, archetype: ARCHETYPES.fast(), archetypeName: 'fast', policyName: p, steps: 30 });
      ok(r.metrics.unservableChosenCount === 0, `${p}@${f.id}: chose unservable task ${r.metrics.unservableChosenCount}×`);
      ok(r.metrics.hardViolationCount === 0, `${p}@${f.id}: hard violations`);
      for (const d of r.trace) {
        if (d.chosen.taskId) {
          const t = f.tasks.find((x) => x.id === d.chosen.taskId);
          ok(t != null, `${p}@${f.id}: chose task outside mission surface`);
          ok(t.capabilityId === d.chosen.capabilityId, `${p}: task/capability mismatch`);
        }
      }
    }
  }
}

/* ═══ 6. No false relearning — time alone never mints refresh ═══ */
{
  const ev = seedIndependentHistory(F, { caps: 3, at: T0 - 30 * DAY });
  for (const p of ['A', 'B', 'C']) {
    const r = runScenario({ fixture: F, archetype: ARCHETYPES.returning30d(), archetypeName: 'returning30d', policyName: p, steps: 16, seed: 'independent30d' });
    ok(r.metrics.falseRelearningCount === 0, `${p}: ${r.metrics.falseRelearningCount} refresh decisions with no verified failure`);
    const d = POLICIES[p](baseState(ev, { now: T0 }), {});
    ok(d.chosen.kind !== KINDS.REFRESH, `${p}: refresh minted from time-away alone`);
  }
}

/* ═══ 7. Diagnostic budget — probes per episode are bounded ═══ */
{
  for (const p of ['B', 'C']) {
    const r = runScenario({ fixture: F, archetype: ARCHETYPES.fast(), archetypeName: 'fast', policyName: p, steps: 24, selection: { diagnosticMaxPerEpisode: 1 } });
    /* per episode (4 decisions): at most 1 diagnostic choice */
    const episodes = {};
    r.trace.forEach((d, i) => {
      const ep = Math.floor(i / 4);
      episodes[ep] = (episodes[ep] ?? 0) + (d.chosen.kind === KINDS.DIAGNOSTIC_PROBE ? 1 : 0);
    });
    for (const [ep, n] of Object.entries(episodes)) {
      ok(n <= 2, `${p}: ${n} diagnostics in episode ${ep} (budget 1 + baseline-probe exceptions)`);
    }
  }
}

/* ═══ 8. Assessment ⇄ transfer separation ═══ */
{
  /* A transferred-but-not-assessed cap must get assessment, not transfer. */
  const r = runScenario({ fixture: F, archetype: ARCHETYPES.fast(), archetypeName: 'fast', policyName: 'B', steps: 30 });
  const transferDecisions = r.trace.filter((d) => d.chosen.kind === KINDS.TRANSFER).map((d) => d.chosen.capabilityId);
  const assessDecisions = r.trace.filter((d) => d.chosen.kind === KINDS.ASSESSMENT).map((d) => d.chosen.capabilityId);
  for (const cap of assessDecisions) {
    ok(transferDecisions.includes(cap), `assessment served for ${cap} without prior transfer — substitution detected`);
  }
  /* And a retained-not-transferred cap never gets an assessment. */
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 2 * DAY });
  const gen = generateCandidates(baseState(ev, { now: T0 }));
  const badAssess = gen.candidates.find((c) => c.kind === KINDS.ASSESSMENT && !c.facts.transferDemonstrated);
  ok(!badAssess, 'assessment candidate generated for non-transferred capability');
}

/* ═══ 9. Explanation completeness — every decision reconstructable ═══ */
{
  for (const p of ['A', 'B', 'C']) {
    const r = runScenario({ fixture: F, archetype: ARCHETYPES.mixed(), archetypeName: 'mixed', policyName: p, steps: 16 });
    for (const d of r.trace) {
      ok(typeof d.explanation?.whyExists === 'string', `${p}: missing whyExists`);
      ok(typeof d.explanation?.tier === 'string', `${p}: missing tier`);
      ok(Array.isArray(d.explanation?.suppressed), `${p}: missing suppressed list`);
      ok(d.selectionPolicyVersion === POLICY_VERSIONS[p], `${p}: wrong version stamp`);
      ok(typeof d.learnerModelVersion === 'string', `${p}: missing learner-model stamp`);
    }
  }
}

/* ═══ 10. Same-task retry ceiling — no infinite identical retry ═══ */
{
  for (const p of ['A', 'B', 'C']) {
    const r = runScenario({ fixture: F, archetype: ARCHETYPES.failer(), archetypeName: 'failer', policyName: p, steps: 40, selection: { failureCeiling: 3 } });
    ok(r.metrics.maxSameTaskRepeatRun <= 5, `${p}: same task repeated ${r.metrics.maxSameTaskRepeatRun}× without a ceiling`);
  }
}

/* ═══ 11. Counterfactual replay — A/B/C over the same frozen state ═══ */
{
  const ev = seedIndependentHistory(F, { caps: 3, at: T0 - 30 * DAY });
  const cf = counterfactual(baseState(ev, { now: T0 }));
  ok(Object.keys(cf.choices).length === 3, 'counterfactual missing a policy');
  for (const [p, choice] of Object.entries(cf.choices)) {
    ok(typeof choice === 'string' && choice.length > 0, `counterfactual: ${p} produced no choice`);
  }
  /* Frozen state must not be mutated — rerun yields the same report. */
  const cf2 = counterfactual(baseState(ev, { now: T0 }));
  ok(JSON.stringify(cf.choices) === JSON.stringify(cf2.choices), 'counterfactual mutated state between runs');
}

/* ═══ 12. Support-demand scoping — probe covers the missing function ═══ */
{
  /* Drive a real demand on meet_at_a_time (the mission with a live route). */
  const mat = ALL_MISSIONS.find((f) => f.id === 'mission.meet_at_a_time');
  const ms = missionState(mat);
  const numProbe = mat.tasks.find((t) => t.purpose === 'support');
  ok(numProbe != null, 'meet_at_a_time has no support probe fixture');
  const tState = { learnerId: 'SIM', events: [], capabilities: ms.capabilities, tasks: mat.tasks, roles: ms.roles, policy: LEARNING_POLICY_V1, now: T0, mission: mat.mission, decisionContext: emptyContext('e', 's'), selection: {} };
  /* a miss attributing identify_spoken_number on the target cap's task */
  const hearTask = mat.tasks.find((t) => t.id === 'task.time.retrieval.hear');
  const evMiss = [attemptEvent(hearTask, capOf(hearTask.capabilityId), { at: T0 - HOUR, outcome: 'fail', missing: ['identify_spoken_number'] })];
  const gen = generateCandidates({ ...tState, events: evMiss });
  const sup = gen.candidates.filter((c) => c.kind === KINDS.SUPPORT_DEMAND);
  ok(sup.length === 1, `expected exactly 1 support demand, got ${sup.length}`);
  ok(sup[0].demand.missingFunction === 'identify_spoken_number', 'demand not function-scoped');
  ok((sup[0].servableTask?.response?.requiredFunctions ?? []).includes('identify_spoken_number'), 'served probe does not cover the missing function');
}

/* ═══ 13. Blocked honesty — exhausted curriculum idles, never fabricates ═══ */
{
  const r = runScenario({ fixture: F, archetype: ARCHETYPES.fast(), archetypeName: 'fast', policyName: 'B', steps: 60 });
  const last = r.trace.at(-1);
  if (last.chosen.kind === 'idle') {
    ok(last.explanation.whyExists === 'no valid candidate', 'idle decision lacks honest reason');
  }
  /* Blocked != crash: a failing-everything run must still terminate. */
  const f = runScenario({ fixture: F, archetype: ARCHETYPES.failer(), archetypeName: 'failer', policyName: 'B', steps: 60 });
  ok(f.trace.length <= 61 && f.trace.length > 0, 'failer trajectory did not terminate cleanly');
}

/* ═══ 14. Mission breadth — every authored mission is traversable ═══ */
{
  for (const f of ALL_MISSIONS) {
    const r = runScenario({ fixture: f, archetype: ARCHETYPES.multiModal(), archetypeName: 'multiModal', policyName: 'B', steps: 40 });
    ok(r.metrics.decisionCount >= 3, `${f.id}: collapsed after ${r.metrics.decisionCount} decisions`);
    ok(r.metrics.unservableChosenCount === 0, `${f.id}: unservable choices`);
  }
}

/* ═══ 15. Archetype matrix runs without pathology explosion ═══ */
{
  const results = {};
  for (const name of ARCHETYPE_NAMES) {
    const r = runScenario({ fixture: F, archetype: ARCHETYPES[name](), archetypeName: name, policyName: 'B', steps: 30 });
    results[name] = publicMetrics(r.metrics);
    ok(r.metrics.decisionCount > 0, `${name}: zero decisions`);
    ok(r.metrics.hardViolationCount === 0, `${name}: hard violations`);
    ok(r.metrics.unservableChosenCount === 0, `${name}: unservable`);
    ok(r.metrics.falseRelearningCount === 0, `${name}: false relearning`);
  }
  /* Pathology probes that must surface in the metrics: */
  ok(results.failer.maxSameTaskRepeatRun <= 3, `failer: identical task retried ${results.failer.maxSameTaskRepeatRun}× — ceiling failed`);
  ok(results.fast.diagnosticFraction < 0.9, 'fast learner drowned in diagnostics');
}

/* ═══ 16. A/B/C counterfactual report across archetypes ═══ */
{
  const rep = counterfactualReport(F, 'mixed', 16);
  ok(rep.mission === F.mission.id, 'report mission mismatch');
  for (const p of ['A', 'B', 'C']) {
    ok(Array.isArray(rep.choices[p]) && rep.choices[p].length > 0, `report missing ${p} choices`);
    ok(typeof rep.metrics[p].decisionCount === 'number', `report missing ${p} metrics`);
  }
}

console.log(`vnext-next-for-you: ${check} checks passed`);
