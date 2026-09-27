// Lesson schema for the A1 course. Every lesson file must pass validateLesson()
// in `npm test` — a lesson that drifts from the shape the runner expects is a
// build failure, not a runtime surprise for a learner.

export const LESSON_KINDS = Object.freeze(['lesson', 'checkpoint']);
export const STEPS = Object.freeze(['prepare', 'read', 'listen', 'write', 'speak']);

// Content bounds — chosen so one lesson stays inside 15–20 minutes for a
// beginner, not as storage limits.
export const BOUNDS = Object.freeze({
  chunks: { min: 6, max: 8 },
  drills: { min: 3, max: 5 },
  dialogueLines: { min: 6, max: 8 },
  readQuestions: { min: 3, max: 4 },
  listenQuestions: { min: 2, max: 3 },
  options: { min: 3, max: 4 },
  model: { min: 1, max: 3 },
  checklist: { min: 2, max: 4 },
});

const LESSON_ID = /^a1-s[1-6]-l[1-5]$/;
const CHUNK_ID = /^c[1-8]$/;

function fail(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function isText(value, min = 1) {
  return typeof value === 'string' && value.trim().length >= min;
}

function checkText(errors, path, value, min = 1) {
  if (!isText(value, min)) fail(errors, path, `expected non-empty string`);
}

function checkPair(errors, path, pair) {
  if (!Array.isArray(pair) || pair.length !== 2) return fail(errors, path, 'expected [en, vi]');
  checkText(errors, `${path}[0]`, pair[0]);
  checkText(errors, `${path}[1]`, pair[1]);
}

function checkCount(errors, path, list, { min, max }) {
  if (!Array.isArray(list)) return fail(errors, path, 'expected array'), false;
  if (list.length < min || list.length > max) fail(errors, path, `expected ${min}–${max} items, got ${list.length}`);
  return true;
}

function checkQuestion(errors, path, q) {
  if (!q || typeof q !== 'object') return fail(errors, path, 'expected object');
  checkText(errors, `${path}.q`, q.q);
  if (checkCount(errors, `${path}.options`, q.options, BOUNDS.options)) {
    q.options.forEach((option, i) => checkText(errors, `${path}.options[${i}]`, option));
    if (new Set(q.options).size !== q.options.length) fail(errors, `${path}.options`, 'duplicate options');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
      fail(errors, `${path}.answer`, `must index options (0–${q.options.length - 1})`);
    }
  }
  checkText(errors, `${path}.hint`, q.hint);
}

function checkQuestions(errors, path, list, bounds) {
  if (checkCount(errors, path, list, bounds)) list.forEach((q, i) => checkQuestion(errors, `${path}[${i}]`, q));
}

function checkTask(errors, path, task, { roles = false } = {}) {
  if (!task || typeof task !== 'object') return fail(errors, path, 'expected object');
  checkText(errors, `${path}.setup`, task.setup);
  checkText(errors, `${path}.prompt`, task.prompt);
  if (roles) {
    checkText(errors, `${path}.roleA`, task.roleA);
    checkText(errors, `${path}.roleB`, task.roleB);
  }
  if (checkCount(errors, `${path}.model`, task.model, BOUNDS.model)) {
    task.model.forEach((line, i) => checkText(errors, `${path}.model[${i}]`, line));
  }
  if (checkCount(errors, `${path}.checklist`, task.checklist, BOUNDS.checklist)) {
    task.checklist.forEach((line, i) => checkText(errors, `${path}.checklist[${i}]`, line));
  }
  if (task.gate != null) {
    if (task.gate.type !== 'time') fail(errors, `${path}.gate.type`, "only 'time' is supported");
    if (!/^\d{1,2}:\d{2}$/.test(String(task.gate.expected))) fail(errors, `${path}.gate.expected`, 'expected H:MM');
    if (typeof task.gate.strict !== 'boolean') fail(errors, `${path}.gate.strict`, 'expected boolean');
  }
}

