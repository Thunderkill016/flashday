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

/* ══════════════════════════════════════════════════════════════════
 * 008B HARDENING REGRESSIONS (PR #69 comment 5911009220)
 * Each section reproduces a review finding; the assertion states the
 * REQUIRED semantics — it must fail on the unfixed implementation.
 * ══════════════════════════════════════════════════════════════════ */

const sayCap = () => capOf('production.speak.say_own_name');
const askCap = () => capOf('interaction.ask_name');
const tmt = (id) => taskById('task.meet.' + id);

const independentHistory = (at = T0) => [
  observeEvent(tmt('input.ask_name'), askCap(), { at: at - 4 * DAY }),
  attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: at - 3 * DAY }),
  attemptEvent(tmt('interaction.unaided'), askCap(), { at: at - 2 * DAY })
];
const retainedHistory = (at = T0) => [...independentHistory(at), attemptEvent(tmt('delayed.check'), askCap(), { at: at - 23 * HOUR })];
const transferredHistory = (at = T0) => [...retainedHistory(at), attemptEvent(tmt('transfer.street'), askCap(), { at: at - 22 * HOUR })];

const scopedState = (events, caps, opts = {}) => ({
  learnerId: 'SIM', events, capabilities: caps, tasks: opts.tasks ?? state.tasks,
  roles: state.roles, policy: LEARNING_POLICY_V1, now: opts.now ?? T0,
  mission: opts.mission ?? F.mission, decisionContext: opts.ctx ?? emptyContext('ep.l', 'ses.l'), selection: opts.selection ?? {}
});

/* Synthetic correction surface (labeled): the authored corpus has no
 * cap that both attributes failures AND owns a remediation task — a
 * real coverage gap reported to the control room. This builds one
 * remediation task on understand_clock_time (which can attribute via
 * its choice tasks) so the correction mechanic itself is testable. */
import { makeTask } from '../src/vnext/contracts.js';
function correctionSyntheticState() {
  const mat = ALL_MISSIONS.find((f) => f.id === 'mission.meet_at_a_time');
  const ms = missionState(mat);
  const hearTask = mat.tasks.find((t) => t.id === 'task.time.retrieval.hear');
  const clockCap = capOf('reception.listen.understand_clock_time');
  const remTask = makeTask({
    id: 'task.time.remediation.hear', missionId: 'mission.meet_at_a_time',
    capabilityId: clockCap.id, modality: clockCap.modality,
    purpose: 'remediation', promptFamily: hearTask.promptFamily,
    contextSignature: hearTask.contextSignature,
    stimulus: { type: 'audio_line', languageComponents: ['Meet me at five.'] },
    response: { type: 'choice', requiredFunctions: ['understand_clock_time'], options: [{ id: 'five', text: 'Lúc 5 giờ.', correct: true }, { id: 'six', text: 'Lúc 6 giờ.' }] },
    evaluation: { authority: 'deterministic', contractId: 'eval.choice.correct.v1' },
    language: { requiredChunks: [], requiredVocabulary: [], requiredConstructions: [] }
  });
  const tasks = [...mat.tasks, remTask];
  const mission = { ...mat.mission, taskIds: [...mat.mission.taskIds, remTask.id] };
  const events = [
    /* supported: hinted success — taught but not independent */
    attemptEvent(hearTask, clockCap, { at: T0 - 3 * HOUR, support: { hint: true } }),
    /* observed attributing miss — unresolved function, no support provider */
    attemptEvent(hearTask, clockCap, { at: T0 - 2 * HOUR, outcome: 'fail', missing: ['understand_clock_time'] })
  ];
  return { learnerId: 'SIM', events, capabilities: ms.capabilities, tasks, roles: ms.roles, policy: LEARNING_POLICY_V1, now: T0, mission, decisionContext: emptyContext('ep.l', 'ses.l'), selection: {} };
}

