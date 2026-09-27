/*
 * Cloud merge helpers for the A1 rebuild. Mapping to Firestore rows is
 * re-wired in Phase 5 — for now this module only carries the union/fence
 * helpers and the learning_progress payload merge.
 */

// Async work belongs to the client, account and storage namespace that
// started it. Switching away and back still invalidates the old generation.
export function createSessionFence(readIdentity) {
  let generation = 0;
  function capture() { return { ...readIdentity(), generation }; }
  function isConnectionCurrent(scope) {
    return scope.generation === generation && scope.client === readIdentity().client;
  }
  function isCurrent(scope) {
    const current = readIdentity();
    return isConnectionCurrent(scope)
      && scope.ownerId === current.ownerId && scope.namespace === current.namespace
      && (!scope.ownerId || scope.namespace === scope.ownerNamespace);
  }
  function assertCurrent(scope) {
    if (isCurrent(scope)) return;
    const error = new Error('Phiên tài khoản đã thay đổi. Tác vụ cũ đã dừng.');
    error.code = 'SESSION_CHANGED'; throw error;
  }
  return { capture, isCurrent, isConnectionCurrent, assertCurrent, invalidate() { generation++; } };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function mergeById(remoteValues, localValues) {
  const merged = new Map();
  for (const value of Array.isArray(localValues) ? localValues : []) {
    if (value?.id != null) merged.set(String(value.id), clone(value));
  }
  // Remote wins an ID collision. Offline work is represented by new IDs in the
  // current product; in-place offline editing is intentionally not supported yet.
  for (const value of Array.isArray(remoteValues) ? remoteValues : []) {
    if (value?.id != null) merged.set(String(value.id), clone(value));
  }
  return Array.from(merged.values());
}

export function mergeLearningProfile(localProfile, remoteProfile) {
  if (!remoteProfile) return clone(localProfile || null);
  if (!localProfile) return clone(remoteProfile);
  const localAt = Number(localProfile.updatedAt || 0);
  const remoteAt = Number(remoteProfile.updatedAt || 0);
  return clone(remoteAt >= localAt ? remoteProfile : localProfile);
}

// Merge only durable records across devices. Scheduler state is a cache
// rebuilt from lesson events and must not overwrite another device's truth.
export function mergeProgressPayload(remote = {}, local = {}) {
  return {
    ...clone(remote), ...clone(local),
    lessonEvents: mergeById(remote.lessonEvents, local.lessonEvents),
    reviewLog: mergeById(remote.reviewLog, local.reviewLog),
    learningProfile: mergeLearningProfile(local.learningProfile, remote.learningProfile),
    fsrs: null
  };
}
