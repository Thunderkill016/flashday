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
 *   - INDEPENDENT = an observed, unaided success on an ATTEMPT event;
 *   - RETAINED = another unaided observed success ≥ RETENTION_DELAY_MS
 *     after the first independent success;
 *   - TRANSFERRED = an unaided observed success in a 'transfer' context
 *     whose promptFamily was never rehearsed — a family practiced WITH
 *     support is still rehearsed and cannot pass as novel;
 *   - FLUENT = transfer succeeded in ≥2 novel families AND ≥2 of those
 *     transfer successes were materially faster than the learner's first
 *     independent baseline (hesitation must be measured, not assumed).
 *
 * Hard boundaries:
 *   - only ATTEMPT_TYPES may advance state — an exposure/feedback/support
 *     record carrying an outcome field is context, not performance;
 *   - only events for THIS learner and THIS modality count — a speaking
 *     event can never mark a listening capability learned, and a mixed
 *     learner log can never cross-contaminate;
 *   - canonical order is (occurredAt, id) — arrival order can never
 *     change the projection; replay of the same event set is identical.
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

// Fluency = transfer-capable performance with measurably lower
// hesitation. v0's measurable proxy: a transfer success counts toward
// fluency only when its latency is ≤ this ratio of the learner's first
// independent-success latency. No latency data → ceiling is TRANSFERRED.
export const FLUENCY_LATENCY_RATIO = 0.8;

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
    firstIndependentLatencyMs: null,
    lastIndependentSuccessAt: null,
    rehearsedPromptFamilies: [],
    transferPromptFamilies: [],
    transferLatencies: []
  };
}

export function projectLearnerState(learnerId, events, capabilities, { retentionDelayMs = RETENTION_DELAY_MS } = {}) {
  // A projection is always for exactly one learner — a log mixing
  // learners must never merge into one state.
  if (typeof learnerId !== 'string' || !learnerId) {
    throw new Error('projectLearnerState requires a learnerId');
  }
  const byId = new Map(capabilities.map((c) => [c.id, c]));
  const byCapability = new Map(capabilities.map((c) => [c.id, emptyCapability()]));

  // Canonical replay order: (occurredAt, id). Two deliveries of the same
  // event set produce the same projection regardless of arrival order;
  // ids dedupe resynced duplicates.
  const seenIds = new Set();
  const mine = [];
  for (const e of events) {
    if (e.learnerId !== learnerId) continue;
    if (seenIds.has(e.id)) continue;
    seenIds.add(e.id);
    mine.push(e);
  }
  mine.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (const e of mine) {
    const cap = byId.get(e.capabilityId);
    const slot = byCapability.get(e.capabilityId);
    if (!cap || !slot) continue;
    // Modality isolation: evidence only counts for the modality the
    // capability declares. A written event on a listening capability is
    // recorded but earns nothing.
    if (e.modality !== cap.modality) continue;

    slot.milestones.exposed = true;
    slot.lastEventAt = e.occurredAt;

    // Families rehearsed in a practiced context — succeeded OR failed,
    // aided OR not — can never be re-sold as a novel transfer context.
    if (e.context?.practicedOrTransfer === 'practiced' && e.context?.promptFamily) {
      if (!slot.rehearsedPromptFamilies.includes(e.context.promptFamily)) {
        slot.rehearsedPromptFamilies.push(e.context.promptFamily);
      }
    }

    // Non-attempt events may carry an outcome field; it is context, not
    // performance, and must not advance state.
    if (!ATTEMPT_TYPES.has(e.eventType) || e.attempt?.outcome == null) continue;
    slot.lastAttemptOutcome = e.attempt.outcome;
    if (!isSuccess(e)) continue;
    if (!isIndependent(e)) {
      slot.milestones.supported = true;
      continue;
    }

    slot.milestones.independent = true;
    if (slot.firstIndependentAt == null) {
      slot.firstIndependentAt = e.occurredAt;
      slot.firstIndependentLatencyMs = e.attempt.latencyMs;
    }
    slot.lastIndependentSuccessAt = e.occurredAt;
    if (e.occurredAt - slot.firstIndependentAt >= retentionDelayMs) {
      slot.milestones.retained = true;
    }

    if (e.context?.practicedOrTransfer === 'transfer') {
      const family = e.context?.promptFamily;
      const novel = family && !slot.rehearsedPromptFamilies.includes(family);
      if (novel && !slot.transferPromptFamilies.includes(family)) {
        slot.transferPromptFamilies.push(family);
        slot.transferLatencies.push(e.attempt.latencyMs ?? null);
      }
      if (slot.transferPromptFamilies.length >= 1) slot.milestones.transferred = true;
    }

    const baseline = slot.firstIndependentLatencyMs;
    if (!slot.milestones.fluent && slot.transferPromptFamilies.length >= 2 && baseline != null) {
      const fastTransfers = slot.transferLatencies.filter(
        (l) => l != null && l <= baseline * FLUENCY_LATENCY_RATIO
      ).length;
      if (fastTransfers >= 2) slot.milestones.fluent = true;
    }
  }

  for (const slot of byCapability.values()) {
    let highest = 'NOT_SEEN';
    for (const name of ['EXPOSED', 'SUPPORTED', 'INDEPENDENT', 'RETAINED', 'TRANSFERRED', 'FLUENT']) {
      if (slot.milestones[name.toLowerCase()]) highest = name;
    }
    slot.state = highest;
  }
  return { learnerId, byCapability, generatedFrom: mine.length };
}
