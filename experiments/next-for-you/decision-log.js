/*
 * Appendable decision log (spec §10/§27). Records only facts available
 * AT decision time — later outcomes may be JOINED, never merged back.
 *
 * The state fingerprint is a canonical digest over every
 * decision-relevant input — ordered event identities (id, task@rev,
 * type, outcome, occurredAt) for the scoped learner plus the
 * DecisionContext — strong enough that two different histories can
 * never collide into the same provenance (review HIGH-7).
 */
import { deepFreezeShallow, hash } from './util.js';

const canonEvent = (e) => [e.id, e.taskId, e.taskRevision ?? '', e.eventType, e.attempt?.outcome ?? '', e.occurredAt].join('|');

export function stateDigest({ events, learnerId, decisionContext }) {
  const evs = [...(events ?? [])]
    .filter((e) => e.learnerId === learnerId)
    .sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1))
    .map(canonEvent)
    .join(';');
  const ctx = decisionContext
    ? `${decisionContext.decisionEpisodeId}|${decisionContext.actionsChosen?.length ?? 0}|${decisionContext.currentThreadCapabilityId ?? ''}|${(decisionContext.actionsChosen ?? []).map((a) => `${a.kind}@${a.capabilityId}:${a.atDecision}`).join(',')}`
    : '';
  return `ev:${hash(evs)}:ctx:${hash(ctx)}`;
}

export function createDecisionLog() {
  const entries = [];
  return {
    append(decision, stateSnapshot) {
      const entry = deepFreezeShallow({
        seq: entries.length,
        decision,
        stateFingerprint: stateSnapshot.digest ?? `${stateSnapshot.eventCount}:${stateSnapshot.capabilityCount}:${stateSnapshot.lastEventId ?? 'none'}`
      });
      entries.push(entry);
      return entry;
    },
    entries,
    at(index) { return entries[index] ?? null; },
    size() { return entries.length; }
  };
}
