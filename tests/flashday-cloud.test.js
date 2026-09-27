import assert from 'node:assert/strict';
import {
  createSessionFence,
  mergeById,
  mergeLearningProfile,
  mergeProgressPayload
} from '../src/core/cloud.js';

{
  // ID-union: local-only records survive; remote wins same-id collisions.
  const merged = mergeById(
    [{ id: 'same', v: 'remote' }],
    [{ id: 'same', v: 'local' }, { id: 'local-only', v: 'x' }]
  );
  assert.equal(merged.length, 2);
  assert.equal(merged.find((row) => row.id === 'same').v, 'remote');
}

{
  // learning_progress merge: append-only records union; scheduler cache is
  // invalidated so each device rebuilds FSRS from the merged event history.
  const merged = mergeProgressPayload(
    { lessonEvents: [{ id: 'remote-ev', submittedAt: 1000 }], fsrs: { stale: 'remote' } },
    { lessonEvents: [{ id: 'local-ev', submittedAt: 2000 }], fsrs: { stale: 'local' } }
  );
  assert.deepEqual(
    merged.lessonEvents.map((event) => event.id).sort(),
    ['local-ev', 'remote-ev']
  );
  assert.equal(merged.fsrs, null, 'merged history invalidates the scheduler cache');
  assert.deepEqual(mergeProgressPayload({}, {}).learningProfile, null);
}

{
  const newer = mergeLearningProfile({ updatedAt: 1000 }, { updatedAt: 2000, x: 1 });
  assert.equal(newer.x, 1, 'newer profile wins');
  assert.equal(mergeLearningProfile({ updatedAt: 3000, x: 2 }, { updatedAt: 2000 }).x, 2);
  assert.equal(mergeLearningProfile(null, null), null);
}

// A->B->A is still a new session; an old completion must not become valid again.
{
  const client = {};
  let identity = { client, ownerId: 'alice', namespace: 'u:alice', ownerNamespace: 'u:alice' };
  const fence = createSessionFence(() => identity);
  const original = fence.capture();
  assert.equal(fence.isCurrent(original), true);
  identity = { ...identity, namespace: 'u:bob' };
  assert.equal(fence.isCurrent(original), false);
  assert.equal(fence.isCurrent(fence.capture()), false, 'a freshly captured mismatched namespace must also fail');
  identity = { ...identity, namespace: 'u:alice' };
  fence.invalidate();
  assert.throws(() => fence.assertCurrent(original), (error) => error.code === 'SESSION_CHANGED');
  const fresh = fence.capture();
  assert.equal(fence.isCurrent(fresh), true);
  identity = { ...identity, client: {} };
  assert.equal(fence.isConnectionCurrent(fresh), false);
}

console.log('FlashDay cloud merge: 4 checks passed');
