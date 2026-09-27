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
  // learning_progress merge: reviewLog unions by id; lessonEvents live in
  // their own collection and fsrs is a rebuilt cache — both are stripped
  // from the payload rather than merged.
  const merged = mergeProgressPayload(
    { lessonEvents: [{ id: 'remote-ev' }], fsrs: { stale: 'remote' }, reviewLog: [{ id: 'r1' }], profile: { updatedAt: 1 } },
    { lessonEvents: [{ id: 'local-ev' }], fsrs: { stale: 'local' }, reviewLog: [{ id: 'l1' }], profile: { updatedAt: 2 } }
  );
  assert.equal(merged.lessonEvents, undefined, 'events stay out of the payload');
  assert.equal(merged.fsrs, undefined, 'fsrs cache is stripped, not merged');
  assert.deepEqual(merged.reviewLog.map((e) => e.id).sort(), ['l1', 'r1']);
  assert.equal(merged.profile.updatedAt, 2, 'newer profile wins');
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
