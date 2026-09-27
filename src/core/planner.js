/*
 * Deterministic planner (A1-ARCH-001): the ONLY place that decides "what
 * next". Pure — same (db, session, lessons, now) in, same action out. The
 * AI tutor can explain or drill, but it can never pick the next action.
 *
 * Policy order (ADR):
 *   1. resume  — in-flight draft with unsubmitted content
 *   2. review  — scheduled retrieval tasks due (spaced memory outranks new
 *      content; brand-new task introductions do NOT count — they are not
 *      overdue work, they ride the review queue opportunistically)
 *   3. remediate — the latest quiz attempt for some (lesson, step) is still
 *      a partial/failed outcome and nothing newer fixed it
 *   4. finish  — started lesson with steps still todo (course order)
 *   5. next    — first unstarted lesson in course order
 *   6. review  — curriculum exhausted but new tasks await introduction
 *   7. done
 */
import { STEPS, lessonStatus, stepsForLesson } from './progress.js';
import { dueTasks, reviewQueue } from './scheduler.js';

function courseOrder(lessons) {
  return [...(Array.isArray(lessons) ? lessons : [])].sort(
    (a, b) => (Number(a?.stage) || 0) - (Number(b?.stage) || 0) || (Number(a?.order) || 0) - (Number(b?.order) || 0)
  );
}

function draftHasContent(draft) {
  if (!draft) return false;
  if (Object.values(draft.guidedPreparation?.responses || {}).some((v) => String(v).trim())) return true;
  const answers = draft.answers && typeof draft.answers === 'object' ? draft.answers : {};
  if (Object.values(answers).some((step) => step && Object.keys(step).length > 0)) return true;
  if (Object.keys(draft.write || {}).length > 0) return true;
  if (Object.keys(draft.speak || {}).length > 0) return true;
  return false;
}

// Latest outcome per (lesson, step) over quiz events — a retry that fixes a
// weak step retires it as a remediation candidate.
function weakSteps(db) {
  const latest = new Map();
  const ordered = [...(Array.isArray(db?.lessonEvents) ? db.lessonEvents : [])]
    .filter((e) => ['drill', 'read', 'listen'].includes(e?.kind))
    .sort((a, b) => (Number(a.submittedAt) || 0) - (Number(b.submittedAt) || 0)
      || String(a.id || '').localeCompare(String(b.id || '')));
  for (const event of ordered) {
    const correct = Number(event?.payload?.correct);
    const total = Number(event?.payload?.total);
    if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) continue;
    latest.set(`${event.lessonId}:${event.step}`, {
      lessonId: String(event.lessonId),
      step: String(event.step),
      outcome: correct >= total ? 'success' : 'weak',
      at: Number(event.submittedAt) || 0
    });
  }
  return [...latest.values()]
    .filter((entry) => entry.outcome === 'weak')
    .sort((a, b) => b.at - a.at || a.lessonId.localeCompare(b.lessonId) || a.step.localeCompare(b.step));
}

export function planNext({ db, session, lessons, now = Date.now() }) {
  const ordered = courseOrder(lessons);
  const byId = new Map(ordered.map((lesson) => [String(lesson.id), lesson]));
  const events = Array.isArray(db?.lessonEvents) ? db.lessonEvents : [];

  // 1. resume — an in-flight draft with real content wins everything.
  const last = session?.getLast?.();
  const lastDraft = last?.lessonId ? session?.getDraft?.(last.lessonId) : null;
  const lastLesson = byId.get(String(last?.lessonId));
  const lastStatus = lastLesson ? lessonStatus(events, lastLesson) : null;
  const guidedFinished = lastLesson?.guided && stepsForLesson(lastLesson).every((step) => lastStatus[step] === 'attempted');
  if (lastLesson && !guidedFinished && draftHasContent(lastDraft)) {
    return {
      kind: 'resume',
      lessonId: String(last.lessonId),
      step: lastDraft.step || last.step || stepsForLesson(lastLesson)[0] || STEPS[0],
      reason: 'draft'
    };
  }

  // 2. review — SCHEDULED retrieval tasks that are due (already exercised
  // at least once). New-state cards are introductions, not overdue work —
  // they never hold the curriculum hostage.
  const due = dueTasks(db, now, ordered);
  if (due.length) {
    return {
      kind: 'review',
      lessonId: null,
      step: null,
      reason: 'due-tasks',
      dueCount: due.length,
      taskId: due[0].key,
      taskKind: due[0].parsed.taskKind
    };
  }

  // 3. remediate — most recent still-weak quiz step.
  const weak = weakSteps(db);
  if (weak.length) {
    return {
      kind: 'remediate',
      lessonId: weak[0].lessonId,
      step: weak[0].step,
      reason: 'weak-evidence'
    };
  }

  // 4. finish — a started lesson with steps still todo, in course order.
  for (const lesson of ordered) {
    const status = lessonStatus(events, lesson);
    if (status.anyAttempt) {
      const openStep = stepsForLesson(lesson).find((step) => status[step] === 'todo');
      if (openStep) {
        return { kind: 'finish', lessonId: String(lesson.id), step: openStep, reason: 'in-progress' };
      }
    }
  }

  // 5. next — first unstarted lesson in course order.
  for (const lesson of ordered) {
    if (!lessonStatus(events, lesson).anyAttempt) {
      return { kind: 'next', lessonId: String(lesson.id), step: stepsForLesson(lesson)[0], reason: 'unstarted' };
    }
  }

  // 6. review — curriculum exhausted; introduce pending new tasks.
  const queue = reviewQueue(db, ordered, now);
  if (queue.due.length || queue.freshPending) {
    return {
      kind: 'review',
      lessonId: null,
      step: null,
      reason: queue.due.length ? 'due-tasks' : 'new-tasks',
      dueCount: queue.due.length,
      newCount: queue.freshPending
    };
  }

  return { kind: 'done', lessonId: null, step: null, reason: 'all-attempted' };
}
