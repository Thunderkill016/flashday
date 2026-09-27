# FlashDay — agent working notes

English-learning flashcard app (A1 course rebuild). Static multi-page Vite
build hosted on Firebase Hosting; Firebase Auth + Firestore are the whole
backend. Product scope: Học · Ôn · Hồ sơ — no library/import/dictionary.
Course content lives in `src/content/a1/` (30 lessons, validated by
`src/content/schema.js`); the learning contract is `REBUILD_A1.md` and
`FlashDay_Design_System.md` — read them before touching product behavior.

## Multi-agent workflow (Devin + Codex)

- GitHub Issues is the single task board. Claim work by labeling the issue
  `agent:codex` or `agent:devin` before starting; `needs-human` means stop
  and wait for the user.
- One agent per branch. Never commit to a branch another agent is using;
  never edit a file an open PR already touches unless coordinating in the
  PR thread. Open a PR per task; `npm run verify` must be green first.
- The user is merge authority. Agents review each other's PRs in comments
  but do not merge.
- Deploys (hosting/rules) happen only on explicit user confirmation.

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

## AI tutor (`src/ai/tutor.js`)

On-device inference only — Transformers.js running
`onnx-community/Qwen3-1.7B-ONNX` in the browser (WebGPU `q4f16`, WASM `q4`
fallback): no API key, no quota, nothing leaves the learner's device.
Qwen3-1.7B was picked as the strongest browser-viable instruct model on
Hugging Face for A1 tutoring (multilingual Vietnamese+English, public repo,
~1.1 GB one-time download, browser-cached; progress via `tutor.setStatusSink`).
If model load/generation fails the tutor marks itself dead and every AI
control falls back to the static flow — never render a dead button. Qwen3
thinking mode is suppressed (`enable_thinking:false` + `/no_think` + strip).
Structured output is enforced by prompt + `parseJson` brace-extraction — the
model is small, never trust raw replies. Test mocks go through
`window.__FLASHDAY_TUTOR__`. Do NOT add a cloud/API-key path — the user
explicitly rejected key-bound AI.

## Learning core v3 (A1-ARCH-001)

FSRS schedules **retrieval tasks**, not chunks: card id
`lessonId:chunkId@rev:taskKind` (`form_recognition`, `meaning_recall`,
`listening_recognition`, `cued_production` — `src/core/domain.js`). `rev`
is a content fingerprint (`contentRev(target)`); editing a chunk's target
mints a NEW component — the old memory is superseded, never transferred.
`src/content/revisions.js` is a generated frozen ledger of pre-fingerprint
text revisions; regenerate it with `node scripts/gen-content-revisions.mjs`
after history-changing content edits, never edit by hand.
Enrollment is staged by step (`STEP_TASKS`); `reviewLog` is the durable
truth and the ONLY path to task state — `rebuildFsrsFromLog` runs on both
local and cloud hydrate so devices converge. Legacy 2-segment `chunkKey`s
normalize to `meaning_recall` at the entry's own timestamp — never rewrite
the log. Review grades are gated on reveal (frozen pre-reveal attempt +
`attempted`/`revealed`/`aided` in the log); new (never-rated) cards are
introductions, not due work — `reviewQueue()` bounds them
(`NEW_TASK_BUDGET`, one-per-component sibling bury).
Evidence projection lives in `src/core/evidence-projection.js` (aided vs
unaided honesty rules), derived state in `src/core/learner-state.js`, and
the deterministic next-action policy in `src/core/planner.js` — AI never
chooses what the learner studies next. Full rationale:
`docs/adr/learning-core-v3.md`.

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
