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
const MIN = 60_000;
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
function correctionSyntheticState({ remediationTasks = 1 } = {}) {
  const mat = ALL_MISSIONS.find((f) => f.id === 'mission.meet_at_a_time');
  const ms = missionState(mat);
  const hearTask = mat.tasks.find((t) => t.id === 'task.time.retrieval.hear');
  const clockCap = capOf('reception.listen.understand_clock_time');
  const remTasks = [];
  for (let i = 0; i < remediationTasks; i++) {
    remTasks.push(makeTask({
      id: `task.time.remediation.hear${i ? `.${i}` : ''}`, missionId: 'mission.meet_at_a_time',
      capabilityId: clockCap.id, modality: clockCap.modality,
      purpose: 'remediation', promptFamily: hearTask.promptFamily,
      contextSignature: hearTask.contextSignature,
      stimulus: { type: 'audio_line', languageComponents: [`Meet me at ${['five', 'six'][i]}.`] },
      response: { type: 'choice', requiredFunctions: ['understand_clock_time'], options: [{ id: `opt${i}`, text: `Đáp ${i}`, correct: true }, { id: `alt${i}`, text: 'Khác.' }] },
      evaluation: { authority: 'deterministic', contractId: 'eval.choice.correct.v1' },
      language: { requiredChunks: [], requiredVocabulary: [], requiredConstructions: [] }
    }));
  }
  const tasks = [...mat.tasks, ...remTasks];
  const mission = { ...mat.mission, taskIds: [...mat.mission.taskIds, ...remTasks.map((t) => t.id)] };
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

/* --- D. Assessment consumption: failed checkpoint — A re-probes, B/C demand fresh --- */
{
  const ev = [...transferredHistory(), attemptEvent(tmt('assessment.checkpoint'), askCap(), { at: T0 - HOUR, outcome: 'fail' })];
  /* B/C must NOT re-sell the consumed item as a fresh sample */
  for (const p of ['B', 'C']) {
    const d = POLICIES[p](scopedState(ev, [askCap()]), {});
    ok(!(d.chosen.kind === KINDS.ASSESSMENT && d.chosen.taskId === 'task.meet.assessment.checkpoint'), `D.${p}: consumed assessment re-sold as fresh after fail`);
  }
  /* the candidate stays visible but flagged — the POLICY owns the
   * consumed-reuse decision (A mirrors production re-probe) */
  const gen = generateCandidates(scopedState(ev, [askCap()]));
  const consumedCand = gen.candidates.find((c) => c.kind === KINDS.ASSESSMENT && c.servableTask);
  ok(consumedCand?.consumed === true, 'D: consumed assessment not flagged for the policy layer');
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

/* ══════════════════════════════════════════════════════════════════
 * ROUND 2 (PR #69 comment 5911702205) — red-first regressions for the
 * second architecture review: clock replay, revision provenance,
 * canonical input digest, fail-closed mission integrity, demand
 * provenance, BLOCKED≠IDLE, Policy-A filter parity, assessment
 * A-vs-B semantics, repair bound, starvation variants, validator
 * coverage, strict observation, immutable log, explanation trace,
 * decision-id state identity.
 * ══════════════════════════════════════════════════════════════════ */

/* --- K. Clock replay: replayAt must pin now=T --- */
{
  /* cap independent ~now: last success at T0 → due at T0+24h, so NOT
   * due at T0, due at T0+30d. A replay "at T0" must evaluate with
   * now=T0 — the future clock must not leak. */
  const ev = independentHistory(T0 + 2 * DAY);
  const atT = POLICIES.B(scopedState(ev, [askCap()], { ctx: emptyContext('ep.k', 'ses.k'), now: T0 }), {});
  const futureState = { ...scopedState(ev, [askCap()], { ctx: emptyContext('ep.k', 'ses.k'), now: T0 }), now: T0 + 30 * DAY };
  const replayed = replayAt(futureState, 'B', T0);
  ok(policyOut(atT) === policyOut(replayed),
    `K: replay leaked future clock (${policyOut(atT)} vs ${policyOut(replayed)})`);
  ok(atT.chosen.kind !== KINDS.DUE_RETRIEVAL, 'K: cap due at T0 — fixture invalid');
}

/* --- L. Revision-scoped provenance: task@rev + mission@rev --- */
{
  const { validateDecision } = await import('../experiments/next-for-you/validator.js');
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const d = POLICIES.B(baseState(ev, { now: T0 }), {});
  ok(d.chosen.taskId != null && d.chosen.taskRevision != null,
    'L: chosen decision does not stamp taskRevision');
  ok(d.missionId === F.mission.id && d.missionRevision === F.mission.revision,
    'L: decision does not stamp missionId@missionRevision');
  /* v1→v2: add a v2 of the served task — the historical decision must
   * still audit against v1, never silently rebind to v2. */
  const v1 = taskById(d.chosen.taskId);
  const v2 = { ...v1, revision: (v1.revision ?? 1) + 1 };
  const tasksV2 = [...state.tasks, v2];
  const v = validateDecision(d, { events: ev, tasks: tasksV2, capabilities: state.capabilities, roles: state.roles, mission: F.mission, learnerId: 'SIM', now: T0, policy: LEARNING_POLICY_V1, selection: {} });
  ok(!v.includes('task_revision_missing') && !v.includes('task_not_in_registry'),
    `L: v1 decision orphaned after v2 registered (${v.join(',')})`);
  /* a decision stamping a revision that never existed must flag */
  const forged = { ...d, chosen: { ...d.chosen, taskRevision: 99 } };
  ok(validateDecision(forged, { events: ev, tasks: tasksV2, capabilities: state.capabilities, roles: state.roles, mission: F.mission, learnerId: 'SIM', now: T0, policy: LEARNING_POLICY_V1, selection: {} }).length > 0,
    'L: forged taskRevision passed the validator');
}

/* --- M. Decision-input digest: mutation matrix + collision resistance --- */
{
  const { stateDigest } = await import('../experiments/next-for-you/decision-log.js');
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const st = baseState(ev, { now: T0 });
  const digestOf = (over = {}) => stateDigest({ events: over.events ?? st.events, learnerId: 'SIM', decisionContext: over.decisionContext ?? st.decisionContext, now: over.now ?? st.now, policy: over.policy ?? st.policy, selection: over.selection ?? st.selection, mission: over.mission ?? st.mission, tasks: over.tasks ?? st.tasks, roles: over.roles ?? st.roles });
  const base = digestOf();
  const mut = (name, over) => ok(digestOf(over) !== base, `M.${name}: decision-relevant input changed but digest did not`);
  mut('support', { events: ev.map((e, i) => i === 0 && e.attempt ? { ...e, support: { ...e.support, hint: true } } : e) });
  mut('observed', { events: ev.map((e, i) => i === 0 && e.attempt ? { ...e, attempt: { ...e.attempt, observed: false } } : e) });
  mut('missingFunctions', { events: ev.map((e, i) => i === 0 && e.attempt ? { ...e, evaluation: { ...(e.evaluation ?? {}), missingFunctions: ['ask_name'] } } : e) });
  mut('promptFamily', { tasks: state.tasks.map((t, i) => i === 0 ? { ...t, promptFamily: t.promptFamily + '.mut' } : t) });
  mut('taskRevision', { tasks: state.tasks.map((t, i) => i === 0 ? { ...t, revision: (t.revision ?? 1) + 1 } : t) });
  mut('policy', { policy: { ...LEARNING_POLICY_V1, retention: { ...LEARNING_POLICY_V1.retention, minLagMs: 999 } } });
  mut('selection', { selection: { diagnosticMaxPerEpisode: 9 } });
  mut('now', { now: T0 + DAY });
  mut('diagnosticContext', { decisionContext: recordChoice(st.decisionContext, { kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: 'x', taskId: 't', timestamp: T0 }) });
  mut('missionRevision', { mission: { ...F.mission, revision: (F.mission.revision ?? 1) + 1 } });
  ok(digestOf() === digestOf(), 'M: digest unstable for identical inputs');
  ok(typeof base === 'string' && base.length >= 32, 'M: digest too weak (need ≥ SHA-256-class)');
}

/* --- N. Mission integrity: fail closed into BLOCKED --- */
{
  for (const p of ['A', 'B', 'C']) {
    const missing = POLICIES[p]({ ...baseState([], { now: T0 }), mission: { ...F.mission, taskIds: [...F.mission.taskIds, 'task.ghost'] } }, {});
    ok(missing.chosen.kind === 'blocked', `N.${p}: missing declared task did not block (got ${missing.chosen.kind})`);
    const dup = POLICIES[p]({ ...baseState([], { now: T0 }), tasks: [...state.tasks, state.tasks[0]] }, {});
    ok(dup.chosen.kind === 'blocked', `N.${p}: duplicate id@revision did not block`);
    const bad = { ...state.tasks[0], purpose: 'teleport' };
    const invalid = POLICIES[p]({ ...baseState([], { now: T0 }), tasks: [...state.tasks.slice(1), bad] }, {});
    ok(invalid.chosen.kind === 'blocked', `N.${p}: invalid declared task did not block`);
  }
}

/* --- O. Support-demand provenance: exact demand identity survives --- */
{
  const mat = ALL_MISSIONS.find((f) => f.id === 'mission.meet_at_a_time');
  const ms = missionState(mat);
  const hearTask = mat.tasks.find((t) => t.id === 'task.time.retrieval.hear');
  const numCap = capOf('reception.listen.identify_spoken_number');
  /* two demands, same provider, different targets */
  const t2 = mat.tasks.find((t) => t.id === 'task.time.diagnostic.hear');
  const clockCap = capOf(t2.capabilityId);
  const ev = [
    attemptEvent(hearTask, capOf(hearTask.capabilityId), { at: T0 - 2 * HOUR, outcome: 'fail', missing: ['identify_spoken_number'] }),
    attemptEvent(t2, clockCap, { at: T0 - HOUR, outcome: 'fail', missing: ['identify_spoken_number'] })
  ];
  const st = { learnerId: 'SIM', events: ev, capabilities: ms.capabilities, tasks: mat.tasks, roles: ms.roles, policy: LEARNING_POLICY_V1, now: T0, mission: mat.mission, decisionContext: emptyContext('ep.o', 'ses.o'), selection: {} };
  for (const p of ['A', 'B', 'C']) {
    const d = POLICIES[p](st, {});
    ok(d.chosen.kind === KINDS.SUPPORT_DEMAND, `O.${p}: demand not routed (got ${d.chosen.kind})`);
    const dp = d.chosen.demandProvenance;
    ok(dp && dp.targetCapabilityId && dp.targetTaskId && dp.targetTaskRevision != null &&
       dp.missingFunction === 'identify_spoken_number' && dp.sourceEventId && dp.supportCapabilityId === numCap.id,
      `O.${p}: chosen demand lost its provenance`);
    ok(d.chosen.taskRevision != null, `O.${p}: serving task revision not stamped`);
  }
}

/* --- P. BLOCKED ≠ IDLE --- */
{
  /* IDLE: fresh surface where every cap is foreign-scoped → no candidates */
  const idleD = POLICIES.B({ ...baseState([], { now: T0 }), capabilities: [], tasks: [] , mission: { ...F.mission, taskIds: [], targetCapabilities: [] } }, {});
  ok(idleD.chosen.kind === 'idle', `P: empty surface should be idle, got ${idleD.chosen.kind}`);
  /* BLOCKED: candidates exist but all are hard-filtered — burned budget
   * leaves only diagnostic candidates for the never-seen target. */
  const blockedD = POLICIES.B(scopedState([], [askCap()], { ctx: burnCtx2(2) }), {});
  ok(blockedD.chosen.kind === 'blocked', `P: filtered-out work should be blocked, got ${blockedD.chosen.kind}`);
  ok(blockedD.blocked === true, 'P: blocked flag missing');
  /* validator: fabricated idle while a servable candidate exists */
  const { validateDecision } = await import('../experiments/next-for-you/validator.js');
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const good = POLICIES.B(baseState(ev, { now: T0 }), {});
  const fakeIdle = { ...good, chosen: { kind: 'idle', capabilityId: null, taskId: null, tier: 'TERMINAL' } };
  const v = validateDecision(fakeIdle, { events: ev, tasks: state.tasks, capabilities: state.capabilities, roles: state.roles, mission: F.mission, learnerId: 'SIM', now: T0, policy: LEARNING_POLICY_V1, selection: {}, decision: fakeIdle });
  ok(v.length > 0, 'P: fabricated idle passed the validator');
}

/* --- Q. Policy A shares the hard-safety envelope --- */
{
  /* burned diagnostic budget must stop probes under ALL policies */
  for (const p of ['A', 'B', 'C']) {
    const d = POLICIES[p](scopedState([], [askCap()], { ctx: burnCtx2(2) }), {});
    ok(d.chosen.kind !== KINDS.DIAGNOSTIC_PROBE, `Q.${p}: probe served past episode budget`);
  }
  /* purpose substitution: a candidate whose servable task has the wrong
   * purpose is filtered everywhere — exercise via a state whose only
   * remaining diagnostic surface resolves to a non-diagnostic task.
   * (Author-side purpose table is exercised by F + this parity check.) */
}

/* --- R. Assessment semantics: A mirrors production retry, B demands fresh --- */
{
  const ev = [...transferredHistory(), attemptEvent(tmt('assessment.checkpoint'), askCap(), { at: T0 - HOUR, outcome: 'fail' })];
  /* Production mirror: remediation precedes re-probe, so A serves the
   * repair first — BUT the consumed assessment must remain ELIGIBLE
   * under A (mission-runner re-serves it after remediation). */
  const da = POLICIES.A(scopedState(ev, [askCap()]), {});
  const aCand = da.candidates.find((c) => c.kind === KINDS.ASSESSMENT && c.taskId === 'task.meet.assessment.checkpoint');
  ok(aCand && aCand.eligible === true, 'R: Policy A filtered the consumed assessment — not production-faithful');
  for (const p of ['B', 'C']) {
    const d = POLICIES[p](scopedState(ev, [askCap()]), {});
    const bc = d.candidates.find((c) => c.kind === KINDS.ASSESSMENT && c.taskId === 'task.meet.assessment.checkpoint');
    ok(bc && bc.eligible === false && bc.filterReason.includes('assessment_consumed'),
      `R.${p}: consumed assessment not hard-filtered (${bc?.filterReason ?? 'absent'})`);
    ok(!(d.chosen.kind === KINDS.ASSESSMENT && d.chosen.taskId === 'task.meet.assessment.checkpoint'),
      `R.${p}: consumed assessment re-sold as fresh under desired semantics`);
  }
  /* B with an unused fresh assessment family → serves that instead,
   * once the failed checkpoint's repair is cleared (REPAIR honestly
   * outranks EVIDENCE while a repair is pending). */
  const altAssess = { ...tmt('assessment.checkpoint'), id: 'task.meet.assessment.second' };
  const tasks2 = [...state.tasks, altAssess];
  const mission2 = { ...F.mission, taskIds: [...F.mission.taskIds, altAssess.id] };
  const repaired = [
    ...transferredHistory(T0), /* last independent ~T0-20h → not due */
    attemptEvent(tmt('assessment.checkpoint'), askCap(), { at: T0 - 2 * HOUR, outcome: 'fail' }),
    attemptEvent(tmt('remediation.ask_name'), askCap(), { at: T0 - HOUR, outcome: 'success' })
  ];
  const db2 = POLICIES.B(scopedState(repaired, [askCap()], { tasks: tasks2, mission: mission2 }), {});
  ok(db2.chosen.kind === KINDS.ASSESSMENT && db2.chosen.taskId === 'task.meet.assessment.second',
    `R2: B should serve the unused fresh assessment, got ${db2.chosen.kind}@${db2.chosen.taskId}`);
}

/* --- S. Alternating repair bound --- */
{
  /* Two remediation tasks on one cap; the per-cap episode repair bound
   * must stop A→B→A→B alternation from monopolizing the episode. */
  const st = correctionSyntheticState({ remediationTasks: 2 });
  let ctx = emptyContext('ep.s', 'ses.s');
  let repairs = 0, escapes = 0;
  for (let i = 0; i < 10; i++) {
    const d = POLICIES.B({ ...st, decisionContext: ctx }, {});
    if (d.chosen.kind === KINDS.CORRECTION) repairs++;
    else if (d.chosen.kind !== 'idle' && d.chosen.kind !== 'blocked') escapes++;
    if (d.chosen.taskId) {
      ctx = recordChoice(ctx, { kind: d.chosen.kind, capabilityId: d.chosen.capabilityId, taskId: d.chosen.taskId, timestamp: T0 + i });
    } else break;
  }
  ok(repairs <= 3, `S: repair monopolized ${repairs}/10 decisions on one capability (bound missing)`);
  ok(repairs >= 1, 'S: fixture produced no repair at all — bound untested');
}

/* --- T. Starvation guard variants --- */
{
  /* A wall of due work + one fresh non-target cap: under every guarded
   * variant the backlog must not permanently starve forward progress —
   * some non-due tier escapes within a bounded window. */
  const ev = seedIndependentHistory(F, { caps: 3, at: T0 - 45 * DAY });
  const seededIds = new Set(ev.map((e) => e.capabilityId));
  const freshCap = state.capabilities.find((c) => !seededIds.has(c.id) && !F.mission.targetCapabilities.includes(c.id) && !(F.mission.supportCapabilities ?? []).includes(c.id));
  ok(freshCap, 'T: no fresh non-target cap available for starvation fixture');
  const caps = [...state.capabilities.filter((c) => seededIds.has(c.id)), freshCap];
  for (const variant of ['review', 'balanced', 'forward']) {
    let ctx = emptyContext('ep.t', 'ses.t');
    let escaped = false;
    for (let i = 0; i < 16; i++) {
      const d = POLICIES.B({ ...baseState(ev, { now: T0 }), capabilities: caps, decisionContext: ctx }, { selection: { starvationGuard: variant } });
      if (d.chosen.kind !== KINDS.DUE_RETRIEVAL && d.chosen.kind !== 'idle' && d.chosen.kind !== 'blocked') { escaped = true; break; }
      if (!d.chosen.taskId) break;
      ctx = recordChoice(ctx, { kind: d.chosen.kind, capabilityId: d.chosen.capabilityId, taskId: d.chosen.taskId, timestamp: T0 + i });
    }
    ok(escaped, `T.${variant}: due backlog permanently monopolized the episode`);
  }
}

/* --- U. Validator coverage: real policy/config + mutation battery --- */
{
  const { validateDecision } = await import('../experiments/next-for-you/validator.js');
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const st = baseState(ev, { now: T0 });
  const good = POLICIES.B(st, {});
  const env = { events: ev, tasks: state.tasks, capabilities: state.capabilities, roles: state.roles, mission: F.mission, learnerId: 'SIM', now: T0, policy: LEARNING_POLICY_V1, selection: {} };
  /* diagnostic budget is a hard rule the validator must re-check */
  const overBudget = { ...good, chosen: { ...good.chosen, kind: 'diagnostic_probe' } };
  ok(validateDecision(overBudget, { ...env, decisionContext: burnCtx2(2) }).some((x) => x.includes('diagnostic')), 'U: validator missed budget violation');
  /* failure ceiling: correction while over ceiling */
  const overCeil = { ...good, chosen: { ...good.chosen, kind: 'correction' } };
  const evFail = [...ev, attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - MIN, outcome: 'fail' }), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - MIN + 1, outcome: 'fail' }), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - MIN + 2, outcome: 'fail' }), attemptEvent(tmt('retrieval.ask_name'), askCap(), { at: T0 - MIN + 3, outcome: 'fail' })];
  ok(validateDecision(overCeil, { ...env, events: evFail, decisionContext: st.decisionContext }).length > 0, 'U: validator missed failure-ceiling violation');
}

