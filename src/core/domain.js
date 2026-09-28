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
// staged enrollment). Five-pane steps use this static map; the mission
// runner (issue #33) instead computes a per-chunk enrollment plan from
// what the attempt actually exercised — heard lines, attempted recalls,
// produced turns — see src/ui/views/mission.js recordStage.
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

// fnv1a-32 over the normalized retrieval artifact: the target↔meaning
// pair IS the semantic identity. Same form + same meaning → same rev →
// history carries over; a change to either (a new phrase, or the same form
// taught with a different sense) mints a new component — old FSRS state
// can never silently transfer to different semantics.
// Keep in sync with scripts/gen-content-revisions.mjs.
export function contentRev(chunk) {
  const t = String(chunk?.target ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const m = String(chunk?.meaning ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const s = `${t}\u0001${m}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.codePointAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// The revision a rev-less durable record can honestly claim. A ledger with
// exactly ONE segment is unambiguous: only one phrase ever lived at that
// slot, so any record naming the slot refers to it. A multi-segment ledger
// means the phrase changed — a rev-less record cannot prove which phrase
// the learner actually saw (commit time ≠ deploy time ≠ seen time), so it
// resolves to null and the caller PARKS the record instead of guessing.
// Unknown chunks (no ledger) → null as well.
export function unambiguousRev(lessonId, chunkId) {
  const segments = CHUNK_REVISION_HISTORY[String(lessonId)]?.[String(chunkId)];
  return Array.isArray(segments) && segments.length === 1 ? segments[0].rev : null;
}

// Number of known revisions for a chunk slot — >1 marks the slot
// ambiguous for rev-less records.
export function revisionCount(lessonId, chunkId) {
  return CHUNK_REVISION_HISTORY[String(lessonId)]?.[String(chunkId)]?.length ?? 0;
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

// Canonicalize any key shape. Rev-bearing keys pass through verbatim — the
// rev IS the phrase identity, so no timestamp is needed or trusted.
// Rev-less keys resolve ONLY through `unambiguousRev`: a single-revision
// ledger proves the slot always held the same phrase. When the slot saw
// multiple phrases (or none are recorded) the key stays rev-less — the
// parked form that downstream code counts as `ambiguous` and never
// presents. Pure and timestamp-free: same key → same result, always.
export function normalizeTaskKey(key) {
  const text = String(key ?? '');
  const parsed = parseTaskKey(text);
  if (parsed) {
    if (parsed.rev) return text;
    const rev = unambiguousRev(parsed.lessonId, parsed.chunkId);
    return rev ? taskKey(parsed.lessonId, parsed.chunkId, parsed.taskKind, rev) : text;
  }
  // 2-segment legacy `lesson:chunk` → its honest nearest task.
  const first = text.indexOf(':');
  if (first > 0 && first === text.lastIndexOf(':')) {
    const lessonId = text.slice(0, first);
    const chunkId = text.slice(first + 1);
    return taskKey(lessonId, chunkId, LEGACY_TASK_KIND, unambiguousRev(lessonId, chunkId));
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
    const rev = contentRev(chunk);
    return {
      id: componentId(lesson.id, chunk.id, rev),
      lessonId: String(lesson.id),
      chunkId: String(chunk.id),
      rev,
      superseded: false,
      ambiguous: false,
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
          ambiguous: false,
          kind: 'lexical_chunk',
          chunk: null
        });
      }
      // A slot that ever held more than one phrase gets a bare
      // `lesson:chunk` component: the referent for rev-less durable records
      // whose true phrase cannot be proven. `ambiguous: true` — resolvable
      // in the registry, never schedulable, never renderable.
      if (segments.length > 1) {
        const slotId = componentKey(lessonId, chunkId);
        if (!components.has(slotId)) {
          components.set(slotId, {
            id: slotId,
            lessonId,
            chunkId,
            rev: null,
            superseded: false,
            ambiguous: true,
            kind: 'lexical_chunk',
            chunk: null
          });
        }
      }
    }
  }
  return { goals, components, tasks };
}
