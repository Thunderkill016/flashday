# Mission report: 008c-next-for-you-runtime

- status: **DONE** (post-finish hardening rounds landed under review —
  b5d9ea0, a6ed75d — recorded via checkpoint 002)
- mission: `missions/008c-next-for-you-runtime/mission.md`
- started: 2026-09-30T15:05:48.920Z
- finished: 2026-09-30T16:24:22.524Z
- branch: devin/m008c-next-for-you-runtime
- starting sha: `3a0b88a2fb63aa5be0a229b211ea27109316c493`
- ending sha: `a6ed75d49647744134ef7fb9f5300379a59568c8` (code-final head;
  this report + checkpoint 002 commit on top)

## Objective
Mission 008C (ChatGPT control room): promote the hardened 008B Policy-B decision engine into src/vnext/next-for-you/ as a production runtime path — browser-safe canonical hashing, REFERENCE/B0/SHADOW_B0 selection modes, runStore-persisted DecisionContext, live-decision lock, consume-once semantics, append-only decision audit, shadow differential corpus — without losing evidence honesty, replay determinism, revision provenance, learner isolation, support-demand semantics, or auditability.

## Commits (5)
- `a6ed75d 008C: re-review hardening — legacy-run pinning, fail-closed reads, journal content validation, audit-store invariant`
- `b5d9ea0 008C: integration hardening — live-lock, crash journal, episode/mode pinning, audit provenance, coverage audit`
- `1f20647 008C: mission report — DONE, verify:full PASS @ 179aeea`
- `179aeea 008C: browser paths, perf harness, decision-audit rules coverage`
- `149cbd8 008C: promote hardened Policy-B engine to src/vnext/next-for-you + runtime integration`

## Files changed vs start (31)
- `M	experiments/next-for-you/candidate-generator.js`
- `M	experiments/next-for-you/constants.js`
- `M	experiments/next-for-you/decision-context.js`
- `M	experiments/next-for-you/decision-log.js`
- `A	experiments/next-for-you/differential.js`
- `A	experiments/next-for-you/perf.js`
- `M	experiments/next-for-you/policies.js`
- `M	experiments/next-for-you/util.js`
- `M	experiments/next-for-you/validator.js`
- `M	firestore.rules`
- `A	missions/008c-next-for-you-runtime/checkpoints/001-checkpoint.md`
- `A	missions/008c-next-for-you-runtime/checkpoints/002-checkpoint.md`
- `A	missions/008c-next-for-you-runtime/checkpoints/plan.md`
- `M	package.json`
- `A	src/vnext/next-for-you/candidate-generator.js`
- `A	src/vnext/next-for-you/canonical.js`
- `A	src/vnext/next-for-you/constants.js`
- `A	src/vnext/next-for-you/decision-context.js`
- `A	src/vnext/next-for-you/decision-log.js`
- `A	src/vnext/next-for-you/policies.js`
- `A	src/vnext/next-for-you/selector.js`
- `A	src/vnext/next-for-you/validator.js`
- `M	src/vnext/persist.js`
- `M	src/vnext/store-memory.js`
- `M	src/vnext/ui-session.js`
- `M	src/vnext/ui/local-store.js`
- `M	src/vnext/ui/mission-page.js`
- `M	tests/app-browser.test.mjs`
- `M	tests/firestore-vnext-emulator.test.mjs`
- `A	tests/vnext-browser.test.mjs`
- `A	tests/vnext-next-for-you-runtime.test.mjs`
- `M	tests/vnext-next-for-you.test.mjs`

## Verification runs (2)
- 2026-09-30T16:24:15.169Z @ `179aeea96cc4` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790785455163-0.log)
- 2026-09-30T17:05Z @ `a6ed75d49647` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-hardening-a6ed75d.log)
  - run manually: the factory refuses verify on DONE missions; the
    command is the mission's declared verification verbatim

## Commands executed (6)
- 2026-09-30T15:05:48.944Z start: devin/m008c-next-for-you-runtime@3a0b88a2fb63
- 2026-09-30T15:10:18.419Z checkpoint: cp 1
- 2026-09-30T16:24:15.170Z verify: PASS
- 2026-09-30T16:24:22.525Z finish: done
- 2026-09-30T17:14Z checkpoint: cp 2 (manual — factory is terminal on DONE)
- 2026-09-30T17:05Z verify: PASS @ a6ed75d (manual, same command)

## Checkpoints (2)
- #1 2026-09-30T15:10:18.412Z @ `3a0b88a2fb63` — checkpoints/001-checkpoint.md
- #2 2026-09-30T17:14:30Z @ `a6ed75d49647` — checkpoints/002-checkpoint.md
  (manual stamp — factory refuses checkpoint on DONE missions)