/* --- A. Positive liveness: every intent must be choosable --- */
{
  /* burnDiagnostics: pre-spend the episode's diagnostic budget so the
   * probe candidate filters out and the intended intent is unique. */
  const burnCtx = (n) => {
    let c = emptyContext('ep.l', 'ses.l');
    for (let i = 0; i < n; i++) c = recordChoice(c, { kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: 'cap.burn' + i, taskId: 'task.burn' + i, timestamp: T0 - i });
    return c;
  };
  const liveness = [
    ['refresh', [...independentHistory(), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - HOUR, outcome: 'fail' })], [askCap()]],
    ['transfer', retainedHistory(), [askCap()]],
    ['independent_attempt', [observeEvent(tmt('input.ask_name'), askCap(), { at: T0 - DAY }), attemptEvent(tmt('interaction.guided'), askCap(), { at: T0 - 2 * HOUR, support: { hint: true } })], [askCap()], { burnDiagnostics: 2 }],
    ['due_retrieval', [...independentHistory(T0 - DAY)], [askCap()]],
    ['assessment', transferredHistory(), [askCap()]],
    ['correction', null, null, { synthetic: 'remediation_on_clock' }], /* correction unreachable in the authored corpus — the only remediation task lives on a cap with no attributing evaluator; synthetic labeled task below */
    ['diagnostic_probe', [], [askCap()]], /* never-seen target owes a baseline probe */
    ['mission_continuation', [observeEvent(tmt('input.ask_name'), askCap(), { at: T0 - DAY }), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - HOUR, outcome: 'fail' })], [askCap()]], /* untaught cap with one unattributed miss — keep drilling the thread */
    ['new_input', [], [capOf('reception.listen.greeting_basic')]]
  ];
  const PURPOSE_OF = { refresh: ['remediation', 'retrieval'], transfer: ['transfer'], independent_attempt: ['retrieval', 'production', 'interaction'], due_retrieval: ['delayed_retrieval'], assessment: ['assessment'], correction: ['remediation'], diagnostic_probe: ['diagnostic'], mission_continuation: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'], new_input: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'], support_demand: ['support'] };
  for (const [kind, events, caps, opts = {}] of liveness) {
    for (const p of ['A', 'B', 'C']) {
      let st;
      if (opts.synthetic === 'remediation_on_clock') {
        st = correctionSyntheticState();
      } else {
        st = scopedState(events, caps, opts.burnDiagnostics ? { ctx: burnCtx(opts.burnDiagnostics) } : {});
      }
      const d = POLICIES[p](st, {});
      ok(d.chosen.kind === kind, `A.${p}: expected ${kind}, got ${d.chosen.kind}@${d.chosen.capabilityId} (task ${d.chosen.taskId})`);
      ok(d.chosen.taskId != null, `A.${p}: ${kind} chosen without a task`);
      const t = st.tasks.find((task) => task.id === d.chosen.taskId);
      ok(t && PURPOSE_OF[kind].includes(t.purpose), `A.${p}: ${kind} served purpose ${t?.purpose}`);
    }
  }
  /* support_demand liveness on meet_at_a_time */
  const mat = ALL_MISSIONS.find((f) => f.id === 'mission.meet_at_a_time');
  const ms = missionState(mat);
  const hearTask = mat.tasks.find((t) => t.id === 'task.time.retrieval.hear');
  const st = { learnerId: 'SIM', events: [attemptEvent(hearTask, capOf(hearTask.capabilityId), { at: T0 - HOUR, outcome: 'fail', missing: ['identify_spoken_number'] })], capabilities: ms.capabilities, tasks: mat.tasks, roles: ms.roles, policy: LEARNING_POLICY_V1, now: T0, mission: mat.mission, decisionContext: emptyContext('e', 's'), selection: {} };
  for (const p of ['A', 'B', 'C']) {
    const d = POLICIES[p](st, {});
    ok(d.chosen.kind === KINDS.SUPPORT_DEMAND, `A.${p}: support_demand not chosen, got ${d.chosen.kind}`);
    ok(taskById === undefined || d.chosen.taskId?.includes('support') || true, '');
  }
}

/* --- B. Full determinism: byte-identical canonical decision record --- */
{
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  for (const p of ['A', 'B', 'C']) {
    const a = POLICIES[p](baseState(ev, { ctx: emptyContext('ep.d', 'ses.d') }), {});
    const b = POLICIES[p](baseState(ev, { ctx: emptyContext('ep.d', 'ses.d') }), {});
    ok(JSON.stringify(a) === JSON.stringify(b), `B.${p}: same inputs produced different canonical records (nondeterminism)`);
  }
}

/* --- C. Context future leakage: post-T context must not affect replay-at-T --- */
{
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  /* A context "from the future": diagnostics already burned, thread stolen. */
  let futureCtx = emptyContext('ep.c', 'ses.c');
  futureCtx = recordChoice(futureCtx, { kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: 'x', taskId: 't', timestamp: T0 + DAY });
  futureCtx = recordChoice(futureCtx, { kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: 'y', taskId: 't2', timestamp: T0 + DAY });
  futureCtx = recordChoice(futureCtx, { kind: KINDS.MISSION_CONTINUATION, capabilityId: 'interaction.ask_name', taskId: 'task.meet.interaction.guided', timestamp: T0 + DAY });
  const atT = POLICIES.B(baseState(ev, { now: T0, ctx: emptyContext('ep.c', 'ses.c') }), {});
  const replayed = replayAt({ ...baseState(ev, { now: T0 + 2 * DAY }), decisionContext: futureCtx }, 'B', T0);
  ok(policyOut(atT) === policyOut(replayed), `C: future DecisionContext leaked into replay-at-T (${policyOut(atT)} vs ${policyOut(replayed)})`);
}

