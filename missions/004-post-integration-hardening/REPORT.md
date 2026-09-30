# Mission report: 004-post-integration-hardening

- status: **DONE**
- mission: `missions/004-post-integration-hardening/mission.md`
- started: 2026-09-30T08:09:01.023Z
- finished: 2026-09-30T08:27:04.928Z
- branch: main
- starting sha: `27574cbf74c9b734e3e3dad976a752a70e5880a4`
- ending sha: `d7aa301e31be5fd0129ad36301f79ab22d9eab92`

## Objective
Resolve three non-blocking correctness gaps found by the independent PR #64 review: pilot primitive/milestone asymmetry, response-type×purpose authoring wedge, and the unwired validateMissionContent gate.

## Commits (1)
- `d7aa301 vnext: close post-integration review findings (mission 004a)`

## Files changed vs start (11)
- `A	missions/004-post-integration-hardening/checkpoints/001-checkpoint.md`
- `A	missions/004-post-integration-hardening/mission.md`
- `M	src/vnext/contracts.js`
- `M	src/vnext/curriculum-checks.js`
- `M	src/vnext/evidence.js`
- `M	src/vnext/pilot-harness.js`
- `M	src/vnext/projection.js`
- `M	src/vnext/ui-session.js`
- `M	tests/vnext-contracts.test.mjs`
- `M	tests/vnext-curriculum.test.mjs`
- `M	tests/vnext-pilot.test.mjs`

## Verification runs (2)
- 2026-09-30T08:23:49.519Z @ `a2850ce8be3a` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790756629516-0.log)
- 2026-09-30T08:26:58.838Z @ `d7aa301e31be` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790756818821-0.log)

## Commands executed (5)
- 2026-09-30T08:09:01.043Z start: main@27574cbf74c9
- 2026-09-30T08:18:43.707Z checkpoint: cp 1
- 2026-09-30T08:23:49.520Z verify: PASS
- 2026-09-30T08:26:58.843Z verify: PASS
- 2026-09-30T08:27:04.929Z finish: done

## Checkpoints (1)
- #1 2026-09-30T08:18:43.701Z @ `27574cbf74c9` — checkpoints/001-checkpoint.md

## Acceptance criteria
- [ ] Finding A reproduced, classified; if confirmed, oracle fixed +
      regression tests for rehearsed-family transfer, novel transfer,
      conditions-violated success, and valid unaided success.
- [ ] Finding B reproduced, classified; if confirmed, incompatible
      response/purpose shapes rejected at authoring time via a reusable
      rule; valid choice combinations still accepted.
- [ ] Finding C investigated; if the gate was meant to be complete,
      `validateMissionContent` is wired into `checkCurriculum` with a
      regression test (structural-pass + content-fail → gate fails).
- [ ] All 7 shipped missions pass `checkCurriculum` and
      `validateMissionContent`.
- [ ] `npm run verify:full` green.

## Known failures
- (none recorded)

## Browser verification
no UI-visible change intended; npm run test:browser (inside verify:full) re-verifies the /vnext/ flow end-to-end

## Final result
# Mission 004 — Post-Integration Correctness Hardening

## FINDING A — pilot integrity primitive asymmetry: CONFIRMED

**Reproduction.** Two independent false alarms:

1. A `transfer_attempt` success on a family already rehearsed in a
   practiced context → engine correctly refuses `TRANSFERRED`, oracle's
   `primitiveTransfer` counted any unaided verified transfer-context
   success → `milestone=false vs primitive=true` integrity alarm.
2. A `recall_attempt` success under `repeat` support violating the
   task's `repeat_once` allowance → engine refuses `INDEPENDENT`
   (conditionsViolated), oracle's `isUnaidedVerifiedSuccess` checked
   only `answerBearing` → `independentMatchesPrimitives` false alarm.

**Root cause.** `evaluateClaim` built `mine` from *verified-only*
events and evaluated one-line predicates against each event's own
`support`. The projection instead (a) accumulates support across all
events sharing `taskId::attemptId` over the FULL log — including
unverifiable records, which still contaminate the engine's attempt
history — and (b) tracks rehearsed families from every non-transfer
context contact. An oracle scanning only verified events with
per-event support was strictly weaker AND blind to contamination.

**Fix.** `unionSupport` moved to `evidence.js` (shared predicate;
aggregation stays independent). `evaluateClaim` now replays, over the
learner's deduped canonical log: attempt-boundary support union, and
family rehearsal order (any non-transfer context rehearses a family;
a transfer success is novel iff its family was unseen at that point).
Verified-gate predicates then apply `conditionsViolated` against
`effectiveAllowedSupport`, and `delayedPasses`/`transferSuccess`/
`checkpointPass`/`primitiveTransfer` all require unaided verified
evidence. Milestone fields are never read as inputs.

**Regression tests** (`tests/vnext-pilot.test.mjs` §11): rehearsed
transfer → consistent refusal; novel transfer → consistent award;
conditions-violated success → consistent refusal; clean unaided
success → consistent award.

