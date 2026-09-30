/* REFERENCE-vs-B0 differential corpus (mission 008C, spec §17).
 *
 * For every authored mission × archetype × seed, the PRODUCTION runner
 * (`nextMissionTask`) drives the trajectory and the hardened B0 engine
 * evaluates THE SAME frozen pre-decision state counterfactually at every
 * step. Each step where the two disagree is classified:
 *
 *   EXPECTED        a documented intentional semantic difference
 *                   (ordering within the same intent, coverage of
 *                   capabilities production never routes to, budgeted
 *                   diagnostics vs production's unbudgeted phase-0)
 *   SAFETY-PRIOR    B0 refuses work a kernel invariant forbids but the
 *                   shipped runner allows (consumed assessment family,
 *                   resume of a consumed pending-phase task)
 *   CONTENT-GAP     B0 wants an intent the curriculum cannot serve
 *   BUG             anything that cannot be attributed — the corpus
 *                   fails on a single unexplained divergence
 *
 * This harness asserts the CLASSIFICATION, never that one side teaches
 * better — a divergence is evidence of a policy difference only.
 */
import { nextMissionTask } from '../../src/vnext/mission-runner.js';
import { capabilityById, FIXTURES } from '../../src/vnext/fixtures.js';
import { CAPABILITIES } from '../../src/vnext/capabilities.js';
import { LEARNING_POLICY_V1 } from '../../src/vnext/policy.js';
import { RISK_PRIORS } from '../../src/vnext/risk-priors.js';
import { engineState } from '../../src/vnext/next-for-you/selector.js';
import { policyB, PURPOSE_TO_KIND } from '../../src/vnext/next-for-you/policies.js';
import { validateDecision } from '../../src/vnext/next-for-you/validator.js';
import { emptyContext, recordChoice } from '../../src/vnext/next-for-you/decision-context.js';
import { KINDS } from '../../src/vnext/next-for-you/constants.js';
import { attemptEvent, observeEvent, seedIndependentHistory, ARCHETYPES } from './scenarios.js';

const MIN = 60_000;
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const SESSION_LEN = 4; // same pacing as benchmark.js [SAFETY PRIOR]

const ELICITING = new Set(['diagnostic', 'retrieval', 'production', 'interaction', 'remediation', 'delayed_retrieval', 'transfer', 'assessment', 'support']);
const EXPOSING = new Set(['input', 'notice']);

/* Production-parity call surface: the shipped runner sees the FULL
 * curriculum registry + capability set; B0 sees the same objects via
 * engineState (scope derived inside). Never the fixture-only lists —
 * the comparison must be between what the deployed runner does and
 * what deployed B0 would do. */
const TASK_REGISTRY = FIXTURES.flatMap((f) => f.tasks);

/* What semantic slot a production-served purpose occupies in B0's kind
 * vocabulary — the comparison is per-intent, never per-surface-label. */
const PURPOSE_KIND = (purpose) => PURPOSE_TO_KIND[purpose] ?? 'mission_continuation';

/* Whether `b0Kind` can legitimately serve a task of `purpose` — the
 * same mapping the hard filter enforces (PURPOSE_OK parity). */
const KIND_SERVES = {
  diagnostic_probe: ['diagnostic'],
  assessment: ['assessment'],
  due_retrieval: ['delayed_retrieval'],
  correction: ['remediation'],
  refresh: ['remediation', 'retrieval'],
  support_demand: ['support'],
  transfer: ['transfer'],
  independent_attempt: ['retrieval', 'production', 'interaction'],
  mission_continuation: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  new_input: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  resume_in_flight: ['input', 'notice', 'retrieval', 'production', 'interaction']
};

const refKind = (ref) => ref.status === 'ready' ? PURPOSE_KIND(ref.purpose) : ref.status;

/* Classify one divergence. `ref` is the production selection shape,
 * `b0` the decision record, `state` the shared frozen input. */