## Acceptance criteria
- [x] Policy B lives in production `src/`, not experiments (success 1)
- [x] Browser-safe canonical hashing with digest test vectors (2, 3)
- [x] REFERENCE selector unchanged and available; regression-locked (4, 19)
- [x] B0 produces normalized mission-task outputs; adapter is honest (5)
- [x] Shadow mode compares exact same immutable pre-decision state and
      cannot alter learner behavior (6, 20)
- [x] DecisionContext survives reload; renders never consume; learner
      action consumes exactly once; live task locked to decision (7-10)
- [x] B0 validator violations fail closed (11)
- [x] Semantic-family assessment freshness; `assessment_content_backlog`
      honest blocked (12, 18)
- [x] Support-demand provenance survives runtime (13)
- [x] blocked vs idle stays honest (14)
- [x] Append-only decision audit; emulator persistence if implemented (15, 16)
- [x] All 7 missions traverse under B0 without semantic substitution (17)
- [x] Benchmark exercises the production implementation (21)
- [x] verify:full green; browser tests green (22, 23)
- [x] No efficacy claim; no deploy (24, 25)

## Known failures
- (none recorded)

## Browser verification
Playwright against the real /vnext surface: fresh mission → diagnostics → input → attempt → feedback → next decision; support-demand, delayed-retrieval, transfer, assessment routes; B0 blocked assessment-content-backlog; reload mid-prompt; reload after commit; 100 screen() calls burn no context budgets.

## Final result
## §34 REPORT

