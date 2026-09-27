/*
 * Cloud merge + sync for the A1 rebuild. Durable truth = append-only
 * lessonEvents + reviewLog; db.fsrs is a derived cache rebuilt from the
 * merged reviewLog so a two-device merge replays identically to a single
 * device's history. Events live in users/{uid}/lesson_events/{id};
 * the learning_progress/{uid} singleton carries only reviewLog + profile.
 */
import { dbKey } from './namespace.js';
import { hydrateDb } from './evidence.js';
import { rebuildFsrsFromLog } from './scheduler.js';

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
// The learning_progress payload carries only reviewLog + profile —
// lessonEvents live in their own collection and fsrs is a derived cache,
// so both are stripped rather than merged in.
export function mergeProgressPayload(remote = {}, local = {}) {
  const strip = (payload) => {
    const { lessonEvents: _drop, fsrs: _dropCache, ...rest } = payload || {};
    return clone(rest);
  };
  return {
    ...strip(remote), ...strip(local),
    reviewLog: mergeById(remote.reviewLog, local.reviewLog),
    profile: mergeLearningProfile(local.profile, remote.profile),
    learningProfile: mergeLearningProfile(local.learningProfile, remote.learningProfile)
  };
}

// --- Firestore row mapping (users/{uid}/lesson_events) ---------------------