export function classifyDivergence(ref, b0) {
  const rk = refKind(ref);
  const bk = b0?.chosen?.kind ?? 'idle';
  const b0Task = b0?.chosen?.taskId ?? null;
  const refTask = ref.taskId ?? null;
  const sameTask = refTask != null && refTask === b0Task;
  if (sameTask) return { class: 'MATCH' };

  const refReady = ref.status === 'ready' && refTask != null;
  const b0Terminal = bk === 'idle' || bk === 'blocked' || b0Task == null;

  /* Both terminal — different terminal vocabulary is not a
   * behavioral divergence. */
  if (!refReady && b0Terminal) {
    return { class: 'EXPECTED', note: `both terminal: ref=${ref.status}, b0=${bk}` };
  }

  /* B0 blocked/idle while production serves: WHY B0 can't serve decides
   * the class. Consumed assessment family or safety filters →
   * SAFETY-PRIOR; no servable task for B0's wanted intents →
   * CONTENT-GAP; production re-serving a consumed pending-phase task
   * B0 refuses to re-serve → SAFETY-PRIOR. */
  if (refReady && b0Terminal) {
    /* Why B0 can't serve lives in two places: explanation.suppressed
     * (mint-level drops) and candidates[].filterReason (hard-filter). */
    const suppressed = (b0?.explanation?.suppressed ?? []).join(' | ');
    const filtered = (b0?.candidates ?? []).map((c) => c.filterReason).filter(Boolean).join(' | ');
    const allBlockers = `${suppressed} | ${filtered}`;
    if (/assessment_family_consumed|assessment_consumed/.test(allBlockers) && ref.purpose === 'assessment') {
      return { class: 'SAFETY-PRIOR', note: 'production re-probes an assessment family B0 considers consumed; B0 requires a fresh family' };
    }
    if (/assessment_family_consumed/.test(allBlockers)) {
      return { class: 'CONTENT-GAP', note: 'B0 wants assessment but the family is consumed and no fresh family exists' };
    }
    if (/diagnostic_budget/.test(allBlockers)) {
      return { class: 'SAFETY-PRIOR', note: 'production phase-0 diagnostic exceeds B0 episode budget' };
    }
    if (allBlockers.trim() !== '|' && allBlockers.trim().length) {
      return { class: 'CONTENT-GAP', note: `B0 blocked — intents exist but all filtered: ${allBlockers.slice(0, 160)}` };
    }
    if (ref.purpose === 'assessment') {
      return { class: 'SAFETY-PRIOR', note: 'production serves assessment B0 has no fresh candidate for' };
    }
    return { class: 'EXPECTED', note: `B0 idle (no candidates) while production serves ${ref.purpose} — coverage difference` };
  }

  /* Production terminal while B0 still has work. Production's intent
   * vocabulary is narrower: its 'retry' needs remediation-purpose tasks
   * and it has no refresh/support-demand/due-routing intents at all.
   * When the shipped runner finds nothing, a B0 serve is by definition
   * work production could not express — the corpus observes WHICH
   * intent still had honest room. Anything still servable here is a
   * coverage difference, provided the validator stays silent (checked
   * separately per row). */
  if (!refReady && !b0Terminal) {
    return {
      class: 'EXPECTED',
      note: `production ${ref.status} (intent has no compatible task) but B0 serves ${bk}@${b0Task} — B0 vocabulary covers work production cannot express`
    };
  }

  /* Both ready, different picks. */
  if (refReady && !b0Terminal) {
    /* Same semantic intent, different task — ordering inside one slot. */
    if ((KIND_SERVES[bk] ?? []).includes(ref.purpose)) {
      return { class: 'EXPECTED', note: `same intent slot: ref ${ref.purpose}=${refTask} vs b0 ${bk}=${b0Task}` };
    }
    /* Production phase-0 diagnostic vs B0's budgeted probe ordering. */
    if (ref.purpose === 'diagnostic' && bk === KINDS.DIAGNOSTIC_PROBE) {
      return { class: 'EXPECTED', note: 'diagnostic ordering differs' };
    }
    if (ref.purpose === 'diagnostic' && bk !== KINDS.DIAGNOSTIC_PROBE) {
      const suppressed = (b0?.explanation?.suppressed ?? []).join(' | ');
      if (/diagnostic_budget/.test(suppressed)) {
        return { class: 'SAFETY-PRIOR', note: 'B0 deferred a diagnostic past its per-episode budget' };
      }
      return { class: 'EXPECTED', note: `B0 prioritized ${bk} over a diagnostic` };
    }
    /* Reference resume re-serving what B0 treats differently. */
    if (rk === KINDS.RESUME_IN_FLIGHT && bk !== KINDS.RESUME_IN_FLIGHT) {
      return { class: 'EXPECTED', note: `production resumed an open encounter; B0 prioritized ${bk}` };
    }
    /* Repair vs maintenance ordering differences — both are
     * evidence-honest intents; ordering is a policy choice. */
    const repairKinds = [KINDS.CORRECTION, KINDS.REFRESH, KINDS.SUPPORT_DEMAND];
    const maintKinds = [KINDS.DUE_RETRIEVAL, KINDS.TRANSFER, KINDS.ASSESSMENT];
    if (repairKinds.includes(rk) && maintKinds.includes(bk)) {
      return { class: 'EXPECTED', note: `B0 prioritized ${bk} (EVIDENCE) over ${rk} (REPAIR)` };
    }
    if (maintKinds.includes(rk) && repairKinds.includes(bk)) {
      return { class: 'EXPECTED', note: `B0 prioritized ${bk} (REPAIR) over ${rk} (EVIDENCE)` };
    }
    /* Within-EVIDENCE ordering: assessment only mints post-transfer, so
     * a production transfer task on an already-transferred cap is extra
     * practice while B0 prefers the claim-bearing assessment plan. The
     * preference ladder is explicit data (mission_assessment_plan >
     * transfer_pending) — an ordering difference, not a substitution. */
    if (rk === KINDS.TRANSFER && bk === KINDS.ASSESSMENT) {
      return { class: 'EXPECTED', note: 'cap already transferred — B0 ranks assessment_plan over extra transfer practice' };
    }
    if (rk === KINDS.ASSESSMENT && bk === KINDS.TRANSFER) {
      return { class: 'EXPECTED', note: 'B0 prefers a pending transfer check before the assessment' };
    }
    if (rk === bk) {
      return { class: 'EXPECTED', note: `same kind ${rk}, different task` };
    }
    /* Introduction vs anything — production and B0 weight fresh
     * exposure differently. */
    if ([KINDS.NEW_INPUT, KINDS.MISSION_CONTINUATION].includes(rk) || [KINDS.NEW_INPUT, KINDS.MISSION_CONTINUATION].includes(bk)) {
      return { class: 'EXPECTED', note: `introduction ordering: ref=${rk} vs b0=${bk}` };
    }
    return { class: 'BUG', note: `unclassified: ref ${ref.purpose}=${refTask} vs b0 ${bk}=${b0Task}` };
  }

  return { class: 'BUG', note: `unclassified state: ref=${ref.status}/${refTask} b0=${bk}/${b0Task}` };
}

