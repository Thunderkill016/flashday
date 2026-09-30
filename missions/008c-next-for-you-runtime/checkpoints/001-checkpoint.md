<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T15:10:18.398Z
- mission: 008c-next-for-you-runtime
- status: RUNNING
- current sha: 3a0b88a2fb63aa5be0a229b211ea27109316c493 (devin/m008c-next-for-you-runtime)
- start sha: 3a0b88a2fb63aa5be0a229b211ea27109316c493
- commits since start: none
- dirty tracked files: none
---
# 008C integration plan (pre-production checkpoint)

## MISSION OBJECTIVE
Promote the 008B-hardened Policy-B engine into `src/vnext/next-for-you/`
with REFERENCE/B0/SHADOW_B0 runtime modes, persisted DecisionContext,
live-decision lock, consume-once semantics, decision audit + optional
Firestore persistence, shadow differential corpus — zero semantic change
from the approved 008B engine.

## RUNTIME CALL CHAIN (as observed)

```
learner action (mission-page.js button)
→ session.view()/commit()/support()/play()      ui-session.js
→ select() → nextMissionTask({learnerId,mission,tasks,capabilities,
     events,riskPriors,now,policy})              mission-runner.js
     → phase-0 declared diagnostics
     → planNext intents → pick/pickPendingPhase → ready/blocked/idle
→ bindAttempt/bindObservation                    bind.js
→ eventStore.append (dedupe/conflict)            store-memory|local-store|persist.js
→ projectLearnerState / buildLearnerModel        projection.js|learner-model.js
→ next select()
```

`liveTask` is session-local lock (never persisted; a reload drops
uncommitted work harmlessly). Run records persist via `runStore`
(memory + localStorage impls; no Firestore run store exists).
`persist.js` owns `users/{uid}/vnext_events` only.

## KEY OBSERVATIONS

1. `experiments/next-for-you/util.js` imports `node:crypto` — the ONLY
   Node dependency in the engine. Everything else is already pure ESM.
2. `generateCandidates({learnerId,events,capabilities,tasks,roles,policy,
   now,mission,decisionContext,selection})` — decisionContext defaults
   absent-safe; the engine treats it as the only session input.
3. `validateDecision(decision, {events,tasks,capabilities,roles,mission,
   learnerId,now,policy,selection,decisionContext})` → violations[].
4. `decisionInputSnapshot` + `sha256` already compute the canonical
   input digest — production needs a browser-safe sha256.
5. `policyB(state)` returns the decision record; `chosen.servableTask`
   carries the resolved task; `chosen.kind` uses experiment kinds
   (support_demand etc.); `purpose` lives on `servableTask`.
6. `ui-session.js` `screen()` already locks selection behind liveTask —
   the consumption points are `view()` (exposure) and `commit()`
   (eliciting). `support()/play()` never consume.
7. `screen()` on `idle` writes run.status='completed' — bookkeeping,
   not context mutation; kept for REFERENCE parity.
8. Benchmark consumes via `recordChoice(ctx, {...d.chosen, timestamp})`
   after the simulated learner responds — the runtime equivalent is the
   consume-on-commit path.
9. `/vnext/` page is the dedicated experimental surface — `?mode=`
   param is the deliberate B0 opt-in (§19); REFERENCE stays default.
10. Seven missions in FIXTURES (meet_new_person, order_drink,
    meet_at_a_time, complete_small_order, buy_small_item, find_a_place,
    talk_about_self_family).

## PLAN

1. `src/vnext/next-for-you/canonical.js` — NEW. canon() + pure-JS
   synchronous SHA-256 (FIPS-180-4, KAT vectors in test) + deepFreeze.
   Zero dependencies, zero node builtins.
2. Promote engine modules verbatim to `src/vnext/next-for-you/`:
   constants, decision-context, decision-log, candidate-generator,
   policies, validator — import fixes only (`../../src/vnext/` → `../`,
   `./util.js` → `./canonical.js`). decision-context gains
   `consumeDecision` (idempotent by decisionId; CONTEXT_VERSION → v2
   with tolerant load).
3. `src/vnext/next-for-you/selector.js` — NEW:
   - `SELECTION_MODES` {reference,b0,shadow_b0}
   - `selectNextTask({mode,...})` → REFERENCE returns nextMissionTask's
     exact result (byte-compatible); B0 = policyB → validateDecision →
     hard violations fail closed → adapt to legacy shape
     `{status,taskId,taskRevision,capabilityId,purpose,reason,decision}`;
     terminal: idle/blocked honest; dominant assessment-family block →
     `assessment_content_backlog` reason code.
   - SHADOW_B0: serve REFERENCE verbatim, run policyB on the same
     immutable pre-decision state, attach `shadow` comparison
     `{reference:{status,task@rev,purpose},b0:{kind,task@rev,decisionId},
     sameTask,divergenceReason}` + optional shadowSink callback.
   - `consumeDecision(ctx,decision,ts)` + `decisionAuditRecord(...)`.
