/*
 * Firebase Auth + Firestore behind the subset of the Supabase client API that
 * FlashDay actually uses. Call sites keep `client.auth.*` and
 * `client.from(table)...` chains; only client construction changed.
 *
 * Data lives under users/{uid}/{table}/{id} so Firestore rules mirror the old
 * RLS policy ("owner manages their own rows") with a single path match.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  updatePassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  isIgnorableResetError,
  mapAuthError,
  matchRows,
  paginateRows,
  rowDocId,
  sortRows
} from './cloud-compat.mjs';

// Postgres `on delete cascade` for decks -> child tables is emulated here:
// Firestore has no foreign keys, so a deck delete sweeps its children.
const DECK_CHILD_TABLES = [
  'units',
  'cards',
  'source_captures',
  'review_events',
  'learning_progress'
];

const FIRESTORE_BATCH_LIMIT = 450;

export function createClient(config) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  // Completes a signInWithRedirect round-trip on whichever page the provider
  // sends the user back to. Keep the promise so callers can surface redirect
  // failures instead of silently landing logged-out.
  const redirectResult = getRedirectResult(auth).catch((error) => ({ error }));

  async function sessionFor(user) {
    if (!user) return null;
    // A transient token-fetch failure (flaky network) must not tear down the
    // listener chain — emit a degraded session; nothing downstream consumes
    // access_token since Firestore calls ride the SDK's own auth.
    let token = null;
    try {
      token = await user.getIdToken();
    } catch (_error) {
      token = null;
    }
    return {
      access_token: token,
      token_type: 'bearer',
      user: { id: user.uid, email: user.email || '' }
    };
  }

  function ok(data = null) {
    return { data, error: null };
  }

  function fail(error) {
    // Plain Error instances keep their message; Firebase errors carry a code
    // and go through the mapping table so authErrorMessage still recognises them.
    if (error instanceof Error && !error.code) return { data: null, error };
    return { data: null, error: mapAuthError(error) };
  }

  // Verification/reset links get a continue URL back to the app. Without it,
  // Firebase's hosted action page strands the learner on *.firebaseapp.com.
  function actionCodeSettings(explicitUrl) {
    const url = explicitUrl
      || (typeof window !== 'undefined' ? `${window.location.origin}/login/` : null);
    return url ? { url } : undefined;
  }

  const api = {
    signUp: async ({ email, password, options } = {}) => {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // The account already exists at this point — a failed verification
        // send (rate limit, bad continue URL) must not report signup failure,
        // or retrying hits "email already in use" and the learner is stuck.
        let verificationError = null;
        try {
          await sendEmailVerification(credential.user, actionCodeSettings(options?.emailRedirectTo));
        } catch (error) {
          verificationError = error;
        }
        // Supabase's confirm-email flow returns no session until the address
        // is verified; mirror that so the UI keeps asking users to check mail.
        await firebaseSignOut(auth);
        const data = { user: { id: credential.user.uid, email: credential.user.email }, session: null };
        if (verificationError) data.verificationError = mapAuthError(verificationError).message;
        return ok(data);
      } catch (error) {
        return fail(error);
      }
    },

    signInWithPassword: async ({ email, password }) => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (!credential.user.emailVerified) {
          // A lost verification email must not become a permanent lockout —
          // resend it on every sign-in attempt before refusing access.
          try { await sendEmailVerification(credential.user, actionCodeSettings()); } catch (_e) { /* rate-limited resends still surface the same sign-in error */ }
          await firebaseSignOut(auth);
          return fail(new Error('Email not confirmed'));
        }
        return ok({ user: credential.user, session: await sessionFor(credential.user) });
      } catch (error) {
        return fail(error);
      }
    },

    signInWithOAuth: async ({ provider }) => {
      if (provider !== 'google') return fail(new Error('Provider is not enabled'));
      try {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return ok();
      } catch (error) {
        return fail(error);
      }
    },

    resetPasswordForEmail: async (email, { redirectTo } = {}) => {
      try {
        await sendPasswordResetEmail(auth, email, actionCodeSettings(redirectTo));
        return ok();
      } catch (error) {
        // "No such user" must look exactly like success so this endpoint
        // cannot be used to probe which emails have accounts.
        if (isIgnorableResetError(error)) return ok();
        return fail(error);
      }
    },

    // Applies a Firebase email-action link (verifyEmail / recoverEmail) that
    // lands on our own domain instead of the hosted handler page.
    applyActionCode: async (oobCode) => {
      try {
        await applyActionCode(auth, oobCode);
        return ok();
      } catch (error) {
        return fail(error);
      }
    },

    // Full oobCode recovery: verify the link, set the password, then sign the
    // learner back in so the flow ends inside the app like Supabase's did.
    completePasswordReset: async (oobCode, newPassword) => {
      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        await confirmPasswordReset(auth, oobCode, newPassword);
        const credential = await signInWithEmailAndPassword(auth, email, newPassword);
        return ok({ user: credential.user, session: await sessionFor(credential.user) });
      } catch (error) {
        return fail(error);
      }
    },

    updateUser: async ({ password }) => {
      try {
        if (!auth.currentUser) throw new Error('Not authenticated');
        await updatePassword(auth.currentUser, password);
        return ok();
      } catch (error) {
        return fail(error);
      }
    },

    getSession: async () => {
      await auth.authStateReady();
      return ok({ session: await sessionFor(auth.currentUser) });
    },

    // Resolves the pending signInWithRedirect round-trip once; the provider
    // error is mapped like every other auth failure.
    getRedirectResult: async () => {
      const result = await redirectResult;
      if (result?.error) return fail(result.error);
      return ok(result || null);
    },

    onAuthStateChange: (callback) => {
      let initial = true;
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        const session = await sessionFor(user);
        const event = initial ? 'INITIAL_SESSION' : user ? 'SIGNED_IN' : 'SIGNED_OUT';
        initial = false;
        callback(event, session);
      });
      return { data: { subscription: { unsubscribe } } };
    },

    signOut: async () => {
      try {
        await firebaseSignOut(auth);
        return ok();
      } catch (error) {
        return fail(error);
      }
    }
  };

  function userCollection(table) {
    const user = auth.currentUser;
    if (!user) return { error: new Error('Not authenticated') };
    return { user, ref: collection(firestore, 'users', user.uid, table) };
  }

  class Builder {
    constructor(table) {
      this._table = table;
      this._op = 'select';
      this._rows = [];
      this._filters = [];
      this._orders = [];
      this._limit = null;
      this._range = null;
      this._single = false;
      this._maybeSingle = false;
      this._ignoreDuplicates = false;
    }

    select() {
      return this;
    }

    eq(column, value) {
      this._filters.push({ column, value });
      return this;
    }

    order(column, { ascending = true } = {}) {
      this._orders.push({ column, ascending });
      return this;
    }

    limit(value) {
      this._limit = value;
      return this;
    }

    range(from, to) {
      this._range = { from, to };
      return this;
    }

    single() {
      this._single = true;
      return this;
    }

    maybeSingle() {
      this._maybeSingle = true;
      return this;
    }

    insert(rows) {
      this._op = 'insert';
      this._rows = Array.isArray(rows) ? rows : [rows];
      return this;
    }

    upsert(rows, { ignoreDuplicates = false } = {}) {
      this._op = 'upsert';
      this._rows = Array.isArray(rows) ? rows : [rows];
      this._ignoreDuplicates = ignoreDuplicates;
      return this;
    }

    delete() {
      this._op = 'delete';
      return this;
    }

    _wheres() {
      // owner_id is implied by the users/{uid}/ path scope, so it never needs
      // a Firestore where clause; every other eq filter does double duty as a
      // server-side where plus an in-memory match for exact parity.
      return this._filters
        .filter(({ column }) => column !== 'owner_id')
        .map(({ column, value }) => where(column, '==', value));
    }

    async _select() {
      const scoped = userCollection(this._table);
      if (scoped.error) return fail(scoped.error);
      const snapshot = await getDocs(query(scoped.ref, ...this._wheres()));
      let rows = snapshot.docs.map((entry) => entry.data());
      rows = sortRows(matchRows(rows, this._filters), this._orders);
      rows = paginateRows(rows, this._range, this._limit);
      if (this._single) {
        if (!rows.length) return fail(new Error('Results contain 0 rows'));
        return ok(rows[0]);
      }
      if (this._maybeSingle) {
        if (rows.length > 1) return fail(new Error('JSON object requested, multiple rows returned'));
        return ok(rows[0] || null);
      }
      return ok(rows);
    }

    async _write(merge) {
      const scoped = userCollection(this._table);
      if (scoped.error) return fail(scoped.error);
      const written = [];
      for (const row of this._rows) {
        const id = rowDocId(row, scoped.user.uid) || crypto.randomUUID();
        const target = doc(scoped.ref, id);
        // Merged upserts must preserve the original created_at — the security
        // rules treat it as write-once.
        const existing = merge ? await getDoc(target) : null;
        if (merge && this._ignoreDuplicates && existing?.exists()) continue;
        const record = {
          created_at: existing?.exists() ? existing.data().created_at : new Date().toISOString(),
          ...row,
          id,
          owner_id: scoped.user.uid
        };
        await setDoc(target, record, merge ? { merge: true } : undefined);
        written.push(record);
      }
      if (this._single || this._maybeSingle) return ok(written[0] || null);
      return ok(written);
    }

    async _delete() {
      const scoped = userCollection(this._table);
      if (scoped.error) return fail(scoped.error);
      if (!this._filters.length) return fail(new Error('Delete requires at least one filter'));
      const snapshot = await getDocs(query(scoped.ref, ...this._wheres()));
      const targets = matchRows(
        snapshot.docs.map((entry) => entry.data()),
        this._filters
      ).map((row) => rowDocId(row, scoped.user.uid));

      const removed = [];
      let batch = writeBatch(firestore);
      let pending = 0;
      const flush = async () => {
        if (!pending) return;
        await batch.commit();
        batch = writeBatch(firestore);
        pending = 0;
      };
      const queue = async (ref) => {
        batch.delete(ref);
        pending += 1;
        removed.push(ref.id);
        if (pending >= FIRESTORE_BATCH_LIMIT) await flush();
      };

      for (const id of targets) await queue(doc(scoped.ref, id));

      if (this._table === 'decks') {
        for (const deckId of targets) {
          for (const childTable of DECK_CHILD_TABLES) {
            const children = await getDocs(
              query(
                collection(firestore, 'users', scoped.user.uid, childTable),
                where('deck_id', '==', deckId)
              )
            );
            for (const child of children.docs) await queue(child.ref);
          }
        }
      }
      await flush();
      return ok(removed);
    }

    async _execute() {
      try {
        if (this._op === 'insert') return await this._write(false);
        if (this._op === 'upsert') return await this._write(true);
        if (this._op === 'delete') return await this._delete();
        return await this._select();
      } catch (error) {
        return fail(mapAuthError(error));
      }
    }

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    }
  }

  return {
    auth: api,
    from: (table) => new Builder(table)
  };
}