/* Drive one mission under an archetype: the REFERENCE runner picks each
 * task (production truth), the archetype answers it, B0 counterfactually
 * evaluates the identical frozen state at every step. */
export function runDifferential({ fixture, archetypeName, steps = 40, seed = null, now0 = Date.parse('2026-02-01T09:00:00Z') }) {
  const archetype = ARCHETYPES[archetypeName]();
  const mission = fixture.mission;
  let now = now0;
  let ctx = emptyContext('ep.diff.0', 'ses.diff');
  const events = seed === 'independent30d' ? seedIndependentHistory(fixture, { caps: 4, at: now0 - 30 * DAY }) : [];
  const rows = [];

  for (let step = 0; step < steps; step++) {
    const ref = nextMissionTask({
      learnerId: 'SIM', mission, tasks: TASK_REGISTRY, capabilities: CAPABILITIES,
      events, riskPriors: RISK_PRIORS, now, policy: LEARNING_POLICY_V1
    });
    const state = engineState({
      learnerId: 'SIM', mission, tasks: TASK_REGISTRY, capabilities: CAPABILITIES,
      events, riskPriors: RISK_PRIORS, policy: LEARNING_POLICY_V1,
      selection: {}, decisionContext: ctx, now
    });
    const b0 = policyB(state);
    const cls = classifyDivergence(ref, b0);
    /* §21 in the corpus too: every counterfactual B0 decision is
     * re-validated against the same frozen input. */
    const violations = validateDecision(b0, {
      events, tasks: TASK_REGISTRY, capabilities: state.capabilities,
      roles: state.roles, mission, learnerId: 'SIM', now,
      policy: LEARNING_POLICY_V1, selection: {}, decisionContext: ctx
    });
    rows.push({
      step, mission: mission.id, archetype: archetypeName,
      ref: { status: ref.status, task: ref.taskId == null ? null : `${ref.taskId}@${ref.taskRevision ?? 1}`, purpose: ref.purpose ?? null },
      b0: { kind: b0.chosen?.kind ?? null, task: b0.chosen?.taskId == null ? null : `${b0.chosen.taskId}@${b0.chosen.taskRevision ?? 1}` },
      b0Violations: violations,
      ...cls
    });

    if (ref.status !== 'ready' || ref.taskId == null) break;
    const task = TASK_REGISTRY.find((t) => t.id === ref.taskId && (t.revision ?? 1) === (ref.taskRevision ?? 1));
    const cap = task ? capabilityById(task.capabilityId) : null;
    if (!task || !cap) break;

    const outcome = archetype.respond({ task, capability: cap, decision: ref, step });
    now += 5 * MIN;
    if (outcome != null) {
      if (ELICITING.has(task.purpose)) {
        const missing = !archetype.forceNoMissing && (outcome === 'fail' || outcome === 'partial')
          ? [archetype.missing?.(task)].flat().filter(Boolean)
          : null;
        events.push(attemptEvent(task, cap, {
          at: now, outcome, missing,
          type: task.purpose === 'support' ? 'support_attempt' : null
        }));
      } else if (EXPOSING.has(task.purpose)) {
        events.push(observeEvent(task, cap, { at: now }));
      }
    }
    /* Context bookkeeping tracks the learner's ACTUAL actions — the
     * reference-served purpose mapped into B0's kind vocabulary. */
    ctx = recordChoice(ctx, {
      kind: PURPOSE_KIND(task.purpose), capabilityId: task.capabilityId,
      taskId: `${task.id}@${task.revision ?? 1}`, timestamp: now, decisionId: null
    });
    if ((step + 1) % SESSION_LEN === 0) {
      now += DAY;
      ctx = { ...emptyContext(`ep.diff.${step}`, ctx.sessionId), currentThreadCapabilityId: ctx.currentThreadCapabilityId };
    }
  }
  return { rows, events };
}

