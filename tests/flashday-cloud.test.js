const assert = require('assert');
const C = require('../flashday-cloud.js');

{
  const row = C.unitRow({
    id: 'on-way', target: "I'm on my way.", meaning: 'Tôi đang trên đường.', type: 'chunk',
    intent: 'báo đang tới', canDo: 'Tôi có thể báo người đang chờ.', contexts: ['nhắn tin'],
    exampleSentence: "I'm on my way.", exampleTranslation: 'Tôi đang trên đường.',
    forms: ['I am on my way.'], tags: ['daily'], origin: 'curated', difficulty: 'A2'
  }, 'deck-1');
  assert.strictEqual(row.deck_id, 'deck-1');
  assert.strictEqual(row.difficulty, 'A2');
  const item = C.itemFromRow(row);
  assert.deepStrictEqual(item.contexts, ['nhắn tin']);
  assert.strictEqual(item.difficulty, 'A2');
}

{
  const event = C.eventFromRow(C.reviewRow({
    id: 'review-1', mode: 'listen', cardId: 'card-1', unitIds: ['unit-1'], ratings: { 'unit-1': 3 },
    response: { text: 'hello', spoke: false, recordedLocally: false },
    stimulus: { audioKind: 'source-audio' }, isReported: false, answeredAt: 1000,
    sentence: "I'm on my way.", nativeSentence: 'Tôi đang trên đường.', captureId: 'cap-1', rotation: 'rotated',
    source: { label: 'video.srt', mediaTimestamp: 12.4 },
    scheduler: 'bespoke-language-policy+fsrs6', memoryScheduler: 'ts', languagePolicy: 'bespoke',
    fsrsGrades: { 'unit-1': 3 },
    telemetry: { presentedAt: 500, firstAttemptAt: 700, revealedAt: 900, recallLatencyMs: 400, sourceViewedPreReveal: false, audioPlays: 2 },
    error: { stage: 'miss', types: ['missing-target', 'word-form'], missedUnits: ['unit-1'], firstMissed: ['unit-1'], firstAttempt: 'I am my way', finalAttempt: 'I am on my way', corrected: true, retryCount: 1 },
    evidence: { kind: 'word-diff', aided: true, unaidedUnits: [], aidedUnits: ['unit-1'] },
    memory: { 'unit-1': { grade: 3, before: null, after: { stability: 2.5, difficulty: 5.1, scheduled_days: 2 } } }
  }, 'deck-1'));
  assert.strictEqual(event.mode, 'listen');
  assert.strictEqual(event.response.text, 'hello');
  assert.strictEqual(event.stimulus.audioKind, 'source-audio');
  assert.strictEqual(event.answeredAt, 1000);
  assert.strictEqual(event.sentence, "I'm on my way.");
  assert.strictEqual(event.nativeSentence, 'Tôi đang trên đường.');
  assert.strictEqual(event.captureId, 'cap-1');
  assert.strictEqual(event.rotation, 'rotated', 'context-rotation marker must survive cloud round-trip');
  assert.strictEqual(event.source.mediaTimestamp, 12.4);
  assert.strictEqual(event.fsrsGrades['unit-1'], 3);
  assert.strictEqual(event.telemetry.recallLatencyMs, 400, 'cloud sync must not drop recall latency');
  assert.strictEqual(event.telemetry.audioPlays, 2);
  assert.strictEqual(event.memory['unit-1'].after.stability, 2.5, 'cloud sync must preserve FSRS memory snapshots');
  assert.strictEqual(event.error.stage, 'miss', 'error record must survive cloud round-trip');
  assert.deepStrictEqual(event.error.types, ['missing-target', 'word-form']);
  assert.deepStrictEqual(event.error.missedUnits, ['unit-1']);
  assert.strictEqual(event.error.corrected, true);
  assert.strictEqual(event.error.retryCount, 1);
  assert.deepStrictEqual(event.error.firstMissed, ['unit-1'], 'first-attempt misses must survive cloud round-trip');
  assert.deepStrictEqual(event.evidence, { kind: 'word-diff', aided: true, unaidedUnits: [], aidedUnits: ['unit-1'] }, 'evidence split must survive cloud round-trip');
}

