<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T08:18:43.686Z
- mission: 004-post-integration-hardening
- status: RUNNING
- current sha: 27574cbf74c9b734e3e3dad976a752a70e5880a4 (main)
- start sha: 27574cbf74c9b734e3e3dad976a752a70e5880a4
- commits since start: none
- dirty tracked files: src/vnext/contracts.js, src/vnext/curriculum-checks.js, src/vnext/evidence.js, src/vnext/pilot-harness.js, src/vnext/projection.js, src/vnext/ui-session.js, tests/vnext-contracts.test.mjs, tests/vnext-curriculum.test.mjs, tests/vnext-pilot.test.mjs
---
# Checkpoint 001 — findings confirmed, fixes implemented

## MISSION OBJECTIVE
Reproduce, classify and close three non-blocking correctness gaps from
the PR #64 independent review (pilot oracle asymmetry, response×purpose
wedge, unwired content gate) — regression tests + minimal fixes, no
invariant weakened.

## CURRENT STATE
All three findings CONFIRMED by reproduction. Regression tests written
(red → green). Fixes implemented; focused suites all pass. verify:full
still to run.

## PROVEN FACTS
- A CONFIRMED: evaluateClaim scanned only verified events and skipped
  conditionsViolated + attempt-boundary union + novelty — reproduced
  false integrity alarms on (1) rehearsed-family transfer success,
  (2) repeat-violated success. Additionally the oracle under-counted
  contamination: an UNVERIFIED support_use/exposure still contaminates
  the engine's attempt history and rehearsal set, so the oracle must
  scan the full learner log, not just verified events.
- B CONFIRMED: validateTask accepted purpose 'production' +
  response.type 'choice'; ui-session's EVENT_TYPE_FOR emitted
  'recognition_attempt' which production may never produce →
  bindAttempt throws on every commit → learner-facing wedge.
- C CONFIRMED: a task requiring undeclared language passed
  checkCurriculum cleanly while validateMissionContent rejected it —
  the gate omitted the content contract entirely.
- unionSupport is a shared predicate (moved projection.js →
  evidence.js); the oracle's aggregation stays independent.

## CHANGES MADE
- src/vnext/evidence.js: unionSupport exported (moved from projection).
- src/vnext/projection.js: imports shared unionSupport; semantics
  unchanged.
- src/vnext/pilot-harness.js: union + rehearsal pass over the FULL
  canonical learner log (deduped, modality-matched); unaided predicate
  applies conditionsViolated via effectiveAllowedSupport;
  delayedPasses/transferSuccess/checkpointPass require unaided verified
  evidence; primitiveTransfer includes order-based novelty.
- src/vnext/contracts.js: emittedEventType exported as contract;
  validateTask rejects purpose×responseType incompatibilities.
- src/vnext/ui-session.js: delegates to shared emittedEventType.
- src/vnext/curriculum-checks.js: validateMissionContent wired into the
  per-mission loop with a contentPolicy passthrough.
- tests/vnext-pilot.test.mjs: §11 — rehearsed-family transfer, novel
  transfer, conditions-violated success, valid unaided success.
- tests/vnext-contracts.test.mjs: §15 — production+choice rejected,
  valid combos (diagnostic/retrieval/delayed/assessment + choice)
  preserved.
- tests/vnext-curriculum.test.mjs: §10 — smuggled-language task fails
  the gate.

## CURRENT TEST STATUS
node tests/vnext-pilot.test.mjs — PASS
node tests/vnext-contracts.test.mjs — PASS
node tests/vnext-curriculum.test.mjs — PASS
node tests/vnext.test.mjs, vnext-slice, vnext-policy, vnext-persist,
vnext-ui-session — all PASS

## CURRENT HYPOTHESIS
Remaining risk is an unexpected consumer of the strengthened predicates
(e.g. slice or ui-session flows that scripted aided probe passes now
counted as aided) — all focused suites pass, so hypothesis is clean;
verify:full is the final gate.

## OPEN PROBLEMS
None blocking. Out-of-scope review notes remain backlog (equal-timestamp
ordering, SUPPORTED-from-unverified planner nuance, local-store corrupt
JSON, commit atomicity, occurred_at trust, RETAINED-vs-claim scope,
role-overlap strictness, factory checkbox machinery).

## IMPORTANT FILES
- src/vnext/pilot-harness.js — oracle semantics
- src/vnext/contracts.js — emittedEventType + validateTask
- src/vnext/curriculum-checks.js — gate composition
- src/vnext/evidence.js — unionSupport home
- src/vnext/ui-session.js — commit path delegates to the contract
- tests/vnext-{pilot,contracts,curriculum}.test.mjs — regression cover

## NEXT EXACT ACTION
npm run verify:full → npm run swe:verify → npm run swe:finish → commit →
final report.

## CURRENT SHA
27574cb (main, post-#64 merge) — work is uncommitted on this base.
