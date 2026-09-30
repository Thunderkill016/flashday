/*
 * Appendable decision log (spec §10/§27). Records only facts available
 * AT decision time — later outcomes may be JOINED, never merged back.
 *
 * The state fingerprint is a collision-resistant SHA-256 digest over a
 * canonical decision-input snapshot: every input that can change the
 * decision — full event provenance (id, task@rev, type, capability,
 * outcome, observed, support flags, evaluation contract/missing,
 * context family), `now`, learning policy, selection config, mission
 * id@revision, task revision surface, roles, and the whole
 * DecisionContext. Two semantically different decision inputs produce
 * different digests with overwhelming probability (collision-RESISTANT,
 * never "impossible").
 *
 * Append deep-clones + deep-freezes the decision so post-append
 * mutation of the caller's object cannot rewrite history.
 */
import { deepFreezeAll, sha256 } from './util.js';

const canonEvent = (e) => ({
  id: e.id ?? null,
  taskId: e.taskId ?? null,
  taskRevision: e.taskRevision ?? null,
  eventType: e.eventType ?? null,
  capabilityId: e.capabilityId ?? null,
  occurredAt: e.occurredAt ?? null,
  attempt: e.attempt ? {
    attemptId: e.attempt.attemptId ?? null,
    observed: e.attempt.observed ?? null,
    outcome: e.attempt.outcome ?? null
  } : null,
  support: e.support ? {
    hint: !!e.support.hint, translation: !!e.support.translation,
    transcript: !!e.support.transcript, modelAnswer: !!e.support.modelAnswer,
    repeat: !!e.support.repeat
  } : null,
  evaluation: e.evaluation ? {
    contractId: e.evaluation.contractId ?? null,
    missingFunctions: [...(e.evaluation.missingFunctions ?? [])].sort()
  } : null,
  context: e.context ? {
    missionId: e.context.missionId ?? null,
    promptFamily: e.context.promptFamily ?? null,
    practicedOrTransfer: e.context.practicedOrTransfer ?? null
  } : null
});

const canonCtx = (ctx) => !ctx ? null : ({
  decisionEpisodeId: ctx.decisionEpisodeId,
  sessionId: ctx.sessionId,
  actionsChosen: (ctx.actionsChosen ?? []).map((a) => ({
    kind: a.kind, capabilityId: a.capabilityId, taskId: a.taskId, atDecision: a.atDecision
  })),
  counts: { ...ctx.counts },
  recentCapabilities: [...(ctx.recentCapabilities ?? [])],
  recentTaskIds: [...(ctx.recentTaskIds ?? [])],
  lastActedCapabilityId: ctx.lastActedCapabilityId ?? null,
  currentThreadCapabilityId: ctx.currentThreadCapabilityId ?? null
});

/* Canonical decision-input snapshot — the complete contract surface a
 * decision can depend on. Used for provenance fingerprinting AND for
 * the decisionId's state identity. */
export function decisionInputSnapshot({ events, learnerId, decisionContext, now, policy, selection, mission, tasks, roles, capabilities }) {
  return {
    learnerId: learnerId ?? null,
    now: now ?? null,
    capabilities: [...(capabilities ?? [])]
      .map((c) => ({ id: c.id, modality: c.modality ?? null, prerequisites: [...(c.prerequisites ?? [])].sort(), probes: [...(c.vietnameseRiskProbes ?? [])].sort() }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
    events: [...(events ?? [])]
      .filter((e) => e.learnerId === learnerId)
      .sort((a, b) => (a.occurredAt ?? 0) - (b.occurredAt ?? 0) || ((a.id ?? '') < (b.id ?? '') ? -1 : 1))
      .map(canonEvent),
    decisionContext: canonCtx(decisionContext),
    policy: policy ?? null,
    selection: selection ?? null,
    mission: mission ? { id: mission.id, revision: mission.revision ?? null } : null,
    tasks: [...(tasks ?? [])]
      .map((t) => ({
        key: `${t.id}@${t.revision ?? 1}`, purpose: t.purpose ?? null,
        capabilityId: t.capabilityId ?? null, modality: t.modality ?? null,
        promptFamily: t.promptFamily ?? t.family ?? null,
        requiredFunctions: [...(t.response?.requiredFunctions ?? [])].sort()
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1)),
    roles: roles ? {
      targets: [...(roles.targets ?? [])].sort(),
      supports: [...(roles.supports ?? [])].sort(),
      prereqs: [...(roles.prereqs ?? [])].sort()
    } : null
  };
}

export function stateDigest(input) {
  return `sha256:${sha256(decisionInputSnapshot(input))}`;
}

export function createDecisionLog() {
  const entries = [];
  return {
    append(decision, stateSnapshot) {
      const entry = deepFreezeAll(structuredClone({
        seq: entries.length,
        decision,
        stateFingerprint: stateSnapshot.digest ?? `${stateSnapshot.eventCount}:${stateSnapshot.capabilityCount}:${stateSnapshot.lastEventId ?? 'none'}`
      }));
      entries.push(entry);
      return entry;
    },
    entries,
    at(index) { return entries[index] ?? null; },
    size() { return entries.length; }
  };
}
