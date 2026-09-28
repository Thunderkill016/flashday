/*
 * vNext EvidenceEvent v0 (issue #42, capability-model-v0.md §3).
 *
 * Append-only durable observation of what the learner did. Learner state
 * is ALWAYS a projection of these events — never stored separately.
 */

import { MODALITIES } from './capabilities.js';

export const EVENT_TYPES = [
  'exposure',
  'recognition_attempt',
  'recall_attempt',
  'production_attempt',
  'interaction_turn',
  'support_use',
  'feedback',
  'retry',
  'delayed_retrieval',
  'transfer_attempt',
  'checkpoint'
];

export const OUTCOMES = ['success', 'partial', 'fail'];
export const CONTEXT_KINDS = ['practiced', 'transfer'];

const defaultSupport = () => ({
  hint: false,
  translation: false,
  transcript: false,
  modelAnswer: false,
  repeat: false
});

/* Hints, model answers, translations and transcripts hand the learner
 * the answer — success under them is SUPPORTED work, never INDEPENDENT.
 * `repeat` only replays the prompt: it does not supply the answer. */
export function answerBearing(support) {
  if (!support) return false;
  return Boolean(support.hint || support.modelAnswer || support.translation || support.transcript);
}

export function validateEvent(e) {
  const problems = [];
  if (!e || typeof e !== 'object') return ['event must be an object'];
  for (const key of ['id', 'learnerId', 'capabilityId', 'taskId', 'eventType', 'modality']) {
    if (typeof e[key] !== 'string' || !e[key]) problems.push(`missing ${key}`);
  }
  if (!Number.isInteger(e.taskRevision) || e.taskRevision < 1) problems.push('taskRevision must be a positive integer');
  if (!EVENT_TYPES.includes(e.eventType)) problems.push(`unknown eventType ${e.eventType}`);
  if (!MODALITIES.includes(e.modality)) problems.push(`unknown modality ${e.modality}`);
  if (e.attempt?.outcome != null && !OUTCOMES.includes(e.attempt.outcome)) {
    problems.push(`unknown outcome ${e.attempt.outcome}`);
  }
  if (e.context?.practicedOrTransfer != null && !CONTEXT_KINDS.includes(e.context.practicedOrTransfer)) {
    problems.push(`unknown practicedOrTransfer ${e.context.practicedOrTransfer}`);
  }
  if (!Number.isFinite(e.occurredAt)) problems.push('occurredAt must be a timestamp');
  return problems;
}

/* Construct a validated event with explicit defaults — support and
 * provenance fields are never left undefined, so a missing flag can
 * never be laundered into "no support used". */
export function makeEvent(fields) {
  const e = {
    context: { missionId: null, practicedOrTransfer: 'practiced', promptFamily: null, partnerType: null },
    attempt: { observed: true, outcome: null, response: null, latencyMs: null },
    support: defaultSupport(),
    feedback: { given: false, target: null },
    ...fields,
    context: { missionId: null, practicedOrTransfer: 'practiced', promptFamily: null, partnerType: null, ...(fields?.context || {}) },
    attempt: { observed: true, outcome: null, response: null, latencyMs: null, ...(fields?.attempt || {}) },
    support: { ...defaultSupport(), ...(fields?.support || {}) },
    feedback: { given: false, target: null, ...(fields?.feedback || {}) }
  };
  const problems = validateEvent(e);
  if (problems.length) throw new Error(`invalid EvidenceEvent: ${problems.join('; ')}`);
  return e;
}
