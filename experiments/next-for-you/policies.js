/*
 * Next For You prototype policies (spec §9):
 *
 *   Policy A — reference cascade: production kernel order over the
 *     SAME hard-filter eligibility set B/C use. A differs in ordering
 *     only, never in honesty (review HIGH-7).
 *   Policy B — filter → tier → ordinal preferences → deterministic
 *     tie-break → explanation. No floating-point learning score.
 *   Policy C — B + bounded information-value heuristic for
 *     diagnostics.
 *
 * Every returned decision carries a machine-readable explanation (spec
 * §8), stamps selectionPolicyVersion + learnerModelVersion, task and
 * mission revisions, support-demand provenance, and a deterministic id
 * bound to the decision-input digest — same inputs, same id; changed
 * inputs at the same episode ordinal can never collide.
 */
import { KINDS, POLICY_VERSIONS, PROVENANCE, TIER_OF } from './constants.js';
import { generateCandidates } from './candidate-generator.js';
import { LEARNER_MODEL_VERSION } from '../../src/vnext/learner-model.js';
import { decisionInputSnapshot } from './decision-log.js';
import { sha256 } from './util.js';

function makeDecision({ policy, version, chosen, candidates, skipped, model, ctx, pendingDemands = [], state = null, escape = null }) {
  const candidateView = candidates.map((c) => ({
    kind: c.kind, capabilityId: c.capabilityId,
    taskId: c.servableTask?.id ?? null, taskRevision: c.servableTask?.revision ?? null,
    eligible: c.eligible !== false,
    filterReason: c.filterReason || null,
    tier: c.tierName ?? null
  }));

  /* Terminal semantics (HIGH-6): BLOCKED = work exists but nothing can
   * honestly be served; IDLE = the valid set is genuinely empty. */
  const terminal = !chosen;
  const terminalKind = terminal
    ? (state?.integrityViolations?.length || candidates.length > 0 ? 'blocked' : 'idle')
    : null;
  const blockedReasons = terminalKind === 'blocked'
    ? [
        ...(state?.integrityViolations ?? []).map((r) => `mission_integrity:${r}`),
        ...candidates.filter((c) => c.eligible === false).map((c) => `${c.kind}@${c.capabilityId}: ${c.filterReason}`),
        ...candidates.filter((c) => c.eligible !== false && !c.servableTask).map((c) => `${c.kind}@${c.capabilityId}: no_servable_task`)
      ]
    : [];

  const losers = (chosen?._losers ?? []);
  const explanation = chosen
    ? {
        whyExists: chosen.why,
        tier: chosen.tierName,
        preferences: (chosen.preferences ?? []).map((p) => `${p.name}${p.detail ? `(${p.detail})` : ''}`),
        penalties: (chosen.penalties ?? []).map((p) => `${p.name}${p.detail ? `(${p.detail})` : ''}`),
        /* MEDIUM-13: every eligible loser keeps a reconstructible
         * comparison — tier, named preferences/penalties, and WHY it
         * lost (higher tier / preference name / tie-break field). */
        beat: losers.map((l) => ({
          kind: l.candidate.kind, capabilityId: l.candidate.capabilityId,
          taskId: l.candidate.servableTask?.id ?? null,
          taskRevision: l.candidate.servableTask?.revision ?? null,
          tier: l.candidate.tierName ?? null,
          preferences: (l.candidate.preferences ?? []).map((p) => p.name),
          penalties: (l.candidate.penalties ?? []).map((p) => p.name),
          lostTo: l.lostTo, lostBecause: l.reason
        })),
        tieBreak: chosen._tieBreak ?? null,
        escape: escape ?? null,
        suppressed: [
          ...skipped.map((s) => `${s.kind}@${s.capabilityId}: ${s.reason}`),
          ...candidates.filter((c) => c.eligible === false).map((c) => `${c.kind}@${c.capabilityId}: filtered — ${c.filterReason}`)
        ]
      }
    : {
        whyExists: terminalKind === 'blocked' ? 'work remains but nothing honestly servable' : 'no valid candidate',
        tier: 'TERMINAL', preferences: [], penalties: [], beat: [], tieBreak: null,
        blockedReasons,
        suppressed: skipped.map((s) => `${s.kind}@${s.capabilityId}: ${s.reason}`)
      };

  /* Deterministic id: episode + ordinal + policy + input digest — the
   * digest makes same-ordinal decisions on different input states
   * distinguishable (review MEDIUM-15). */
  const inputDigest = state ? sha256(decisionInputSnapshot({ ...state })).slice(0, 16) : 'no-state';
  const chosenStub = chosen
    ? `${chosen.kind}@${chosen.capabilityId}:${chosen.servableTask?.id ?? 'none'}@${chosen.servableTask?.revision ?? 1}`
    : terminalKind;
  const demand = chosen?.kind === KINDS.SUPPORT_DEMAND ? chosen.demand : null;

  return {
    decisionId: `dec:${ctx?.decisionEpisodeId ?? 'ep'}#${ctx?.actionsChosen?.length ?? 0}:${version}:${inputDigest}:${chosenStub}`,
    selectionPolicyVersion: version,
    learnerModelVersion: LEARNER_MODEL_VERSION,
    missionId: state?.mission?.id ?? null,
    missionRevision: state?.mission?.revision ?? null,
    chosen: chosen
      ? {
          kind: chosen.kind, capabilityId: chosen.capabilityId,
          taskId: chosen.servableTask?.id ?? null,
          taskRevision: chosen.servableTask?.revision ?? null,
          tier: chosen.tierName,
          /* BLOCKER-5: support demand keeps its full provenance in the
           * chosen record — which target miss this probe serves. */
          ...(demand ? {
            demandProvenance: {
              targetCapabilityId: demand.targetCapabilityId,
              targetTaskId: demand.targetTaskId ?? null,
              targetTaskRevision: demand.targetTaskRevision ?? null,
              missingFunction: demand.missingFunction,
              sourceEventId: demand.sourceEventId ?? null,
              issuedAt: demand.issuedAt ?? null,
              supportCapabilityId: demand.supportCapabilityId
            }
          } : {})
        }
      : { kind: terminalKind, capabilityId: null, taskId: null, taskRevision: null, tier: 'TERMINAL' },
    explanation,
    candidates: candidateView,
    decisionContextSummary: ctx ? { episode: ctx.decisionEpisodeId, counts: { ...ctx.counts }, thread: ctx.currentThreadCapabilityId, lastActed: ctx.lastActedCapabilityId ?? null } : null,
    openDemands: pendingDemands.map((d) => `${d.targetCapabilityId}|${d.missingFunction}|${d.supportCapabilityId}`),
    candidateCount: candidates.length,
    integrityViolations: state?.integrityViolations ?? [],
    blocked: chosen == null && terminalKind === 'blocked'
  };
}