4. `ui-session.js`: `selectionMode` option (default 'reference'),
   `shadowSink`, `decisionStore` options. Run record gains
   `selection:{mode,policyVersion,decisionContext}` — minted on new
   run, initialized+migrated on resume (§32). Consume points persist
   context via runStore BEFORE re-selecting; liveTask carries
   `decision`; audit record appended on consume.
5. stores: `createMemoryDecisionStore` in store-memory.js;
   `createLocalDecisionStore` in ui/local-store.js; persist.js gains
   `vnext_decisions` to/from/append/load + firestore.rules create/read
   only (committed, NOT deployed) + emulator tests.
6. `mission-page.js`: `?mode=reference|b0|shadow_b0` (default
   reference) → session options; `/vnext` only — legacy loop untouched.
7. experiments migration: promoted modules become thin re-export shims;
   benchmark/scenarios/replay repoint to src; test file imports src.
8. Tests: `tests/vnext-next-for-you-runtime.test.mjs` (§9 reload
   invariant, §15 purpose/support through real session, §25 A–R, digest
   vectors, boundary checks: no node: imports under src/, no
   experiments imports under src/vnext/).
9. `experiments/next-for-you/shadow-corpus.js` (§18): ref-vs-B0 across
   all 7 missions × state matrix, classified divergences.
10. `scripts/vnext-perf.mjs` (§22): 100/500/2000-event timings.
11. Browser suite: extend the existing /vnext section for `?mode=b0`
    paths incl. reload + render-invariance.

## STOP CONDITIONS WATCHED
- Any semantic drift discovered vs 008B Policy B → STOP + report.
- Firestore coupling unsafe → STOP before weakening design.

---

## CURRENT STATE
Mission RUNNING on devin/m008c-next-for-you-runtime @3a0b88a (branched
from main@16fd3a5). §0 inspection complete: mission-runner, ui-session,
store-memory, persist, planner, learner-model, contracts, experiments/*,
spec doc all read. Integration plan written (this file). ZERO production
code changed so far.

## PROVEN FACTS
- node:crypto in experiments/next-for-you/util.js is the only Node-only
  dependency in the decision engine; every other module is pure ESM.
- ui-session already locks selection behind liveTask; consume points are
  view() (exposure) and commit() (eliciting); support()/play() never consume.
- runStore has memory + localStorage impls; no Firestore run store exists.
- 7 fixture missions; /vnext page is the dedicated experimental surface;
  existing browser suite already walks it (app-browser.test.mjs §22).

## CHANGES MADE
missions/008c-next-for-you-runtime/mission.md + spec-source.md committed;
factory state RUNNING; branch created at exact merge SHA.

## CURRENT TEST STATUS
Baseline at branch point = main@16fd3a5 (PR #69 CI green: verify+build,
browser, Firestore emulator). No 008C code yet.

## CURRENT HYPOTHESIS
Promotion is mechanical (import rewires + canonical.js) except:
consumeDecision idempotency, run.selection persistence shape, shadow
comparison plumbing, and the B0→legacy adapter need new code.

## OPEN PROBLEMS
- Where to expose B0 selection config (per-run vs caller) — plan: run
  record `selection` block, caller passes only mode via options.
- Firestore run-store does not exist → decisionContext persists via
  runStore impls (memory/local); Firestore gets vnext_decisions audit docs.
- screen() writes run.status on idle inside a render — kept for
  REFERENCE parity; flag in report.

## IMPORTANT FILES
- src/vnext/ui-session.js (integration point)
- src/vnext/mission-runner.js (REFERENCE selector — unchanged)
- src/vnext/persist.js (vnext_decisions adapter goes here)
- experiments/next-for-you/{candidate-generator,policies,validator,
  decision-context,decision-log,constants,util}.js (promotion source)
- src/vnext/ui/mission-page.js (?mode= wiring)

## NEXT EXACT ACTION
Write src/vnext/next-for-you/canonical.js (pure-JS SHA-256 + canon +
freeze) with standard test vectors; then promote the six engine modules.

## CURRENT SHA
3a0b88a (devin/m008c-next-for-you-runtime, == main@16fd3a5 + mission files)
