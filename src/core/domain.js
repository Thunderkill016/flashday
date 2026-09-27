/*
 * Learning-domain model v3 (A1-ARCH-001, docs/adr/learning-core-v3.md).
 * Pure module: adapts the existing lesson schema into explicit learning
 * targets — CanDoGoal → SkillTarget → KnowledgeComponent → RetrievalTask —
 * without rewriting the 30 lesson files.
 *
 * Identity is revision-aware: a KnowledgeComponent is
 * `${lessonId}:${chunkId}@${rev}` where `rev` is a fingerprint of the
 * chunk's retrieval artifact (its target text). Changing the text mints a
 * new component — old FSRS state can never silently transfer to a different
 * phrase. Legacy rev-less keys resolve through CHUNK_REVISION_HISTORY, the
 * frozen ledger of pre-fingerprint-era texts (src/content/revisions.js).
 *
 * Honesty boundary: only task kinds the current UI can actually exercise are
 * enrolled. Pronunciation/prosody is NOT modelled — transcript matching is
 * not acoustic assessment (A1-SPEECH-001).
 */
import { CHUNK_REVISION_HISTORY } from '../content/revisions.js';

// Closed registry — extend here, never inline in UI code.
export const SKILL_TARGETS = Object.freeze({
  'lexical.form_recognition': { id: 'lexical.form_recognition', modality: 'reception', label: 'Nhìn hiểu' },
  'lexical.meaning_recall': { id: 'lexical.meaning_recall', modality: 'recall', label: 'Nhớ cụm từ' },
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

// Badge labels name the observable ability only — a writing task must not
// imply speaking evidence.
export const TASK_KIND_LABELS = Object.freeze({
  form_recognition: 'Nhìn hiểu',
  meaning_recall: 'Nhớ cụm từ',
  listening_recognition: 'Nghe hiểu',
  cued_production: 'Viết lại'
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
// `${lessonId}:${chunkId}[@${rev}]:${taskKind}` — rev optional so keys from
// before revision-aware identity still parse.
const TASK_ID = /^([^:]+):([^:@:]+)(?:@([0-9a-f]{8}))?:([a-z_]+)$/;

/* ── content revisions ───────────────────────────────────────────────── */

// fnv1a-32 over the normalized retrieval artifact (the target text). The
// artifact IS the identity: same text → same rev → history carries over;
// different text → different rev → a new component, old state parked.
// Keep in sync with scripts/gen-content-revisions.mjs.
export function contentRev(text) {
  const s = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.codePointAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Which revision of a chunk was live at `atMs`, per the frozen ledger.
// Missing timestamp → latest known rev; timestamp before the first known
// segment → earliest rev (data can't predate the content's first text).
// Unknown chunk (not in the ledger) → null; callers keep the key rev-less.
export function revAt(lessonId, chunkId, atMs) {
  const segments = CHUNK_REVISION_HISTORY[String(lessonId)]?.[String(chunkId)];
  if (!Array.isArray(segments) || !segments.length) return null;
  const at = Number(atMs);
  if (!Number.isFinite(at)) return segments[segments.length - 1].rev;
  let rev = segments[0].rev;
  for (const seg of segments) {
    if (Number(seg.since) <= at) rev = seg.rev;
  }
  return rev;
}

/* ── ids ─────────────────────────────────────────────────────────────── */

export function canDoIdFor(lessonId) {
  return `a1.cando.${String(lessonId)}`;
}

// Bare component ref kept for durable fields that predate revisions
// (enroll entries' chunkKey) — display/grouping only, never a task id.
export function componentKey(lessonId, chunkId) {
  return `${String(lessonId)}:${String(chunkId)}`;
}

export function componentId(lessonId, chunkId, rev) {
  return rev ? `${componentKey(lessonId, chunkId)}@${rev}` : componentKey(lessonId, chunkId);
}

// Task identity embeds the component revision: `${l}:${c}@${rev}:${kind}`.
export function taskKey(lessonId, chunkId, taskKind, rev) {
  return `${componentId(lessonId, chunkId, rev)}:${String(taskKind)}`;
}

// Parse a review key of any era: `l:c@rev:kind` → full identity; `l:c:kind`
// → rev-less (pre-revision or unmanifested content); `l:c` → legacy chunk
// card (no task kind). Returns null on junk.
export function parseTaskKey(key) {
  const match = String(key ?? '').match(TASK_ID);
  if (!match) return null;
  const [, lessonId, chunkId, rev, taskKind] = match;
  return {
    lessonId,
    chunkId,
    rev: rev || null,
    componentKey: componentKey(lessonId, chunkId),
    componentId: componentId(lessonId, chunkId, rev || null),
    taskKind
  };
}

// Canonicalize any key shape to `l:c@rev:kind`. Rev-less keys resolve `rev`
// through the ledger at `atMs` — a legacy `l:c7` rated before the lesson-1
// rewrite lands on the OLD phrase's rev, never on the new text. Unknown
// chunks keep the rev-less form (no ledger to resolve through).
export function normalizeTaskKey(key, atMs) {
  const text = String(key ?? '');
  const parsed = parseTaskKey(text);
  if (parsed) {
    if (parsed.rev) return text;
    const rev = revAt(parsed.lessonId, parsed.chunkId, atMs);
    return rev ? taskKey(parsed.lessonId, parsed.chunkId, parsed.taskKind, rev) : text;
  }
  // 2-segment legacy `lesson:chunk` → its honest nearest task.
  const first = text.indexOf(':');
  if (first > 0 && first === text.lastIndexOf(':')) {
    const lessonId = text.slice(0, first);
    const chunkId = text.slice(first + 1);
    const rev = revAt(lessonId, chunkId, atMs);
    return taskKey(lessonId, chunkId, LEGACY_TASK_KIND, rev);
  }
  return null;
}

function bad(lessonId, message) {
  throw new Error(`adaptLesson ${String(lessonId || '?')}: ${message}`);
}

/* ── adaptation ──────────────────────────────────────────────────────── */

// Adapt one lesson into domain objects. Fails loudly — a malformed lesson
// must not silently invent learning targets (issue requirement). Every
// component carries its content revision; tasks are derived from it.
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
    const rev = contentRev(chunk.target);
    return {
      id: componentId(lesson.id, chunk.id, rev),
      lessonId: String(lesson.id),
      chunkId: String(chunk.id),
      rev,
      superseded: false,
      kind: 'lexical_chunk',
      chunk
    };
  });
  const tasks = [];
  for (const component of components) {
    for (const taskKind of TASK_KINDS) {
      tasks.push({
        id: `${component.id}:${taskKind}`,
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

// Course-wide registry: live components PLUS every historical revision the
// ledger knows — superseded revisions stay resolvable so old evidence and
// parked cards still point at a real (retired) component.
export function adaptCourse(lessons) {
  const goals = [];
  const components = new Map();
  const tasks = new Map();
  const liveRev = new Map(); // componentKey → rev
  for (const lesson of Array.isArray(lessons) ? lessons : []) {
    const adapted = adaptLesson(lesson);
    goals.push(adapted.canDo);
    for (const c of adapted.components) {
      if (components.has(c.id)) throw new Error(`adaptCourse: duplicate component ${c.id}`);
      components.set(c.id, c);
      liveRev.set(`${c.lessonId}:${c.chunkId}`, c.rev);
    }
    for (const t of adapted.tasks) {
      if (tasks.has(t.id)) throw new Error(`adaptCourse: duplicate task ${t.id}`);
      tasks.set(t.id, t);
    }
  }
  for (const [lessonId, chunks] of Object.entries(CHUNK_REVISION_HISTORY)) {
    for (const [chunkId, segments] of Object.entries(chunks)) {
      for (const { rev } of segments) {
        if (liveRev.get(`${lessonId}:${chunkId}`) === rev) continue;
        const id = componentId(lessonId, chunkId, rev);
        if (components.has(id)) continue;
        components.set(id, {
          id,
          lessonId,
          chunkId,
          rev,
          superseded: true,
          kind: 'lexical_chunk',
          chunk: null
        });
      }
    }
  }
  return { goals, components, tasks };
}
