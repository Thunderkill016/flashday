/*
 * LearnerState (A1-ARCH-001): derived, rebuildable — same durable logs in,
 * same state out, on any device. No hand-mutated "mastery" exists anywhere.
 *
 * Per retrieval task it reports only observable things: FSRS schedule card,
 * attempt counts, last outcome/grade, whether the last attempt was aided
 * (null when the durable record cannot say), and due-ness. Rating one task
 * can never move another task's schedule — they are separate FSRS cards by
 * construction. A task whose phrase was edited since the memory formed is
 * `superseded`: kept, counted, never presented as if it were today's text.
 */
import { State, deserializeCard } from './fsrs.mjs';
import {
  contentRev,
  normalizeTaskKey,
  parseTaskKey,
  skillTargetFor
} from './domain.js';
import { projectAll } from './evidence-projection.js';

function lessonsIndex(lessons) {
  const map = new Map();
  for (const lesson of Array.isArray(lessons) ? lessons : []) map.set(String(lesson?.id), lesson);
  return map;
}

// Live revision of the chunk a task addresses — null when the lesson/chunk
// no longer resolves (content removed entirely).
function liveRevFor(lessonsById, lessonId, chunkId) {
  const chunk = lessonsById.get(String(lessonId))?.chunks?.find((c) => String(c.id) === String(chunkId));
  return chunk ? contentRev(chunk) : null;
}

export function deriveLearnerState(db, lessons, now = Date.now()) {
  const byId = lessonsIndex(lessons);
  const evidence = projectAll(db, byId);
  const nowMs = Number(now);

  const tasks = {};
  const fsrsMap = db?.fsrs && typeof db.fsrs === 'object' ? db.fsrs : {};
  for (const [rawKey, rawCard] of Object.entries(fsrsMap)) {
    const key = normalizeTaskKey(rawKey);
    const parsed = parseTaskKey(key);
    const card = deserializeCard(rawCard);
    if (!parsed || !card) continue;
    const dueAt = new Date(card.due).getTime();
    const liveRev = liveRevFor(byId, parsed.lessonId, parsed.chunkId);
    tasks[key] = {
      taskId: key,
      lessonId: parsed.lessonId,
      chunkId: parsed.chunkId,
      componentId: parsed.componentId,
      componentKey: parsed.componentKey,
      taskKind: parsed.taskKind,
      skillTargetId: skillTargetFor(parsed.taskKind),
      card,
      attempts: 0,
      lastOutcome: null,
      lastGrade: null,
      lastAided: null,
      lastResponse: null,
      lastAttemptScore: null,
      lastAt: null,
      superseded: parsed.rev != null && parsed.rev !== liveRev,
      // rev-less keys parked by normalizeTaskKey (multi-revision slot or no
      // ledger): the record cannot prove which phrase it exercised.
      ambiguous: parsed.rev == null,
      isNew: Number(card.state ?? State.New) === State.New && Number(card.reps || 0) === 0,
      isDue: dueAt <= nowMs,
      dueAt
    };
  }

  // Task-level evidence folds into its own slot only — a listening grade can
  // never surface as meaning_recall state, and vice versa.
  for (const ev of evidence) {
    if (!ev.taskId) continue;
    const parsed = parseTaskKey(ev.taskId);
    const slot = tasks[ev.taskId] || (tasks[ev.taskId] = {
      taskId: ev.taskId,
      lessonId: ev.lessonId,
      chunkId: parsed?.chunkId ?? null,
      componentId: ev.componentIds?.[0] ?? null,
      componentKey: parsed?.componentKey ?? null,
      taskKind: parsed?.taskKind ?? null,
      skillTargetId: ev.skillTargetId,
      card: null,
      attempts: 0,
      lastOutcome: null,
      lastGrade: null,
      lastAided: null,
      lastResponse: null,
      lastAttemptScore: null,
      lastAt: null,
      superseded: false,
      ambiguous: parsed?.rev == null,
      isNew: true,
      isDue: false,
      dueAt: null
    });
    slot.attempts += 1;
    if (slot.lastAt == null || ev.occurredAt >= slot.lastAt) {
      slot.lastAt = ev.occurredAt;
      slot.lastOutcome = ev.outcome;
      slot.lastGrade = ev.grade ?? null;
      slot.lastAided = ev.aided ?? null;
      slot.lastResponse = ev.response ?? null;
      slot.lastAttemptScore = ev.attemptScore ?? null;
    }
  }

  return { evidence, tasks, generatedAt: nowMs };
}

// Lesson-level evidence rolled up per lesson — for weak-step detection the
// planner needs "latest quiz outcome per (lesson, step)", nothing more.
export function latestStepOutcome(db, lessons) {
  const byId = lessonsIndex(lessons);
  const latest = new Map(); // `${lessonId}:${step}` → evidence
  for (const event of Array.isArray(db?.lessonEvents) ? db.lessonEvents : []) {
    if (!['drill', 'read', 'listen'].includes(event?.kind)) continue;
    const projected = projectLessonEventForPlanner(event, byId.get(String(event.lessonId)));
    if (!projected) continue;
    const key = `${event.lessonId}:${event.step}`;
    const prev = latest.get(key);
    if (!prev || Number(event.submittedAt) >= prev.submittedAt) {
      latest.set(key, { ...projected, submittedAt: Number(event.submittedAt) || 0, step: event.step });
    }
  }
  return latest;
}

function projectLessonEventForPlanner(event) {
  const correct = Number(event?.payload?.correct);
  const total = Number(event?.payload?.total);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;
  const outcome = correct >= total ? 'success' : correct <= 0 ? 'failed' : 'partial';
  return { lessonId: String(event.lessonId), outcome };
}
