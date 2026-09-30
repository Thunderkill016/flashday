<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T10:26:10.118Z
- mission: 007-learner-model
- status: RUNNING
- current sha: d5309a452b6efcce3805ecd822e5fff04e2155f5 (devin/m007-learner-model)
- start sha: d5309a452b6efcce3805ecd822e5fff04e2155f5
- commits since start: none
- dirty tracked files: package.json, src/vnext/planner.js
---
## MISSION OBJECTIVE

Build the vNext learner model: a pure deterministic derived read-model (per-capability achievement/evidence/support/failure/retention/transfer/assessment/uncertainty + categorical profile), rebuildable from events, learner-isolated, replay-identical, no fake mastery score, planner untouched.

## CURRENT STATE

Implementation complete, all verification green at working-tree HEAD.

## PROVEN FACTS

- `buildLearnerModel` replays the learner's verified events once: canonical sort, id-dedupe, modality gate, verifyEventTask seam — same bar as the projection.
- Milestone semantics come from `projectLearnerState`; demand lifecycle from `deriveSupportLifecycle` — the planner's own derivation (no second truth).
- Support dependency = relied (everUsed/served/pending) AND no unaided success after last reliance; pending demand issuedAt counts as reliance.
- Function-gap ledger: missed fns vs later demonstrations → unresolved/resolved/recurring.
- Uncertainty is categorical (`reasons[]` codes), never a number. `memory: 'NOT_MODELED'` — capability evidence ≠ FSRS.

## CHANGES MADE

- src/vnext/planner.js — extracted exported `deriveSupportLifecycle`; `deriveSupportDemands` wraps it (planner-facing shape unchanged).
- src/vnext/learner-model.js — NEW: buildLearnerModel + explainCapability + vnext.learner-model.v1 contract.
- tests/vnext-learner-model.test.mjs — NEW: 24 checks (19 adversarial incl. dup/reorder/foreign/stale-revision/weak-authority/Firestore-doc round-trip; 6 archetype multi-timestamp sims).
- package.json — suite wired into `npm test`.
- missions/007-learner-model/mission.md — factory definition.

## CURRENT TEST STATUS

`npm run verify:full` PASS at working tree: typecheck 126 files, all unit suites (incl. new 24 checks, audit 25, support-demand 13), vite build, browser 26 groups, Firestore emulator both suites.

## CURRENT HYPOTHESIS

Model contract holds — no planner mutation needed; lifecycle export was the only kernel change and audit suite stayed green proving zero behavior drift.

## OPEN PROBLEMS

None.

## IMPORTANT FILES

- src/vnext/learner-model.js
- src/vnext/planner.js (lifecycle export)
- tests/vnext-learner-model.test.mjs
- missions/007-learner-model/mission.md

## NEXT EXACT ACTION

Commit → `npm run swe:verify -- 007-learner-model` (JAVA_HOME set) → REPORT.md → swe:finish → push + PR → post report to ChatGPT control room.

## CURRENT SHA

Working tree on devin/m007-learner-model, base d5309a4; pre-commit.