/* ============ Hard filters (spec §4) — shared by A/B/C ============ */

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

/* Per-capability repair bound per episode [SAFETY_PRIOR]: after this
 * many correction/refresh actions on one capability in one episode the
 * REPAIR tier stops monopolizing — sideways/maintenance/forward work
 * proceeds (or honest BLOCKED if the cap is a hard gate). Not a
 * pedagogical optimum. */
const REPAIR_BOUND_PER_CAP_EPISODE = 3;

function hardFilter(cand, { ctx, selection, pendingDemands, roles, assessmentMode = 'fresh' }) {
  const reasons = [];
  const diagBudget = selection.diagnosticMaxPerEpisode ?? 2;
  const ceiling = selection.failureCeiling ?? 3;
  const repairBound = selection.repairMaxPerEpisodePerCap ?? REPAIR_BOUND_PER_CAP_EPISODE;

  if (!cand.servableTask) reasons.push('no_servable_task');
  else {
    const p = cand.servableTask.purpose;
    if (!PURPOSE_OK[cand.kind]?.includes(p)) reasons.push(`purpose_substitution:${p}`);
  }
  if (cand.kind === KINDS.SUPPORT_DEMAND) {
    /* BLOCKER-5: match the EXACT pending demand, not the first demand
     * sharing a provider. */
    const dp = cand.demand;
    const stillPending = dp && pendingDemands.some((d) =>
      d.supportCapabilityId === cand.capabilityId &&
      d.targetCapabilityId === dp.targetCapabilityId &&
      d.missingFunction === dp.missingFunction &&
      d.sourceEventId === dp.sourceEventId);
    if (!stillPending) reasons.push('demand_no_longer_pending');
    else if (!(cand.servableTask?.response?.requiredFunctions ?? []).includes(dp.missingFunction)) {
      reasons.push('probe_does_not_cover_function');
    }
  }
  if (cand.kind === KINDS.CORRECTION && cand.facts.consecutiveFailures >= ceiling) {
    reasons.push(`failure_ceiling:${ceiling}`);
  }
  if (cand.identicalRetry) {
    reasons.push('identical_retry_after_failure_ceiling');
  }
  if ((cand.kind === KINDS.CORRECTION || cand.kind === KINDS.REFRESH) &&
      (ctx?.actionsChosen ?? []).filter((a) => a.capabilityId === cand.capabilityId && (a.kind === KINDS.CORRECTION || a.kind === KINDS.REFRESH)).length >= repairBound) {
    reasons.push(`repair_bound:${repairBound}`);
  }
  if (cand.kind === KINDS.DIAGNOSTIC_PROBE && (ctx?.counts?.diagnostic ?? 0) >= diagBudget) {
    /* Budget is per-episode and applies to EVERY probe, baseline
     * included — an exhausted budget defers new-target introduction to
     * a later episode instead of silently unbounding diagnostics
     * (review MEDIUM-8). */
    reasons.push(`diagnostic_budget:${diagBudget}`);
  }
  if (cand.kind === KINDS.REFRESH && !(cand.facts.lastAttemptOutcome === 'fail' || cand.facts.lastAttemptOutcome === 'partial')) {
    reasons.push('no_verified_failure'); // time alone never mints refresh
  }
  /* HIGH-8: consumed-assessment reuse is a POLICY choice, not kernel
   * truth. A mirrors production (re-probe allowed); B/C refuse. */
  if (assessmentMode === 'fresh' && cand.kind === KINDS.ASSESSMENT && cand.consumed) {
    reasons.push('assessment_consumed');
  }
  return reasons;
}

