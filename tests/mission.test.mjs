/*
 * Mission regression suite (issue #33 rounds 2–3): the things review
 * caught — a keyword-bag scorer that accepted nonsense, enrollment that
 * minted tasks for modalities never exercised, and a name check that
 * accepted ANY content word after "I am". These tests pin the honest
 * contract: ordered-phrase checks against a fixed learner persona, and
 * `enrollTasks` restricted to the chunks the learner actually used.
 */
import assert from 'node:assert/strict';
import { meetsCheck, scoreExitTurn, canonLine } from '../src/core/mission-checks.js';
import { enrollTasks } from '../src/core/scheduler.js';
import { createInitialDb } from '../src/core/evidence.js';
import lesson from '../src/content/a1/s1-l1.js';

const turn1 = lesson.mission.exit.turns[0];
const turn2 = lesson.mission.exit.turns[1];
const checkOf = (turn, key) => turn.checks.find((c) => c.key === key);
const keys = (db) => Object.keys(db.fsrs || {}).sort();

// Content declares `i am <name>` etc. — production resolves <name> with
// the learner's own captured name before scoring (mission.js renderName).
// The test does the same substitution to exercise the real patterns.
const forName = (name) => {
  const sub = (s) => String(s ?? '').replaceAll('<name>', name);
  const resolveTurn = (turn) => ({
    ...turn,
    checks: turn.checks.map((c) => ({ ...c, match: c.match.map(sub), hint: sub(c.hint) }))
  });
  return { turn1: resolveTurn(turn1), turn2: resolveTurn(turn2), resolveTurn };
};
const asLinh = forName('Linh');

// ── 1. The counterexample from review: keyword soup must NOT pass ──
{
  const scored = scoreExitTurn(asLinh.turn1, 'Hi, I am your name');
  const byKey = Object.fromEntries(scored.checks.map((c) => [c.key, c.met]));
  assert.deepEqual(byKey, { greet: true, name: false, ask: false },
    '"Hi, I am your name" only greets — it neither names nor asks');
  assert.equal(scored.met, 1, '1/3, not 3/3');
}

// ── 2. Honest full answers still pass — learner said they're Linh ──
{
  for (const response of [
    'Hi, I’m Linh. What’s your name?',
    'Hello, I am Linh — what is your name?',
    'hi my name is linh and your name',
    'Hey! Call me Linh. What about you?',
    'Hi I am Linh, your name please',
    'Hello, I’m Linh — tell me your name?'
  ]) {
    const scored = scoreExitTurn(asLinh.turn1, response);
    assert.equal(scored.met, scored.total, `expected all checks met: "${response}" → ${JSON.stringify(scored.checks)}`);
  }
}

// ── 3. The name check compares the learner's OWN captured name ─────
// (issue #33 round 4): no stem+word acceptance, and no hidden persona —
// whoever the learner entered in context is the name that passes.
{
  const name = checkOf(asLinh.turn1, 'name');
  for (const sentence of [
    'Hi, I am happy.',
    'Hi, I am tired.',
    'My name is student.',
    'I am Nam.',
    'I’m Mai.',
    'i am',
    'i am your name'
  ]) {
    assert.equal(meetsCheck(sentence, name), false,
      `"${sentence}" must not satisfy "Nói tên mình" — learner is Linh`);
  }
  assert.equal(meetsCheck('i am linh', name), true);
  assert.equal(meetsCheck("I'm Linh", name), true, 'contraction canonicalizes');
  assert.equal(meetsCheck('call me linh', name), true);

  // A different captured name switches the contract — "I'm Hoang" is a
  // real self-introduction when the learner IS Hoang (the exact review
  // counterexample), and "I'm Linh" is then wrong.
  const hoangName = checkOf(forName('Hoang').turn1, 'name');
  assert.equal(meetsCheck("Hi, I'm Hoang. What's your name?", hoangName), true,
    'learner-named Hoang passes as Hoang');
  assert.equal(meetsCheck('I am Linh', hoangName), false, '…and Linh no longer counts');
  // Vietnamese names typed without diacritics still match.
  const hoangDia = checkOf(forName('Hoàng').turn1, 'name');
  assert.equal(meetsCheck("i'm hoang", hoangDia), true, 'diacritic-free typing matches "Hoàng"');
}

