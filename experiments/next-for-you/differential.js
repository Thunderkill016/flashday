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
import { RISK_PRIORS, priorById } from '../../src/vnext/risk-priors.js';
import { contractAttributesFunctions } from '../../src/vnext/evaluators.js';
import { canonicalFamilyId } from '../../src/vnext/contracts.js';
import { engineState, classifyB0B1 } from '../../src/vnext/next-for-you/selector.js';
import { policyB, policyB1, PURPOSE_TO_KIND } from '../../src/vnext/next-for-you/policies.js';
import { validateDecision } from '../../src/vnext/next-for-you/validator.js';
import { emptyContext, recordChoice } from '../../src/vnext/next-for-you/decision-context.js';
import { generateCandidates } from '../../src/vnext/next-for-you/candidate-generator.js';
import { projectLearnerState } from '../../src/vnext/projection.js';
import { KINDS } from '../../src/vnext/next-for-you/constants.js';
import { attemptEvent, observeEvent, seedIndependentHistory, missionState, ARCHETYPES } from './scenarios.js';

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
  /* 008F/B1 shadow-only kind — kept so classification can name it if a
   * row ever surfaces one through this path. */
  correction_retest: ['delayed_retrieval', 'retrieval', 'production', 'interaction'],
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
    /* 008F: B1 evaluates the identical frozen input; its divergence from
     * the B0 control is classified separately (`b0VsB1`) and its
     * counterfactual decisions are re-validated exactly like B0's. */
    const b1 = policyB1(state);
    const b1Violations = validateDecision(b1, {
      events, tasks: TASK_REGISTRY, capabilities: state.capabilities,
      roles: state.roles, mission, learnerId: 'SIM', now,
      policy: LEARNING_POLICY_V1, selection: {}, decisionContext: ctx
    });
    rows.push({
      step, mission: mission.id, archetype: archetypeName,
      ref: { status: ref.status, task: ref.taskId == null ? null : `${ref.taskId}@${ref.taskRevision ?? 1}`, purpose: ref.purpose ?? null },
      b0: { kind: b0.chosen?.kind ?? null, task: b0.chosen?.taskId == null ? null : `${b0.chosen.taskId}@${b0.chosen.taskRevision ?? 1}` },
      b0Violations: violations,
      b1: { kind: b1.chosen?.kind ?? null, task: b1.chosen?.taskId == null ? null : `${b1.chosen.taskId}@${b1.chosen.taskRevision ?? 1}` },
      b1Violations,
      b0VsB1: classifyB0B1(b0, b1),
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

/* ── HIGH-7 + 008D: trajectory-independent coverage audit — a
 * CONSERVATIVE SEMANTIC REACHABILITY audit, not a state-space proof ──
 *
 * The differential corpus is REFERENCE-driven — B0-only states are
 * unreachable inside it, so "0 CONTENT-GAP rows" can never prove "no
 * content gaps". This audit instead derives, per mission-surface
 * capability, the authored REACHABILITY envelope and mirrors
 * candidate-generator.js's mint conditions as a static surface model.
 *
 * SCOPE LIMIT (review 008D-R1): `attemptable` / `attributable` /
 * `freshTransfer` are EXISTENTIAL surface properties; actual minting
 * also depends on temporal learner state (milestone ladders, last
 * observed outcome, unresolved-function lifecycle, prerequisites,
 * budgets, prior consumption). This audit is excellent for content
 * triage — it is NOT an exhaustive proof that a given learner state
 * can or cannot produce a serve. Every `required` finding therefore
 * carries an EXECUTABLE WITNESS (`requiredWitness`): a built engine
 * state where the intent's mint preconditions genuinely hold and the
 * generator confirms there is nothing servable.
 *
 * Surface conditions mirrored from candidate-generator.js:
 *
 *   - EXPOSED is set by ANY verified modality-matching event
 *     (projection.js), so an eliciting task doubles as introduction
 *     (pendingPhase's exposure→eliciting fallthrough).
 *   - independent/retained are reachable from ANY attempt-binding
 *     task; retained needs no delayed_retrieval purpose (two
 *     independent successes ≥ lag suffice).
 *   - transferred needs a transfer task on a family NO non-transfer
 *     task consumes (projection counts only novel-family transfer
 *     successes).
 *   - correction mints only on ATTRIBUTED consecutive failure — a cap
 *     whose attempt tasks all carry non-attributing contracts can
 *     never mint it; the failure path self-suppresses (no fabricated
 *     substrate diagnosis).
 *   - diagnostic_probe post-baseline paths self-suppress when no
 *     diagnostic task exists; only the baseline probe (targets and
 *     risk-triggered prereqs) mints unconditionally.
 *   - assessment iterates authored assessment tasks — none authored
 *     means the intent never mints, but assessmentPlan.required makes
 *     it authoring debt, not a benign absence.
 *
 * Each (capability, intent) pair then lands in exactly one class:
 *   covered       mintable AND servable on the authored surface
 *                 (`derivation` notes fallback servable paths, e.g.
 *                 new_input introduced by an eliciting task)
 *   required      mintable, nothing servable, claim/repair-bearing
 *                 role (target / support / prereq) — a learner-facing
 *                 dead end on the evidence chain; an executable
 *                 witness state backs each row (`witness`)
 *   optional      mintable, nothing servable, carrier role — degraded
 *                 recovery surface; carriers own no claim
 *   not_mintable  structurally unreachable under the authored surface
 *                 — audit-visible, NOT a gap; `reason` names the
 *                 concrete structural cause
 */
const G_EXPOSURE = ['input', 'notice'];
const G_ELICITING = ['retrieval', 'production', 'interaction'];
const ATTEMPT_BINDING = (t) => t.response?.type != null && t.response.type !== 'none';
const famOf = (t) => t?.contextSignature
  ? canonicalFamilyId(t.capabilityId, t.contextSignature)
  : (t?.promptFamily ?? null);

/* The authored-surface reachability envelope for one capability. */
function capProfile(tasks) {
  const purposes = new Set(tasks.map((t) => t.purpose));
  const attemptTasks = tasks.filter(ATTEMPT_BINDING);
  const nonTransferFams = new Set(tasks.filter((t) => t.purpose !== 'transfer').map(famOf).filter(Boolean));
  const teachingFams = new Set(tasks.filter((t) => t.purpose !== 'assessment').map(famOf).filter(Boolean));
  return {
    exposure: purposes.has('input') || purposes.has('notice'),
    eliciting: purposes.has('retrieval') || purposes.has('production') || purposes.has('interaction'),
    retrieval: purposes.has('retrieval'),
    diagnostic: purposes.has('diagnostic'),
    remediation: purposes.has('remediation'),
    delayed: purposes.has('delayed_retrieval'),
    support: purposes.has('support'),
    attemptable: attemptTasks.length > 0,
    attributable: attemptTasks.some((t) => contractAttributesFunctions(t.evaluation?.contractId)),
    /* A transfer task whose family collides with a non-transfer
     * authored family can never demonstrate novelty. */
    freshTransfer: tasks.some((t) => t.purpose === 'transfer' && famOf(t) && !nonTransferFams.has(famOf(t))),
    freshAssessment: tasks.some((t) => t.purpose === 'assessment' && famOf(t) && !teachingFams.has(famOf(t)))
  };
}

/* Mintability + servability per intent kind, mirroring
 * candidate-generator.js. `probeTrigger` marks a prereq-role cap whose
 * vietnameseRiskProbes route its introduction to DIAGNOSTIC_PROBE.
 * `notMintableReason` names the structural cause when `mintable` is
 * false — every not_mintable row carries it so the class is a concrete
 * derivation, not an aggregate-count inference. */
const INTENT_MODEL = [
  {
    kind: 'diagnostic_probe',
    mintable: (role, p, probeTrigger) =>
      role === 'target' || (role === 'prereq' && probeTrigger) || p.diagnostic,
    servable: (p) => p.diagnostic,
    notMintableReason: (role, p) => (!p.diagnostic
      ? `${role}_intro_mints_${role === 'carrier' ? 'new_input' : 'probe_or_input'}_and_no_diagnostic_task`
      : `${role}_intro_does_not_probe`)
  },
  {
    kind: 'new_input',
    mintable: (role, p, probeTrigger) => role === 'carrier' || (role === 'prereq' && !probeTrigger),
    servable: (p) => p.exposure || p.eliciting,
    servedBy: (p) => (p.exposure ? 'exposure' : 'eliciting_intro'),
    notMintableReason: (role, p, probeTrigger) =>
      role === 'target' ? 'target_intro_mints_baseline_probe' : 'prereq_intro_mints_risk_probe'
  },
  {
    kind: 'resume_in_flight',
    mintable: (role, p) => p.exposure || p.attemptable,
    servable: (p) => p.exposure || p.eliciting,
    notMintableReason: () => 'no_exposure_or_attempt_surface'
  },
  {
    kind: 'mission_continuation',
    mintable: (role, p) => p.exposure || p.attemptable,
    servable: (p) => p.exposure || p.eliciting,
    notMintableReason: () => 'no_exposure_or_attempt_surface'
  },
  {
    kind: 'independent_attempt',
    mintable: (role, p) => p.attemptable,
    servable: (p) => p.eliciting,
    notMintableReason: () => 'no_attempt_binding_task'
  },
  {
    kind: 'refresh',
    mintable: (role, p) => p.attemptable,
    servable: (p) => p.remediation || p.retrieval,
    servedBy: (p) => (p.remediation ? 'remediation' : 'retrieval'),
    notMintableReason: () => 'no_attempt_binding_task'
  },
  {
    kind: 'correction',
    mintable: (role, p) => p.attemptable && p.attributable,
    servable: (p) => p.remediation,
    notMintableReason: (role, p) => (!p.attemptable
      ? 'no_attempt_binding_task'
      : 'no_attributing_evaluator')
  },
  {
    kind: 'due_retrieval',
    mintable: (role, p) => p.attemptable,
    servable: (p) => p.delayed,
    notMintableReason: () => 'no_attempt_binding_task'
  },
  {
    kind: 'transfer',
    mintable: (role, p) => role === 'target' && p.attemptable,
    servable: (p) => p.freshTransfer,
    notMintableReason: (role, p) => (role !== 'target'
      ? 'non_target_role'
      : 'no_attempt_binding_task')
  },
  {
    kind: 'support_demand',
    mintable: (role, p) => role === 'support',
    servable: (p) => p.support,
    notMintableReason: () => 'non_support_role_demand_routed_only'
  }
];

export function contentCoverageAudit(fixture) {
  const mission = fixture.mission;
  const surface = new Set([
    ...(mission.targetCapabilities ?? []),
    ...(mission.carrierCapabilities ?? []),
    ...(mission.supportCapabilities ?? []),
    ...(mission.prerequisiteCapabilities ?? [])
  ]);
  const scopedTasks = fixture.tasks.filter((t) => surface.has(t.capabilityId));
  const roleOf = (capId) =>
    (mission.targetCapabilities ?? []).includes(capId) ? 'target'
    : (mission.supportCapabilities ?? []).includes(capId) ? 'support'
    : (mission.prerequisiteCapabilities ?? []).includes(capId) ? 'prereq'
    : 'carrier';
  const findings = [];
  const rows = [];
  const pushRow = (row) => {
    rows.push(row);
    if (row.class !== 'covered') findings.push(row);
  };
  const classify = (capId, role, kind, mintable, servable, extra = {}) => {
    const cls = !mintable ? 'not_mintable'
      : servable ? 'covered'
      : (role === 'target' || role === 'support' || role === 'prereq') ? 'required'
      : 'optional';
    pushRow({ capabilityId: capId, role, kind, mintable, servable, class: cls, ...extra });
  };

  for (const capId of surface) {
    const tasks = scopedTasks.filter((t) => t.capabilityId === capId);
    const role = roleOf(capId);
    const cap = capabilityById(capId);
    const p = capProfile(tasks);
    /* The generator's intro rule (candidate-generator.js: kind =
     * target→PROBE, carrier→NEW_INPUT, prereq→probe-or-input) keys on
     * risk priors that may trigger for this capability's modality. */
    const probeTrigger = (cap?.vietnameseRiskProbes ?? [])
      .map(priorById)
      .some((pr) => pr && pr.mayTriggerProbe && pr.appliesTo.includes(cap.modality));

    for (const { kind, mintable, servable, servedBy, notMintableReason } of INTENT_MODEL) {
      if (kind === 'support_demand' && role !== 'support') continue;
      if (role === 'support' && kind !== 'support_demand') continue;
      const m = mintable(role, p, probeTrigger);
      const s = servable(p);
      classify(capId, role, kind, m, s, {
        ...(m && s && servedBy ? { derivation: servedBy(p) } : {}),
        ...(!m ? { reason: notMintableReason(role, p, probeTrigger) } : {})
      });
    }

    /* Assessment is handled separately — its mint iterates AUTHORED
     * assessment tasks, so the gap classes differ: missing task vs
     * consumed-only families vs transfer unreachable. */
    if (mission.assessmentPlan?.required && role === 'target') {
      const assessTasks = tasks.filter((t) => t.purpose === 'assessment');
      const reason = assessTasks.length === 0 ? 'no_assessment_task'
        : !p.freshAssessment ? 'no_fresh_family'
        : null;
      const blockedOn = !p.freshTransfer ? 'transfer' : null;
      if (reason || blockedOn) {
        pushRow({
          capabilityId: capId, role, kind: 'assessment',
          mintable: p.attemptable && p.freshTransfer, servable: !reason,
          class: 'required', backlog: reason ?? 'transfer_unreachable', blockedOn
        });
      } else {
        pushRow({ capabilityId: capId, role, kind: 'assessment', mintable: true, servable: true, class: 'covered' });
      }
    }
  }
  /* Every required finding carries its executable witness — the audit
   * is conservative triage, so a row only earns 'required' when the
   * real generator confirms the dead end on a state that satisfies the
   * mint preconditions. */
  for (const f of findings.filter((x) => x.class === 'required')) {
    f.witness = requiredWitness(f, fixture);
  }
  const gaps = findings.filter((f) => f.class === 'required');
  return { mission: mission.id, rows, findings, gaps };
}

/* ── Executable witnesses for REQUIRED findings (review 008D-R1) ────
 * A static reachability model cannot prove "intent mints + no valid
 * authored surface" — so each required row is backed by a built engine
 * state replayed through the REAL generateCandidates. The witness is
 * the executable half of the finding; the static row is the triage.
 *
 *   correction            taught cap + attributed observed miss → the
 *                         correction candidate must exist with
 *                         servableTask === null
 *   assessment            post-transfer state → either zero authored
 *     no_assessment_task  assessment tasks to iterate (nothing can
 *                         mint), or every assessment candidate is
 *     no_fresh_family     family-consumed
 */
const WT0 = Date.parse('2026-02-01T09:00:00Z');
const WITNESS_LAG = 25 * HOUR; /* retention lag is 24h; +1h margin */

const WITNESS_LEARNER = 'SIM'; /* attemptEvent stamps learnerId 'SIM' */
const witnessState = (fixture, events, now) => {
  const ms = missionState(fixture);
  return {
    learnerId: WITNESS_LEARNER, events, capabilities: ms.capabilities, tasks: fixture.tasks,
    roles: ms.roles, policy: LEARNING_POLICY_V1, now, mission: fixture.mission,
    decisionContext: emptyContext('ep.audit', 'ses.audit'), selection: {}
  };
};

const attemptTasksOf = (tasks, capId) =>
  tasks.filter((t) => t.capabilityId === capId && ATTEMPT_BINDING(t) && t.purpose !== 'assessment');

/* Build: independent success → post-lag success (retained) → fresh
 * transfer success (transferred). Returns null when the authored
 * surface cannot reach the precondition state. */
const transferredHistory = (fixture, capId) => {
  const tasks = fixture.tasks.filter((t) => t.capabilityId === capId);
  const cap = capabilityById(capId);
  const indep = attemptTasksOf(fixture.tasks, capId).find((t) => t.purpose !== 'transfer');
  const delayed = tasks.find((t) => t.purpose === 'delayed_retrieval')
    ?? attemptTasksOf(fixture.tasks, capId).find((t) => t !== indep && t.purpose !== 'transfer');
  const nonTransferFams = new Set(tasks.filter((t) => t.purpose !== 'transfer').map(famOf).filter(Boolean));
  const transfer = tasks.find((t) => t.purpose === 'transfer' && famOf(t) && !nonTransferFams.has(famOf(t)));
  if (!indep || !delayed || !transfer) return null;
  return [
    attemptEvent(indep, cap, { at: WT0, outcome: 'success' }),
    attemptEvent(delayed, cap, { at: WT0 + WITNESS_LAG, outcome: 'success' }),
    attemptEvent(transfer, cap, { at: WT0 + WITNESS_LAG + MIN, outcome: 'success' })
  ];
};

export function requiredWitness(finding, fixture) {
  const capId = finding.capabilityId;
  const cap = capabilityById(capId);
  const tasks = fixture.tasks.filter((t) => t.capabilityId === capId);

  if (finding.kind === 'correction') {
    const indep = attemptTasksOf(fixture.tasks, capId).find((t) => t.purpose !== 'remediation');
    const attr = tasks.find((t) => ATTEMPT_BINDING(t) && contractAttributesFunctions(t.evaluation?.contractId));
    if (!indep || !attr) return { confirmed: false, built: false, reason: 'no_taught_attributing_surface' };
    const events = [
      attemptEvent(indep, cap, { at: WT0, outcome: 'success' }),
      attemptEvent(attr, cap, { at: WT0 + HOUR, outcome: 'fail', missing: attr.response?.requiredFunctions ?? [] })
    ];
    const cand = generateCandidates(witnessState(fixture, events, WT0 + 2 * HOUR)).candidates
      .find((c) => c.kind === KINDS.CORRECTION && c.capabilityId === capId);
    return {
      confirmed: cand != null && cand.servableTask == null,
      built: true, minted: cand != null, servableTask: cand?.servableTask?.id ?? null,
      state: 'taught_then_attributed_observed_miss'
    };
  }

  if (finding.kind === 'assessment') {
    const assessTasks = tasks.filter((t) => t.purpose === 'assessment');
    const history = transferredHistory(fixture, capId);
    if (!history) return { confirmed: false, built: false, reason: 'transfer_precondition_unreachable' };
    const now = WT0 + WITNESS_LAG + 2 * MIN;
    const proj = projectLearnerState(WITNESS_LEARNER, history, witnessState(fixture, history, now).capabilities, fixture.tasks, { policy: LEARNING_POLICY_V1 });
    const transferred = proj.byCapability.get(capId)?.milestones?.transferred === true;
    if (finding.backlog === 'no_fresh_family') {
      /* Consume every authored assessment task, then re-check — every
       * minted candidate must be family-consumed. */
      const ev2 = [...history, ...assessTasks.map((t, i) => attemptEvent(t, cap, { at: now + (i + 1) * MIN, outcome: 'success' }))];
      const cands = generateCandidates(witnessState(fixture, ev2, now + 10 * MIN)).candidates
        .filter((c) => c.kind === KINDS.ASSESSMENT && c.capabilityId === capId);
      return {
        confirmed: transferred && assessTasks.length > 0 && cands.length > 0 && cands.every((c) => c.familyConsumed === true || c.consumed === true),
        built: true, transferred, assessmentTasks: assessTasks.length,
        familyConsumed: cands.map((c) => c.familyConsumed === true),
        state: 'transferred_all_assessment_families_consumed'
      };
    }
    /* no_assessment_task: at the post-transfer state the assessment
     * loop has zero authored tasks to iterate — nothing can mint. */
    const cands = generateCandidates(witnessState(fixture, history, now)).candidates
      .filter((c) => c.kind === KINDS.ASSESSMENT && c.capabilityId === capId);
    return {
      confirmed: transferred && assessTasks.length === 0 && cands.length === 0,
      built: true, transferred, minted: cands.length,
      assessmentTasks: assessTasks.length,
      state: 'transferred_no_assessment_task'
    };
  }

  return { confirmed: false, built: false, reason: 'no_witness_builder_for_kind' };
}

export function runCoverageAudit(fixtures) {
  const perMission = fixtures.map(contentCoverageAudit);
  const findings = perMission.flatMap((m) => m.findings.map((g) => ({ mission: m.mission, ...g })));
  const byClass = {};
  for (const f of findings) byClass[f.class] = (byClass[f.class] ?? 0) + 1;
  return {
    missions: perMission,
    findings,
    byClass,
    gaps: findings.filter((f) => f.class === 'required')
  };
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
  /* 008F: the B0↔B1 shadow comparison is the experiment surface —
   * every divergence must land in the named taxonomy; a BUG class or a
   * B1 validator violation fails the corpus. */
  const b1ByClass = {};
  let b1Violations = 0;
  for (const r of rows) {
    const cls = r.b0VsB1?.class ?? 'MISSING';
    b1ByClass[cls] = (b1ByClass[cls] ?? 0) + 1;
    b1Violations += (r.b1Violations ?? []).length;
  }
  console.log('b0-vs-b1:', JSON.stringify(b1ByClass), '| b1 validator violations:', b1Violations);
  for (const r of rows.filter((r) => r.b0VsB1 && r.b0VsB1.class !== 'MATCH')) {
    console.log(`B1:${r.b0VsB1.class} | ${r.mission} ${r.archetype} step ${r.step} | b0:${r.b0.kind ?? 'none'}@${r.b0.task ?? 'none'} -> b1:${r.b1?.kind ?? 'none'}@${r.b1?.task ?? 'none'} | ${r.b0VsB1.note ?? ''}`);
  }
  if (rows.some((r) => r.class === 'BUG') || violations > 0) process.exitCode = 1;
  if (rows.some((r) => r.b0VsB1?.class === 'BUG' || r.b0VsB1?.class === 'MISSING') || b1Violations > 0) process.exitCode = 1;

  /* HIGH-7 + 008D content coverage — conservative semantic
   * reachability audit (static surface model; required rows carry
   * executable witnesses replayed through the real generator):
   * required = learner-facing dead end on a claim/repair-bearing role;
   * optional = degraded carrier recovery; not_mintable = structurally
   * unreachable under the authored surface (reason code on the row). */
  const coverage = runCoverageAudit(FIXTURES);
  console.log(`\ncontent coverage (conservative semantic reachability): ${coverage.findings.length} findings ${JSON.stringify(coverage.byClass)} across ${FIXTURES.length} missions`);
  for (const g of coverage.findings) {
    const w = g.witness ? ` witness:${g.witness.confirmed ? 'CONFIRMED' : 'FAILED(' + (g.witness.reason ?? JSON.stringify(g.witness)) + ')'}` : '';
    const r = g.reason ? ` reason:${g.reason}` : '';
    console.log(`  [${g.class}] ${g.mission} ${g.capabilityId} [${g.role}] ${g.kind}${g.backlog ? ' (' + g.backlog + ')' : ''}${g.blockedOn ? ' blockedOn:' + g.blockedOn : ''}${r}${w}`);
  }
  if (coverage.findings.some((g) => g.class === 'required' && g.witness && g.witness.confirmed !== true)) process.exitCode = 1;
}
