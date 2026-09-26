import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../fsrs-scheduler.mjs';

const require = createRequire(import.meta.url);
const A = require('../bespoke-adapter.js');
const F = globalThis.FlashDayFsrs;

function fixture() {
  return {
    items: [
      { id: 'u1', target: "I'm on my way.", meaning: 'Tôi đang trên đường.', type: 'chunk', forms: [], accepted: [], contexts: [], tags: [], difficulty: 'A2' },
      { id: 'u2', target: "I'm running late.", meaning: 'Tôi đang tới muộn.', type: 'chunk', forms: [], accepted: [], contexts: [], tags: [], difficulty: 'A2' }
    ],
    events: [], captures: [], bespokeCards: [], bespokeProgress: null, fsrsProgress: null
  };
}

assert.equal(A.hasFsrs, true, 'production adapter must see the FSRS module');
assert.equal(A.introductionGuardMs(), 10 * 60 * 1000, 'new-memory guard must derive from the longest configured short-term FSRS step');
assert.equal(A.bespokeScore(4), 3, 'future FSRS Easy must remain a Bespoke success instead of becoming an unknown score');

{
  const db = fixture();
  const first = A.selectNext(db, 1_000_000);
  assert.match(first.selectionReason, /introduction/);
  const ratings = A.allSuccess(first.card);
  const result = A.finalizeCard(db, first, ratings, { nowMs: 1_000_000 });
  assert.equal(result.event.scheduler, 'bespoke-language-policy+fsrs6');
  assert.match(result.event.memoryScheduler, /ts-fsrs/);
  assert(db.fsrsProgress?.cards, 'FSRS cache must be updated after review');

  for (const unitId of first.card.unit_tags.map((tag) => tag.unit_id)) {
    assert(db.fsrsProgress.cards[`${unitId}::${first.mode}`], 'reviewed Unit x Mode must get an FSRS state');
  }
  const untouchedMode = first.mode === 'listen' ? 'speak' : 'listen';
  assert.equal(Boolean(db.fsrsProgress.cards[`u1::${untouchedMode}`]), false, 'other skills must not receive fake FSRS reviews');

  assert.throws(
    () => A.selectNext(db, 1_000_001),
    /tạm không mở Unit × kỹ năng mới/,
    'a short-term FSRS review must block immediate flooding of new memories'
  );

  const memory = F.taskState(db, first.unitId, first.mode, 1_000_000);
  const due = A.selectNext(db, memory.dueAt);
  assert.equal(due.selectionReason, 'fsrs-due');
  assert.equal(`${due.unitId}::${due.mode}`, `${first.unitId}::${first.mode}`, 'the scheduled FSRS task must return when due');

  const engine = A.buildEngine(db);
  const unseen = F.newTasks(db, A.taskPairs(engine));
  const continuity = A.chooseIntroductionTask(db, engine, unseen, 1_000_001);
  assert.equal(continuity.unitId, first.unitId, 'cross-skill evidence may guide WHAT to introduce next');
  assert.notEqual(continuity.mode, first.mode, 'cross-skill continuity must choose an unseen mode, not fabricate a review');
}

{
  // Production ladder: a fresh unit opens on the easiest rung ('read') and a
  // partially-known unit climbs one rung at a time — never straight to
  // 'speak' while 'listen' is still unseen.
  const db = fixture();
  const engine = A.buildEngine(db);
  const tasks = A.taskPairs(engine);
  const unseen = F.newTasks(db, tasks);
  const firstIntro = A.chooseIntroductionTask(db, engine, unseen, 1_000_000);
  assert.equal(firstIntro.mode, 'read', 'a fresh unit must start at the recognition rung, not production');
  assert.equal(firstIntro.unitId, 'u1');

  // Simulate 'read' reviewed: mark the mode as having state.
  db.fsrsProgress = { cards: { 'u1::read': { due: '2099-01-01T00:00:00.000Z', state: 2, reps: 1, scheduled_days: 3, stability: 2, difficulty: 5 } } };
  const stillUnseen = F.newTasks(db, tasks);
  const next = A.chooseIntroductionTask(db, engine, stillUnseen, 1_000_000);
  assert.equal(next.unitId, 'u1', 'cross-skill continuity still prefers the touched unit');
  assert.equal(next.mode, 'listen', 'the ladder must climb to listen before write/speak');
}

