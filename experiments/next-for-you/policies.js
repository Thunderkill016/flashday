/*
 * Next For You prototype policies (spec §9):
 *
 *   Policy A — reference cascade: the corrected kernel order (all
 *     eligibility inside the cascade), retained as the regression
 *     baseline. Lexicographic, no tiers.
 *   Policy B — filter → tier → ordinal preferences → deterministic
 *     tie-break → explanation. No floating-point learning score.
 *   Policy C — B + bounded information-value heuristic for
 *     diagnostics.
 *
 * Every returned decision carries a machine-readable explanation (spec
 * §8) and stamps selectionPolicyVersion + learnerModelVersion.
 */
import { KINDS, POLICY_VERSIONS, PROVENANCE, TIER_OF } from './constants.js';
import { generateCandidates } from './candidate-generator.js';
import { LEARNER_MODEL_VERSION } from '../../src/vnext/learner-model.js';

let decisionSeq = 0;

function makeDecision({ policy, version, chosen, candidates, skipped, model, ctx }) {
  const explanation = chosen
    ? {
        whyExists: chosen.why,
        tier: chosen.tierName,
        preferences: (chosen.preferences ?? []).map((p) => `${p.name}${p.detail ? `(${p.detail})` : ''}`),
        penalties: (chosen.penalties ?? []).map((p) => `${p.name}${p.detail ? `(${p.detail})` : ''}`),
        beat: candidates
          .filter((c) => c !== chosen && c.eligible !== false)
          .map((c) => `${c.kind}@${c.capabilityId}`),
        suppressed: [
          ...skipped.map((s) => `${s.kind}@${s.capabilityId}: ${s.reason}`),
          ...candidates.filter((c) => c.eligible === false).map((c) => `${c.kind}@${c.capabilityId}: filtered — ${c.filterReason}`)
        ]
      }
    : { whyExists: 'no valid candidate', tier: 'TERMINAL', preferences: [], penalties: [], beat: [], suppressed: skipped.map((s) => `${s.kind}@${s.capabilityId}: ${s.reason}`) };

  return {
    decisionId: `d${++decisionSeq}`,
    selectionPolicyVersion: version,
    learnerModelVersion: LEARNER_MODEL_VERSION,
    chosen: chosen ? { kind: chosen.kind, capabilityId: chosen.capabilityId, taskId: chosen.servableTask?.id ?? null, tier: chosen.tierName } : { kind: 'idle', capabilityId: null, taskId: null, tier: 'TERMINAL' },
    explanation,
    decisionContextSummary: ctx ? { episode: ctx.decisionEpisodeId, counts: { ...ctx.counts }, thread: ctx.currentThreadCapabilityId } : null,
    candidateCount: candidates.length,
    blocked: chosen == null && candidates.length > 0
  };
}

/* ============ POLICY A — corrected reference cascade ============ */

export function policyA(state, { selection = {} } = {}) {
  const { candidates, skipped, model } = generateCandidates(state);
  const ceiling = selection.failureCeiling ?? 3;

  const order = [
    KINDS.RESUME,
    KINDS.REFRESH,
    KINDS.DUE_RETRIEVAL,
    KINDS.SUPPORT_DEMAND,
    KINDS.CORRECTION,
    KINDS.TRANSFER,
    KINDS.INDEPENDENT_ATTEMPT,
    KINDS.DIAGNOSTIC_PROBE,
    KINDS.MISSION_CONTINUATION,
    KINDS.NEW_INPUT,
    KINDS.ASSESSMENT
  ];
  for (const kind of order) {
    const hit = candidates.find((c) => c.kind === kind && c.servableTask);
    if (hit) {
      /* A is a cascade with the corrected boundary: identical-task
       * retry above the failure ceiling is filtered, never scored. */
      if (kind === KINDS.CORRECTION && hit.facts.consecutiveFailures >= ceiling) continue;
      if (hit.identicalRetry) continue;
      hit.tierName = tierNameOf(kind);
      return makeDecision({ version: POLICY_VERSIONS.A, chosen: hit, candidates, skipped, model, ctx: state.decisionContext });
    }
  }
  return makeDecision({ version: POLICY_VERSIONS.A, chosen: null, candidates, skipped, model, ctx: state.decisionContext });
}