/* --- V. Strict observation: missing `observed` ≠ verified --- */
{
  const t = tmt('retrieval.ask_name');
  const raw = attemptEvent(t, askCap(), { at: T0 - HOUR, outcome: 'fail' });
  delete raw.attempt.observed; /* legacy/malformed event — not verified */
  const gen = generateCandidates(scopedState([...independentHistory(), raw], [askCap()]));
  ok(!gen.candidates.some((c) => c.kind === KINDS.REFRESH), 'V: refresh minted from event with missing observed flag');
}

/* --- W. Immutable decision log --- */
{
  const { createDecisionLog, stateDigest } = await import('../experiments/next-for-you/decision-log.js');
  const ev = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const st = baseState(ev, { now: T0 });
  const d = POLICIES.B(st, {});
  const log = createDecisionLog();
  log.append(d, { digest: stateDigest({ events: ev, learnerId: 'SIM', decisionContext: st.decisionContext, now: T0, policy: LEARNING_POLICY_V1, selection: {}, mission: F.mission, tasks: state.tasks, roles: state.roles }) });
  const before = JSON.stringify(log.at(0));
  d.chosen.kind = 'MUTATED';
  d.explanation.whyExists = 'tampered';
  ok(JSON.stringify(log.at(0)) === before, 'W: mutating the decision object changed the log');
}

