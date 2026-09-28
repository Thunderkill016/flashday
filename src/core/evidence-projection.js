/*
 * Evidence projection (A1-ARCH-001): durable records → EvidenceEvents.
 *
 * The append-only logs stay the source of truth; this module is the only
 * place that interprets them as learning evidence. Everything here is pure —
 * same logs in, same evidence out, on any device.
 *
 * Honesty rules encoded here (non-negotiable, per issue):
 * - support flags (translation/transcript/model) make evidence `aided`;
 * - multiple choice never projects production evidence;
 * - typed recall is never pronunciation evidence;
 * - a review grade with no observable pre-reveal response is self-report
 *   evidence — `aided` is true (the answer was just shown); when the record
 *   is too old to carry provenance, `aided` is null, never a guessed false;
 * - componentIds are the domain's real component ids (`lesson:chunk@rev`),
 *   resolved at the record's own timestamp so pre-edit evidence keeps
 *   pointing at the phrase that was actually exercised.
 */
import {
  canDoIdFor,
  componentId,
  contentRev,
  normalizeTaskKey,
  parseTaskKey,
  unambiguousRev,
  skillTargetFor
} from './domain.js';

export const OUTCOMES = Object.freeze(['failed', 'partial', 'success', 'submitted', 'again', 'hard', 'good', 'easy']);

// lessonEvent.kind → skill target. `drill`/`read` are recognition-layer
// skills; `listen` only counts as listening when the transcript was not
// used as a crutch — the aid flag is carried, not hidden. Mission-format
// kinds (issue #33) map to the same honest axes: typed dialogue turns are
// written production, never implied speech evidence.
const EVENT_SKILL = Object.freeze({
  drill: 'lexical.form_recognition',
  read: 'reception.reading',
  listen: 'reception.listening',
  write: 'production.writing',
  speak: 'production.speaking',
  context: 'reception.listening',
  gist: 'reception.reading',
  notice: 'lexical.form_recognition',
  retrieve: 'lexical.meaning_recall',
  interact: 'production.writing',
  exit: 'production.writing'
});