/* ============ Hard filters (spec §4) ============ */

const PURPOSE_OK = {
  correction: ['remediation'],
  refresh: ['remediation', 'retrieval'],
  due_retrieval: ['delayed_retrieval'],
  transfer: ['transfer'],
  assessment: ['assessment'],
  support_demand: ['support'],
  diagnostic_probe: ['diagnostic'],
  independent_attempt: ['retrieval', 'production', 'interaction'],
  mission_continuation: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  new_input: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  resume_in_flight: ['input', 'notice', 'retrieval', 'production', 'interaction']
};

function hardFilter(cand, { ctx, selection, pendingDemands, roles }) {
  const reasons = [];
  const diagBudget = selection.diagnosticMaxPerEpisode ?? 2;
  const ceiling = selection.failureCeiling ?? 3;

  if (!cand.servableTask) reasons.push('no_servable_task');
  else {
    const p = cand.servableTask.purpose;
    if (!PURPOSE_OK[cand.kind]?.includes(p)) reasons.push(`purpose_substitution:${p}`);
  }
  if (cand.kind === KINDS.SUPPORT_DEMAND) {
    const stillPending = pendingDemands.some((d) => d.supportCapabilityId === cand.capabilityId && d.missingFunction === cand.demand?.missingFunction);
    if (!stillPending) reasons.push('demand_no_longer_pending');
    else if (!(cand.servableTask?.response?.requiredFunctions ?? []).includes(cand.demand.missingFunction)) {
      reasons.push('probe_does_not_cover_function');
    }
  }
  if (cand.kind === KINDS.CORRECTION && cand.facts.consecutiveFailures >= ceiling) {
    reasons.push(`failure_ceiling:${ceiling}`);
  }
  if (cand.identicalRetry) {
    reasons.push('identical_retry_after_failure_ceiling');
  }
  if (cand.kind === KINDS.DIAGNOSTIC_PROBE && (ctx?.counts?.diagnostic ?? 0) >= diagBudget &&
      !cand.preferences.some((p) => p.name === 'baseline_probe')) {
    /* Budget is per-episode [SAFETY_PRIOR]; baseline probes for never-seen
     * targets stay admissible because they are the introduction path. */
    reasons.push(`diagnostic_budget:${diagBudget}`);
  }
  if (cand.kind === KINDS.REFRESH && !(cand.facts.lastAttemptOutcome === 'fail' || cand.facts.lastAttemptOutcome === 'partial')) {
    reasons.push('no_verified_failure'); // time alone never mints refresh
  }
  return reasons;
}

/* ============ POLICY B — filter → tier → ordinal → tie-break ============ */

export function policyB(state, { selection = {} } = {}) {
  const { candidates, skipped, model, pendingDemands } = generateCandidates(state);
  const ctx = state.decisionContext;

  for (const c of candidates) {
    const violations = hardFilter(c, { ctx, selection, pendingDemands, roles: state.roles });
    c.eligible = violations.length === 0;
    c.filterReason = violations.join('; ');
    c.tier = TIER_OF[c.kind];
    c.tierName = tierNameOf(c.kind);
  }
  const eligible = candidates.filter((c) => c.eligible);
  const chosen = pickOrdinal(eligible, ctx, selection);
  return makeDecision({ version: POLICY_VERSIONS.B, chosen, candidates, skipped, model, ctx });
}

/* ============ POLICY C — B + bounded information value ============ */