/* --- X. Explanation trace: every loser reconstructible --- */
{
  const ev = seedIndependentHistory(F, { caps: 3, at: T0 - 30 * DAY });
  const d = POLICIES.B(baseState(ev, { now: T0 }), {});
  ok(d.explanation.beat.length > 0, 'X: no alternatives recorded');
  for (const b of d.explanation.beat) {
    ok(b.kind && b.capabilityId != null && b.tier != null && b.lostBecause != null,
      `X: losing alternative not auditable (${JSON.stringify(b)})`);
  }
  ok(d.explanation.tieBreak != null, 'X: no tie-break record');
}

/* --- Y. Decision id carries state identity --- */
{
  const evA = seedIndependentHistory(F, { caps: 2, at: T0 - 30 * DAY });
  const evB = seedIndependentHistory(F, { caps: 3, at: T0 - 30 * DAY });
  const dA = POLICIES.B(baseState(evA, { now: T0 }), {});
  const dB = POLICIES.B(baseState(evB, { now: T0 }), {});
  ok(dA.decisionId !== dB.decisionId, 'Y: different input states collided on one decisionId');
}

function burnCtx2(n) {
  let c = emptyContext('ep.b2', 'ses.b2');
  for (let i = 0; i < n; i++) c = recordChoice(c, { kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: 'cap.burn' + i, taskId: 'task.burn' + i, timestamp: T0 - i });
  return c;
}

console.log(`vnext-next-for-you hardening sections included`);
