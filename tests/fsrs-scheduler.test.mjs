import assert from 'node:assert/strict';
import {
  FSRS_ALGORITHM,
  FSRS_SOURCE,
  Rating,
  applyRatings,
  ensureProgress,
  rebuildProgressFromEvents,
  taskKey,
  taskState,
  rankDueTasks,
  ratingFromBespokeScore
} from '../fsrs-scheduler.mjs';

assert.equal(FSRS_ALGORITHM, 'FSRS-6');
assert.match(FSRS_SOURCE, /ts-fsrs@v5\.4\.2/);
assert.equal(ratingFromBespokeScore(1), Rating.Again);
assert.equal(ratingFromBespokeScore(2), Rating.Hard);
assert.equal(ratingFromBespokeScore(3), Rating.Good);
assert.equal(ratingFromBespokeScore(0), null);
assert.notEqual(taskKey('u1', 'listen'), taskKey('u1', 'speak'));

{
  const goodDb = { events: [], fsrsProgress: null };
  const againDb = { events: [], fsrsProgress: null };
  applyRatings(goodDb, 'write', { u1: 3 }, 1_000_000);
  applyRatings(againDb, 'write', { u1: 1 }, 1_000_000);
  const good = taskState(goodDb, 'u1', 'write', 1_000_000);
  const again = taskState(againDb, 'u1', 'write', 1_000_000);
  assert(good.dueAt > again.dueAt, 'Good must schedule later than Again for a new memory');
  assert.equal(taskState(goodDb, 'u1', 'listen', 1_000_000).isNew, true, 'a Write review must not fabricate Listen evidence');
}

{
  const events = [
    { id: 'late', mode: 'speak', unitIds: ['u1'], ratings: { u1: 1 }, answeredAt: 2_000_000 },
    { id: 'early', mode: 'speak', unitIds: ['u1'], ratings: { u1: 3 }, answeredAt: 1_000_000 }
  ];
  const progress = rebuildProgressFromEvents(events);
  const card = progress.cards[taskKey('u1', 'speak')];
  assert(card, 'replay must produce an FSRS card');
  assert.equal(card.reps, 2, 'replay must apply both events chronologically');
}

{
  const db = { events: [], fsrsProgress: null };
  applyRatings(db, 'read', { u1: 1 }, 1_000_000);
  const tasks = [
    { unitId: 'u1', mode: 'read' },
    { unitId: 'u1', mode: 'write' }
  ];
  const due = rankDueTasks(db, tasks, 1_000_000 + 2 * 60_000);
  assert.equal(due.length, 1);
  assert.equal(due[0].mode, 'read');
}

{
  const legacyDb = {
    events: [],
    fsrsProgress: null,
    bespokeProgress: {
      ratings: {
        u1: [
          { mode: 'listen', time: 1000, score: 3 },
          { mode: 'listen', time: 2000, score: 1 }
        ]
      }
    }
  };
  const progress = ensureProgress(legacyDb);
  assert.equal(progress.cards['u1::listen'].reps, 2, 'legacy Bespoke rating history must seed FSRS instead of resetting progress');
  assert.equal(Boolean(progress.cards['u1::write']), false);
}

console.log('FlashDay FSRS v6: 12 Unit-mode scheduling checks passed');

// Reviews of one meaning must not advance another meaning of the same word.
{
  const db={events:[],fsrsProgress:null};
  applyRatings(db,'write',{'bank-money':Rating.Good},1_000_000);
  assert.equal(taskState(db,'bank-money','write',1_000_000).isNew,false);
  assert.equal(taskState(db,'bank-river','write',1_000_000).isNew,true);
}