function applyFilters(candidates, env) {
  for (const c of candidates) {
    const violations = hardFilter(c, env);
    c.eligible = violations.length === 0;
    c.filterReason = violations.join('; ');
    c.tier = TIER_OF[c.kind];
    c.tierName = tierNameOf(c.kind);
  }
}

/* ============ POLICY A — production-mirror reference cascade ============ */

export function policyA(state, { selection = {} } = {}) {
  const gen = generateCandidates(state);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.A, chosen: null, candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state: { ...state, integrityViolations } });
  }
  /* HIGH-7: A runs the SAME hard filters as B/C — only ordering
   * differs. Production-mirror semantics keep consumed assessments
   * eligible (the runner re-probes failed checkpoints). */
  applyFilters(candidates, { ctx: state.decisionContext, selection, pendingDemands, roles: state.roles, assessmentMode: 'production' });

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
    const hit = candidates.find((c) => c.kind === kind && c.eligible);
    if (hit) {
      hit._losers = candidates.filter((c) => c !== hit && c.eligible).map((c) => ({ candidate: c, lostTo: 'cascade', reason: `kernel order: ${kind} precedes ${c.kind}` }));
      hit._tieBreak = 'kernel_order';
      return makeDecision({ version: POLICY_VERSIONS.A, chosen: hit, candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state });
    }
  }
  return makeDecision({ version: POLICY_VERSIONS.A, chosen: null, candidates, skipped, model, ctx: state.decisionContext, pendingDemands, state });
}

