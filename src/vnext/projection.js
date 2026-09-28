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
 *   - FLUENT — RESERVED, unreachable in v0. The doctrine requires
 *     hesitation + intelligibility + successful turns + repairs +
 *     stability; no single field measures that yet and "responded
 *     faster" is not fluency. The milestone and state exist so the enum
 *     is stable, but nothing promotes into it until a dedicated
 *     fluency-evidence contract is calibrated.
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
import { answerBearing, conditionsViolated } from './evidence.js';

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
// capability past SUPPORTED. "Unaided" means no answer-bearing support
// AND every support actually used was permitted by the capability's
// declared conditions — an attempt that violates its own conditions is
// not valid evidence of independence.
const isIndependent = (e, cap) =>
  isSuccess(e) && e.attempt?.observed === true && !answerBearing(e.support) &&
  !conditionsViolated(e.support, cap);

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
    rehearsedPromptFamilies: [],
    transferPromptFamilies: []
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
    if (!isIndependent(e, cap)) {
      slot.milestones.supported = true;
      continue;
    }

    slot.milestones.independent = true;
    if (slot.firstIndependentAt == null) {
      slot.firstIndependentAt = e.occurredAt;
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
      }
      if (slot.transferPromptFamilies.length >= 1) slot.milestones.transferred = true;
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
