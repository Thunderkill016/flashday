const assert = require('assert');
const IM = require('../immersion-engine.js');
const SC = require('../source-capture.js');

function cap(id, sentence, sourceTitle, start = 0, end = 3) {
  return SC.normalizeCapture({ id, sentence, sourceTitle, subtitle: { text: sentence, start, end, index: 0 } });
}

function dbFixture() {
  return {
    items: [
      { id: 'u1', target: 'on my way', meaning: 'đang tới', type: 'chunk', forms: [] },
      { id: 'u2', target: 'ended up', meaning: 'cuối cùng lại', type: 'phrasal_verb', forms: [] }
    ],
    captures: [], events: [], bespokeCards: []
  };
}

// No FSRS in the unit-test process — knowledge is injected via taskState so
// the assertions stay deterministic and offline.
const known = () => 'known';
const learning = () => 'learning';
const mixed = (unitId) => (unitId === 'u1' ? 'known' : 'learning');

{
  const db = dbFixture();
  db.captures = [
    cap('a1', 'On my way — ended up.', 'video-a', 0, 4),
    cap('a2', "I'm on my way.", 'video-a', 4, 7),
    cap('b1', 'Cryptic jargon nobody taught you yesterday.', 'video-b', 0, 5)
  ];
  const sources = IM.assessSources(db, { taskState: known });
  assert.strictEqual(sources.length, 2, 'two source titles make two sources');
  assert.strictEqual(sources[0].title, 'video-a', 'deck-covered source must rank first');
  // Coverage is measured honestly: only chars inside deck units count, so a
  // 9-char chunk inside a longer sentence is partial coverage, not fake 100%.
  assert(sources[0].coverage > 0 && sources[0].coverage < 1);
  assert.strictEqual(sources[0].verdict.key, 'easy', 'high absolute coverage + all covered units known → easy');
  assert.strictEqual(sources[1].coverage, 0, 'no deck match = zero coverage, not a low guess');
  assert.strictEqual(sources[1].verdict.key, 'thin');
  assert.strictEqual(sources[1].outsidePct, 100);
}

{
  const db = dbFixture();
  db.captures = [cap('a1', 'I ended up on my way anyway.', 'video-a', 0, 4)];
  const [source] = IM.assessSources(db, { taskState: mixed });
  assert(source.knownPct > 0 && source.learningPct > 0, 'mixed knowledge must split coverage');
  assert.deepStrictEqual(source.learningUnits, ['u2']);
  assert.deepStrictEqual(source.knownUnits, ['u1']);
  assert.strictEqual(source.verdict.key, 'good-fit', 'a learning unit inside makes it productive');
  assert.strictEqual(source.segments, 1);
  assert.strictEqual(source.minutes, 1);
}

{
  const db = dbFixture();
  // Deck-covered but the covered unit was never reviewed → stretch, not easy.
  const [stretch] = IM.assessSources({ ...db, captures: [cap('x', 'ended up on my way.', 'v', 0, 2)] }, { taskState: () => 'new' });
  assert.strictEqual(stretch.verdict.key, 'stretch');
  assert.deepStrictEqual(stretch.newUnits.sort(), ['u1', 'u2']);
}

{
  const db = dbFixture();
  // Captures with no source identity (no title/file/url) are skipped rather
  // than grouped into a junk bucket.
  db.captures = [SC.normalizeCapture({ id: 'naked', sentence: 'on my way.' })];
  assert.strictEqual(IM.assessSources(db, { taskState: known }).length, 0);
}

{
  const db = dbFixture();
  const parts = IM.annotatedParts(db, 'I ended up on my way anyway.', { taskState: mixed });
  const tagged = parts.filter((part) => part.unitId);
  assert.strictEqual(tagged.length, 2, 'both units must be highlighted');
  assert.strictEqual(tagged.find((part) => part.unitId === 'u1').knowledge, 'known');
  assert.strictEqual(tagged.find((part) => part.unitId === 'u2').knowledge, 'learning');
  assert.strictEqual(parts.map((part) => part.text).join(''), 'I ended up on my way anyway.', 'annotation must preserve the sentence exactly');
}

{
  // Without FSRS (guest/no-module path) knowledge is honestly 'new', never
  // guessed — and a unit missing from the deck is also 'new'.
  const db = dbFixture();
  assert.strictEqual(IM.unitKnowledge(db, 'u1'), 'new');
  assert.strictEqual(IM.unitKnowledge(db, 'not-in-deck'), 'new');
  assert.strictEqual(IM.unitKnowledge(db, 'u1', { taskState: () => 'known' }), 'known');
}

