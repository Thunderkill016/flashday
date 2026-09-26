const assert = require('assert');
const A = require('../bespoke-adapter.js');
const B = require('../bespoke-engine.js');

function dbFixture() {
  return {
    items: [{
      id: 'u1', target: "I'm on my way.", meaning: 'Tôi đang trên đường.', type: 'chunk',
      forms: [], accepted: [], contexts: [], tags: [], difficulty: 'A2'
    }],
    events: [], captures: [], bespokeCards: [], bespokeProgress: null,
    scheduler: 'google-bespoke-port', schedulerSource: 'google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e'
  };
}

{
  assert.strictEqual(A.normalizedDifficulty('A2'), B.Difficulty.A2);
  assert.strictEqual(A.normalizedDifficulty('not-a-level'), B.Difficulty.A1);
  assert.deepStrictEqual(A.normalizeStimulus({ audioKind: 'browser-tts' }), { audioKind: 'browser-tts' });
  assert.deepStrictEqual(A.normalizeStimulus({ audioKind: 'invented' }), { audioKind: 'none' });
}

{
  const db = dbFixture();
  db.events = [
    { id: 'r2', mode: 'write', cardId: 'fallback:u1', unitIds: ['u1'], ratings: { u1: 1 }, isReported: false, answeredAt: 2000 },
    { id: 'r1', mode: 'write', cardId: 'fallback:u1', unitIds: ['u1'], ratings: { u1: 3 }, isReported: false, answeredAt: 1000 }
  ];
  const engine = A.rebuildProgressFromEvents(db);
  const ratings = engine.ratingStates.u1.ratings().filter((rating) => rating.mode === B.Mode.WRITE);
  assert.strictEqual(ratings.length, 2);
  assert.deepStrictEqual(ratings.map((rating) => rating.time), [1, 2], 'replay must be chronological');
  assert(db.bespokeProgress?.ratings?.u1, 'replay must rebuild scheduler cache');
  assert.strictEqual(engine.cardIdUses['fallback:u1'].length, 2, 'card usage must be replayed too');
}

{
  const db = dbFixture();
  const selection = A.selectNext(db, 1000);
  const result = A.finalizeCard(db, selection, A.allSuccess(selection.card), {
    stimulus: { audioKind: 'source-audio' },
    response: { text: 'understood' },
    nowMs: 2000
  });
  assert.strictEqual(result.event.stimulus.audioKind, 'source-audio');
  assert.strictEqual(result.event.response.text, 'understood');
  assert(/^review_/.test(result.event.id));
}

{
  const db = dbFixture();
  // Regression: P0 no longer drops old review events at an arbitrary 1500-row boundary.
  db.events = Array.from({ length: 1500 }, (_, index) => ({ id: `existing-${index}` }));
  const selection = A.selectNext(db, 1000);
  A.finalizeCard(db, selection, A.allSuccess(selection.card), { nowMs: 3000 });
  assert.strictEqual(db.events.length, 1501);
}

{
  const telemetry = A.normalizeTelemetry(
    { presentedAt: 1000, firstAttemptAt: 1400, revealedAt: 3000, sourceViewedPreReveal: true, audioPlays: 2 },
    3500
  );
  assert.strictEqual(telemetry.recallLatencyMs, 2000);
  assert.strictEqual(telemetry.attemptLatencyMs, 400);
  assert.strictEqual(telemetry.gradingMs, 500);
  assert.strictEqual(telemetry.sourceViewedPreReveal, true);
  assert.strictEqual(telemetry.audioPlays, 2);

  const empty = A.normalizeTelemetry({}, 1000);
  assert.strictEqual(empty.recallLatencyMs, null, 'missing timestamps must stay null, not fabricate 0ms recall');
  assert.strictEqual(empty.audioPlays, 0);
}

{
  const db = dbFixture();
  const selection = A.selectNext(db, 1000);
  const result = A.finalizeCard(db, selection, A.allSuccess(selection.card), {
    telemetry: { presentedAt: 500, firstAttemptAt: 800, revealedAt: 900, audioPlays: 1 },
    nowMs: 1500
  });
  assert.strictEqual(result.event.telemetry.recallLatencyMs, 400);
  assert.strictEqual(result.event.telemetry.attemptLatencyMs, 300);
  assert(result.event.memory && typeof result.event.memory === 'object', 'event must carry per-unit memory snapshots');
}

{
  // Context rotation: while a unit has several context cards, consecutive
  // draws for the same unit+mode must not repeat the last-served card.
  const db = dbFixture();
  db.bespokeCards = [
    { id: 'ctx_a', sentence: "I'm on my way to work.", native_sentence: 'Tôi đang đi làm.', audio_filename: '', slow_audio_filename: '', native_audio_filename: '', phonetic: null, unit_tags: [{ occurance: "I'm on my way", unit_id: 'u1' }], notes: [], source: null },
    { id: 'ctx_b', sentence: 'Hang on — I\'m on my way, give me a minute.', native_sentence: 'Khoan — tôi đang tới.', audio_filename: '', slow_audio_filename: '', native_audio_filename: '', phonetic: null, unit_tags: [{ occurance: "I'm on my way", unit_id: 'u1' }], notes: [], source: null }
  ];
  const engine = A.buildEngine(db);

  const first = A.pickCardForTask(db, engine, 'u1', 'read', 1000);
  assert.strictEqual(first.rotation, 'first', 'no prior read event means first encounter');

  db.events.push({ id: 'e1', mode: 'read', cardId: first.card.id, unitIds: ['u1'], answeredAt: 900 });
  const second = A.pickCardForTask(db, engine, 'u1', 'read', 2000);
  assert.notStrictEqual(second.card.id, first.card.id, 'a different context must be served');
  assert.strictEqual(second.rotation, 'rotated');

  db.events.push({ id: 'e2', mode: 'read', cardId: second.card.id, unitIds: ['u1'], answeredAt: 1500 });
  const third = A.pickCardForTask(db, engine, 'u1', 'read', 3000);
  assert.strictEqual(third.card.id, first.card.id, 'rotation cycles back once alternatives run out');
  assert.strictEqual(third.rotation, 'rotated');

  // A prior event in a different mode must not constrain this mode's rotation.
  const writePick = A.pickCardForTask(db, engine, 'u1', 'write', 4000);
  assert.strictEqual(writePick.rotation, 'first', 'write has no history yet');
  assert.strictEqual(A.seenContextCount(db, 'u1'), 2, 'events prove two distinct contexts were served');
}

{
  // With only one context card the same card is served again — the event must
  // honestly say 'repeated' rather than claim rotation happened.
  const db = dbFixture();
  const engine = A.buildEngine(db);
  const first = A.pickCardForTask(db, engine, 'u1', 'read', 1000);
  db.events.push({ id: 'e1', mode: 'read', cardId: first.card.id, unitIds: ['u1'], answeredAt: 900 });
  const second = A.pickCardForTask(db, engine, 'u1', 'read', 2000);
  assert.strictEqual(second.card.id, first.card.id);
  assert.strictEqual(second.rotation, 'repeated');

  const result = A.finalizeCard(db, { ...first, mode: 'read', unitId: 'u1', selectionReason: 'test' }, A.allSuccess(first.card), { nowMs: 3000 });
  assert.strictEqual(result.event.rotation, 'first', 'rotation must be recorded on the review event');
}

console.log('FlashDay Bespoke adapter P0: 9 checks passed');