## FINDING B — response type × purpose compatibility: CONFIRMED

**Reproduction.** `validateTask` accepted
`{purpose:'production', response:{type:'choice'}}`; the UI's
`EVENT_TYPE_FOR` emitted `recognition_attempt`, which
`EVENT_TYPES_FOR_PURPOSE.production` forbids → `bindAttempt` threw on
every commit → error → reload → same task. Fail-closed but a
learner-facing wedge; no shipped task hit it (latent).

**Root cause.** The emitted-event-type rule lived only in the UI
session layer; the authoring gate never saw it, so it could not
reject unservable shapes.

**Fix.** `emittedEventType(purpose, responseKind)` is now a contract
in `contracts.js` — single source for (purpose, response kind) →
event type. `validateTask` rejects shapes whose emitted type the
purpose may never produce (covers production+choice, interaction+
choice — interaction_turn is not a recognition event — and any
future combination uniformly, not a one-off conditional).
`ui-session.js` delegates to the same contract.

**Regression tests** (`tests/vnext-contracts.test.mjs` §15):
production+choice rejected; diagnostic/retrieval/delayed/assessment
+ choice remain valid; shipped fixtures still validate.

## FINDING C — validateMissionContent unwired: CONFIRMED

**Reproduction.** A mission task requiring language chunks absent
from `mission.content` passed `checkCurriculum` cleanly while the
standalone `validateMissionContent` rejected it — the authoritative
gate silently omitted the content contract it clearly intends to
cover ("safe to author/ship").

**Root cause.** Layering gap: content validation existed and was
unit-tested, but `checkCurriculum` never called it.

**Fix.** `checkCurriculum` invokes `validateMissionContent` per
mission with an optional `contentPolicy` passthrough (budgets
enforced only when supplied). No duplication — content problems are
namespaced by mission tag alongside structural ones.

**Regression test** (`tests/vnext-curriculum.test.mjs` §10): a
mission passing all structural checks but smuggling undeclared
language fails the gate.

## ROOT CAUSES

- A: oracle drifted from engine semantics (verified-only scan,
  per-event support, no novelty/conditions checks).
- B: emitted-event-type knowledge lived only in UI commit path.
- C: composition gap — a validated layer never reached by the gate.

## TESTS ADDED

- `tests/vnext-pilot.test.mjs` §11 — 4 primitive-parity cases.
- `tests/vnext-contracts.test.mjs` §15 — response×purpose matrix.
- `tests/vnext-curriculum.test.mjs` §10 — content smuggle through gate.

## FILES CHANGED

- `src/vnext/evidence.js` — `unionSupport` exported (shared predicate).
- `src/vnext/projection.js` — imports shared `unionSupport`.
- `src/vnext/pilot-harness.js` — full-log union+rehearsal scan;
  conditions-aware unaided predicate; novelty in transfer primitives.
- `src/vnext/contracts.js` — `emittedEventType` contract +
  `validateTask` compatibility rejection.
- `src/vnext/ui-session.js` — delegates to `emittedEventType`.
- `src/vnext/curriculum-checks.js` — `validateMissionContent` wired,
  `contentPolicy` option.
- `tests/vnext-{pilot,contracts,curriculum}.test.mjs` — regression
  coverage.

## INVARIANTS PRESERVED

- Oracle is still an independent recomputation: it reads events,
  task/capability registry and shared predicates — never milestone
  fields.
- No evidence invariant weakened: conditionsViolated and novelty are
  now *enforced* where the oracle previously under-checked.
- All 7 shipped missions pass `checkCurriculum` unchanged.
- Browser-visible behavior unchanged (`verify:full` includes the
  /vnext/ browser flow).

## VERIFY:FULL RESULT

PASS @ a2850ce — typecheck 122 files; 25 test files (incl. all vNext
suites + swe-factory 33 checks); vite build clean; browser 25 groups
(1280px + 390px, /vnext/ flow); Firestore emulator + vNext emulator
suites PASS. Recorded via `swe:verify` → `logs/verify-*.log`.

## ENDING SHA

`a2850ce` on `devin/m004-hardening` (work commit) + artifacts commit.

## REMAINING REVIEW NOTES (backlog, out of scope)

- Equal-timestamp transfer ordering decided by id sort (canonical but
  arbitrary).
- Unverified success mints SUPPORTED → shifts planner rule 5.
- Forged `fail` events feed `lastAttemptOutcome`/remediation counters.
- `local-store.js` corrupt JSON → silent empty (dev seam only).
- Attempt+feedback written as two appends (mid-pair failure → reload
  heals; never mints wrong evidence).
- `occurred_at` unbounded vs `recorded_at` (honest-client boundary).
- RETAINED milestone broader than claim's `delayed_retrieval` probe.
- target∩support / carrier∩support role overlaps unvalidated.
- Factory acceptance checkboxes not machine-enforced.

## NEXT RECOMMENDED MISSION

#61 — Demand-driven Support Routing (per the roadmap sequence;
mission 005 adversarial curriculum/evidence audit remains queued
after it).
