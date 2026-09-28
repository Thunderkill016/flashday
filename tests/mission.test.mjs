/*
 * Mission regression suite (issue #33 round 2): the two things the review
 * caught — a keyword-bag scorer that accepted nonsense, and enrollment that
 * minted tasks for modalities never exercised. These tests pin the honest
 * contract: structured checks, and `enrollTasks` restricted to the chunks
 * the learner actually used.
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

// ── 1. The counterexample from review: keyword soup must NOT pass ──
{
  const scored = scoreExitTurn(turn1, 'Hi, I am your name');
  const byKey = Object.fromEntries(scored.checks.map((c) => [c.key, c.met]));
  assert.deepEqual(byKey, { greet: true, name: false, ask: false },
    '"Hi, I am your name" only greets — it neither names nor asks');
  assert.equal(scored.met, 1, '1/3, not 3/3');
}

// ── 2. Honest full answers still pass ─────────────────────────────
{
  for (const response of [
    'Hi, I’m Linh. What’s your name?',
    "Hello, I am Nam. What's your name?",
    'hi my name is binh and your name',
    'Hey! Call me Mai. What about you?',
    'Hi I am Linh, your name please',
    'Hello, I’m Linh — tell me your name?'
  ]) {
    const scored = scoreExitTurn(turn1, response);
    assert.equal(scored.met, scored.total, `expected all checks met: "${response}" → ${JSON.stringify(scored.checks)}`);
  }
}

// ── 3. Structural strictness — order and boundaries matter ────────
{
  const ask = checkOf(turn1, 'ask');
  const name = checkOf(turn1, 'name');
  assert.equal(meetsCheck('what is your names', ask), false, 'word boundary: "names" is not the question form');
  assert.equal(meetsCheck('name your what is', ask), false, 'scrambled words are not the question form');
  assert.equal(meetsCheck('your name', ask), false, '"your name" alone is not an ask');
  assert.equal(meetsCheck('i am', name), false, 'stem without a slot value is not a name');
  assert.equal(meetsCheck('i am not sure', name), false, 'glue word after stem is not a name');
  assert.equal(meetsCheck('i am your name', name), false, 'the P0 false positive stays pinned');
  assert.equal(meetsCheck('and your name', ask), true, 'reciprocal "and your name" is a real ask');
  assert.equal(meetsCheck('whats your name', ask), true, 'contraction-free variant canonicalizes');
  assert.equal(meetsCheck('my name is linh', name), true);
  assert.equal(meetsCheck("i'm an", name), false, 'lowercase article after stem is not a name');
  assert.equal(meetsCheck("i'm An", name), true, 'capitalised proper noun fills the slot (learner named An)');
}

// ── 4. Turn 2 politeness check ────────────────────────────────────
{
  const polite = checkOf(turn2, 'polite');
  assert.equal(meetsCheck('Nice to meet you too.', polite), true);
  assert.equal(meetsCheck('nice to meet you', polite), true, 'echoing the formula counts');
  assert.equal(meetsCheck('you too', polite), true, 'minimal reciprocal counts');
  assert.equal(meetsCheck('ok meet you', polite), false, '"meet you" without the formula is not polite reply');
  assert.equal(meetsCheck('thank you', polite), false);
}

// ── 5. canonLine keeps pattern semantics intact ───────────────────
{
  assert.equal(canonLine("Hi, I’m Linh. What’s your name?"), 'hi i am linh what is your name');
  assert.equal(canonLine('  HEY!!  '), 'hey');
}

// ── 6. Enrollment honesty — only exercised chunks mint tasks ──────
{
  const db = createInitialDb();
  // Context where only two lines played (covers c1, c2) — nothing else mints.
  enrollTasks(db, lesson, ['listening_recognition'], 1000, ['c1', 'c2']);
  assert.equal(keys(db).length, 2, 'only heard chunks mint listening tasks');
  assert(keys(db).every((k) => k.includes('listening_recognition')));
  assert(!keys(db).some((k) => k.startsWith('a1-s1-l1:c3')), 'c3 was never heard → no card');
  // A second stage enrolling a different subset doesn't duplicate or inflate.
  enrollTasks(db, lesson, ['listening_recognition'], 2000, ['c3', 'c4']);
  enrollTasks(db, lesson, ['form_recognition'], 3000, ['c1', 'c2', 'c3', 'c4']);
  assert.equal(keys(db).length, 8, '4 listening + 4 form after honest subsets');
  // Exit production: only produced chunks — c3 (Sam's line) never enrolls.
  enrollTasks(db, lesson, ['cued_production'], 4000, ['c1', 'c2', 'c4']);
  assert.equal(keys(db).filter((k) => k.includes('cued_production')).length, 3);
  assert(!keys(db).some((k) => k.startsWith('a1-s1-l1:c3@') && k.includes('cued_production')),
    'production card must not exist for a phrase the learner never says');
  assert.equal(keys(db).length, 11, 'honest total: no idle-modality inflation');
  // Empty subset is a no-op, not "all chunks".
  assert.deepEqual(enrollTasks(db, lesson, ['meaning_recall'], 5000, []), []);
  assert.equal(keys(db).length, 11);
  // Meaning recall mints where recall actually happens (retrieve).
  enrollTasks(db, lesson, ['meaning_recall'], 6000, ['c1', 'c2', 'c3', 'c4']);
  assert.equal(keys(db).filter((k) => k.includes('meaning_recall')).length, 4);
}

console.log('FlashDay mission checks: 6 groups passed');