const GRADE_OUTCOME = Object.freeze({ 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' });

function isAided(support) {
  if (!support || typeof support !== 'object') return false;
  return Boolean(
    support.translationViewed || support.transcriptViewed || support.modelRevealed || support.hintViewed
  );
}

function quizOutcome(payload) {
  const correct = Number(payload?.correct);
  const total = Number(payload?.total);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return 'submitted';
  if (correct >= total) return 'success';
  if (correct <= 0) return 'failed';
  return 'partial';
}

function sourceOf(payload) {
  if (payload?.remediation) return 'remediation';
  if (payload?.variant) return 'transfer';
  return 'lesson';
}

// lessonEvent → one EvidenceEvent at lesson scope. componentIds lists the
// lesson's components. An event stamped with the lesson's CURRENT
// contentVersion provably saw the live text — the live rev is its honest
// component. Events from older content go through the ledger instead:
// single-revision slots resolve to that one rev (only one phrase ever
// lived there); chunks whose text changed emit the bare slot id
// `lesson:chunk` (resolves to the registry's ambiguous component —
// honest "some phrase at this slot", never a guess).
export function projectLessonEvent(event, lesson) {
  if (!event || typeof event !== 'object') return null;
  const skillTargetId = EVENT_SKILL[event.kind];
  if (!skillTargetId) return null;
  const at = Number(event.submittedAt) || 0;
  const eventVersion = Number(event.contentVersion) || 0;
  const isCurrent = eventVersion > 0 && eventVersion === Number(lesson?.contentVersion);
  const componentIds = Array.isArray(lesson?.chunks)
    ? lesson.chunks.map((c) =>
        componentId(lesson.id, c.id, isCurrent ? contentRev(c) : unambiguousRev(lesson.id, c.id)))
    : [];
  return {
    id: `ev:${String(event.id)}`,
    sourceEventId: String(event.id),
    lessonId: String(event.lessonId),
    canDoId: canDoIdFor(event.lessonId),
    skillTargetId,
    componentIds,
    taskId: null, // step events are not retrieval-task evidence
    step: String(event.step || ''),
    source: sourceOf(event.payload),
    outcome: event.kind === 'write' || event.kind === 'speak' ? 'submitted' : quizOutcome(event.payload),
    aided: isAided(event.support),
    confidence: null,
    occurredAt: at,
    contentVersion: Number(event.contentVersion) || 0
  };
}

// reviewLog entry → task-level EvidenceEvent. Legacy 2-segment chunkKey
// normalizes to the legacy task kind (ADR: projection, not rewrite);
// rev-less keys on multi-revision chunks stay rev-less → parked.
// `enroll` entries are pool facts, not ability evidence — skipped.
//
// Provenance is two separate facts, never conflated:
// - OBSERVED retrieval: `attempted` + `attempt` + `attemptScore` — the
//   response frozen at reveal, with its deterministic match score.
// - SELF-REPORT: `grade` is always `selfReported` — the learner marked it.
//   `aided` answers "was there observable unaided retrieval": false only
//   when a pre-reveal attempt was actually recorded; true when grading
//   followed a bare reveal; null when the record is too old to say.
export function projectReviewEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const key = entry.taskKey ?? entry.chunkKey;
  if (!key) return null;
  if (entry.kind === 'enroll') return null;
  const occurredAt = Number(entry.at ?? entry.reviewedAt ?? entry.submittedAt) || 0;
  const taskId = normalizeTaskKey(key);
  const parsed = parseTaskKey(taskId);
  if (!parsed) return null;
  const grade = Number(entry.grade);
  const attempt = typeof entry.attempt === 'string' ? entry.attempt
    : typeof entry.response === 'string' ? entry.response : undefined;
  const attempted = entry.attempted != null ? Boolean(entry.attempted)
    : attempt != null ? attempt.trim().length > 0 : null;
  const attemptScore = Number.isFinite(Number(entry.attemptScore))
    ? Number(entry.attemptScore)
    : null;
  const aided = entry.aided != null ? Boolean(entry.aided)
    : attempted === true ? false
    : attempted === false ? true
    : null;
  return {
    id: `rv:${String(entry.id ?? '')}`,
    sourceEventId: entry.id != null ? String(entry.id) : null,
    lessonId: parsed.lessonId,
    canDoId: canDoIdFor(parsed.lessonId),
    taskId,
    skillTargetId: skillTargetFor(parsed.taskKind),
    componentIds: [parsed.componentId],
    step: null,
    source: 'review',
    outcome: GRADE_OUTCOME[grade] || 'submitted',
    aided,
    attempted,
    attemptScore,
    revealed: entry.revealed != null ? Boolean(entry.revealed) : null,
    // The grade itself is always a self-report — never upgrade it to
    // observed ability. Observed ability is what `attempt`/`attemptScore`
    // carry; a wrong attempt graded "Easy" is exactly that on record.
    selfReported: true,
    confidence: null,
    occurredAt,
    contentVersion: Number(entry.contentVersion) || 0,
    grade,
    response: attempt
  };
}

export function projectAll(db, lessonsById) {
  const evidence = [];
  for (const event of Array.isArray(db?.lessonEvents) ? db.lessonEvents : []) {
    const lesson = lessonsById?.get ? lessonsById.get(String(event.lessonId)) : null;
    const projected = projectLessonEvent(event, lesson);
    if (projected) evidence.push(projected);
  }
  for (const entry of Array.isArray(db?.reviewLog) ? db.reviewLog : []) {
    const projected = projectReviewEntry(entry);
    if (projected) evidence.push(projected);
  }
  return evidence.sort((a, b) => a.occurredAt - b.occurredAt || String(a.id).localeCompare(String(b.id)));
}
