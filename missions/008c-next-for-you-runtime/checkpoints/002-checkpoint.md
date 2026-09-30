<!-- stamped by swe:checkpoint -->
- checkpoint: 2
- at: 2026-09-30T17:14:30Z
- mission: 008c-next-for-you-runtime
- status: DONE (post-finish hardening — recorded manually; the factory
  refuses checkpoint/verify/finish on terminal missions)
- current sha: a6ed75d49647744134ef7fb9f5300379a59568c8 (devin/m008c-next-for-you-runtime)
- start sha: 3a0b88a2fb63aa5be0a229b211ea27109316c493
- commits since start: a6ed75d | b5d9ea0 | 1f20647 | 179aeea | 149cbd8
- dirty tracked files: none (this checkpoint + REPORT.md staged next)
---

# 008C integration hardening (post-review checkpoint 2)

## MISSION OBJECTIVE
Same as mission.md — productionize the 008B Policy-B engine. Two
integration hardening rounds landed after the original DONE report:
ChatGPT re-review found runtime-consistency and trust-boundary issues
that this checkpoint records.

## CURRENT STATE
All review findings implemented and verified:

Round 1 hardening (b5d9ea0):
- B1 live-decision lock: screen() renders the locked liveTask while
  phase=prompt; the selector runs exactly once per real selection
  (selectionStats). support/play/view/commit act on the displayed
  decision only.
- B2 two-phase consumption journal: run.selection.pendingConsumption
  persists BEFORE evidence; init() reconciles (finish / rollback /
  fail-closed); crash injection tested at every boundary.
- B3 wall-clock episode rollover removed — one persisted
  decisionEpisodeId per run; now() resolved once per selection.
- H4: localStore writeJson failures throw; memory run store deep-clones
  on every boundary.
- H5: audit records carry missionRunId + decide-time fallbacks;
  validVnextDecision demands complete provenance + sha256 digest;
  recorded_at stays out of the logical fingerprint.
- H6: run.selection pins mode + selectionPolicyVersion; ?mode=
  mismatch on an open run fails closed.
- H7: direct B0 content-coverage audit (trajectory-independent) found
  60 real authoring gaps — the differential corpus's 0 CONTENT-GAP is
  explicitly trajectory-observed only.
- H8: post-lock perf re-measured; ~285ms one-shot B0 at 2000 events
  reported as potentially UI-blocking, not "non-blocking".

Round 2 hardening (a6ed75d, re-review of b5d9ea0):
- BLOCKER-1: legacy open runs (no selection bookkeeping) are historical
  REFERENCE — B0/SHADOW reopen throws selection_mode_legacy; reference
  continues and pins the record. Selection mints WITH the run.
  selectionPolicyVersion pinned alongside mode; version drift fails
  closed (selection_policy_version_pinned).
- HIGH-2: localStore reads fail closed — absent key → fallback;
  storage-access failure or corrupt JSON throws instead of fabricating
  a blank learner.
- HIGH-3: consumption journal pins event CONTENT (canonical
  fingerprint over the stamped event); reconcile fails closed on
  partial landings, empty journals, or same-id/altered-content
  (consumption_reconcile_conflict).
- Final invariant: B0/SHADOW sessions default to a memory decision
  store — a decision can never be consumed audit-free. session.
  auditTrail() exposes the trail. REFERENCE stays audit-free.

## PROVEN FACTS
- verify:full PASS @ a6ed75d (typecheck 137 files, full unit chain,
  vite build, browser 26+5, Firestore emulator incl. decision-audit
  rules + negative provenance tests).
- Runtime suite: 60 checks.
- Differential corpus: 1483 rows — 718 MATCH, 759 EXPECTED,
  6 SAFETY-PRIOR, 0 BUG, 0 trajectory-observed CONTENT-GAP,
  0 validator violations.
- Direct coverage audit: 60 authoring gaps (remediation/assessment/
  carrier coverage) — content, not engine.

## CHANGES MADE
- src/vnext/ui-session.js: live lock, journal, episode/mode/version
  pinning, reconcile, audit-store default, auditTrail().
- src/vnext/ui/local-store.js: fail-closed reads + writes.
- src/vnext/store-memory.js: deep-cloned run records.
- src/vnext/next-for-you/selector.js: missionRunId + decide-time
  fallbacks in decisionAuditRecord.
- firestore.rules: complete provenance requirements on
  vnext_decisions.
- tests/vnext-next-for-you-runtime.test.mjs: 60 checks.
- tests/firestore-vnext-emulator.test.mjs: negative provenance matrix.
- experiments/next-for-you/differential.js: direct coverage audit.

## CURRENT TEST STATUS
All green — see PROVEN FACTS.

## CURRENT HYPOTHESIS
The runtime-consistency boundary is now honest: consumption is
crash-consistent, selection policy is pinned per run including legacy
runs, storage failures surface, and audit provenance is complete.

## OPEN PROBLEMS
- One-shot B0 ~285ms at 2000 events — potentially UI-blocking on very
  large logs; incremental state or worker offload is a follow-up.
- 60 authoring gaps (remediation/assessment/carrier coverage) are
  content work for a future mission.
- REPORT.md regenerated manually post-finish (factory is terminal on
  DONE); verify recorded at the code-final head.

## IMPORTANT FILES
- src/vnext/ui-session.js (lock, journal, pinning, reconcile)
- src/vnext/next-for-you/* (engine + selector)
- src/vnext/ui/local-store.js, src/vnext/store-memory.js (stores)
- firestore.rules, tests/firestore-vnext-emulator.test.mjs
- tests/vnext-next-for-you-runtime.test.mjs
- experiments/next-for-you/{differential,perf}.js

## NEXT EXACT ACTION
Await ChatGPT final clearance on PR #70; do not start 008D.

## CURRENT SHA
a6ed75d49647744134ef7fb9f5300379a59568c8