export function policyC(state, { selection = {} } = {}) {
  const result = generateCandidates(state);
  const ctx = state.decisionContext;

  for (const c of result.candidates) {
    const violations = hardFilter(c, { ctx, selection, pendingDemands: result.pendingDemands, roles: state.roles });
    c.eligible = violations.length === 0;
    c.filterReason = violations.join('; ');
    c.tier = TIER_OF[c.kind];
    c.tierName = tierNameOf(c.kind);
    /* Information-value heuristic [EXPERIMENTAL]: thin/conflicting/
     * never-sampled evidence boosts probes within the budget. Coarse
     * categorical signal only — no psychometric item model exists. */
    if (c.kind === KINDS.DIAGNOSTIC_PROBE) {
      const codes = new Set(c.facts.reasonCodes);
      if (codes.has('thin_independent_evidence') || codes.has('no_independent_evidence') ||
          codes.has('no_assessment_evidence') || codes.has('currently_failing')) {
        c.preferences.push({ name: 'information_value', provenance: PROVENANCE.EXPERIMENTAL });
      }
    }
  }
  const eligible = result.candidates.filter((c) => c.eligible);
  const chosen = pickOrdinal(eligible, ctx, selection, { informationValue: true });
  return makeDecision({ version: POLICY_VERSIONS.C, chosen, candidates: result.candidates, skipped: result.skipped, model: result.model, ctx });
}

/* Ordinal preference: within a tier, apply named comparisons in order;
 * every preference name is provenance-tagged. Returns ONE winner or
 * null. Tie-break is total-order deterministic. */
function pickOrdinal(eligible, ctx, selection, { informationValue = false } = {}) {
  if (!eligible.length) return null;
  const bestTier = Math.min(...eligible.map((c) => c.tier));
  const inTier = eligible.filter((c) => c.tier === bestTier);

  const score = (c) => {
    const names = c.preferences.map((p) => p.name);
    let rank = 0;
    /* Ordered contribution ladder — earlier = stronger. Every rung is
     * named so "why A beat B" is a reason, not a number. */
    const ladder = [
      'pending_demand',                 // KERNEL — open substrate gap
      'verified_failure_on_demonstrated',// KERNEL — refresh semantics
      'open_attributed_gap',            // EVIDENCE — repairable failure
      'support_dependency_fade',        // EVIDENCE — fade scaffolding
      'due',                            // EVIDENCE — spacing
      'mission_assessment_plan',        // KERNEL — claim-bearing evidence
      'unattributed_failure',           // EXPERIMENTAL — clarify
      'information_value',              // EXPERIMENTAL — Policy C only
      'baseline_probe',                 // KERNEL — R6 role semantics
      'transfer_pending',               // EVIDENCE — varied practice
      'thread_continuation',            // SAFETY/UX — hysteresis
      'breadth'                         // EXPERIMENTAL — starvation guard
    ];
    for (const name of ladder) {
      if (names.includes(name)) { rank = ladder.length - ladder.indexOf(name); break; }
    }
    return rank;
  };

  inTier.sort((a, b) =>
    score(b) - score(a) ||
    (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) ||
    (b.facts?.consecutiveFailures ?? 0) - (a.facts?.consecutiveFailures ?? 0) ||
    (ctx?.currentThreadCapabilityId === b.capabilityId ? 1 : 0) - (ctx?.currentThreadCapabilityId === a.capabilityId ? 1 : 0) ||
    (a.capabilityId < b.capabilityId ? -1 : 1) ||
    (a.kind < b.kind ? -1 : 1) ||
    ((a.servableTask?.id ?? '') < (b.servableTask?.id ?? '') ? -1 : 1));
  return inTier[0];
}

function tierNameOf(kind) {
  const t = TIER_OF[kind];
  return ['MANDATORY', 'REPAIR', 'MAINTENANCE', 'EVIDENCE', 'PROGRESS', 'INTRODUCE', 'TERMINAL'][t] ?? 'TERMINAL';
}

export const POLICIES = { A: policyA, B: policyB, C: policyC };
