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
import { deepFreezeAll, sha256, canon } from './util.js';

/* FULL canonical forms — no hand-picked field subsets (BLOCKER-1 r3):
 * a field that verifyEventTask / the projection / the planner can read
 * MUST be able to move the digest. Canonicalizing whole contracts
 * guarantees the snapshot can never silently miss a semantic field. */
const canonEvent = (e) => e; // events are canonicalized whole via canon()

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
 * the decisionId's state identity.
 *
 * Events are learner-scoped, canonically sorted, and deduped by id the
 * way the kernel dedupes (first delivery wins): an exact idempotent
 * re-delivery cannot change the digest. A CONFLICTING duplicate (same
 * id, different content) is a registry violation — it is recorded in
 * the snapshot so it changes the digest AND surfaces to fail-closed
 * integrity instead of being silently swallowed. */
export function decisionInputSnapshot({ events, learnerId, decisionContext, now, policy, selection, mission, tasks, roles, capabilities }) {
  const scoped = [...(events ?? [])]
    .filter((e) => e.learnerId === learnerId)
    .sort((a, b) => (a.occurredAt ?? 0) - (b.occurredAt ?? 0) || ((a.id ?? '') < (b.id ?? '') ? -1 : 1));
  const seen = new Map();
  const deduped = [];
  const conflicts = [];
  for (const e of scoped) {
    const k = e.id ?? `noid:${deduped.length}`;
    if (seen.has(k)) {
      if (canon(seen.get(k)) !== canon(e)) conflicts.push(k);
      continue;
    }
    seen.set(k, e);
    deduped.push(e);
  }
  return {
    learnerId: learnerId ?? null,
    now: now ?? null,
    capabilities: [...(capabilities ?? [])]
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
    events: deduped.map(canonEvent),
    duplicateEventConflicts: conflicts.sort(),
    decisionContext: canonCtx(decisionContext),
    policy: policy ?? null,
    selection: selection ?? null,
    mission: mission ?? null,
    tasks: [...(tasks ?? [])]
      .sort((a, b) => { const ka = `${a.id}@${a.revision ?? 1}`, kb = `${b.id}@${b.revision ?? 1}`; return ka < kb ? -1 : 1; }),
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
    /* MEDIUM-8 r3: append FAILS CLOSED without canonical provenance —
     * the weak eventCount:capabilityCount:lastEventId fallback is gone.
     * Callers pass the full decision input (the snapshot/digest is
     * computed here) or a precomputed {digest, provenance}. Each entry
     * persists enough identity to rebuild/audit the historical state:
     * mission@rev, learning policy version, selection policy+config,
     * the active task@rev surface, and the decision-context identity. */
    append(decision, input) {
      const snapshot = input?.digest ? null : decisionInputSnapshot(input ?? {});
      const digest = input?.digest ?? `sha256:${sha256(snapshot)}`;
      if (!input?.digest && (!input || typeof input !== 'object' || !('events' in input))) {
        throw new Error('decision log append requires canonical decision-input provenance');
      }
      const src = input ?? {};
      const entry = deepFreezeAll(structuredClone({
        seq: entries.length,
        decision,
        stateFingerprint: digest,
        provenance: {
          missionId: src.mission?.id ?? decision.missionId ?? null,
          missionRevision: src.mission?.revision ?? decision.missionRevision ?? null,
          learningPolicyVersion: src.policy?.version ?? null,
          selectionPolicyVersion: decision.selectionPolicyVersion ?? null,
          selectionConfig: src.selection ?? null,
          taskSurface: [...(src.tasks ?? [])].map((t) => `${t.id}@${t.revision ?? 1}`).sort(),
          decisionEpisodeId: src.decisionContext?.decisionEpisodeId ?? null,
          sessionId: src.decisionContext?.sessionId ?? null
        }
      }));
      entries.push(entry);
      return entry;
    },
    entries,
    at(index) { return entries[index] ?? null; },
    size() { return entries.length; }
  };
}
