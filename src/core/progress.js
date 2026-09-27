/*
 * Pure progress labelling. Every label is activity-only — "attempted",
 * "started" — never "đạt A1" (rule 3: counters don't prove proficiency).
 */
import { STEPS } from '../content/schema.js';

export { STEPS };

const STEP_KIND = { prepare: 'drill', read: 'read', listen: 'listen', write: 'write', speak: 'speak' };

export function lessonStatus(events, lesson) {
  const relevant = (Array.isArray(events) ? events : []).filter(
    (event) => String(event?.lessonId) === String(lesson?.id)
  );
  const status = { anyAttempt: relevant.length > 0 };
  for (const step of STEPS) {
    status[step] = relevant.some(
      (event) => event.step === step || event.kind === STEP_KIND[step]
    ) ? 'attempted' : 'todo';
  }
  return status;
}

export function stageStatus(events, stage, lessons) {
  const stageLessons = (Array.isArray(lessons) ? lessons : []).filter(
    (lesson) => Number(lesson?.stage) === Number(stage)
  );
  let started = 0;
  let attemptedAll = 0;
  for (const lesson of stageLessons) {
    const status = lessonStatus(events, lesson);
    if (status.anyAttempt) started += 1;
    if (STEPS.every((step) => status[step] === 'attempted')) attemptedAll += 1;
  }
  return { total: stageLessons.length, started, attemptedAll };
}

function draftHasContent(draft) {
  if (!draft) return false;
  const answers = draft.answers && typeof draft.answers === 'object' ? draft.answers : {};
  if (Object.values(answers).some((step) => step && Object.keys(step).length > 0)) return true;
  if (Object.keys(draft.write || {}).length > 0) return true;
  if (Object.keys(draft.speak || {}).length > 0) return true;
  return false;
}

export function suggestNext({ events, session, lessons }) {
  const ordered = [...(Array.isArray(lessons) ? lessons : [])].sort(
    (a, b) => (Number(a?.stage) || 0) - (Number(b?.stage) || 0) || (Number(a?.order) || 0) - (Number(b?.order) || 0)
  );
  const byId = new Map(ordered.map((lesson) => [String(lesson.id), lesson]));

  // 1. Resume: an in-flight draft with unsubmitted content wins everything.
  const last = session?.getLast?.();
  const lastDraft = last?.lessonId ? session?.getDraft?.(last.lessonId) : null;
  if (last?.lessonId && byId.has(String(last.lessonId)) && draftHasContent(lastDraft)) {
    return {
      kind: 'resume',
      lessonId: String(last.lessonId),
      step: lastDraft.step || last.step || STEPS[0],
      reason: 'draft'
    };
  }

  // 2. Finish: a lesson started but with steps still to do.
  for (const lesson of ordered) {
    const status = lessonStatus(events, lesson);
    if (status.anyAttempt) {
      const openStep = STEPS.find((step) => status[step] === 'todo');
      if (openStep) {
        return { kind: 'finish', lessonId: String(lesson.id), step: openStep, reason: 'in-progress' };
      }
    }
  }

  // 3. Next: the first lesson with no attempts, in course order.
  for (const lesson of ordered) {
    if (!lessonStatus(events, lesson).anyAttempt) {
      return { kind: 'next', lessonId: String(lesson.id), step: STEPS[0], reason: 'unstarted' };
    }
  }

  return { kind: 'done', lessonId: null, step: null, reason: 'all-attempted' };
}