/* Whole corpus: all missions × a representative archetype set covering
 * the §17 state list (fresh, failer=observed failure, nonAttributing=
 * unobserved failure, assessmentFailing, transferBlocked, stuck=
 * repair-bound, recurringGap, supportDependent, returning30d+seed=
 * returning/due/large-backlog). */
export const DIFFERENTIAL_MATRIX = [
  { archetype: 'fast' },
  { archetype: 'thin' },
  { archetype: 'failedRetrieval' },
  { archetype: 'failer' },
  { archetype: 'nonAttributingFailer' },
  { archetype: 'supportDependent' },
  { archetype: 'recurringGap' },
  { archetype: 'transferBlocked' },
  { archetype: 'assessmentFailing' },
  { archetype: 'multiModal' },
  { archetype: 'stuck' },
  { archetype: 'mixed' },
  { archetype: 'rapidNew' },
  { archetype: 'returning30d', seed: 'independent30d' },
  { archetype: 'manyDue', seed: 'independent30d' }
];

export function runCorpus(fixtures, { steps = 40, matrix = DIFFERENTIAL_MATRIX } = {}) {
  const all = [];
  for (const f of fixtures) {
    for (const { archetype, seed } of matrix) {
      all.push(...runDifferential({ fixture: f, archetypeName: archetype, seed, steps }).rows);
    }
  }
  return all;
}

/* Direct run: `node experiments/next-for-you/differential.js` prints the
 * per-class histogram and every non-EXPECTED divergence for §17 review. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = runCorpus(FIXTURES);
  const byClass = {};
  let violations = 0;
  for (const r of rows) {
    byClass[r.class] = (byClass[r.class] ?? 0) + 1;
    violations += (r.b0Violations ?? []).length;
  }
  console.log('differential rows:', rows.length, JSON.stringify(byClass), '| b0 validator violations:', violations);
  for (const r of rows.filter((r) => r.class !== 'MATCH' && r.class !== 'EXPECTED')) {
    console.log(`${r.class} | ${r.mission} ${r.archetype} step ${r.step} | ref:${r.ref.purpose ?? r.ref.status} -> b0:${r.b0.kind ?? 'none'} | ${r.note ?? ''}`);
  }
  if (rows.some((r) => r.class === 'BUG') || violations > 0) process.exitCode = 1;
}
