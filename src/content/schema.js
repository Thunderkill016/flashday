// Lesson schema for the A1 course. Every lesson file must pass validateLesson()
// in `npm test` — a lesson that drifts from the shape the runner expects is a
// build failure, not a runtime surprise for a learner.

export const LESSON_KINDS = Object.freeze(['lesson', 'checkpoint']);
export const LESSON_FORMATS = Object.freeze(['steps', 'mission']);
export const STEPS = Object.freeze(['prepare', 'read', 'listen', 'write', 'speak']);
// The mission runner (issue #33) is one guided flow, not five panes —
// its stage names are the durable `step` values on lesson events.
export const MISSION_STEPS = Object.freeze(['context', 'gist', 'notice', 'retrieve', 'interact', 'exit']);

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

// Mission lessons are deliberately small: one communicative mission,
// a handful of genuinely useful chunks, support that fades.
export const MISSION_BOUNDS = Object.freeze({
  chunks: { min: 3, max: 4 },
  contextLines: { min: 3, max: 5 },
  gist: { min: 1, max: 2 },
  interactTurns: { min: 2, max: 4 },
  exitTurns: { min: 1, max: 4 },
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

function checkChunks(errors, path, chunks, bounds) {
  if (!checkCount(errors, path, chunks, bounds)) return;
  const ids = new Set();
  chunks.forEach((chunk, i) => {
    const cp = `${path}[${i}]`;
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

// Mission format (issue #33): one communicative mission — context dialogue
// → gist check → notice phrases → guided retrieval → scaffolded interaction
// → unaided exit attempt. Small on purpose: 3–4 chunks, no school panes.
function validateMission(lesson, errors, p) {
  checkChunks(errors, `${p}.chunks`, lesson.chunks, MISSION_BOUNDS.chunks);
  const chunkIds = new Set((Array.isArray(lesson.chunks) ? lesson.chunks : []).map((c) => c?.id));

  const m = lesson.mission;
  if (!m || typeof m !== 'object') return fail(errors, `${p}.mission`, 'expected object');
  checkText(errors, `${p}.mission.title`, m.title);
  checkText(errors, `${p}.mission.scene`, m.scene, 10);
  if (checkCount(errors, `${p}.mission.lines`, m.lines, MISSION_BOUNDS.contextLines)) {
    m.lines.forEach((line, i) => {
      const lp = `${p}.mission.lines[${i}]`;
      if (!line || typeof line !== 'object') return fail(errors, lp, 'expected object');
      checkText(errors, `${lp}.speaker`, line.speaker);
      checkText(errors, `${lp}.en`, line.en);
      checkText(errors, `${lp}.vi`, line.vi);
    });
  }
  checkQuestions(errors, `${p}.mission.gist`, m.gist, MISSION_BOUNDS.gist);

  if (checkCount(errors, `${p}.mission.retrieval`, m.retrieval, { min: 1, max: 8 })) {
    // Every taught chunk needs exactly one recall cue — retrieval coverage
    // is the mission's memory contract, not an optional extra.
    if (chunkIds.size && m.retrieval.length !== chunkIds.size) {
      fail(errors, `${p}.mission.retrieval`, `expected one item per chunk (${chunkIds.size}), got ${m.retrieval.length}`);
    }
    const seen = new Set();
    m.retrieval.forEach((item, i) => {
      const rp = `${p}.mission.retrieval[${i}]`;
      if (!item || typeof item !== 'object') return fail(errors, rp, 'expected object');
      if (!chunkIds.has(item.chunkId)) fail(errors, `${rp}.chunkId`, 'unknown chunk');
      if (seen.has(item.chunkId)) fail(errors, `${rp}.chunkId`, 'duplicate');
      seen.add(item.chunkId);
      checkText(errors, `${rp}.cue`, item.cue);
      checkText(errors, `${rp}.answer`, item.answer);
    });
  }

  const inter = m.interact;
  if (!inter || typeof inter !== 'object') fail(errors, `${p}.mission.interact`, 'expected object');
  else {
    checkText(errors, `${p}.mission.interact.partner`, inter.partner);
    checkText(errors, `${p}.mission.interact.setup`, inter.setup);
    if (checkCount(errors, `${p}.mission.interact.turns`, inter.turns, MISSION_BOUNDS.interactTurns)) {
      inter.turns.forEach((turn, i) => {
        const tp = `${p}.mission.interact.turns[${i}]`;
        if (!turn || typeof turn !== 'object') return fail(errors, tp, 'expected object');
        checkText(errors, `${tp}.them`, turn.them);
        checkText(errors, `${tp}.themVi`, turn.themVi);
        checkText(errors, `${tp}.you`, turn.you);
      });
    }
  }

  const exit = m.exit;
  if (!exit || typeof exit !== 'object') return fail(errors, `${p}.mission.exit`, 'expected object');
  else {
    checkText(errors, `${p}.mission.exit.setup`, exit.setup);
    checkText(errors, `${p}.mission.exit.partner`, exit.partner);
    if (checkCount(errors, `${p}.mission.exit.turns`, exit.turns, MISSION_BOUNDS.exitTurns)) {
      exit.turns.forEach((turn, i) => {
        const tp = `${p}.mission.exit.turns[${i}]`;
        if (!turn || typeof turn !== 'object') return fail(errors, tp, 'expected object');
        checkText(errors, `${tp}.them`, turn.them);
        checkText(errors, `${tp}.themVi`, turn.themVi);
        checkText(errors, `${tp}.model`, turn.model);
        // produces = chunks the learner must actually say this turn —
        // production tasks mint only for these, never for the partner's lines.
        if (!Array.isArray(turn.produces) || !turn.produces.length) {
          fail(errors, `${tp}.produces`, 'expected ≥1 chunk id');
        } else {
          turn.produces.forEach((id, j) => {
            if (!chunkIds.has(id)) fail(errors, `${tp}.produces[${j}]`, 'unknown chunk');
          });
        }
        if (checkCount(errors, `${tp}.checks`, turn.checks, { min: 1, max: 4 })) {
          turn.checks.forEach((check, j) => {
            const cp = `${tp}.checks[${j}]`;
            if (!check || typeof check !== 'object') return fail(errors, cp, 'expected object');
            checkText(errors, `${cp}.key`, check.key);
            checkText(errors, `${cp}.label`, check.label);
            // Every check needs a targeted hint — feedback names the missed
            // goal without revealing the full model (issue #33 round 2).
            checkText(errors, `${cp}.hint`, check.hint);
            if (checkCount(errors, `${cp}.match`, check.match, { min: 1, max: 6 })) {
              check.match.forEach((pattern, k) => checkText(errors, `${cp}.match[${k}]`, pattern));
            }
          });
        }
      });
    }
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

  const format = lesson.format ?? 'steps';
  if (!LESSON_FORMATS.includes(format)) fail(errors, `${p}.format`, `expected ${LESSON_FORMATS.join('|')}`);
  if (format === 'mission') {
    validateMission(lesson, errors, p);
    return errors;
  }

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

  checkChunks(errors, `${p}.chunks`, lesson.chunks, BOUNDS.chunks);

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
