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
 * This module proves, per open episode and per still-missing function,
 * that a currently reachable, mission-local, validator-clean repair
 * route exists that does NOT consume a fresh retest probe:
 *
 *   deriveCorrectionEpisodes()      — evidence truth
 *         ↓
 *   deriveMissionRepairPlan(s)()    — this file: ∀ missing fn ∃ witness
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

  for (const fn of remaining) {
    for (const route of REPAIR_ROUTES) {
      /* Route liveness is read from the ACTUAL generated candidate set —
       * the policy only serves through intents it minted. A route the
       * generator suppressed (failure ceiling, no attribution, …) is
       * not currently reachable, whatever the registry holds. */
      const live = candidates.find((c) => c.capabilityId === ep.capabilityId && c.kind === route.kind);
      if (!live) continue;

      /* The route's own next serve with the probes withheld — the
       * repick the real routing would make if reservation existed. */
      const primary = route.viaPickTask
        ? resolver.pickTask(ep.capabilityId, route.purposes, live.facts ?? {}, ceiling, { excludeTaskIds: probeIds }).task
        : resolver.servable(ep.capabilityId, route.purposes, { excludeTaskIds: probeIds });

      /* Witness set = every repair-eligible member of the route's
       * fn-covering servable stream — the tasks this route can still
       * serve for `fn` in mission order, probes withheld. The primary
       * serve is listed first by construction. */
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
          alternateTask: t.id !== primary?.id
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
          servedNext: t.id === primary?.id
        });
      }
    }
  }

  plan.complete = remaining.every((fn) =>
    plan.witnesses[fn].some((w) =>
      w.missionMember && w.coversFunction && w.hardFilterClean &&
      !w.consumesFreshRetestSurface));
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
