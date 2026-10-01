/*
 * Mission-local repair reachability proof (Mission 008G) — ROUTING
 * TRUTH for correction episodes.
 *
 * deriveCorrectionEpisodes answers evidence truth only: which episodes
 * exist, which functions remain missing, which surfaces are burned.
 * Whether the learner still has a repair path INSIDE the serving mission
 * is a different question — one the old code answered by scanning the
 * full task registry, which could hold a remediation task belonging to
 * another mission (false positive) or name a task the live routes would
 * never actually serve (existence ≠ reachability).
 *
 * This module proves, per open episode, that SOME repair route's actual
 * next serve — computed with the fresh retest probes withheld — is a
 * mission-local, validator-clean, non-probe task covering EVERY
 * still-missing function. Per-function witness streams are kept for
 * audit only; a different-stream-member-per-function proof is NOT
 * accepted, because the route can only serve one task next and serving
 * it may exhaust the repair bound (R1 review):
 *
 *   deriveCorrectionEpisodes()      — evidence truth
 *         ↓
 *   deriveMissionRepairPlan(s)()    — this file: ∃ route whose
 *                                     servedNext covers ALL missing fns
 *         ↓
 *   deriveRetestReservations()      — the withheld probe-id set
 *         ↓
 *   hardFilter(reservations)        — candidates on a reserved probe are
 *         ↓                          ineligible (except the retest kind)
 *   policyB1()
 *
 * Repair routes are exactly the ones the live policy mints: CORRECTION
 * and REFRESH. SUPPORT_DEMAND is never a repair witness (support success
 * does not repair a target episode), and no other intent is silently
 * promoted into one — extending the route set is a contract change.
 *
 * Reservation semantics by episode state:
 *   OPEN              — nothing reserved; the first covering success may
 *                       legitimately BE the repair on any surface.
 *   REPAIRING/RELAPSED— reserve the fresh probes IFF the proof is
 *                       complete for EVERY remaining function; otherwise
 *                       the probes stay servable (a probe may become the
 *                       repair rather than stranding the learner).
 *   REPAIRED_WAITING  — reserve directly; repair already demonstrated,
 *                       no channel proof owed.
 *   RETEST_DUE        — nothing reserved; the retest must serve.
 *   VERIFIED          — terminal; nothing reserved.
 */
import {
  remainingOf, retestSurfaces, burnedSurfaces
} from '../correction-episodes.js';
import { KINDS } from './constants.js';
import { INTENT_PURPOSES } from './candidate-generator.js';

export const REPAIR_PROOF_VERSION = 'vnext.mission-repair-proof.v1';

const PROOF_REQUIRED_STATES = new Set(['REPAIRING', 'RELAPSED']);
const DIRECT_RESERVE_STATES = new Set(['REPAIRED_WAITING']);

/* The repair routes B1 may claim — the same kinds its hard rules mint.
 * Any future intent that can carry episode repair must be added here
 * deliberately, never discovered by accident. */
const REPAIR_ROUTES = [
  { kind: KINDS.CORRECTION, purposes: INTENT_PURPOSES[KINDS.CORRECTION], viaPickTask: false },
  { kind: KINDS.REFRESH, purposes: INTENT_PURPOSES[KINDS.REFRESH], viaPickTask: true }
];

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;

/* A repair witness may not consume a fresh retest probe. Eligible
 * surfaces: remediation-purpose tasks (authored repair work) and any
 * already-burned surface (re-practicing a contaminated item is free —
 * it can never be the delayed retest anyway). */
const repairEligible = (t, burned) =>
  t.purpose === 'remediation' || burned.has(t.id);

/* Per-episode reachability proof. `resolver` is the SHARED mission-task
 * resolver generateCandidates already built for this decision — the
 * proof asks counterfactual reachability through the identical
 * servable/pickTask machinery the routes use, never a reimplementation.
 * `hardFilter` is injected so this module stays import-cycle-free. */