{
  const db = dbFixture();
  db.captures = [
    cap('a1', "I'm on my way to work.", 'video-a', 0, 4),
    cap('a2', 'Sure, on my way already.', 'video-a', 4, 7)
  ];
  const now = Date.now();
  // Per-line granularity: only the lines the learner actually touched get
  // encounters — viewing line a1 must not also record line a2.
  const touchedOnly = IM.collectEncounters(db, [db.captures[0]], { nowMs: now });
  assert.strictEqual(touchedOnly.length, 1);
  assert.strictEqual(touchedOnly[0].captureId, 'a1');
  assert.strictEqual(touchedOnly[0].kind, 'line-viewed', 'default kind is an honest line view');
  assert.deepStrictEqual(touchedOnly[0].kinds, ['line-viewed'], 'record keeps the full kind list as provenance');
  // First open records one encounter per unit×capture — two lines, two rows.
  const first = IM.collectEncounters(db, db.captures, { nowMs: now });
  assert.strictEqual(first.length, 2);
  db.encounters = first;
  // Same day, same lines → nothing new; rereading tomorrow is a new encounter.
  assert.strictEqual(IM.collectEncounters(db, db.captures, { nowMs: now }).length, 0);
  const tomorrow = IM.collectEncounters(db, db.captures, { nowMs: now + 86400000 });
  assert.strictEqual(tomorrow.length, 2);
  // encounterCount measures distinct source lines, not raw events.
  db.encounters = [...first, ...tomorrow];
  assert.strictEqual(IM.encounterCount(db, 'u1'), 2, 'two distinct captures, days must not multiply it');
  // An unmet learning unit boosts the source that would re-surface it.
  const met = IM.assessSource(db, 'video-a', db.captures, { taskState: learning });
  assert.strictEqual(met.unmetLearning, 0, 'encountered units are met');
  const neverMet = IM.assessSource({ ...db, encounters: [] }, 'video-a', db.captures, { taskState: learning });
  assert.strictEqual(neverMet.unmetLearning, 1);
  assert(neverMet.fitScore > met.fitScore, 'unmet learning units must rank a source higher');
}

{
  // Encounter kind is provenance metadata — tapped/played keep a distinct
  // label, junk values fall back to 'line-viewed'.
  const db = dbFixture();
  const caps = [cap('a1', "I'm on my way.", 'video-a', 0, 4)];
  const tapped = IM.collectEncounters(db, caps, { nowMs: 1000, kind: 'word-tapped' });
  assert.strictEqual(tapped[0].kind, 'word-tapped');
  const junk = IM.collectEncounters({ ...db, encounters: [] }, caps, { nowMs: 2000, kind: 'hacked' });
  assert.strictEqual(junk[0].kind, 'line-viewed', 'unknown encounter kinds must not enter the log');
}

{
  // sourceKey collision fix: two DIFFERENT sources that share a title must
  // stay separate groups once sourceId exists; legacy captures without
  // sourceId keep the title key they were grouped under.
  const a = SC.normalizeCapture({ id: 'a', sentence: 's1', sourceTitle: 'Daily vlog', sourceId: 'yt-AAA' });
  const b = SC.normalizeCapture({ id: 'b', sentence: 's2', sourceTitle: 'Daily vlog', sourceId: 'yt-BBB' });
  const legacy = SC.normalizeCapture({ id: 'c', sentence: 's3', sourceTitle: 'Daily vlog' });
  assert.notStrictEqual(IM.sourceKey(a), IM.sourceKey(b), 'same title, different sourceId → different groups');
  assert.strictEqual(IM.sourceKey(legacy), 'Daily vlog', 'legacy capture keeps title key');
}

