<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T09:47:48.561Z
- mission: 006-kernel-audit
- status: RUNNING
- current sha: 4d01ec0acbb29f53412e118edcf2ad78d01178f9 (devin/m005-support-routing)
- start sha: 4d01ec0acbb29f53412e118edcf2ad78d01178f9
- commits since start: none
- dirty tracked files: none
---
## MISSION OBJECTIVE
Independent adversarial audit of the learning kernel at PR #66 head (4d01ec0): reproduce or disprove the six control-room hypotheses, attack classes A–J + long-horizon simulations, report first, fix only confirmed BLOCKER/HIGH defects.

## CURRENT STATE
Audit complete — report written (missions/006-kernel-audit/REPORT.md). REVIEW RESULT: BLOCKING DEFECTS FOUND. Audit suite tests/vnext-audit-kernel.test.mjs reproduces 5 HIGH defects; 10 attack assertions pass clean (disproved vectors documented).

## PROVEN FACTS
- CONFIRMED A (lifetime ban): cycles keyed cap|fn over full history — recovered-then-forgotten pair can never re-route (repro: miss→probe→recovery→30d miss → 'retry' not 'support_demand').
- CONFIRMED B (multi-consume): one support_attempt on provider cap clears ALL pending demands on it, regardless of function coverage.
- CONFIRMED C (capability-scoped pick): runner serves first unattempted support task on cap; demand.missingFunction never consulted — fn_b demand got probeA.
- CONFIRMED D (capability-wide cancel): any verified success on target cap cancels all pending demands; delayed.hear (uct only) cancels the num demand.
- CONFIRMED I (gate holes): provided-but-uncovered function passes; probe testing non-provided function passes.
- DISPROVED E: carrier-origin demand is INTENDED AND SAFE — task-scoped attribution, mission-declared provider, mints nothing.
- DISPROVED: mastery laundering (G), replay/dup/isolation (J), starvation/ordering/cross-mission (H), in-episode oscillation (A2, SIM-5).
- F is MEDIUM: choice attribution is coarse but bounded to declared functions — documented authoring assumption.

## CHANGES MADE
- tests/vnext-audit-kernel.test.mjs: 25-check adversarial suite (new, currently red on the confirmed defects by design).
- missions/006-kernel-audit/mission.md + REPORT.md.

## CURRENT TEST STATUS
Audit suite: 15 pass / 10 red-by-design (A, B, C, C2, D, F, I, I2, SIM-1, SIM-4). No production code touched yet — report-first per command.

## CURRENT HYPOTHESIS
All confirmed defects share one root: demand lifecycle keyed at capability granularity instead of (cap, function, episode). Minimal fix = function-scoped consume/cancel + episode-scoped cycle budget + function-filtered probe pick + gate coverage checks.

## OPEN PROBLEMS
- C must land WITH B: function-scoped consumption + capability-scoped pick = wrong probe served forever (demand never consumed, repeatable probe re-served).
- F stays documented-assumption severity; no static gate can verify option-set isolation.

## IMPORTANT FILES
- src/vnext/planner.js (deriveSupportDemands: consume L91-100, cancel L105-110, cycles L80/97/123)
- src/vnext/mission-runner.js (pick L190-196, dispatch L226-228)
- src/vnext/curriculum-checks.js (support gate L162-195)
- tests/vnext-audit-kernel.test.mjs (audit suite → regression suite)
- missions/006-kernel-audit/REPORT.md

## NEXT EXACT ACTION
Fix deriveSupportDemands consume/cancel to be function-scoped and reset cycles on function-demonstrating recovery; add event-id dedup; filter runner pick by demand.missingFunction; add gate coverage checks; rerun audit suite to green; verify:full.

## CURRENT SHA
4d01ec0 (devin/m005-support-routing) — audit target, unmodified.
