/*
 * OpenLingo -> FlashDay vNext attempt bridge.
 *
 * OpenLingo is treated as a learner-facing exercise shell only. It may
 * report what the learner actually did (response, support used, timing),
 * but it may NOT author capability identity, task purpose, freshness,
 * transfer/assessment semantics, evaluation authority, or outcome.
 *
 * The FlashDay TaskContract remains the source of truth:
 *   OpenLingo result -> evaluateAttempt(task) -> bindAttempt(task, cap)
 *                    -> EvidenceEvent
 *
 * This seam intentionally rejects OpenLingo's own `correct` boolean.
 * A UI component saying "correct" is not evidence until the registered
 * FlashDay evaluator scores the response under the task contract.
 */

import { bindAttempt } from '../bind.js';
import { evaluateAttempt } from '../evaluators.js';

const FORBIDDEN_SEMANTIC_KEYS = new Set([
  'capabilityId',
  'taskId',
  'taskRevision',
  'purpose',
  'eventType',
  'outcome',
  'correct',
  'context',
  'promptFamily',
  'practicedOrTransfer',
  'freshness',
  'transfer',
  'assessment',
  'evaluation',
  'authority',
  'binding'
]);

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

export function mapOpenLingoSupport(raw = {}) {
  const repeatCount = Number.isInteger(raw.repeatCount) && raw.repeatCount >= 0
    ? raw.repeatCount
    : null;
  return {
    hint: raw.hintUsed === true,
    translation: raw.translationViewed === true,
    transcript: raw.transcriptViewed === true,
    modelAnswer: raw.modelAnswerViewed === true,
    repeat: (repeatCount ?? 0) > 0,
    repeatCount
  };
}

function rejectSemanticOverrides(payload) {
  for (const key of Object.keys(payload ?? {})) {
    if (FORBIDDEN_SEMANTIC_KEYS.has(key)) {
      throw new Error(
        `openlingo bridge: '${key}' is semantic authority owned by the FlashDay TaskContract`
      );
    }
  }
}

function observedFromSource(task, source) {
  /*
   * OpenLingo speaking currently evaluates an STT transcript. FlashDay's
   * doctrine is explicit: transcript match != pronunciation/intelligibility
   * evidence. Keep the attempt for history/feedback, but mark it unobserved
   * so it can never mint INDEPENDENT/TRANSFER/ASSESSMENT credit.
   *
   * Non-spoken direct UI responses are observable interaction facts.
   * A future acoustic/human evaluator should get a new explicit bridge
   * source + contract rather than upgrading this flag.
   */
  if (
    source === 'stt_transcript' ||
    task?.modality === 'spoken_production' ||
    task?.modality === 'spoken_interaction'
  ) {
    return false;
  }
  return true;
}

export function bridgeOpenLingoAttempt(task, capability, payload = {}) {
  rejectSemanticOverrides(payload);

  const {
    id,
    learnerId,
    occurredAt,
    response,
    attemptId = id,
    source = 'direct_ui',
    support = {},
    evaluatorContext = {}
  } = payload;

  if (!isNonEmptyString(id)) {
    throw new Error('openlingo bridge: id is required');
  }
  if (!isNonEmptyString(learnerId)) {
    throw new Error('openlingo bridge: learnerId is required');
  }
  if (!Number.isFinite(occurredAt)) {
    throw new Error('openlingo bridge: occurredAt must be a timestamp');
  }
  if (response == null) {
    throw new Error('openlingo bridge: response is required; a UI correct/incorrect flag is insufficient');
  }

  const scored = evaluateAttempt(task, response, evaluatorContext);
  if (!scored) {
    throw new Error(
      `openlingo bridge: task '${task?.id ?? 'unknown'}' has no registered FlashDay evaluator`
    );
  }

  return bindAttempt(task, capability, {
    id,
    learnerId,
    occurredAt,
    attempt: {
      observed: observedFromSource(task, source),
      outcome: scored.outcome,
      response,
      attemptId
    },
    support: mapOpenLingoSupport(support),
    evaluation: {
      evaluator: 'openlingo-kernel-bridge',
      version: 1,
      missingFunctions: scored.missingFunctions ?? []
    }
  });
}