// Append-only evidence doc. client.from() re-pins id/owner_id at write time;
// created_at is added there too — we send it anyway for direct-set callers.
export function lessonEventRow(event, ownerId, now = new Date()) {
  const iso = (value) => {
    const ms = Number(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : now.toISOString();
  };
  return {
    id: String(event.id),
    owner_id: ownerId,
    lesson_id: String(event.lessonId),
    content_version: Number(event.contentVersion) || 0,
    step: String(event.step),
    kind: String(event.kind),
    payload: event.payload && typeof event.payload === 'object' ? clone(event.payload) : {},
    support: event.support && typeof event.support === 'object' ? clone(event.support) : {},
    submitted_at: iso(event.submittedAt),
    created_at: iso(event.submittedAt)
  };
}

export function lessonEventFromRow(row) {
  return {
    id: String(row.id),
    lessonId: String(row.lesson_id),
    contentVersion: Number(row.content_version) || 0,
    step: String(row.step),
    kind: String(row.kind),
    payload: row.payload && typeof row.payload === 'object' ? clone(row.payload) : {},
    support: row.support && typeof row.support === 'object' ? clone(row.support) : {},
    submittedAt: Date.parse(row.submitted_at) || Date.parse(row.created_at) || 0
  };
}

// --- Sync engine -----------------------------------------------------------

// Warn-only ceiling (Firestore hard cap is 1MiB/doc; leave headroom for
// encoding overhead). reviewLog entries are tiny — tripping this means
// something unexpected grew, not that the design broke.
export const PROGRESS_PAYLOAD_WARN_BYTES = 700 * 1024;
const CLOUD_PAGE_SIZE = 500;
const PUSH_DEBOUNCE_MS = 1500;

export function createCloudSync({ client, store, storage, onStatus }) {
  let ownerId = null;
  let connected = false;
  let hydrating = false;
  let pushTimer = null;
  let unsubscribeStore = null;
  let detachFlush = null;
  let pushChain = Promise.resolve();

  const fence = createSessionFence(() => ({
    client,
    ownerId,
    namespace: ownerId ? `${dbKey(storage)}:u:${ownerId}` : dbKey(storage),
    ownerNamespace: ownerId ? `${dbKey(storage)}:u:${ownerId}` : null
  }));

  const setStatus = (state, message) => {
    try { onStatus?.(state, message); } catch (_error) {}
  };

  function uploadedIds() {
    try {
      const raw = storage.getItem(`${dbKey(storage)}:uploaded-events`);
      return new Set((JSON.parse(raw || '[]') || []).map(String));
    } catch (_error) {
      return new Set();
    }
  }

  function rememberUploaded(ids) {
    try {
      storage.setItem(`${dbKey(storage)}:uploaded-events`, JSON.stringify([...ids]));
    } catch (_error) {}
  }

  async function pushIncremental(scope = fence.capture()) {
    fence.assertCurrent(scope);
    if (!connected || !scope.ownerId || hydrating) return;
    const db = store.getState();
    const uploaded = uploadedIds();
    const pending = (Array.isArray(db.lessonEvents) ? db.lessonEvents : [])
      .filter((event) => event?.id != null && !uploaded.has(String(event.id)));
    if (pending.length) {
      const rows = pending.map((event) => lessonEventRow(event, scope.ownerId));
      const { error } = await client.from('lesson_events').upsert(rows, { ignoreDuplicates: true });
      fence.assertCurrent(scope);
      if (error) throw new Error(error.message);
      for (const event of pending) uploaded.add(String(event.id));
      rememberUploaded(uploaded);
    }
    const payload = {
      version: 2,
      reviewLog: Array.isArray(db.reviewLog) ? db.reviewLog : [],
      profile: db.profile && typeof db.profile === 'object' ? db.profile : {}
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    if (bytes > PROGRESS_PAYLOAD_WARN_BYTES) {
      console.warn(`[cloud] learning_progress payload ${bytes}B exceeds ${PROGRESS_PAYLOAD_WARN_BYTES}B warn limit`);
    }
    const { error } = await client.from('learning_progress').upsert({
      owner_id: scope.ownerId,
      deck_id: 'a1',
      payload,
      updated_at: new Date().toISOString()
    });
    fence.assertCurrent(scope);
    if (error) throw new Error(error.message);
    setStatus('saved');
  }

  // Serialize pushes; failures mark offline instead of dropping the queue.
  function requestPush(reason) {
    if (!connected || hydrating) return pushChain;
    const scope = fence.capture();
    setStatus('saving');
    pushChain = pushChain
      .catch(() => undefined)
      .then(() => pushIncremental(scope))
      .catch((error) => {
        if (!fence.isCurrent(scope)) return;
        const message = String(error?.message || '');
        const offline = /network|fetch|offline|unavailable/i.test(message);
        setStatus(offline ? 'offline' : 'error', message);
      });
    return pushChain;
  }

  function schedulePush() {
    if (!connected) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = null; requestPush('debounced'); }, PUSH_DEBOUNCE_MS);
  }

  async function fetchAllEvents(scope) {
    const rows = [];
    let cursor = null;
    for (;;) {
      const page = await client.from('lesson_events').pageAfter(cursor, CLOUD_PAGE_SIZE);
      fence.assertCurrent(scope);
      if (page.error) throw new Error(page.error.message);
      const data = page.data || [];
      rows.push(...data);
      if (data.length < CLOUD_PAGE_SIZE) break;
      cursor = page.cursor;
    }
    return rows.map(lessonEventFromRow);
  }

  async function hydrate() {
    if (!connected || !ownerId || hydrating) return;
    const scope = fence.capture();
    hydrating = true;
    setStatus('saving');
    try {
      const [remoteEvents, progressResult] = await Promise.all([
        fetchAllEvents(scope),
        client.from('learning_progress').select().eq('owner_id', scope.ownerId).maybeSingle()
      ]);
      fence.assertCurrent(scope);
      if (progressResult.error) throw new Error(progressResult.error.message);

      const remotePayload = progressResult.data?.payload && typeof progressResult.data.payload === 'object'
        ? progressResult.data.payload : {};
      const local = store.getState();
      const mergedPayload = mergeProgressPayload(remotePayload, {
        reviewLog: local.reviewLog, profile: local.profile
      });
      const mergedEvents = mergeById(remoteEvents, local.lessonEvents)
        .sort((a, b) => (Number(a.submittedAt) || 0) - (Number(b.submittedAt) || 0)
          || String(a.id).localeCompare(String(b.id)));
      const reviewLog = (mergedPayload.reviewLog || [])
        .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0)
          || String(a.id || '').localeCompare(String(b.id || '')));
      const merged = hydrateDb({
        version: 2,
        lessonEvents: mergedEvents,
        reviewLog,
        profile: mergedPayload.profile,
        fsrs: rebuildFsrsFromLog(reviewLog)
      });
      store.replace(merged);
      // Only REMOTE ids are already in the cloud — marking local-only events
      // would make the follow-up push skip them forever.
      const uploaded = uploadedIds();
      for (const event of remoteEvents) uploaded.add(String(event.id));
      rememberUploaded(uploaded);
      window.dispatchEvent(new CustomEvent('flashday:cloud-hydrated'));
      fence.assertCurrent(scope);
      hydrating = false;
      await pushIncremental(scope);
      setStatus('saved');
    } catch (error) {
      if (!fence.isCurrent(scope)) return;
      hydrating = false;
      if (error?.code !== 'SESSION_CHANGED') {
        const message = String(error?.message || '');
        setStatus(/network|fetch|offline|unavailable/i.test(message) ? 'offline' : 'error', message);
      }
    }
  }

  function connect(user) {
    disconnect();
    ownerId = user?.id || null;
    connected = Boolean(client && ownerId);
    if (!connected) { setStatus('local'); return; }
    unsubscribeStore = store.subscribe(schedulePush);
    const flush = () => { requestPush('flush'); };
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    function onVis() { if (document.visibilityState === 'hidden') flush(); }
    detachFlush = () => {
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
    hydrate();
  }

  function disconnect() {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    unsubscribeStore?.(); unsubscribeStore = null;
    detachFlush?.(); detachFlush = null;
    fence.invalidate();
    hydrating = false;
    connected = false;
    ownerId = null;
    pushChain = Promise.resolve();
  }

  return { connect, disconnect, pushIncremental: requestPush, hydrate };
}