/* ============ POLICY B — filter → tier → ordinal → tie-break ============ */

export function policyB(state, { selection = {} } = {}) {
  const gen = generateCandidates(state);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  const ctx = state.decisionContext;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.B, chosen: null, candidates, skipped, model, ctx, pendingDemands, state: { ...state, integrityViolations } });
  }

  applyFilters(candidates, { ctx, selection, pendingDemands, roles: state.roles, assessmentMode: 'fresh' });
  const eligible = candidates.filter((c) => c.eligible);
  const { winner, losers, escape } = pickOrdinal(eligible, ctx, selection);
  if (winner) { winner._losers = losers; winner._tieBreak = winner._tieBreak ?? 'total_order'; }
  return makeDecision({ version: POLICY_VERSIONS.B, chosen: winner, candidates, skipped, model, ctx, pendingDemands, state, escape });
}

/* ============ POLICY C — B + bounded information value ============ */

export function policyC(state, { selection = {} } = {}) {
  const gen = generateCandidates(state);
  const { candidates, skipped, model, pendingDemands, integrityViolations } = gen;
  const ctx = state.decisionContext;
  if (integrityViolations?.length) {
    return makeDecision({ version: POLICY_VERSIONS.C, chosen: null, candidates, skipped, model, ctx, pendingDemands, state: { ...state, integrityViolations } });
  }

  applyFilters(candidates, { ctx, selection, pendingDemands, roles: state.roles, assessmentMode: 'fresh' });
  for (const c of candidates) {
    /* Information-value heuristic [EXPERIMENTAL]: thin/conflicting/
     * never-sampled evidence boosts probes within the budget. Coarse
     * categorical signal only — no psychometric item model exists. */
    if (c.eligible && c.kind === KINDS.DIAGNOSTIC_PROBE) {
      const codes = new Set(c.facts.reasonCodes);
      if (codes.has('thin_independent_evidence') || codes.has('no_independent_evidence') ||
          codes.has('no_assessment_evidence') || codes.has('currently_failing')) {
        c.preferences.push({ name: 'information_value', provenance: PROVENANCE.EXPERIMENTAL });
      }
    }
  }
  const eligible = candidates.filter((c) => c.eligible);
  const { winner, losers, escape } = pickOrdinal(eligible, ctx, selection);
  if (winner) { winner._losers = losers; winner._tieBreak = winner._tieBreak ?? 'total_order'; }
  return makeDecision({ version: POLICY_VERSIONS.C, chosen: winner, candidates, skipped, model, ctx, pendingDemands, state, escape });
}

/* Starvation-guard limits per variant [SAFETY_PRIOR/EXPERIMENTAL]: how
 * many consecutive same-tier decisions an episode tolerates before one
 * decision escapes to the next eligible tier. Bounded escape valve —
 * not an efficacy claim. */
const STARVATION_LIMITS = { review: 8, balanced: 4, forward: 2 };

/* Ordinal preference: within a tier, apply named comparisons in order;
 * every preference name is provenance-tagged. Returns the winner plus
 * a reconstructible reason for every loser (MEDIUM-13). */
