/*
 * vNext capability-state projection (issue #42, capability-model-v0.md §2).
 *
 * States are DERIVED from the append-only event log, never stored:
 *
 *   NOT_SEEN → EXPOSED → SUPPORTED → INDEPENDENT → RETAINED → TRANSFERRED → FLUENT
 *
 * The milestone rules encode the spec's non-negotiables:
 *   - exposure is any modality-matched contact, including a failed probe;
 *   - SUPPORTED = a success that needed answer-bearing help or was not
 *     observed (self-report cannot prove independence);
 *   - INDEPENDENT = an observed, unaided success;
 *   - RETAINED = another unaided observed success ≥ RETENTION_DELAY_MS
 *     after the first independent success;
 *   - TRANSFERRED = an unaided observed success in a 'transfer' context
 *     whose promptFamily was never proven in practice — replaying the
 *     practiced prompt does not transfer;
 *   - FLUENT = transfer succeeded in ≥2 distinct prompt families.
 *
 * Only events whose modality matches the capability's modality count —
 * speaking practice can never mark a listening capability learned.
 */
import { answerBearing } from './evidence.js';

export const CAPABILITY_STATES = [
  'NOT_SEEN',
  'EXPOSED',
  'SUPPORTED',
  'INDEPENDENT',
  'RETAINED',
  'TRANSFERRED',
  'FLUENT'
];

// "A meaningful delay" — v0 pins this at 24h. It is a named constant so
// the day we calibrate it, every test and every learner sees the same rule.
export const RETENTION_DELAY_MS = 24 * 60 * 60 * 1000;

const ATTEMPT_TYPES = new Set([
  'recognition_attempt',
  'recall_attempt',
  'production_attempt',
  'interaction_turn',
  'retry',
  'delayed_retrieval',
  'transfer_attempt',
  'checkpoint'
]);

const isSuccess = (e) => e.attempt?.outcome === 'success';
// Observed, unaided success — the only evidence that can carry a
// capability past SUPPORTED.
const isIndependent = (e) =>
  isSuccess(e) && e.attempt?.observed === true && !answerBearing(e.support);

function emptyCapability() {
  return {
    state: 'NOT_SEEN',
    milestones: {
      exposed: false,
      supported: false,
      independent: false,
      retained: false,
      transferred: false,
      fluent: false
    },
    lastEventAt: null,
    lastAttemptOutcome: null,
    firstIndependentAt: null,
    lastIndependentSuccessAt: null,
    provenPromptFamilies: [],
    transferPromptFamilies: []
  };
}

export function projectLearnerState(events, capabilities, { retentionDelayMs = RETENTION_DELAY_MS } = {}) {
  const byId = new Map(capabilities.map((c) => [c.id, c]));
  const byCapability = new Map(capabilities.map((c) => [c.id, emptyCapability()]));

  // Sort by time so arrival order cannot change the projection; a stable
  // second key keeps same-timestamp replays deterministic too.
  const sorted = events
    .map((e, i) => [e, i])
    .sort((a, b) => a[0].occurredAt - b[0].occurredAt || a[1] - b[1])
    .map(([e]) => e);

  const seenIds = new Set();
  for (const e of sorted) {
    if (seenIds.has(e.id)) continue; // sync replay dedupe — append-only log
    seenIds.add(e.id);
    const cap = byId.get(e.capabilityId);
    const slot = byCapability.get(e.capabilityId);
    if (!cap || !slot) continue;
    // Modality isolation: evidence only counts for the modality the
    // capability declares. A written event on a listening capability is
    // recorded but earns nothing.
    if (e.modality !== cap.modality) continue;

    slot.milestones.exposed = true;
    slot.lastEventAt = e.occurredAt;
    if (ATTEMPT_TYPES.has(e.eventType) && e.attempt?.outcome != null) {
      slot.lastAttemptOutcome = e.attempt.outcome;
    }

    if (isSuccess(e)) {
      if (!isIndependent(e)) {
        slot.milestones.supported = true;
        continue;
      }
      slot.milestones.independent = true;
      if (slot.firstIndependentAt == null) slot.firstIndependentAt = e.occurredAt;
      slot.lastIndependentSuccessAt = e.occurredAt;
      if (e.occurredAt - slot.firstIndependentAt >= retentionDelayMs) {
        slot.milestones.retained = true;
      }
      const family = e.context?.promptFamily;
      if (e.context?.practicedOrTransfer === 'transfer') {
        // A transfer claim only counts when the prompt family is novel —
        // a practiced prompt replayed later is retention, not transfer.
        if (family && !slot.provenPromptFamilies.includes(family)) {
          if (!slot.transferPromptFamilies.includes(family)) slot.transferPromptFamilies.push(family);
          slot.milestones.transferred = true;
        }
      } else if (family && !slot.provenPromptFamilies.includes(family)) {
        slot.provenPromptFamilies.push(family);
      }
      if (slot.transferPromptFamilies.length >= 2) slot.milestones.fluent = true;
    }
  }

  const rank = (name) => CAPABILITY_STATES.indexOf(name);
  for (const slot of byCapability.values()) {
    let highest = 'NOT_SEEN';
    for (const name of ['EXPOSED', 'SUPPORTED', 'INDEPENDENT', 'RETAINED', 'TRANSFERRED', 'FLUENT']) {
      if (slot.milestones[name.toLowerCase()]) highest = name;
    }
    slot.state = highest;
  }
  return { byCapability, generatedFrom: sorted.length };
}
