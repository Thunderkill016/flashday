# FlashDay — agent working notes

English-learning flashcard app. Static multi-page Vite build hosted on
Firebase Hosting; Firebase Auth + Firestore are the whole backend.
`firebase-client.js` wraps both behind a Supabase-shaped API the app
already spoke.

## Build / verify / deploy

```bash
npm run verify          # syntax checks + Node tests + vite build
npm run test:browser    # isolated local preview: quiz, mission gate, mobile layout
npm run test:firestore  # Java 21 required; isolated demo project emulator
npm run verify:full     # verify + browser + Firestore regression gates
npm run build           # emits dist/
firebase deploy --only hosting --project flashday-22ae1
firebase deploy --only firestore:rules --project flashday-22ae1
```

If `firebase` is not on PATH, use `npx --yes firebase-tools deploy …`.

Browser tests use installed Google Chrome when available, otherwise Playwright Chromium
(`npx playwright install chromium`). Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to
use another Chromium binary. Tests start their own local Vite server and fresh
preview contexts; they do not log in or write production learner data.
Firestore tests use the pinned Firebase CLI through npx and only the
`demo-flashday-test` emulator project. Java 21 is required; CI installs it.
No system JDK? A user-local Temurin JRE works:
`export JAVA_HOME="$HOME/.local/jdk/jdk-21.0.12.1+1-jre" PATH="$JAVA_HOME/bin:$PATH"`.

Single hosting site: `flashday` → canonical `https://flashday.web.app`.
The legacy `flashday-22ae1` site was removed; `public/canonical.js` still
bounces any non-canonical host (e.g. `flashday.firebaseapp.com`) to the
canonical origin, path + query preserved.

## Pages and auth flow

| Route        | File             | Role                                   |
| ------------ | ---------------- | -------------------------------------- |
| `/`          | `index.html`     | landing                                |
| `/login/`    | `login/`         | email+password, Google, reset, verify  |
| `/auth/`     | `auth/`          | OAuth redirect transition (no form)    |
| `/app/`      | `app/`           | the product; `product-bootstrap.js` guards |

Google sign-in is **popup-first** (`firebase-client.js` →
`signInWithOAuth`). If the popup is blocked/unsupported the caller goes to
`/auth/?flow=redirect`, which calls `startOAuthRedirect` **from `/auth/`** —
`signInWithRedirect` always returns to the page that started it, so the
login form must never be the initiator or the user sees it flash again.
`/auth/` tags its URL with `#return` before leaving so a storage-partitioned
browser is still recognisable on the way back.

Shared auth glue lives in `flashday-auth.mjs`
(`createFlashdayClient`, `enterApp`, `appUrl`, `authErrorMessage`,
`AUTH_MODE`, password policy). `login.js` and `auth/auth.js` must use it —
do not fork another client construction or navigate-to-app path.

## Hard-won lessons (do not relearn the expensive way)

1. **authDomain must equal the hosting origin.** If the app runs on a
   different domain than `authDomain`, the `/__/auth/*` helper iframe is
   third-party and tracker blockers / Safari ITP / Chrome partitioned
   storage silently kill popup and redirect sign-in. Hosting on Firebase
   serves the handler natively — no proxy needed.
2. **Two different allowlists.** OAuth redirect URIs live in the GCP
   console OAuth client; Firebase Auth `authorizedDomains` is a separate
   list (PATCH `identitytoolkit.googleapis.com/v2/projects/{id}/config`,
   `updateMask=authorizedDomains`). A new Hosting site needs BOTH.
3. **`String.matches()` in Firestore Rules is a FULL-string match.** A
   regex missing `$`-coverage (e.g. no `(.\d+)?(Z|±hh:mm)` tail) silently
   denied every timestamped write. When writes 403 while reads pass,
   suspect a validator before suspecting auth claims.
4. **OAuth tokens may lack `email_verified`.** Enforcing
   `request.auth.token.email_verified` in Rules denied all Google users.
   Email-verify gating stays client-side unless custom claims exist.
5. **`oobCode` is a bearer secret** — strip it from the URL on arrival
   (`history.replaceState`) and pre-validate reset codes before rendering
   the password form.
6. **`confirmPasswordReset` does not sign the user in.** Report
   "password changed, please sign in" separately from reset failures.
7. **Browser storage probing beats guessing.** `detectStorageBlocking()`
   (cloud-compat.mjs) distinguishes IndexedDB-blocked (session never
   persists → login↔app loop) from sessionStorage-blocked (OAuth handoff
   fails, email/password still works). Show the diagnostic, don't loop.
8. **Keep `canonical.js` fast and `no-cache`.** It is the origin policy
   enforcer; it must run before Firebase initialises and its updates must
   not sit in CDN cache.
9. **HTML entry points must be `no-cache`; hashed assets `immutable`.**
   Firebase Hosting's default freshness lets browsers pin a cached
   `index.html` for ~1h — which pins them to the OLD hashed JS chunks,
   so "the deploy didn't take effect" bugs appear that are really stale
   HTML. `firebase.json` now sets `Cache-Control: no-cache` on every
   page pattern (`/`, `/login`, `/login/**`, `/app`, `/app/**`, `/auth`,
   `/auth/**`, `**/*.html`) and `max-age=31536000, immutable` on
   `/assets/**`. When a "bug" exists in source but not in production,
   diff the chunk hash in `performance.getEntriesByType('resource')`
   against `dist/` before suspecting code.
10. **`INITIAL_SESSION` is a replay, not a login.** `onAuthStateChange`
    fires it immediately with the session `getSession()` already
    returned — hydrating inside the listener doubles every Firestore
    read per page load. Skip it (`event === 'INITIAL_SESSION'` → return)
    after hydrating explicitly.

## Canonical domain policy

`public/canonical.js` is `<script src>`-loaded first in every HTML entry.
Any host that isn't `flashday.web.app`, localhost, or a preview channel
(`--` in hostname) is redirected to the canonical host before anything
else runs — otherwise the auth helper iframe becomes cross-origin and
lesson #1 happens again.
