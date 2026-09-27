/*
 * LearnerState (A1-ARCH-001): derived, rebuildable — same durable logs in,
 * same state out, on any device. No hand-mutated "mastery" exists anywhere.
 *
 * Per retrieval task it reports only observable things: FSRS schedule card,
 * attempt counts, last outcome/grade, whether the last attempt was aided,
 * and due-ness. Rating one task can never move another task's schedule —
 * they are separate FSRS cards by construction.
 */
import { State, deserializeCard } from './fsrs.mjs';
import { normalizeTaskKey, parseTaskKey, skillTargetFor } from './domain.js';
import { projectAll } from './evidence-projection.js';

function lessonsIndex(lessons) {
  const map = new Map();
  for (const lesson of Array.isArray(lessons) ? lessons : []) map.set(String(lesson?.id), lesson);
  return map;
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
    tasks[key] = {
      taskId: key,
      lessonId: parsed.lessonId,
      chunkId: parsed.chunkId,
      componentKey: parsed.componentKey,
      taskKind: parsed.taskKind,
      skillTargetId: skillTargetFor(parsed.taskKind),
      card,
      attempts: 0,
      lastOutcome: null,
      lastGrade: null,
      lastAided: false,
      lastResponse: null,
      lastAt: null,
      isNew: Number(card.state ?? State.New) === State.New && Number(card.reps || 0) === 0,
      isDue: dueAt <= nowMs,
      dueAt
    };
  }

  // Task-level evidence folds into its own slot only — a listening grade can
  // never surface as meaning_recall state, and vice versa.
  for (const ev of evidence) {
    if (!ev.taskId) continue;
    const slot = tasks[ev.taskId] || (tasks[ev.taskId] = {
      taskId: ev.taskId,
      lessonId: ev.lessonId,
      chunkId: ev.componentIds?.[0] ?? null,
      componentKey: ev.componentIds?.[0] != null ? `${ev.lessonId}:${ev.componentIds[0]}` : null,
      taskKind: parseTaskKey(ev.taskId)?.taskKind ?? null,
      skillTargetId: ev.skillTargetId,
      card: null,
      attempts: 0,
      lastOutcome: null,
      lastGrade: null,
      lastAided: false,
      lastResponse: null,
      lastAt: null,
      isNew: true,
      isDue: false,
      dueAt: null
    });
    slot.attempts += 1;
    if (slot.lastAt == null || ev.occurredAt >= slot.lastAt) {
      slot.lastAt = ev.occurredAt;
      slot.lastOutcome = ev.outcome;
      slot.lastGrade = ev.grade ?? null;
      slot.lastAided = Boolean(ev.aided);
      slot.lastResponse = ev.response ?? null;
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
