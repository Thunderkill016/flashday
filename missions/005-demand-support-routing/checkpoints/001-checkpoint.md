<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T09:14:21.869Z
- mission: 005-demand-support-routing
- status: RUNNING
- current sha: 647b5065742e880e4768fe86e389db47ec8499c5 (main)
- start sha: 647b5065742e880e4768fe86e389db47ec8499c5
- commits since start: none
- dirty tracked files: package.json, src/vnext/bind.js, src/vnext/contracts.js, src/vnext/curriculum-checks.js, src/vnext/evaluators.js, src/vnext/evidence.js, src/vnext/fixtures.js, src/vnext/mission-runner.js, src/vnext/planner.js, src/vnext/policy.js, src/vnext/ui-session.js, src/vnext/ui/copy.js, tests/app-browser.test.mjs
---
## MISSION OBJECTIVE
Demand-driven support routing (#61): target miss → evaluator-attributed missingFunctions → providesFunctions → SUPPORT_DEMAND → scoped probe → return to target. Support evidence mints nothing.

## CURRENT STATE
All production layers implemented and green. Adversarial suite (13 checks) written and passing. Browser section added; npm test chain wired.

## PROVEN FACTS
- support_attempt is a registered event type outside ATTEMPT_TYPES — projection mints zero milestones on it (verified on target AND substrate caps).
- eval.choice.correct.v1 attributes misses to declared requiredFunctions; eval.required_functions.v1 refuses (missingFunctions stays []).
- Binder rejects missingFunctions ∉ requiredFunctions (forged provenance) and non-list shapes.
- Demand requires: verified event + observed + attributing contract + provider covering the function. Fresh learner never routes to support.
- Demand lifecycle: probe consumes (pass or fail), target success cancels, per-pair cycle bound (policy supportDemand.maxCyclesPerPair=1).
- Unservable demand → skipped intent, non-fatal.
- Gate rejects dead providesFunctions, probe-less support, claim-bearing probes, misplaced probes, role overlap.
- UI path verified end-to-end: commit stamps missingFunctions → probe interposes → mission resumes.

## CHANGES MADE
- evidence.js: support_attempt event type + validateEvent missingFunctions shape check
- evaluators.js: attributesFunctions flag; missingFunctions signal (choice attributes, text does not)
- contracts.js: 'support' purpose, EVENT_TYPES_FOR_PURPOSE.support=['support_attempt'], emittedEventType support→support_attempt, validateTask support rules
- bind.js: missingFunctions stamped, bounded to requiredFunctions
- policy.js: supportDemand.maxCyclesPerPair
- planner.js: deriveSupportDemands + SUPPORT_DEMAND intent (rule 3) + isSupportCap guards on every normal rule
- mission-runner.js: INTENT_PURPOSES.support_demand=['support'], support in REPEATABLE
- curriculum-checks.js: support-role declarations validated (coverage, probe presence, no claim purposes, role exclusivity, misplaced probes)
- fixtures.js: identify_spoken_number required on two clock-time choice tasks; numberSpot signature; number_probe task; supportCapabilities activated on meet_at_a_time
- ui/copy.js: support frame 'Luyện phần nền' — honest non-progress wording
- ui-session.js: missingFunctions wired through commit; support caps excluded from progress lines
- tests/vnext-support-demand.test.mjs: 13-check adversarial suite (new)
- tests/app-browser.test.mjs: browser drive of the demand route (new §23)
- package.json: new suite wired into npm test

## CURRENT TEST STATUS
- tests/vnext-support-demand.test.mjs: 13 checks PASS
- All vNext suites + swe-factory PASS; typecheck 123 files OK
- verify:full NOT yet run at final state

## CURRENT HYPOTHESIS
Implementation complete. Remaining: full gate, checkpoint commit, swe verify, report, PR.

## OPEN PROBLEMS
- None blocking. Attribution granularity is contract-coarse (choice attributes ALL declared fns; unprovided fns produce no demand) — documented, acceptable for v0.

## IMPORTANT FILES
src/vnext/{evidence,evaluators,contracts,bind,policy,planner,mission-runner,curriculum-checks,fixtures,ui-session}.js, src/vnext/ui/copy.js, tests/vnext-support-demand.test.mjs, tests/app-browser.test.mjs, package.json

## NEXT EXACT ACTION
Run npm run verify:full; then commit, swe:verify, report, swe:finish, push, PR.

## CURRENT SHA
647b506 + uncommitted mission-005 changes
