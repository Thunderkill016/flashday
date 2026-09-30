/*
 * Appendable decision log (spec §10/§27). Records only facts available
 * AT decision time — later outcomes may be JOINED, never merged back.
 * Replaying a decision at time T truncates evidence at occurredAt ≤ T:
 * no future leakage.
 */
import { deepFreezeShallow } from './util.js';

export function createDecisionLog() {
  const entries = [];
  return {
    append(decision, stateSnapshot) {
      const entry = deepFreezeShallow({
        seq: entries.length,
        decision,
        // canonical state fingerprint for audit: count + last event id +
        // the capability set — not the full log
        stateFingerprint: `${stateSnapshot.eventCount}:${stateSnapshot.capabilityCount}:${stateSnapshot.lastEventId ?? 'none'}`
      });
      entries.push(entry);
      return entry;
    },
    entries,
    /* Replay the decision that was made at event-count index N:
     * returns the logged record — verification compares it against a
     * recomputation over events[0..N). */
    at(index) { return entries[index] ?? null; },
    size() { return entries.length; }
  };
}
