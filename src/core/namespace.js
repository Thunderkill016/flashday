/*
 * Per-account local namespaces. The shared (un-namespaced) record is the
 * guest/preview pool; once an account signs in, its learner data must live
 * under its own uid key so a second account on the same browser never
 * merges with or uploads the first account's leftovers.
 *
 * Fresh key for the A1 rebuild — pre-rebuild local data is intentionally
 * not migrated (prod was reset).
 */
export const DB_BASE_KEY = 'flashday-a1';
export const DB_OWNER_KEY = 'flashday:db-owner';

export function dbKey(storage) {
  let owner = '';
  try { owner = String(storage?.getItem(DB_OWNER_KEY) || '').trim(); } catch (_error) {}
  return owner ? `${DB_BASE_KEY}:u:${owner}` : DB_BASE_KEY;
}

export function claimDbNamespace(storage, uid) {
  // Marker first: even if the claim itself is interrupted, later reads
  // must not fall back into the shared pool while a session is active.
  try { storage.setItem(DB_OWNER_KEY, String(uid)); } catch (_error) { return dbKey(storage); }
  const uidKey = `${DB_BASE_KEY}:u:${uid}`;
  try {
    if (storage.getItem(uidKey) == null) {
      const guestRaw = storage.getItem(DB_BASE_KEY);
      if (guestRaw != null) {
        // First sign-in on this browser: adopt guest/preview work into the
        // account namespace, then empty the shared pool so another account
        // cannot inherit it. When the uid namespace already exists the
        // guest pool is left alone — anonymous work stays anonymous.
        storage.setItem(uidKey, guestRaw);
        storage.removeItem(DB_BASE_KEY);
      }
    }
  } catch (_error) {}
  return uidKey;
}

export function releaseDbNamespace(storage) {
  try { storage.removeItem(DB_OWNER_KEY); } catch (_error) {}
}