{
  const local = {
    version: 'repo-driven-1', createdAt: 1,
    items: [
      { id: 'same', target: 'local stale', meaning: 'local', type: 'chunk' },
      { id: 'local-only', target: 'offline unit', meaning: 'offline', type: 'chunk' }
    ],
    bespokeCards: [], captures: [],
    events: [{ id: 'local-event', answeredAt: 2000, mode: 'write', cardId: 'c2', unitIds: [], ratings: {} }],
    transferAttempts: [{ id: 'local-transfer', missionId: 'mission', submittedAt: 2000 }],
    bespokeProgress: { stale: true }
  };
  const remote = {
    units: [{ id: 'same', target: 'remote canonical', meaning: 'remote', unit_type: 'chunk', forms: [], accepted: [], tags: [], origin: 'curated' }],
    cards: [], captures: [],
    events: [{ id: 'remote-event', answered_at: new Date(1000).toISOString(), mode: 'read', card_id: 'c1', unit_ids: [], ratings: {}, response: {}, stimulus: {}, is_reported: false }]
  };
  local.encounters = [
    { id: 'enc-u-l-2025-01-01', unitId: 'u', captureId: 'l', at: 1500, kind: 'word-tapped', kinds: ['word-tapped'] }
  ];
  const merged = C.mergeLearnerDb(local, remote, {
    transferAttempts: [{ id: 'remote-transfer', missionId: 'mission', submittedAt: 1000 }],
    encounters: [
      { id: 'enc-u-l-2025-01-01', unitId: 'u', captureId: 'l', at: 1400, kind: 'line-viewed', kinds: ['line-viewed'] },
      { id: 'enc-u-m-2025-01-01', unitId: 'u', captureId: 'm', at: 1600, kind: 'line-played', kinds: ['line-played'] }
    ]
  });
  assert.strictEqual(merged.items.length, 2, 'remote and local-only unit should both survive');
  assert.strictEqual(merged.items.find((item) => item.id === 'same').target, 'remote canonical', 'remote must win same-id collision');
  assert(merged.items.some((item) => item.id === 'local-only'), 'offline local-only unit must survive');
  assert.deepStrictEqual(merged.events.map((event) => event.id), ['remote-event', 'local-event'], 'event union must be time ordered');
  assert.strictEqual(merged.bespokeProgress, null, 'merged history invalidates scheduler cache');
  assert.deepStrictEqual(merged.transferAttempts.map((attempt) => attempt.id), ['remote-transfer', 'local-transfer'], 'transfer attempts must survive device merge in chronological order');
  const mergedEncounter = merged.encounters.find((entry) => entry.id === 'enc-u-l-2025-01-01');
  assert.deepStrictEqual(mergedEncounter.kinds.sort(), ['line-viewed', 'word-tapped'], 'same-day same-line encounters across devices must union interaction kinds');
  assert.strictEqual(mergedEncounter.at, 1400, 'merge keeps the earliest observed timestamp');
  assert.strictEqual(merged.encounters.length, 2, 'distinct lines keep distinct encounter rows');
}

{
  const remote = { units: [{ id: 'u1' }], cards: [{ id: 'c1' }], captures: [], events: [{ id: 'e1' }] };
  const known = C.knownIds(remote);
  assert.deepStrictEqual(C.unknownById([{ id: 'u1' }, { id: 'u2' }], known.units).map((row) => row.id), ['u2']);
  C.rememberIds(known, 'units', [{ id: 'u2' }]);
  assert.strictEqual(known.units.has('u2'), true);
  const empty = C.emptyKnownIds();
  assert.strictEqual(empty.events.size, 0);
}

{
  // Capture edits are the one in-place mutation the product makes (mined
  // sentence translation). mergeCaptures must prefer the newer updatedAt so
  // a stale remote row cannot wipe the learner's typed translation.
  const localCap = { id: 'cap-1', sentence: 's', nativeSentence: 'dịch mới của tôi', updatedAt: 2000 };
  const remoteStale = { id: 'cap-1', sentence: 's', nativeSentence: '' };
  let merged = C.mergeCaptures([remoteStale], [localCap]);
  assert.strictEqual(merged[0].nativeSentence, 'dịch mới của tôi', 'local edit must survive merge');
  // Remote that was edited LATER wins back.
  const remoteNewer = { id: 'cap-1', sentence: 's', nativeSentence: 'bản dịch từ máy khác', updatedAt: 3000 };
  merged = C.mergeCaptures([remoteNewer], [localCap]);
  assert.strictEqual(merged[0].nativeSentence, 'bản dịch từ máy khác', 'newer remote edit must win');
  // Neither side stamped → remote wins (legacy rows keep old semantics).
  merged = C.mergeCaptures([{ id: 'cap-1', sentence: 's', nativeSentence: 'remote' }], [{ id: 'cap-1', sentence: 's', nativeSentence: 'local' }]);
  assert.strictEqual(merged[0].nativeSentence, 'remote');
  // New local-only captures still survive.
  merged = C.mergeCaptures([remoteStale], [localCap, { id: 'cap-2', sentence: 'x' }]);
  assert.strictEqual(merged.length, 2);
}

{
  // F3: an edited capture keeps its id, so "new id" detection alone would
  // never upload the fix. dirtyCaptures must flag local rows whose updatedAt
  // is newer than the last stamp seen remotely.
  const known = C.knownIds({ captures: [{ id: 'cap-1', payload: { id: 'cap-1', sentence: 's', updatedAt: 1000 } }] });
  const untouched = [{ id: 'cap-1', sentence: 's', updatedAt: 1000 }];
  assert.strictEqual(C.dirtyCaptures(untouched, known).length, 0, 'same stamp → nothing to upload');
  const edited = [{ id: 'cap-1', sentence: 's', nativeSentence: 'dịch mới', updatedAt: 2000 }];
  assert.strictEqual(C.dirtyCaptures(edited, known).length, 1, 'local edit newer than remote stamp must upload');
  const fresh = [{ id: 'cap-2', sentence: 'x' }];
  assert.strictEqual(C.dirtyCaptures(fresh, known).length, 1, 'unknown id still uploads');
  C.rememberIds(known, 'captures', edited);
  assert.strictEqual(C.dirtyCaptures(edited, known).length, 0, 'rememberIds must record the uploaded stamp');
}

{
  // Comprehension spot-check records ride the learning_progress payload —
  // remote + local records union by id like encounters, never FSRS state.
  const merged = C.mergeLearnerDb(
    { comprehensionChecks: [{ id: 'comp-local', sourceKey: 's', correct: 3, total: 4, at: 10 }] },
    {},
    { comprehensionChecks: [{ id: 'comp-remote', sourceKey: 's', correct: 4, total: 4, at: 20 }] }
  );
  assert.strictEqual(merged.comprehensionChecks.length, 2, 'local + remote quiz records must both survive');
  assert(merged.comprehensionChecks.some((r) => r.id === 'comp-local'));
}

assert.strictEqual(C.remoteHasLearnerData({}), false);
assert.strictEqual(C.remoteHasLearnerData({ units: [{ id: 'u' }] }), true);
console.log('FlashDay cloud P0: 7 checks passed');