// ── 4. Structural strictness — order and boundaries matter ────────
{
  const ask = checkOf(asLinh.turn1, 'ask');
  assert.equal(meetsCheck('what is your names', ask), false, 'word boundary: "names" is not the question form');
  assert.equal(meetsCheck('name your what is', ask), false, 'scrambled words are not the question form');
  assert.equal(meetsCheck('your name', ask), false, '"your name" alone is not an ask');
  assert.equal(meetsCheck('and your name', ask), true, 'reciprocal "and your name" is a real ask');
  assert.equal(meetsCheck('whats your name', ask), true, 'contraction-free variant canonicalizes');
}

// ── 5. Turn 2 politeness check ────────────────────────────────────
{
  const polite = checkOf(asLinh.turn2, 'polite');
  assert.equal(meetsCheck('Nice to meet you too.', polite), true);
  assert.equal(meetsCheck('nice to meet you', polite), true, 'echoing the formula counts');
  assert.equal(meetsCheck('you too', polite), true, 'minimal reciprocal counts');
  assert.equal(meetsCheck('ok meet you', polite), false, '"meet you" without the formula is not polite reply');
  assert.equal(meetsCheck('thank you', polite), false);
}

// ── 6. canonLine keeps pattern semantics intact ───────────────────
{
  assert.equal(canonLine("Hi, I’m Linh. What’s your name?"), 'hi i am linh what is your name');
  assert.equal(canonLine('  HEY!!  '), 'hey');
  assert.equal(canonLine('Hoàng'), 'hoang', 'diacritics normalize');
  assert.equal(canonLine('Đức'), 'duc', 'đ is not a combining mark — needs the explicit map');
}

// ── 7. Enrollment honesty — the lesson-1 pool is 11, no listening ──
// PM decision (issue #33 round 3): lesson 1 mints NO listening cards —
// playing audio while its text is visible is exposure, not retrieval.
// Honest pool: 4 form (notice) + 4 meaning (retrieve) + 3 production
// (exit produces; c3 is Sam's line). enrollTasks' chunkIds filter is
// the mechanism that keeps subsets honest.
{
  const db = createInitialDb();
  // Subset filtering is real: asking for 2 of 4 chunks mints exactly 2.
  enrollTasks(db, lesson, ['form_recognition'], 1000, ['c1', 'c2']);
  assert.equal(keys(db).length, 2, 'only the seen subset mints');
  enrollTasks(db, lesson, ['form_recognition'], 2000, ['c3', 'c4']);
  assert.equal(keys(db).filter((k) => k.includes('form_recognition')).length, 4);
  // Meaning recall mints where recall actually happens (retrieve).
  enrollTasks(db, lesson, ['meaning_recall'], 3000, ['c1', 'c2', 'c3', 'c4']);
  assert.equal(keys(db).filter((k) => k.includes('meaning_recall')).length, 4);
  // Exit production: only produced chunks — c3 (Sam's line) never enrolls.
  enrollTasks(db, lesson, ['cued_production'], 4000, ['c1', 'c2', 'c4']);
  assert.equal(keys(db).filter((k) => k.includes('cued_production')).length, 3);
  assert(!keys(db).some((k) => k.startsWith('a1-s1-l1:c3@') && k.includes('cued_production')),
    'production card must not exist for a phrase the learner never says');
  // The honest total for lesson 1 — and zero listening cards anywhere.
  assert.equal(keys(db).length, 11, '4 form + 4 meaning + 3 production = 11');
  assert(!keys(db).some((k) => k.includes('listening_recognition')),
    'lesson 1 has no audio→meaning retrieval stage → no listening cards');
  // Empty subset is a no-op, not "all chunks".
  assert.deepEqual(enrollTasks(db, lesson, ['meaning_recall'], 5000, []), []);
  assert.equal(keys(db).length, 11);
}

console.log('FlashDay mission checks: 7 groups passed');