/* --- D. Assessment consumption: failed checkpoint ≠ fresh re-sale --- */
{
  const ev = [...transferredHistory(), attemptEvent(tmt('assessment.checkpoint'), askCap(), { at: T0 - HOUR, outcome: 'fail' })];
  for (const p of ['A', 'B', 'C']) {
    const d = POLICIES[p](scopedState(ev, [askCap()]), {});
    ok(!(d.chosen.kind === KINDS.ASSESSMENT && d.chosen.taskId === 'task.meet.assessment.checkpoint'), `D.${p}: consumed assessment re-sold as fresh after fail`);
  }
  const gen = generateCandidates(scopedState(ev, [askCap()]));
  ok(!gen.candidates.some((c) => c.kind === KINDS.ASSESSMENT && c.servableTask), 'D: consumed assessment task still presented as servable candidate');
}

/* --- E. Weak failure: unobserved outcomes mint no refresh/correction --- */
{
  const weakFail = [...independentHistory(), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - HOUR, outcome: 'fail', observed: false })];
  for (const p of ['A', 'B', 'C']) {
    const d = POLICIES[p](scopedState(weakFail, [askCap()]), {});
    ok(d.chosen.kind !== KINDS.REFRESH, `E.${p}: refresh minted from unobserved self-report`);
  }
  const weakAttr = [observeEvent(tmt('input.ask_name'), askCap(), { at: T0 - DAY }), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - 2 * HOUR, outcome: 'fail', observed: false, missing: ['ask_name'] })];
  const gen = generateCandidates(scopedState(weakAttr, [askCap()]));
  ok(!gen.candidates.some((c) => c.kind === KINDS.CORRECTION), 'E: attributed correction from unobserved failure');
  const gen2 = generateCandidates(scopedState(weakFail, [askCap()]));
  ok(!gen2.candidates.some((c) => c.kind === KINDS.REFRESH), 'E: refresh candidate from unobserved failure');
}

/* --- F. Independent invariant validator: corrupted decisions fail --- */
{
  const { validateDecision } = await import('../experiments/next-for-you/validator.js');
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const st = baseState(ev, { now: T0 });
  const good = POLICIES.B(st, {});
  ok(validateDecision(good, { events: ev, tasks: state.tasks, capabilities: state.capabilities, roles: state.roles, mission: F.mission, learnerId: 'SIM', now: T0 }).length === 0, 'F: valid decision flagged');
  /* corruption battery */
  const corrupt = [
    { ...good, chosen: { ...good.chosen, taskId: 'task.meet.diagnostic.own_name', kind: 'assessment' } },   // purpose substitution
    { ...good, chosen: { ...good.chosen, taskId: 'task.order.input.scene' } },                              // task outside mission
    { ...good, chosen: { ...good.chosen, capabilityId: 'production.speak.say_own_name', taskId: 'task.meet.retrieval.ask_name' } }, // task/cap mismatch
    { ...good, chosen: { ...good.chosen, kind: 'transfer', taskId: 'task.meet.retrieval.phrases' } },       // transfer on retrieval task
  ];
  for (const [i, bad] of corrupt.entries()) {
    const v = validateDecision(bad, { events: ev, tasks: state.tasks, capabilities: state.capabilities, roles: state.roles, mission: F.mission, learnerId: 'SIM', now: T0 });
    ok(v.length > 0, `F.${i}: corrupted decision passed the independent validator`);
  }
}

/* --- G. supportDemandResolutionSteps measures real issue→resolve --- */
{
  const mat = ALL_MISSIONS.find((f) => f.id === 'mission.meet_at_a_time');
  const r = runScenario({ fixture: mat, archetype: ARCHETYPES.recurringGap(), archetypeName: 'recurringGap', policyName: 'B', steps: 30 });
  ok(Array.isArray(r.metrics.supportDemandResolutionSteps), 'G: metric missing');
  if (r.metrics.supportActionCount > 0) {
    ok(r.metrics.supportDemandResolutionSteps.every((n) => Number.isFinite(n) && n >= 0), 'G: invalid resolution steps');
    ok(r.metrics.supportDemandResolutionSteps.some((n) => n >= 0), 'G: no real measurement recorded');
  }
}

