/*
 * Pure progress labelling. Every label is activity-only — "attempted",
 * "started" — never "đạt A1" (rule 3: counters don't prove proficiency).
 */
import { STEPS, MISSION_STEPS } from '../content/schema.js';

export { STEPS, MISSION_STEPS };

const STEP_KIND = { prepare: 'drill', read: 'read', listen: 'listen', write: 'write', speak: 'speak' };

// Display names shared by today/path/summary — mission stages are the
// durable `step` values on mission-lesson events (issue #33).
export const STEP_LABELS = Object.freeze({
  prepare: 'Hiểu mẫu',
  read: 'Đọc',
  listen: 'Nghe',
  write: 'Viết',
  speak: 'Nói',
  context: 'Xem tình huống',
  gist: 'Hiểu ý',
  notice: 'Học cụm từ',
  retrieve: 'Nhớ lại',
  interact: 'Hội thoại',
  exit: 'Tự làm'
});

// Checkpoints skip the prepare step — their offered steps start at read.
// Mission-format lessons (issue #33) offer their stage sequence instead of
// the five school panes.
export function stepsForLesson(lesson) {
  if (lesson?.format === 'mission') return MISSION_STEPS;
  return lesson?.kind === 'checkpoint' ? STEPS.slice(1) : STEPS;
}

export function lessonStatus(events, lesson) {
  const relevant = (Array.isArray(events) ? events : []).filter(
    (event) => String(event?.lessonId) === String(lesson?.id)
  );
  const status = { anyAttempt: relevant.length > 0 };
  // Only steps the lesson offers get a status — a checkpoint's 'prepare'
  // would otherwise sit at 'todo' forever and look permanently unfinished.
  for (const step of stepsForLesson(lesson)) {
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
    if (stepsForLesson(lesson).every((step) => status[step] === 'attempted')) attemptedAll += 1;
  }
  return { total: stageLessons.length, started, attemptedAll };
}

function draftHasContent(draft) {
  if (!draft) return false;
  const answers = draft.answers && typeof draft.answers === 'object' ? draft.answers : {};
  if (Object.values(answers).some((step) => step && Object.keys(step).length > 0)) return true;
  if (Object.keys(draft.write || {}).length > 0) return true;
  if (Object.keys(draft.speak || {}).length > 0) return true;
  // Mission-format drafts keep in-flight stage work under `mission`.
  if (draft.mission && typeof draft.mission === 'object' && Object.keys(draft.mission).length > 0) return true;
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
      const openStep = stepsForLesson(lesson).find((step) => status[step] === 'todo');
      if (openStep) {
        return { kind: 'finish', lessonId: String(lesson.id), step: openStep, reason: 'in-progress' };
      }
    }
  }

  // 3. Next: the first lesson with no attempts, in course order.
  for (const lesson of ordered) {
    if (!lessonStatus(events, lesson).anyAttempt) {
      return { kind: 'next', lessonId: String(lesson.id), step: stepsForLesson(lesson)[0], reason: 'unstarted' };
    }
  }

  return { kind: 'done', lessonId: null, step: null, reason: 'all-attempted' };
}

// Learning streak: consecutive local-calendar days with ≥1 submitted event
// (lesson event or review log), ending today — or ending yesterday if today
// hasn't produced one yet (the streak is still alive until tomorrow).
// Activity data only; no claim about proficiency.
export function computeStreak(db, now = Date.now()) {
  const days = new Set();
  const stamp = (ts) => {
    const d = new Date(Number(ts));
    return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  for (const e of db?.lessonEvents || []) {
    const s = stamp(e.submittedAt);
    if (s) days.add(s);
  }
  for (const r of db?.reviewLog || []) {
    const s = stamp(r.reviewedAt ?? r.submittedAt ?? r.at);
    if (s) days.add(s);
  }
  const dayKey = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  let start = 0;
  if (!days.has(dayKey(0))) {
    if (!days.has(dayKey(1))) return 0;
    start = 1;
  }
  let streak = 0;
  for (let i = start; days.has(dayKey(i)); i++) streak++;
  return streak;
}