export function validateLesson(lesson) {
  const errors = [];
  if (!lesson || typeof lesson !== 'object') return ['lesson: expected object'];
  const p = lesson.id || '?';

  if (!LESSON_ID.test(String(lesson.id))) fail(errors, `${p}.id`, 'expected a1-s{1-6}-l{1-5}');
  if (!Number.isInteger(lesson.stage) || lesson.stage < 1 || lesson.stage > 6) fail(errors, `${p}.stage`, 'expected 1–6');
  if (!Number.isInteger(lesson.order) || lesson.order < 1 || lesson.order > 5) fail(errors, `${p}.order`, 'expected 1–5');
  if (LESSON_ID.test(String(lesson.id))) {
    const [, s, l] = lesson.id.match(/s(\d)-l(\d)/);
    if (Number(s) !== lesson.stage || Number(l) !== lesson.order) fail(errors, `${p}.id`, 'stage/order must match id');
  }
  if (!LESSON_KINDS.includes(lesson.kind)) fail(errors, `${p}.kind`, `expected ${LESSON_KINDS.join('|')}`);
  if (lesson.kind === 'checkpoint' && lesson.order !== 5) fail(errors, `${p}.kind`, 'checkpoint must be lesson 5');
  if (!Number.isInteger(lesson.contentVersion) || lesson.contentVersion < 1) fail(errors, `${p}.contentVersion`, 'expected integer ≥1');
  checkText(errors, `${p}.title`, lesson.title);
  checkText(errors, `${p}.canDo`, lesson.canDo, 10);

  // pattern — checkpoints revisit, they do not introduce one
  if (lesson.kind === 'lesson') {
    const pat = lesson.pattern;
    if (!pat || typeof pat !== 'object') fail(errors, `${p}.pattern`, 'expected object');
    else {
      checkText(errors, `${p}.pattern.name`, pat.name);
      checkText(errors, `${p}.pattern.rule`, pat.rule);
      if (checkCount(errors, `${p}.pattern.examples`, pat.examples, { min: 2, max: 4 })) {
        pat.examples.forEach((pair, i) => checkPair(errors, `${p}.pattern.examples[${i}]`, pair));
      }
    }
  }

  if (checkCount(errors, `${p}.chunks`, lesson.chunks, BOUNDS.chunks)) {
    const ids = new Set();
    lesson.chunks.forEach((chunk, i) => {
      const cp = `${p}.chunks[${i}]`;
      if (!CHUNK_ID.test(String(chunk?.id))) fail(errors, `${cp}.id`, 'expected c1–c8');
      if (ids.has(chunk?.id)) fail(errors, `${cp}.id`, 'duplicate');
      ids.add(chunk?.id);
      checkText(errors, `${cp}.target`, chunk?.target);
      checkText(errors, `${cp}.meaning`, chunk?.meaning);
      checkText(errors, `${cp}.example`, chunk?.example);
      checkText(errors, `${cp}.exampleVi`, chunk?.exampleVi);
      if (isText(chunk?.example) && isText(chunk?.target)) {
        // The example must actually use the chunk. Targets may offer
        // alternatives ("His … / Her …") or leave slots ("I’m from …"): pass
        // when every word of at least one alternative appears in the example.
        const words = (s) => s.toLowerCase().replace(/…/g, ' ').replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
        const exampleWords = new Set(words(chunk.example));
        const alternatives = chunk.target.split(' / ').map(words).filter((list) => list.length);
        if (alternatives.length && !alternatives.some((list) => list.every((w) => exampleWords.has(w)))) {
          fail(errors, `${cp}.example`, 'example must contain the chunk');
        }
      }
    });
  }

  checkQuestions(errors, `${p}.drills`, lesson.drills, BOUNDS.drills);

  const d = lesson.dialogue;
  if (!d || typeof d !== 'object') fail(errors, `${p}.dialogue`, 'expected object');
  else {
    checkText(errors, `${p}.dialogue.title`, d.title);
    if (checkCount(errors, `${p}.dialogue.lines`, d.lines, BOUNDS.dialogueLines)) {
      d.lines.forEach((pair, i) => checkPair(errors, `${p}.dialogue.lines[${i}]`, pair));
    }
    checkQuestions(errors, `${p}.dialogue.questions`, d.questions, BOUNDS.readQuestions);
  }

  const li = lesson.listening;
  if (!li || typeof li !== 'object') fail(errors, `${p}.listening`, 'expected object');
  else {
    checkText(errors, `${p}.listening.text`, li.text, 20);
    checkText(errors, `${p}.listening.vi`, li.vi, 10);
    if (isText(li.text) && d?.lines && d.lines.some((pair) => pair[0] && li.text.includes(pair[0].replace(/^[^:]+:\s*/, '')))) {
      fail(errors, `${p}.listening.text`, 'listening must be new text, not a dialogue line');
    }
    checkQuestions(errors, `${p}.listening.questions`, li.questions, BOUNDS.listenQuestions);
  }

  checkTask(errors, `${p}.write`, lesson.write);
  checkTask(errors, `${p}.speak`, lesson.speak, { roles: true });

  return errors;
}

export function validateCourse(lessons) {
  const errors = [];
  if (!Array.isArray(lessons)) return ['course: expected array'];
  const seen = new Set();
  for (const lesson of lessons) {
    errors.push(...validateLesson(lesson));
    if (seen.has(lesson?.id)) errors.push(`${lesson.id}: duplicate lesson id`);
    seen.add(lesson?.id);
  }
  const bySlot = new Map(lessons.map((l) => [`${l.stage}-${l.order}`, l]));
  for (let s = 1; s <= 6; s++) {
    for (let o = 1; o <= 5; o++) {
      if (lessons.length >= 30 && !bySlot.has(`${s}-${o}`)) errors.push(`course: missing lesson s${s}-l${o}`);
    }
  }
  return errors;
}
