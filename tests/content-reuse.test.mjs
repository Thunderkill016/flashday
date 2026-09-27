// Checkpoint reuse contract (REBUILD_A1.md §3; audit: docs/level-audit-a1.md).
// A checkpoint must not assess language the learner has not met in the stage's
// four teaching lessons. This test fails when a checkpoint chunk target or a
// drill's correct option introduces a content word never seen in l1–l4.
import assert from 'node:assert/strict';
import { LESSONS, lessonsForStage } from '../src/content/a1/index.js';

// Function words excluded from the novelty check — particles are recombinable.
const STOPWORDS = new Set(
  `a an the and or of to in on at for with from by about is are am was were be been
   do does did done have has had having i you he she it we they me him her us them
   my your his its our their mine yours this that these those what where when how
   who which whose any some no not yes one two three s t m ll re ve d don can can
   could will would shall should must if so too very all each every there here up
   out off over under again than then just also only but because before after into
   like as get go let make take please thanks thank sorry excuse nice ok okay hi
   hello hey oh mr mrs miss dr yeah wow great good sure well right left`
    .split(/\s+/),
);

// Content words a checkpoint may legitimately introduce because they appear in
// the checkpoint's own dialogue/listening BEFORE assessment (self-teaching via
// context) or are trivial compositions. Every entry needs a justification.
const ALLOWED_NOVEL = new Map([
  // "children" — derived on the spot from taught "son" + "daughter"; the drill
  // hint itself teaches the mapping, so it assesses inference, not memory.
  ['a1-s1-l5', new Set(['children'])],
  // "Take care of yourself" — a fixed farewell glossed by the chunk meaning and
  // spoken by the manager in the checkpoint dialogue before the speak step.
  ['a1-s5-l5', new Set(['care', 'yourself'])],
]);

function tokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .match(/[a-z']+/g) || [];
}

// Rough morphology for A1 vocab: produce the base candidates a word could
// share with an inflected relative (live/lives, going/go, studied/study).
function stemForms(word) {
  const w = word.replace(/^'+|'+$/g, '');
  if (w.length < 3) return [w];
  const forms = new Set([w]);
  for (const suffix of ["'s", 'ing', 'ies', 'ed', 'es', 's']) {
    if (w.endsWith(suffix)) {
      const base = suffix === 'ies' ? `${w.slice(0, -3)}y` : w.slice(0, -suffix.length);
      if (base.length >= 3) {
        forms.add(base);
        forms.add(`${base}e`); // lives→live, comes→come
      }
    }
  }
  return [...forms];
}

function* englishStrings(value) {
  if (typeof value === 'string') yield value;
  else if (Array.isArray(value)) for (const item of value) yield* englishStrings(item);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) yield* englishStrings(v);
}

function stageCorpus(lessons) {
  const stems = new Set();
  for (const lesson of lessons) {
    for (const text of englishStrings(lesson)) {
      for (const word of tokens(text)) for (const form of stemForms(word)) stems.add(form);
    }
  }
  return stems;
}

function assessedSurfaces(checkpoint) {
  const surfaces = [];
  for (const chunk of checkpoint.chunks) {
    for (const alternative of chunk.target.split(' / ')) {
      surfaces.push({ where: `chunk ${chunk.id} “${alternative.trim()}”`, text: alternative });
    }
  }
  checkpoint.drills.forEach((drill, i) => {
    const answer = drill.options[drill.answer];
    surfaces.push({ where: `drill ${i + 1} answer “${answer}”`, text: answer });
  });
  return surfaces;
}

const failures = [];
for (let stage = 1; stage <= 6; stage++) {
  const lessons = lessonsForStage(stage);
  // A checkpoint may reuse anything taught in earlier stages plus this stage's
  // own four teaching lessons — never material first assessed in a checkpoint.
  const taught = LESSONS.filter((lesson) => lesson.stage <= stage && lesson.kind === 'lesson');
  const corpus = stageCorpus(taught);
  const checkpoint = lessons.find((lesson) => lesson.order === 5);
  assert(checkpoint && checkpoint.kind === 'checkpoint', `stage ${stage}: missing checkpoint`);
  const allowed = ALLOWED_NOVEL.get(checkpoint.id) || new Set();

  for (const surface of assessedSurfaces(checkpoint)) {
    const novel = [...new Set(tokens(surface.text))]
      .filter((word) => word.length > 1 && !STOPWORDS.has(word))
      .filter((word) => !stemForms(word).some((form) => corpus.has(form)) && !allowed.has(word));
    if (novel.length) {
      failures.push(`${checkpoint.id} ${surface.where}: novel word(s) ${novel.join(', ')}`);
    }
  }
}

assert.deepEqual(failures, [], `checkpoint assessed language must reuse taught words:\n${failures.join('\n')}`);
console.log('FlashDay content reuse: checkpoint targets reuse taught language');
