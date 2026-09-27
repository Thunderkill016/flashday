/*
 * Pure helpers for the Firebase → Supabase compatibility layer in
 * firebase-client.mjs. No firebase imports — this module must stay loadable in
 * plain Node so the test suite can exercise the mapping logic directly.
 */

// Translate Firebase Auth error codes into the message shapes that
// authErrorMessage() in flashday-auth.mjs already recognises.
export function mapAuthError(error) {
  const code = String(error?.code || '');
  const table = {
    'auth/invalid-credential': 'Invalid login credentials',
    'auth/wrong-password': 'Invalid login credentials',
    'auth/user-not-found': 'Invalid login credentials',
    'auth/invalid-email': 'Invalid email address',
    'auth/missing-email': 'Invalid email address',
    'auth/email-already-in-use': 'User already registered',
    'auth/account-exists-with-different-credential': 'User already registered',
    'auth/credential-already-in-use': 'User already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/too-many-requests': 'Too many requests',
    'auth/quota-exceeded': 'Too many requests',
    'auth/network-request-failed': 'Network request failed',
    'auth/user-disabled': 'User account disabled',
    'auth/requires-recent-login': 'Requires recent login',
    'auth/operation-not-allowed': 'Provider is not enabled',
    'auth/unauthorized-domain': 'Provider is not enabled',
    'auth/invalid-continue-uri': 'Continue url not authorized',
    'auth/unauthorized-continue-uri': 'Continue url not authorized',
    'auth/missing-continue-uri': 'Continue url not authorized',
    'auth/expired-action-code': 'Action link expired',
    'auth/invalid-action-code': 'Action link expired',
    'auth/popup-blocked': 'Sign-in popup blocked',
    'auth/popup-closed-by-user': 'Sign-in popup closed',
    'auth/web-storage-unsupported': 'Web storage unsupported'
  };
  return new Error(table[code] || String(error?.message || error || 'Authentication failed'));
}

// Firebase Auth persists sessions in IndexedDB and hands popup/redirect
// results through sessionStorage. Privacy modes and tracker-blocking
// extensions disable either one, which is how sign-in can "succeed" yet the
// session vanishes on the next page. Probe both so the UI can name the
// actual blocker instead of looping between /login/ and /app/ forever.
export async function detectStorageBlocking() {
  const status = { sessionStorage: true, indexedDB: true };
  try {
    const store = globalThis.sessionStorage;
    if (!store) throw new Error('sessionStorage unavailable');
    store.setItem('__flashday_probe__', '1');
    store.removeItem('__flashday_probe__');
  } catch (_error) {
    status.sessionStorage = false;
  }
  const idb = globalThis.indexedDB;
  if (!idb) {
    status.indexedDB = false;
  } else {
    try {
      await new Promise((resolve) => {
        const request = idb.open('__flashday_probe__');
        request.onsuccess = () => {
          request.result?.close();
          idb.deleteDatabase('__flashday_probe__');
          resolve();
        };
        request.onerror = () => {
          status.indexedDB = false;
          resolve();
        };
        // Restricted engines can leave the request pending forever; a short
        // grace period keeps the login UI responsive — the onerror path is
        // what actually marks IndexedDB as blocked.
        setTimeout(resolve, 500);
      });
    } catch (_error) {
      status.indexedDB = false;
    }
  }
  status.blocked = !status.sessionStorage || !status.indexedDB;
  return status;
}

// Password-reset requests must answer identically whether or not the email
// exists — otherwise the form becomes an account-enumeration oracle. These
// codes are swallowed so the UI always shows the neutral "check your inbox".
export function isIgnorableResetError(error) {
  const code = String(error?.code || '');
  return code === 'auth/user-not-found' || code === 'auth/invalid-email';
}

// Deterministic document id for a stored row. Rows carrying their own id keep
// it; owner-keyed singletons (learning_progress, learner_profiles) collapse to
// the owner id.
export function rowDocId(row, fallbackId) {
  const id = row?.id ?? row?.owner_id ?? fallbackId;
  return id == null ? null : String(id);
}

// Equality filters are applied in memory after the Firestore `where` pass —
// keeps semantics identical for any column shape (JSON fields included).
export function matchRows(rows, filters) {
  return rows.filter((row) =>
    filters.every(({ column, value }) => String(row?.[column]) === String(value))
  );
}

// created_at / answered_at are stored as ISO strings; lexicographic order is
// chronological for the consistent toISOString() format the writers use.
export function sortRows(rows, orders) {
  if (!orders.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { column, ascending } of orders) {
      const av = a?.[column] ?? '';
      const bv = b?.[column] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return ascending ? cmp : -cmp;
    }
    return 0;
  });
}

export function paginateRows(rows, range, limit) {
  if (range) return rows.slice(range.from, range.to + 1);
  if (limit != null) return rows.slice(0, limit);
  return rows;
}

// Leave headroom for Firestore field/path encoding below its 1 MiB document cap.
// This is a conservative app guard, not an exact Firestore size calculator.
export const PROGRESS_MAX_JSON_BYTES = 750 * 1024;

export async function writeProgressTransaction(fs, target, row, ownerId, mergePayload) {
  if (typeof mergePayload !== 'function') throw new Error('Progress merge policy is required');
  return fs.runTransaction(fs.db, async transaction => {
    const snapshot = await transaction.get(target);
    const remote = snapshot.exists() ? snapshot.data() : {};
    const record = {
      ...row,
      id: target.id,
      owner_id: ownerId,
      created_at: remote.created_at || row.created_at || new Date().toISOString(),
      payload: mergePayload(remote.payload || {}, row.payload || {})
    };
    if (new TextEncoder().encode(JSON.stringify(record)).length > PROGRESS_MAX_JSON_BYTES) {
      throw new Error('Tiến độ vượt giới hạn đồng bộ. Dữ liệu local vẫn được giữ; chưa lưu lên tài khoản.');
    }
    transaction.set(target, record);
    return record;
  });
}

// Each page reads only its own documents. A document snapshot is the cursor,
// so equal timestamps cannot skip or duplicate rows between pages.
export async function readFirestorePage(fs, ref, constraints, cursor, pageSize) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid page size');
  const query = [...constraints, fs.orderBy(fs.documentId())];
  if (cursor) query.push(fs.startAfter(cursor));
  query.push(fs.limit(pageSize));
  const snapshot = await fs.getDocs(fs.query(ref, ...query));
  return {
    data: snapshot.docs.map(document => document.data()),
    cursor: snapshot.docs.at(-1) || null,
    error: null
  };
}