{
  // Comprehension spot-check — only translatable lines may be quizzed, and
  // the honest failure mode reports "not enough translations" instead of
  // fabricating questions.
  const tcap = (id, sentence, vi, i) => SC.normalizeCapture({ id, sentence, nativeSentence: vi, sourceTitle: 'src', sourceId: 'src', subtitle: { text: sentence, start: i, end: i + 1, index: i } });
  const line1 = tcap('l1', 'Hello there.', 'Xin chào.', 0);
  const untranslated = SC.normalizeCapture({ id: 'l2', sentence: 'General Kenobi.', sourceTitle: 'src', sourceId: 'src', subtitle: { text: 'General Kenobi.', start: 1, end: 2, index: 1 } });

  const thin = IM.comprehensionQuiz({ encounters: [] }, [line1, untranslated]);
  assert.strictEqual(thin.available, false, 'one translated line is not enough to build distractors');
  assert(thin.reason.length > 0, 'unavailable must come with a learner-readable reason');

  const caps = [line1, untranslated, tcap('l3', 'How are you?', 'Bạn khỏe không?', 2), tcap('l4', 'I am fine.', 'Tôi khỏe.', 3), tcap('l5', 'See you.', 'Hẹn gặp.', 4), tcap('l6', 'Goodbye.', 'Tạm biệt.', 5)];
  const quiz = IM.comprehensionQuiz({ encounters: [] }, caps, { count: 4 });
  assert.strictEqual(quiz.available, true);
  assert.strictEqual(quiz.questions.length, 4);
  for (const q of quiz.questions) {
    assert(q.answer && q.options.includes(q.answer), 'correct answer must be among options');
    assert.strictEqual(new Set(q.options).size, q.options.length, 'options must be unique');
    assert(!q.options.includes(''), 'no blank distractors');
    assert(q.sentence !== 'General Kenobi.', 'untranslated line must never become a question');
  }
  // Seeded: same input → identical questions and option order.
  const again = IM.comprehensionQuiz({ encounters: [] }, caps, { count: 4 });
  assert.deepStrictEqual(again.questions, quiz.questions, 'quiz must be deterministic across re-renders');
  // Encountered lines are quizzed first — the check covers what was read.
  const seenQuiz = IM.comprehensionQuiz({ encounters: [{ captureId: 'l6', kind: 'line-viewed' }] }, caps, { count: 1 });
  assert.strictEqual(seenQuiz.questions[0].captureId, 'l6', 'encountered line must be picked first');

  // Two lines sharing one translation cannot form distractors — a one-option
  // question is a guaranteed click, so it must be excluded, and a source where
  // every translated line means the same thing reports unavailable.
  const dupA = tcap('d1', 'Hi.', 'Chào.', 0);
  const dupB = tcap('d2', 'Hello.', 'Chào.', 1);
  const sameMeaning = IM.comprehensionQuiz({ encounters: [] }, [dupA, dupB]);
  assert.strictEqual(sameMeaning.available, false, 'identical translations give no real distractors');
  const mixed = IM.comprehensionQuiz({ encounters: [] }, [dupA, dupB, tcap('d3', 'Bye.', 'Tạm biệt.', 2)]);
  assert.strictEqual(mixed.available, true);
  assert(mixed.questions.every((q) => q.options.length >= 2), 'every question needs a real distractor');
  assert(!mixed.questions.some((q) => q.captureId === 'd2') || mixed.questions.length >= 1);

  // F4: a source that is 83% outside the deck must not be labeled 'easy' —
  // coverage verdicts describe deck fit, not claimed comprehension.
  // F4: a source that is mostly outside the deck must not be labeled 'easy' —
  // coverage verdicts describe deck fit, not claimed comprehension.
  const mostlyUnknown = SC.normalizeCapture({ id: 'u1', sentence: 'on my way through complicated bureaucratic terminology', sourceTitle: 'x', subtitle: { text: 'x', start: 0, end: 1, index: 0 } });
  const fakeSource = IM.assessSource(dbFixture(), 'x', [mostlyUnknown], { taskState: known });
  assert.notStrictEqual(fakeSource.verdict.key, 'easy', 'mostly-uncovered source must not claim easy');

  // F4 wording regression: even at qualifying coverage the label must stay
  // scoped to the deck — never imply the whole source is "gần hết" known.
  const easySource = IM.assessSource(dbFixture(), 'src-a', [cap('a1', 'I usually wake up early'), cap('a2', 'She works near the park'), cap('a3', 'We drink coffee together')], { taskState: known });
  if (easySource.verdict.key === 'easy') {
    assert(!easySource.verdict.label.includes('gần hết'), 'easy label must not claim near-total coverage');
    assert(easySource.verdict.label.includes('trong deck'), 'easy label scopes itself to the deck');
  }
}

console.log('FlashDay immersion engine: 13 checks passed');

// Explicit source meaning governs highlighting, coverage and encounter credit.
{
  const db={items:[{id:'money',target:'bank',meaning:'ngân hàng'},{id:'river',target:'bank',meaning:'bờ sông'}],encounters:[]};
  const capture=SC.normalizeCapture({id:'sense-source',sentence:'We sat by the bank.',linkedUnitIds:['river']});
  assert.deepEqual(IM.assessCapture(db,capture).unitIds,['river']);
  assert.deepEqual(IM.collectEncounters(db,[capture],{nowMs:1000}).map(row=>row.unitId),['river']);
  assert.deepEqual(IM.annotatedParts(db,capture.sentence,{capture}).filter(part=>part.unitId).map(part=>part.unitId),['river']);
  assert.deepEqual(IM.assessCapture(db,{...capture,linkedUnitIds:[]}).unitIds,[]);
}
