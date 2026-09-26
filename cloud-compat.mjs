/*
 * Pure helpers for the Firebase → Supabase compatibility layer in
 * firebase-client.js. No firebase imports — this module must stay loadable in
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
    'auth/invalid-email': 'Invalid login credentials',
    'auth/email-already-in-use': 'User already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/too-many-requests': 'Too many requests',
    'auth/network-request-failed': 'Too many requests',
    'auth/operation-not-allowed': 'Provider is not enabled',
    'auth/unauthorized-domain': 'Provider is not enabled',
    'auth/expired-action-code': 'Reset link expired',
    'auth/invalid-action-code': 'Reset link expired',
    'auth/popup-blocked': 'Sign-in popup blocked',
    'auth/popup-closed-by-user': 'Sign-in popup closed'
  };
  return new Error(table[code] || String(error?.message || error || 'Authentication failed'));
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
