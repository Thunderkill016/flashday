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
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  updatePassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  isIgnorableResetError,
  mapAuthError,
  matchRows,
  paginateRows,
  rowDocId,
  sortRows,
} from './cloud-compat.mjs';

// Postgres `on delete cascade` for decks -> child tables is emulated here:
// Firestore has no foreign keys, so a deck delete sweeps its children.
const DECK_CHILD_TABLES = [
  'units',
  'cards',
  'source_captures',
  'review_events',
  'learning_progress',
];

const FIRESTORE_BATCH_LIMIT = 450;

// Resending verification on every failed sign-in spams the mailbox and trips
// Firebase's email rate limits — throttle to once per page session.
const VERIFICATION_RESEND_COOLDOWN_MS = 60_000;
let lastVerificationResend = 0;

// Breadcrumb for the signInWithRedirect round-trip: the returning /login/
// uses it to render a handoff state instead of flashing the login form.
const OAUTH_PENDING_KEY = 'flashday:oauth-pending';

export function createClient(config) {
  const app = initializeApp(config);
  const auth = getAuth(app);

  // Firestore is only needed for cloud data — loading it eagerly triples the
  // JS the login page must parse before auth can even start. Dynamic-import
  // it on first use so sign-in stays light.
  let firestorePromise = null;
  async function firestore() {
    if (!firestorePromise) {
      firestorePromise = import('firebase/firestore').then((fs) => ({
        ...fs,
        db: fs.getFirestore(app),
      }));
    }
    return firestorePromise;
  }

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
      user: { id: user.uid, email: user.email || '' },
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
    const url =
      explicitUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/login/`
        : null);
    return url ? { url } : undefined;
  }

  const api = {
    signUp: async ({ email, password, options } = {}) => {
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        // The account already exists at this point — a failed verification
        // send (rate limit, bad continue URL) must not report signup failure,
        // or retrying hits "email already in use" and the learner is stuck.
        let verificationError = null;
        try {
          await sendEmailVerification(
            credential.user,
            actionCodeSettings(options?.emailRedirectTo)
          );
        } catch (error) {
          verificationError = error;
        }
        // Supabase's confirm-email flow returns no session until the address
        // is verified; mirror that so the UI keeps asking users to check mail.
        await firebaseSignOut(auth);
        const data = {
          user: { id: credential.user.uid, email: credential.user.email },
          session: null,
        };
        if (verificationError)
          data.verificationError = mapAuthError(verificationError).message;
        return ok(data);
      } catch (error) {
        return fail(error);
      }
    },

    signInWithPassword: async ({ email, password }) => {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        if (!credential.user.emailVerified) {
          // A lost verification email must not become a permanent lockout —
          // resend it (throttled) before refusing access.
          if (
            Date.now() - lastVerificationResend >
            VERIFICATION_RESEND_COOLDOWN_MS
          ) {
            lastVerificationResend = Date.now();
            try {
              await sendEmailVerification(
                credential.user,
                actionCodeSettings()
              );
            } catch (_e) {
              /* rate-limited resends still surface the same sign-in error */
            }
          }
          await firebaseSignOut(auth);
          return fail(new Error('Email not confirmed'));
        }
        return ok({
          user: credential.user,
          session: await sessionFor(credential.user),
        });
      } catch (error) {
        return fail(error);
      }
    },

    signInWithOAuth: async ({ provider }) => {
      if (provider !== 'google')
        return fail(new Error('Provider is not enabled'));
      const googleProvider = new GoogleAuthProvider();
      try {
        // Popup-first: the credential arrives in the same call, no dependence
        // on sessionStorage surviving a cross-origin navigation — which is
        // exactly where redirect sign-in loses its state (privacy browsers,
        // storage partitioning, cross-tab handoffs).
        const credential = await signInWithPopup(auth, googleProvider);
        return ok({
          user: credential.user,
          session: await sessionFor(credential.user),
        });
      } catch (error) {
        const code = String(error?.code || '');
        if (
          code === 'auth/popup-closed-by-user' ||
          code === 'auth/cancelled-popup-request'
        ) {
          // Ambiguous: the learner may have closed the popup on purpose, OR
          // the popup completed Google sign-in but the auth-domain iframe
          // could not deliver the event back (tracker-blockers, strict ETP).
          // Flag it so the UI can warn instead of dying silently.
          return ok({ cancelled: true });
        }
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment'
        ) {
          // If the round-trip survives, the marker lets /login/ skip the form
          // flash; if storage is blocked it just never appears — no harm.
          try {
            sessionStorage.setItem(OAUTH_PENDING_KEY, '1');
          } catch (_e) {
            /* storage-blocked browsers lose the marker, same as the state */
          }
          await signInWithRedirect(auth, googleProvider);
          // The page is already navigating away; flag it so the UI can show
          // a handoff message in the remaining moments.
          return ok({ redirecting: true });
        }
        return fail(error);
      }
    },

    resetPasswordForEmail: async (email, { redirectTo } = {}) => {
      try {
        await sendPasswordResetEmail(
          auth,
          email,
          actionCodeSettings(redirectTo)
        );
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
        // A signed-in user's cached token still carries the pre-action claims
        // (e.g. email_verified=false) — force-refresh so Rules and the UI see
        // the new state immediately instead of failing for up to an hour.
        if (auth.currentUser) {
          await auth.currentUser.reload();
          await auth.currentUser.getIdToken(true);
        }
        return ok();
      } catch (error) {
        return fail(error);
      }
    },

    // Pre-validates a reset link before the form renders, so expired/used
    // codes fail fast ("send a new link") instead of after the learner has
    // already typed and confirmed a new password.
    checkPasswordResetCode: async (oobCode) => {
      try {
        return ok({ email: await verifyPasswordResetCode(auth, oobCode) });
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
        try {
          const credential = await signInWithEmailAndPassword(
            auth,
            email,
            newPassword
          );
          return ok({
            user: credential.user,
            session: await sessionFor(credential.user),
          });
        } catch (_reloginError) {
          // The password already changed — only the automatic re-login failed
          // (rate limit, network). Reporting a reset failure here would tell
          // the learner to retry a link that no longer exists.
          return ok({ passwordChanged: true, email });
        }
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
        const event = initial
          ? 'INITIAL_SESSION'
          : user
            ? 'SIGNED_IN'
            : 'SIGNED_OUT';
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
    },
  };

  async function userCollection(table) {
    const user = auth.currentUser;
    if (!user) return { error: new Error('Not authenticated') };
    const fs = await firestore();
    return { user, fs, ref: fs.collection(fs.db, 'users', user.uid, table) };
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

    _wheres(fs) {
      // owner_id is implied by the users/{uid}/ path scope, so it never needs
      // a Firestore where clause; every other eq filter does double duty as a
      // server-side where plus an in-memory match for exact parity.
      return this._filters
        .filter(({ column }) => column !== 'owner_id')
        .map(({ column, value }) => fs.where(column, '==', value));
    }

    async _select() {
      const scoped = await userCollection(this._table);
      if (scoped.error) return fail(scoped.error);
      const snapshot = await scoped.fs.getDocs(
        scoped.fs.query(scoped.ref, ...this._wheres(scoped.fs))
      );
      let rows = snapshot.docs.map((entry) => entry.data());
      rows = sortRows(matchRows(rows, this._filters), this._orders);
      rows = paginateRows(rows, this._range, this._limit);
      if (this._single) {
        if (!rows.length) return fail(new Error('Results contain 0 rows'));
        return ok(rows[0]);
      }
      if (this._maybeSingle) {
        if (rows.length > 1)
          return fail(
            new Error('JSON object requested, multiple rows returned')
          );
        return ok(rows[0] || null);
      }
      return ok(rows);
    }

    async _write(merge) {
      const scoped = await userCollection(this._table);
      if (scoped.error) return fail(scoped.error);
      const fs = scoped.fs;
      const written = [];
      for (const row of this._rows) {
        const id = rowDocId(row, scoped.user.uid) || crypto.randomUUID();
        const target = fs.doc(scoped.ref, id);
        // Merged upserts must preserve the original created_at — the security
        // rules treat it as write-once.
        const existing = merge ? await fs.getDoc(target) : null;
        if (merge && this._ignoreDuplicates && existing?.exists()) continue;
        const record = {
          created_at: existing?.exists()
            ? existing.data().created_at
            : new Date().toISOString(),
          ...row,
          id,
          owner_id: scoped.user.uid,
        };
        await fs.setDoc(target, record, merge ? { merge: true } : undefined);
        written.push(record);
      }
      if (this._single || this._maybeSingle) return ok(written[0] || null);
      return ok(written);
    }

    async _delete() {
      const scoped = await userCollection(this._table);
      if (scoped.error) return fail(scoped.error);
      if (!this._filters.length)
        return fail(new Error('Delete requires at least one filter'));
      const fs = scoped.fs;
      const snapshot = await fs.getDocs(
        fs.query(scoped.ref, ...this._wheres(fs))
      );
      const targets = matchRows(
        snapshot.docs.map((entry) => entry.data()),
        this._filters
      ).map((row) => rowDocId(row, scoped.user.uid));

      const removed = [];
      let batch = fs.writeBatch(fs.db);
      let pending = 0;
      const flush = async () => {
        if (!pending) return;
        await batch.commit();
        batch = fs.writeBatch(fs.db);
        pending = 0;
      };
      const queue = async (ref) => {
        batch.delete(ref);
        pending += 1;
        removed.push(ref.id);
        if (pending >= FIRESTORE_BATCH_LIMIT) await flush();
      };

      for (const id of targets) await queue(fs.doc(scoped.ref, id));

      if (this._table === 'decks') {
        for (const deckId of targets) {
          for (const childTable of DECK_CHILD_TABLES) {
            const children = await fs.getDocs(
              fs.query(
                fs.collection(fs.db, 'users', scoped.user.uid, childTable),
                fs.where('deck_id', '==', deckId)
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
    from: (table) => new Builder(table),
  };
}
