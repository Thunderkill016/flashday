<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T18:08:05.355Z
- mission: 008d-content-surface-perf
- status: RUNNING
- current sha: b40c649ab53c43160ed469c8ab62388a81f181c3 (devin/m008d-content-surface-perf)
- start sha: a13055698506160ed13e846f3d5fd5c7f293446c
- commits since start: b40c649 008D: semantic coverage audit, clock-time remediation slice, journal digests, shared input digest
- dirty tracked files: none
---
# 008D implementation checkpoint

## MISSION OBJECTIVE
Close the B0 content surface honestly: semantic classification of the
60-row coverage audit, one complete A1 vertical slice on real authored
content, B0 selection-path profiling with duplicated work removed, and
journal fingerprints replaced by cryptographic digests — with zero
Policy-B semantic change.

## CURRENT STATE
All three workstreams implemented, tested, committed at the checkpoint
SHA. Awaiting final REPORT.md regeneration, swe verify/finish, exact-head
CI, and control-room review.

## PROVEN FACTS
- Semantic audit: 91 findings = 5 required / 21 optional / 65
  not_mintable. The naive 60-gap count was mostly false positives:
  carrier diagnostic_probe self-suppresses on missing surface; spoken
  tasks use eval.required_functions.v1 which does NOT attribute (so
  correction is structurally unreachable on production caps — a real
  semantic result, not an audit artifact); pendingPhase introduces
  eliciting-only carriers via the eliciting fallback.
- Required findings remaining: correction remediation gaps on
  reception.listen.understand_spoken_price (buy_small_item) and
  reception.listen.follow_short_direction (find_a_place); missing
  assessment tasks on production.speak.say_own_name (meet_new_person),
  interaction.request_item (complete_small_order),
  production.speak.state_basic_self_detail (talk_about_self_family).
- Vertical slice closed on reception.listen.understand_clock_time:
  authored task.time.remediation.hear completes attributing miss ->
  support demand (number probe) -> correction/refresh on authored
  remediation -> lagged delayed retest -> fresh transfer family
  (clinic) -> fresh assessment family (announcement).
- Journal holds sha256 digests over stamped event fingerprints;
  reconcile verifies content, conflict on same-id/different-content,
  no response text persisted.
- Perf: B0 @2k events ~125ms median / ~130ms p95 (was ~265-285 /
  ~302-325). One canonical digest per select (was two).
- Differential corpus post-change: 1575 rows, 772 MATCH, 797 EXPECTED,
  6 SAFETY-PRIOR, 0 BUG, 0 B0 validator violations.

## CHANGES MADE
- experiments/next-for-you/differential.js: contentCoverageAudit
  rewritten — per-cap reachability envelope (attemptable/attributable/
  exposure/eliciting/freshTransfer/freshAssessment) + INTENT_MODEL
  mirroring generator mint/servable conditions; classes
  required/optional/not_mintable/covered(+derivation); assessment
  rows dedup'd with backlog reasons.
- src/vnext/fixtures.js: authored task.time.remediation.hear (choice,
  attributing, rehearsed family, requires clock-time + number-catch
  functions); taskIds reordered so remediation precedes re-drill.
- src/vnext/ui-session.js: pendingConsumption.expectedEvents stores
  sha256 digest per stamped event; reconcile compares digests.
- src/vnext/next-for-you/selector.js: computes canonical input digest
  once (state.inputDigestHex); B0 + audit reuse it.
- src/vnext/next-for-you/policies.js: makeDecision reads the shared
  digest; standalone callers fall back to computing it.
- src/vnext/ui/mission-page.js: ?clockOffset=<ms> test seam forwarding
  to session `now` (post-lag paths reachable in one browser session).
- experiments/next-for-you/perf.js: stage-level breakdown
  (learnerModel/projection/supportLifecycle/digest/generate/policyB/
  validate/b0/shadow/reference).
- tests/vnext-next-for-you.test.mjs: correctionState uses the authored
  remediation (synthetic extras only for the repair-bound test); Z12
  full-chain slice test.
- tests/vnext-next-for-you-runtime.test.mjs: COVERAGE asserts semantic
  classes; JOURNAL-CONTENT asserts digest-only storage.
- tests/vnext-browser.test.mjs: wrong-answer + until drive options;
  post-lag remediation serve test.

## CURRENT TEST STATUS
- node tests/vnext-next-for-you.test.mjs: 907 checks + Z1-Z12 hardening
  sections — PASS (slice chain verified end-to-end on authored content)
- node tests/vnext-next-for-you-runtime.test.mjs: 63 checks — PASS
- node tests/vnext-curriculum.test.mjs: PASS (authored task satisfies
  the content contract)
- node tests/vnext-browser.test.mjs: 6 checks — PASS (incl. slice:
  post-lag miss -> authored remediation served as refresh)
- npm run typecheck: 137 files OK
- npm test: all suites PASS
- differential corpus: 0 BUG, 0 validator violations

## CURRENT HYPOTHESIS
None open — implementation phase complete.

## OPEN PROBLEMS
- Remaining required authoring debt (classified, not blocking the
  slice): 2 correction remediation tasks (spoken_price,
  short_direction) + 3 assessment tasks (say_own_name, request_item,
  state_basic_self_detail). Next-mission backlog.
- B0 select remains O(event-log) synchronous ~125ms at 2k events —
  once-per-decision, not per-render; honest limitation, no SLA.

## IMPORTANT FILES
- src/vnext/fixtures.js (authored remediation task + taskIds order)
- experiments/next-for-you/differential.js (semantic audit)
- src/vnext/ui-session.js (journal digests)
- src/vnext/next-for-you/selector.js + policies.js (shared digest)
- src/vnext/ui/mission-page.js (clockOffset seam)
- experiments/next-for-you/perf.js (stage breakdown)
- tests/vnext-next-for-you.test.mjs Z12, tests/vnext-browser.test.mjs

## NEXT EXACT ACTION
Regenerate REPORT.md in the §34 format -> npm run verify:full ->
swe:verify -> swe:finish -> push -> exact-head CI -> control-room report.

## CURRENT SHA
b40c649 (devin/m008d-content-surface-perf)