function pickOrdinal(eligible, ctx, selection) {
  if (!eligible.length) return { winner: null, losers: [], escape: null };

  /* Starvation escape (HIGH-9): if the best eligible tier has produced
   * ≥ limit consecutive decisions this episode and other tiers have
   * eligible work, one decision goes to the best candidate OUTSIDE the
   * monopolizing tier. Limits are variant tunables, never "optimal". */
  let pool = eligible;
  let escape = null;
  let bestTier = Math.min(...pool.map((c) => c.tier));
  const limit = STARVATION_LIMITS[selection.starvationGuard ?? 'balanced'] ?? STARVATION_LIMITS.balanced;
  const actions = ctx?.actionsChosen ?? [];
  let streak = 0;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (TIER_OF[actions[i].kind] === bestTier) streak++; else break;
  }
  if (streak >= limit && pool.some((c) => c.tier !== bestTier)) {
    pool = pool.filter((c) => c.tier !== bestTier);
    escape = { from: tierLabel(bestTier), streak, reason: `starvation_guard(${selection.starvationGuard ?? 'balanced'}):${limit}` };
    bestTier = Math.min(...pool.map((c) => c.tier));
  }
  const inTier = pool.filter((c) => c.tier === bestTier);
  const tierLosers = pool.filter((c) => c.tier !== bestTier)
    .map((c) => ({ candidate: c, lostTo: 'tier', reason: `tier ${tierLabel(c.tier)} loses to ${tierLabel(bestTier)}${escape ? ' after starvation escape' : ''}` }));

  const score = (c) => {
    const names = c.preferences.map((p) => p.name);
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
      if (names.includes(name)) return ladder.length - ladder.indexOf(name);
    }
    return 0;
  };
  const topPref = (c) => {
    const names = c.preferences.map((p) => p.name);
    const ladder = ['pending_demand', 'verified_failure_on_demonstrated', 'open_attributed_gap', 'support_dependency_fade', 'due', 'mission_assessment_plan', 'unattributed_failure', 'information_value', 'baseline_probe', 'transfer_pending', 'thread_continuation', 'breadth'];
    return ladder.find((n) => names.includes(n)) ?? null;
  };

  const tieFields = [
    ['score', (c) => -score(c)],
    ['dueAt', (c) => c.dueAt ?? Infinity],
    ['consecutiveFailures', (c) => -(c.facts?.consecutiveFailures ?? 0)],
    ['thread', (c) => -(ctx?.currentThreadCapabilityId === c.capabilityId ? 1 : 0)],
    ['capabilityId', (c) => c.capabilityId],
    ['kind', (c) => c.kind],
    ['taskId', (c) => c.servableTask?.id ?? '']
  ];
  const cmp = (a, b) => {
    for (const [, f] of tieFields) {
      const fa = f(a), fb = f(b);
      if (fa < fb) return { d: -1 };
      if (fa > fb) return { d: 1 };
    }
    return { d: 0 };
  };
  const sorted = [...inTier].sort((a, b) => cmp(a, b).d);
  const winner = sorted[0];
  const breakReason = (loser) => {
    for (const [name, f] of tieFields) {
      const fw = f(winner), fl = f(loser);
      if (fw !== fl) return { field: name, winner: String(fw), loser: String(fl) };
    }
    return { field: 'identical', winner: '', loser: '' };
  };
  const inTierLosers = sorted.slice(1).map((c) => {
    const br = breakReason(c);
    return br.field === 'score'
      ? { candidate: c, lostTo: 'preference', reason: `${topPref(winner) ?? 'none'} outranks ${topPref(c) ?? 'none'}` }
      : { candidate: c, lostTo: 'tiebreak', reason: `${br.field}: ${br.loser} loses to ${br.winner}` };
  });
  winner._tieBreak = escape ? `starvation_escape:${escape.from}` : 'ordinal+tier+lexicographic';
  return { winner, losers: [...tierLosers, ...inTierLosers], escape };
}

function tierLabel(t) {
  return ['MANDATORY', 'REPAIR', 'MAINTENANCE', 'EVIDENCE', 'PROGRESS', 'INTRODUCE', 'TERMINAL'][t] ?? 'TERMINAL';
}

function tierNameOf(kind) {
  return tierLabel(TIER_OF[kind]);
}

export const POLICIES = { A: policyA, B: policyB, C: policyC };