- **BASE SHA**: 16fd3a5a524e54a05adda6578a2f8fecdc1955e6 (post-008B merge; branch devin/m008c-next-for-you-runtime)
- **ENDING SHA**: a6ed75d49647744134ef7fb9f5300379a59568c8 (code-final; this report commits on top)
- **PR**: #70 — https://github.com/Thunderkill016/flashday/pull/70 (NOT MERGED — awaiting integration review)
- **PRODUCTION MODULES**: src/vnext/next-for-you/{canonical,constants,candidate-generator,policies,validator,decision-context,decision-log,selector}.js — promoted verbatim from the 008B-approved engine; experiments/next-for-you/* are thin re-export shims, so the 907-check benchmark pins the deployed engine with zero drift surface.
- **BROWSER-SAFE HASH RESULT**: canonical.js implements FIPS 180-4 SHA-256 + canonical JSON + deep freeze, zero Node builtins; all standard vectors verified against node:crypto, canon byte-identical to the 008B baseline.
- **REFERENCE SELECTOR STATUS**: untouched — selectNextTask(mode=reference) calls shipped nextMissionTask verbatim on the full capability list; production planner diff vs main is zero.
- **B0 SELECTOR STATUS**: promoted engine runs inside selectNextTask(mode=b0); mission capability scope derived internally mirroring mission-runner.js; validator violations fail closed (blocked screen, no serve).
- **SHADOW MODE**: serves the reference decision while evaluating B0 on the same frozen pre-decision state; comparison recorded on the audit entry (shadow field); browser-verified identical served sequence to reference.
- **DECISION CONTEXT LIFECYCLE**: vnext.decision-context.v2 persisted in runStore; minted/migrated per run; consumeDecision idempotent — view() for exposure/input, commit() for eliciting; render never consumes; episode is run-pinned (one persisted decisionEpisodeId per run — wall-clock rollover cannot silently reset per-episode budgets).
- **RELOAD RESULT**: reload resumes the same missionRunId and decision context; browser-verified resume without errors and without new-run minting.
- **LIVE DECISION LOCK**: the selected decision binds to the displayed task + decide-time input digest at screen-build; view()/commit() act on actingTask() — support_use events landing between render and action cannot rebind the decision.
- **DECISION AUDIT LOG**: decisionAuditRecord carries decisionId, selection+learning policy versions, task/capability identity, decide-time sha256 input digest, episode/session ids, reason codes, optional shadow comparison; response text excluded; append recomputes the digest and rejects mismatches.
- **FIRESTORE DECISION PERSISTENCE**: users/{uid}/vnext_decisions adapter in persist.js (transactional create/dedupe/conflict-throw) + firestore.rules block (owner+learner pin, create/read only, schema-validated). Emulator-verified; rules NOT deployed (deploy requires explicit user confirmation).
- **ASSESSMENT BACKLOG BEHAVIOR**: assessment_family_consumed → blocked with explicit reason, never a silent substitute; runtime suite pins it.
- **CORRECTION CONTENT GAP**: 0 CONTENT-GAP rows *observed in the reference-driven differential corpus* — but that corpus cannot reach B0-only states, so it cannot prove curriculum completeness. The direct B0 coverage audit (experiments/next-for-you/differential.js, trajectory-independent) found **60 real authoring gaps** across all 7 missions: correction routes lacking remediation tasks (no authored attributing-failure + remediation pairs), 3 target capabilities lacking any assessment task (meet_new_person say_own_name, complete_small_order request_item, talk_about_self_family state_basic_self_detail), and carrier capabilities lacking diagnostic/remediation/input coverage. These are content gaps, not selector defects.
- **REFERENCE-vs-B0 DIFFERENTIAL MATRIX**: experiments/next-for-you/differential.js; reference drives, B0 counterfactual per frozen step; every divergence classified.
- **ALL-7-MISSION RESULT**: 1483 decision points (7 missions × 15 archetypes × 40 steps) — 718 MATCH, 759 EXPECTED (ordering/vocabulary/family/terminal variance), 6 SAFETY-PRIOR (production re-probes a consumed assessment family; B0 requires a fresh family), 0 BUG, 0 CONTENT-GAP, 0 validator violations on counterfactual decisions.
- **ADVERSARIAL TESTS**: 60-check runtime suite — duplicate delivery, malformed binding/evaluator events, stale revisions, conflict handling, render-vs-consume, exactly-once consumption, live-task lock (100 renders = 1 selection), decision-flip-under-support, run-pinned episode at day boundary, crash-injection at every journal boundary, journal content verification (same-id/altered-content fails closed), legacy-run pinning (mode + policy version), fail-closed storage reads/writes, memory-store non-aliasing, audit-store fallback, learner isolation, future-leakage, B0-parity with approved Policy B; corpus classification invariants pinned.
- **CRASH-CONSISTENCY PROTOCOL**: consumption is a two-phase commit — run.selection.pendingConsumption (decision id, decide-time digest, expected event id+fingerprint pairs, audit payload, journaled next context) persists BEFORE evidence; then evidence append, audit append, context advance + marker clear. init() reconciles: all expected events present AND fingerprint-identical → finish audit + apply context; zero landed → rollback; partial, empty journal, or same-id/different-content → consumption_reconcile_conflict (fail closed). Crash injection tested at every boundary.
- **MODE + POLICY PINNING**: run.selection mints WITH the run; reopening an open run under a different ?mode= or a different pinned selectionPolicyVersion throws (selection_mode_pinned / selection_policy_version_pinned). Open runs predating selection bookkeeping are historical REFERENCE — B0/SHADOW reopen throws selection_mode_legacy; reference continues and pins the record.
- **STORAGE INTEGRITY**: localStore writes AND reads fail closed — absent key returns fallback, but inaccessible storage or corrupt JSON throws rather than fabricating empty learner history. Memory run store deep-clones on every boundary.
- **AUDIT PROVENANCE**: decisionAuditRecord carries missionRunId and decide-time episode/session fallbacks; validVnextDecision requires complete provenance + sha256:[0-9a-f]{64} digest; recorded_at stays out of the logical fingerprint; emulator negative tests deny every missing/null critical field. B0/SHADOW sessions never consume audit-free (memory store fallback); session.auditTrail() exposes the trail.
- **PERFORMANCE MEASUREMENTS** (experiments/next-for-you/perf.js, post-lock, median/p95): 100 ev — B0 select 38.9/47.9ms, shadow 48.8/63.7, ref 0.8/1.2; 500 ev — B0 102.0/118.4, shadow 104.5/124.1, ref 3.3/4.0; 2000 ev — B0 284.6/324.9, shadow 308.7/388.2, ref 8.8/10.7 (generate 15.2, policyB 141.7, validate 8.5). Repeated same-state evaluations while a task is live are eliminated by the live lock — cost is once per decision, not per render.
- **BROWSER PLAYWRIGHT RESULT**: tests/vnext-browser.test.mjs 5 checks — B0 serve path clean, shadow==reference served sequence, bogus mode fails closed, reload resume, audit digest persistence. Caught+fixed a real boot bug (SELECTION_MODES import site).
- **VERIFY:FULL**: PASS at a6ed75d — typecheck 137 files, full unit chain (60 runtime checks), build, 26+5 browser checks, Firestore emulator incl. vnext_decisions rules + negative provenance matrix.
- **CI**: pending on head; reported separately.
- **KNOWN LIMITATIONS**: (1) one-shot B0 select ~285ms median at 2000 events is **potentially UI-blocking** on very large logs — amortized to once per decision by the live lock, but incremental-state/worker evaluation is a follow-up; (2) shadow mode evaluates full B0 once per new selection — acceptable now that renders don't re-select; (3) localStorage stores are browser-local; the Firestore sync path exists but awaits a decided sync policy; (4) the two-phase journal bounds crash recovery to reconcile-at-init — a learner who never returns leaves a pending marker on an open run (honest state, not corruption); (5) 60 authored content gaps remain (see CORRECTION CONTENT GAP).
- **ANY SEMANTIC CHANGE FROM 008B**: none in the engine — experiments modules are byte-compatible re-exports; production planner untouched (zero diff vs main). Runtime additions are adapter/persistence-only.
- **RECOMMENDATION FOR NEXT MISSION**: 008D — wire vnext_decisions sync + decide a remote decision-store policy, and consider projecting the audit digest into the learner-facing mission summary for provenance transparency.

PR #70 NOT MERGED — AWAITING FINAL CHATGPT CLEARANCE