export function deriveMissionRepairPlan({
  episode: ep, mission, tasks, candidates,
  resolver, selection = {}, decisionContext = null,
  pendingDemands = [], roles = null, episodes = null,
  hardFilter
}) {
  const missionTasks = resolver?.missionTasks ?? [];
  const missionTaskIds = new Set(missionTasks.map((t) => t.id));
  const probes = retestSurfaces(ep, missionTasks);
  const probeIds = new Set(probes.map((t) => t.id));
  const remaining = remainingOf(ep);
  const burned = burnedSurfaces(ep);
  const ceiling = selection.failureCeiling ?? 3;

  const plan = {
    version: REPAIR_PROOF_VERSION,
    episodeId: ep.episodeId,
    learnerId: ep.learnerId,
    missionId: mission?.id ?? null,
    missionRevision: mission?.revision ?? null,
    capabilityId: ep.capabilityId,
    state: ep.state,
    remainingFunctions: [...remaining],
    retestSurfaceIds: probes.map((t) => t.id),
    witnesses: {},
    servedNext: [],
    required: PROOF_REQUIRED_STATES.has(ep.state),
    complete: false,
    reserved: false,
    reasonCode: null
  };
  for (const f of remaining) plan.witnesses[f] = [];

  if (!plan.required) {
    plan.reasonCode = DIRECT_RESERVE_STATES.has(ep.state)
      ? 'repair_already_demonstrated'
      : `reservation_not_applicable:${ep.state}`;
    plan.reserved = DIRECT_RESERVE_STATES.has(ep.state) && probes.length > 0;
    return plan;
  }
  if (!probes.length || !remaining.length) {
    /* No fresh probe to protect (or no missing function left to
     * repair): there is nothing a reservation could withhold. */
    plan.reasonCode = 'mission_repair_channel_vacuous';
    plan.reserved = false;
    return plan;
  }
  if (!resolver || typeof hardFilter !== 'function') {
    plan.reasonCode = 'mission_repair_channel_unproven';
    return plan;
  }

  /* The env the witness check runs under — identical to the policy's
   * filter env EXCEPT reservations: the question is "would this repair
   * candidate still be clean while the probes stay protected?" */
  const envSansReservation = {
    ctx: decisionContext, selection, pendingDemands, roles,
    assessmentMode: 'fresh', episodes, reservations: null
  };

  /* Load-bearing check (R1 patch): a route serves exactly ONE task next,
   * and serving it may consume the last repair action the episode budget
   * allows. A proof built by picking a different stream member per
   * function can claim reachability that never materialises — F1→A and
   * F2→B are witnesses on paper, but if only A can actually serve next
   * and it does not cover F2, B is dead. So `complete` requires SOME
   * repair route whose actual next serve (probes withheld) is
   * mission-local, filter-clean, non-probe AND covers EVERY remaining
   * function. Per-function witness streams remain below for audit. */
  for (const route of REPAIR_ROUTES) {
    /* Route liveness is read from the ACTUAL generated candidate set —
     * the policy only serves through intents it minted. A route the
     * generator suppressed (failure ceiling, no attribution, …) is
     * not currently reachable, whatever the registry holds. */
    const live = candidates.find((c) => c.capabilityId === ep.capabilityId && c.kind === route.kind);
    if (!live) continue;
    const pick = route.viaPickTask
      ? resolver.pickTask(ep.capabilityId, route.purposes, live.facts ?? {}, ceiling, { excludeTaskIds: probeIds })
      : { task: resolver.servable(ep.capabilityId, route.purposes, { excludeTaskIds: probeIds }), identicalRetry: false, alternateTask: false };
    const t = pick.task;
    if (!t || !repairEligible(t, burned)) continue;
    const violations = hardFilter({
      kind: route.kind, capabilityId: ep.capabilityId,
      servableTask: t, facts: live.facts ?? {},
      identicalRetry: pick.identicalRetry, alternateTask: pick.alternateTask
    }, envSansReservation);
    plan.servedNext.push({
      candidateKind: route.kind,
      taskId: t.id,
      taskRevision: t.revision ?? 1,
      purpose: t.purpose,
      missionMember: missionTaskIds.has(t.id),
      coversAllRemaining: remaining.every((fn) =>
        (t.response?.requiredFunctions ?? []).includes(fn)),
      hardFilterClean: violations.length === 0,
      filterReasons: violations,
      consumesFreshRetestSurface: probeIds.has(t.id)
    });
  }

  /* Per-function audit streams: every repair-eligible member of each
   * route's fn-covering servable stream, probes withheld — kept for
   * review/backlog diagnosis, NOT for completeness. */
  for (const fn of remaining) {
    for (const route of REPAIR_ROUTES) {
      const live = candidates.find((c) => c.capabilityId === ep.capabilityId && c.kind === route.kind);
      if (!live) continue;
      const primary = plan.servedNext.find((w) => w.candidateKind === route.kind)?.taskId ?? null;
      const stream = resolver.optionsFor(ep.capabilityId, route.purposes, {
        requiredFunctions: [fn], excludeTaskIds: probeIds
      });
      const lastTask = resolver.lastAttemptByCap?.get(ep.capabilityId)?.task ?? null;
      const observedFails = live.facts?.observedFails ?? live.facts?.consecutiveFailures ?? 0;
      for (const t of stream) {
        if (!repairEligible(t, burned)) continue;
        const hypothetical = {
          kind: route.kind, capabilityId: ep.capabilityId,
          servableTask: t, facts: live.facts ?? {},
          /* Ceiling-escape flags reproduce pickTask semantics on the
           * constrained stream: re-serving the last-failed task under
           * a ceiling is an identical retry. */
          identicalRetry: lastTask != null && t.id === lastTask.id && observedFails >= ceiling,
          alternateTask: t.id !== primary
        };
        const violations = hardFilter(hypothetical, envSansReservation);
        plan.witnesses[fn].push({
          candidateKind: route.kind,
          taskId: t.id,
          taskRevision: t.revision ?? 1,
          purpose: t.purpose,
          missionMember: missionTaskIds.has(t.id),
          coversFunction: true,
          hardFilterClean: violations.length === 0,
          filterReasons: violations,
          consumesFreshRetestSurface: probeIds.has(t.id),
          servedNext: t.id === primary
        });
      }
    }
  }

  plan.complete = plan.servedNext.some((w) =>
    w.missionMember && w.coversAllRemaining && w.hardFilterClean &&
    !w.consumesFreshRetestSurface);
  plan.reasonCode = plan.complete
    ? 'mission_repair_channel_proven'
    : 'mission_repair_channel_unproven';
  plan.reserved = plan.complete;
  return plan;
}

export function deriveMissionRepairPlans({ episodes, mission, tasks, candidates, ...rest }) {
  return (episodes?.episodes ?? []).map((ep) =>
    deriveMissionRepairPlan({ episode: ep, mission, tasks, candidates, ...rest }));
}

/* The withheld probe-id set the policy's hard filter enforces: direct
 * reservation while the repair is demonstrated-but-not-yet-verified,
 * proof-gated reservation while repair is still owed. */
export function deriveRetestReservations({ episodes, plans, missionTasks }) {
  const byEpisode = new Map((plans ?? []).map((p) => [p.episodeId, p]));
  const reserved = new Set();
  for (const ep of episodes?.episodes ?? []) {
    const plan = byEpisode.get(ep.episodeId);
    if (!plan) continue;
    if (!plan.reserved) continue;
    for (const t of retestSurfaces(ep, missionTasks ?? [])) reserved.add(t.id);
  }
  return reserved;
}