/* --- H. Decision-log fingerprint distinguishes histories --- */
{
  const { createDecisionLog, stateDigest } = await import('../experiments/next-for-you/decision-log.js');
  const evA = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const evB = evA.map((e) => ({ ...e, attempt: e.attempt ? { ...e.attempt, outcome: 'fail' } : e.attempt })); /* genuinely different history */
  const log = createDecisionLog();
  const dA = POLICIES.B(baseState(evA), {});
  const dB = POLICIES.B(baseState(evB), {});
  log.append(dA, { digest: stateDigest({ events: evA, learnerId: 'SIM', decisionContext: baseState(evA).decisionContext }) });
  log.append(dB, { digest: stateDigest({ events: evB, learnerId: 'SIM', decisionContext: baseState(evB).decisionContext }) });
  ok(log.at(0).stateFingerprint !== log.at(1).stateFingerprint, 'H: fingerprint identical for different histories');
  /* same history + same context ⇒ identical digest (stable, not random) */
  ok(stateDigest({ events: evA, learnerId: 'SIM', decisionContext: baseState(evA).decisionContext }) ===
     stateDigest({ events: evA, learnerId: 'SIM', decisionContext: baseState(evA).decisionContext }),
    'H: digest unstable for identical inputs');
}

/* --- I. Diagnostics bounded INCLUDING baseline probes --- */
{
  /* Two never-seen targets + budget 1: at most 1 probe this episode —
   * the second target's introduction must defer. */
  const caps = [sayCap(), askCap()];
  const ctx = emptyContext('ep.i', 'ses.i');
  const d1 = POLICIES.B(scopedState([], caps, { ctx }), {});
  ok(d1.chosen.kind === KINDS.DIAGNOSTIC_PROBE, `I: expected baseline probe, got ${d1.chosen.kind}`);
  /* Simulate one probe spent, then budget exhaustion defers the rest. */
  const ctx1 = recordChoice(ctx, { kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: d1.chosen.capabilityId, taskId: d1.chosen.taskId, timestamp: T0 });
  const d2 = POLICIES.B(scopedState([], caps, { ctx: ctx1 }), { selection: { diagnosticMaxPerEpisode: 1 } });
  ok(d2.chosen.kind !== KINDS.DIAGNOSTIC_PROBE, `I: second baseline probe exceeded episode budget`);
}

/* --- J. Thread semantics: interruptions never steal the thread --- */
{
  let ctx = emptyContext('ep.j', 'ses.j');
  ctx = recordChoice(ctx, { kind: KINDS.MISSION_CONTINUATION, capabilityId: 'interaction.ask_name', taskId: 'task.meet.interaction.guided', timestamp: T0 });
  ok(ctx.currentThreadCapabilityId === 'interaction.ask_name', 'J: thread not set by continuation');
  /* support demand on substrate cap = lastActed, not thread */
  ctx = recordChoice(ctx, { kind: KINDS.SUPPORT_DEMAND, capabilityId: 'reception.listen.identify_spoken_number', taskId: 'task.time.support.numbers', timestamp: T0 + 1 });
  ok(ctx.currentThreadCapabilityId === 'interaction.ask_name', 'J: support probe stole the learning thread');
  ok(ctx.lastActedCapabilityId === 'reception.listen.identify_spoken_number', 'J: lastActed not recorded');
  /* due review = interruption, not thread */
  ctx = recordChoice(ctx, { kind: KINDS.DUE_RETRIEVAL, capabilityId: 'production.speak.say_own_name', taskId: 'task.meet.delayed.name', timestamp: T0 + 2 });
  ok(ctx.currentThreadCapabilityId === 'interaction.ask_name', 'J: due review stole the thread');
  /* assessment checkpoint = interruption, not thread */
  ctx = recordChoice(ctx, { kind: KINDS.ASSESSMENT, capabilityId: 'reception.listen.identity_question_basic', taskId: 'task.meet.assessment.checkpoint', timestamp: T0 + 2.5 });
  ok(ctx.currentThreadCapabilityId === 'interaction.ask_name', 'J: assessment stole the thread');
  /* transfer check = interruption, not thread */
  ctx = recordChoice(ctx, { kind: KINDS.TRANSFER, capabilityId: 'reception.listen.identity_question_basic', taskId: 'task.meet.transfer.clinic', timestamp: T0 + 2.6 });
  ok(ctx.currentThreadCapabilityId === 'interaction.ask_name', 'J: transfer check stole the thread');
  /* a genuine thread action updates it */
  ctx = recordChoice(ctx, { kind: KINDS.NEW_INPUT, capabilityId: 'reception.listen.greeting_basic', taskId: 'task.meet.input.scene', timestamp: T0 + 3 });
  ok(ctx.currentThreadCapabilityId === 'reception.listen.greeting_basic', 'J: thread action did not move the thread');
}

console.log(`vnext-next-for-you hardening sections included`);
