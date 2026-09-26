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
    cap('a1', "I'm on my way to work.", 'video-a', 0, 4),
    cap('a2', 'Wait, on my way already.', 'video-a', 4, 7),
    cap('b1', 'Cryptic jargon nobody taught you yesterday.', 'video-b', 0, 5)
  ];
  const sources = IM.assessSources(db, { taskState: known });
  assert.strictEqual(sources.length, 2, 'two source titles make two sources');
  assert.strictEqual(sources[0].title, 'video-a', 'deck-covered source must rank first');
  // Coverage is measured honestly: only chars inside deck units count, so a
  // 9-char chunk inside a longer sentence is partial coverage, not fake 100%.
  assert(sources[0].coverage > 0 && sources[0].coverage < 1);
  assert.strictEqual(sources[0].verdict.key, 'easy', 'all covered units known, no learning → easy');
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

console.log('FlashDay immersion engine: 9 checks passed');