{
  const db = fixture();
  const engine = A.buildEngine(db);
  const unit = engine.unitLookup.u1;
  const card = engine.getCardsForUnit('u1', 1)[0];
  engine.rate(unit, 'write', 3, 1000);

  const upstreamSoon = engine.scoreCard(card, 'write', 1001);
  const upstreamLate = engine.scoreCard(card, 'write', 1000 + 30 * 24 * 60 * 60);
  assert.notEqual(upstreamSoon, upstreamLate, 'upstream Bespoke score includes time-based urgency');

  const hybridSoon = A.hybridCardScore(engine, card, 'write', 1001 * 1000);
  const hybridLate = A.hybridCardScore(engine, card, 'write', (1000 + 30 * 24 * 60 * 60) * 1000);
  assert.equal(hybridSoon, hybridLate, 'hybrid card ranking must not leak Bespoke memory urgency back into FSRS timing');
}

{
  const db = fixture();
  db.events = [
    { id: 'e1', mode: 'write', cardId: 'fallback:u1', unitIds: ['u1'], ratings: { u1: 3 }, isReported: false, answeredAt: 1_000_000 },
    { id: 'e2', mode: 'write', cardId: 'fallback:u1', unitIds: ['u1'], ratings: { u1: 1 }, isReported: false, answeredAt: 2_000_000 }
  ];
  A.rebuildProgressFromEvents(db);
  assert(db.bespokeProgress?.ratings?.u1, 'Bespoke language-policy cache must rebuild');
  assert(db.fsrsProgress?.cards?.['u1::write'], 'FSRS timing cache must rebuild from the same review history');
  assert.equal(db.fsrsProgress.cards['u1::write'].reps, 2);
}

{
  const db = fixture();
  const selection = A.selectNext(db, 1_000_000);
  const ratings = Object.fromEntries(selection.card.unit_tags.map((tag) => [tag.unit_id, 4]));
  const result = A.finalizeCard(db, selection, ratings, { nowMs: 1_000_000 });
  assert(Object.values(result.event.ratings).every((score) => score === 4), 'review event must preserve FSRS Easy');
  for (const unitId of result.event.unitIds) {
    const bespokeRatings = result.engine.ratingStates[unitId].ratings().filter((rating) => rating.mode === selection.mode);
    assert.equal(bespokeRatings.at(-1).score, 3, 'Bespoke cache must translate Easy to its upstream success score');
    assert.equal(result.event.fsrsGrades[unitId], F.Rating.Easy, 'FSRS must receive the original Easy grade');
  }
}

{
  const db = fixture();
  const first = A.selectNext(db, 1_000_000);
  const firstResult = A.finalizeCard(db, first, A.allSuccess(first.card), {
    telemetry: { presentedAt: 900_000, firstAttemptAt: 940_000, revealedAt: 980_000, sourceViewedPreReveal: false, audioPlays: 3 },
    nowMs: 1_000_000
  });
  for (const unitId of firstResult.event.unitIds) {
    const memory = firstResult.event.memory[unitId];
    assert(memory, 'every rated unit must appear in the event memory map');
    assert.equal(memory.grade, F.Rating.Good);
    assert.equal(memory.before, null, 'first-ever review has no prior FSRS state');
    assert(memory.after && Number.isFinite(memory.after.stability) && Number.isFinite(memory.after.difficulty),
      'event memory must carry post-review FSRS difficulty/stability');
    assert(Number.isFinite(memory.after.scheduled_days));
  }

  const due = A.selectNext(db, F.taskState(db, first.unitId, first.mode, 1_000_000).dueAt);
  const secondResult = A.finalizeCard(db, due, A.allSuccess(due.card), { nowMs: F.taskState(db, first.unitId, first.mode, 1_000_000).dueAt });
  const memory = secondResult.event.memory[due.unitId];
  assert(memory?.before, 'a scheduled review must preserve the pre-review FSRS state');
  assert(memory.before.due, 'pre-review snapshot must include the due date that triggered this review');
}

console.log('FlashDay hybrid policy: corrected Bespoke + FSRS boundary checks passed');
