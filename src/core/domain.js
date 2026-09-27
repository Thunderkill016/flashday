/*
 * Learning-domain model v3 (A1-ARCH-001, docs/adr/learning-core-v3.md).
 * Pure module: adapts the existing lesson schema into explicit learning
 * targets — CanDoGoal → SkillTarget → KnowledgeComponent → RetrievalTask —
 * without rewriting the 30 lesson files.
 *
 * Honesty boundary: only task kinds the current UI can actually exercise are
 * enrolled. Pronunciation/prosody is NOT modelled — transcript matching is
 * not acoustic assessment (A1-SPEECH-001).
 */

// Closed registry — extend here, never inline in UI code.
export const SKILL_TARGETS = Object.freeze({
  'lexical.form_recognition': { id: 'lexical.form_recognition', modality: 'reception', label: 'Nhìn hiểu' },
  'lexical.meaning_recall': { id: 'lexical.meaning_recall', modality: 'recall', label: 'Nhớ nghĩa → nói' },
  'reception.reading': { id: 'reception.reading', modality: 'reception', label: 'Đọc hiểu' },
  'reception.listening': { id: 'reception.listening', modality: 'reception', label: 'Nghe hiểu' },
  'production.writing': { id: 'production.writing', modality: 'production', label: 'Viết' },
  'production.speaking': { id: 'production.speaking', modality: 'production', label: 'Nói' },
  'interaction.spoken': { id: 'interaction.spoken', modality: 'interaction', label: 'Hội thoại' }
});

// The four retrieval tasks a chunk can honestly carry in v1.
export const TASK_KINDS = Object.freeze([
  'form_recognition',
  'meaning_recall',
  'listening_recognition',
  'cued_production'
]);

export const TASK_KIND_LABELS = Object.freeze({
  form_recognition: 'Nhìn hiểu',
  meaning_recall: 'Nhớ từ',
  listening_recognition: 'Nghe hiểu',
  cued_production: 'Tự nói/viết'
});

const TASK_TO_SKILL = Object.freeze({
  form_recognition: 'lexical.form_recognition',
  meaning_recall: 'lexical.meaning_recall',
  listening_recognition: 'reception.listening',
  cued_production: 'production.writing'
});

export function skillTargetFor(taskKind) {
  return TASK_TO_SKILL[taskKind] || null;
}

// Which retrieval tasks a submitted step legitimately introduces. A task
// never enters the pool before its modality has been exercised (ADR —
// staged enrollment).
export const STEP_TASKS = Object.freeze({
  prepare: ['form_recognition', 'meaning_recall'],
  read: [],
  listen: ['listening_recognition'],
  write: ['cued_production'],
  speak: []
});

// Legacy reviewLog keys (`lesson:chunk`) were graded on a VI→EN recall card.
// 'meaning_recall' is the honest nearest task; other kinds start fresh.
export const LEGACY_TASK_KIND = 'meaning_recall';

const LESSON_ID = /^a1-s[1-6]-l[1-5]$/;
const CHUNK_ID = /^c[1-8]$/;
const TASK_ID = /^(.+):(.+):([a-z_]+)$/;

export function canDoIdFor(lessonId) {
  return `a1.cando.${String(lessonId)}`;
}

export function taskKey(lessonId, chunkId, taskKind) {
  return `${String(lessonId)}:${String(chunkId)}:${String(taskKind)}`;
}

export function componentKey(lessonId, chunkId) {
  return `${String(lessonId)}:${String(chunkId)}`;
}

// Parse a review key of either era: 2-segment legacy keys resolve to the
// legacy task kind; 3-segment keys parse directly. Returns null on junk.
export function parseTaskKey(key) {
  const match = String(key ?? '').match(TASK_ID);
  if (!match) return null;
  const [, lessonId, componentId, taskKind] = match;
  return { lessonId, chunkId: componentId, componentKey: componentKey(lessonId, componentId), taskKind };
}

export function normalizeTaskKey(key) {
  const text = String(key ?? '');
  if (TASK_ID.test(text)) return text;
  // 2-segment legacy `lesson:chunk` → its honest nearest task.
  const first = text.indexOf(':');
  if (first > 0 && first === text.lastIndexOf(':')) return `${text}:${LEGACY_TASK_KIND}`;
  return null;
}

function bad(lessonId, message) {
  throw new Error(`adaptLesson ${String(lessonId || '?')}: ${message}`);
}

// Adapt one lesson into domain objects. Fails loudly — a malformed lesson
// must not silently invent learning targets (issue requirement).
export function adaptLesson(lesson) {
  if (!lesson || typeof lesson !== 'object') bad(lesson?.id, 'expected lesson object');
  if (!LESSON_ID.test(String(lesson.id))) bad(lesson.id, 'id must match a1-s{1-6}-l{1-5}');
  if (typeof lesson.canDo !== 'string' || lesson.canDo.trim().length < 10) {
    bad(lesson.id, 'canDo must be a non-empty descriptor');
  }
  if (!Array.isArray(lesson.chunks) || !lesson.chunks.length) bad(lesson.id, 'chunks missing');
  const seen = new Set();
  const components = lesson.chunks.map((chunk) => {
    if (!CHUNK_ID.test(String(chunk?.id))) bad(lesson.id, `chunk id "${chunk?.id}" must match c1–c8`);
    if (seen.has(chunk.id)) bad(lesson.id, `duplicate chunk id ${chunk.id}`);
    seen.add(chunk.id);
    if (typeof chunk.target !== 'string' || !chunk.target.trim()) bad(lesson.id, `chunk ${chunk.id} missing target`);
    if (typeof chunk.meaning !== 'string' || !chunk.meaning.trim()) bad(lesson.id, `chunk ${chunk.id} missing meaning`);
    return {
      id: componentKey(lesson.id, chunk.id),
      lessonId: String(lesson.id),
      chunkId: String(chunk.id),
      kind: 'lexical_chunk',
      chunk
    };
  });
  const tasks = [];
  for (const component of components) {
    for (const taskKind of TASK_KINDS) {
      tasks.push({
        id: taskKey(lesson.id, component.chunkId, taskKind),
        componentId: component.id,
        lessonId: String(lesson.id),
        taskKind,
        skillTargetId: skillTargetFor(taskKind),
        canDoId: canDoIdFor(lesson.id)
      });
    }
  }
  return {
    canDo: {
      id: canDoIdFor(lesson.id),
      level: 'A1',
      descriptor: lesson.canDo.trim(),
      lessonId: String(lesson.id)
    },
    components,
    tasks
  };
}

export function adaptCourse(lessons) {
  const goals = [];
  const components = new Map();
  const tasks = new Map();
  for (const lesson of Array.isArray(lessons) ? lessons : []) {
    const adapted = adaptLesson(lesson);
    goals.push(adapted.canDo);
    for (const c of adapted.components) {
      if (components.has(c.id)) throw new Error(`adaptCourse: duplicate component ${c.id}`);
      components.set(c.id, c);
    }
    for (const t of adapted.tasks) {
      if (tasks.has(t.id)) throw new Error(`adaptCourse: duplicate task ${t.id}`);
      tasks.set(t.id, t);
    }
  }
  return { goals, components, tasks };
}
