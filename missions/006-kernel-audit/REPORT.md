# Mission report: 006-kernel-audit

- status: **DONE**
- mission: `missions/006-kernel-audit/mission.md`
- started: 2026-09-30T09:29:09.588Z
- finished: 2026-09-30T09:59:51.677Z
- branch: devin/m005-support-routing
- starting sha: `4d01ec0acbb29f53412e118edcf2ad78d01178f9`
- ending sha: `4ee98c4f6b40b0f7d6ffa173633585814f92cb25`

## Objective
Independent adversarial audit of the vNext learning kernel at PR #66 head — reproduce or disprove the six ChatGPT hypotheses (lifetime pair bound, multi-demand consume, wrong-probe selection, capability-wide cancel, carrier-triggered demand, attribution coarseness), attack classes A-J plus long-horizon simulations, produce the audit report first, then fix only confirmed BLOCKER/HIGH defects on this branch.

## Commits (2)
- `4ee98c4 missions: unstage 006 state.json — factory rewrites it during verify`
- `1e0cebb vnext: audit 006 — fix function-scoped demand lifecycle defects`

## Files changed vs start (8)
- `A	missions/006-kernel-audit/REPORT.md`
- `A	missions/006-kernel-audit/checkpoints/001-checkpoint.md`
- `A	missions/006-kernel-audit/mission.md`
- `M	package.json`
- `M	src/vnext/curriculum-checks.js`
- `M	src/vnext/mission-runner.js`
- `M	src/vnext/planner.js`
- `A	tests/vnext-audit-kernel.test.mjs`

## Verification runs (3)
- 2026-09-30T09:55:42.596Z @ `1e0cebb69ff5` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790762142593-0.log)
- 2026-09-30T09:57:30.407Z @ `4ee98c4f6b40` — **FAIL**
  - `npm run verify:full` → exit 1 (logs/verify-1790762250404-0.log)
- 2026-09-30T09:59:40.357Z @ `4ee98c4f6b40` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790762380353-0.log)

## Commands executed (6)
- 2026-09-30T09:29:09.611Z start: devin/m005-support-routing@4d01ec0acbb2
- 2026-09-30T09:47:48.581Z checkpoint: cp 1
- 2026-09-30T09:55:42.597Z verify: PASS
- 2026-09-30T09:57:30.408Z verify: FAIL
- 2026-09-30T09:59:40.358Z verify: PASS
- 2026-09-30T09:59:51.678Z finish: done

## Checkpoints (1)
- #1 2026-09-30T09:47:48.574Z @ `4d01ec0acbb2` — checkpoints/001-checkpoint.md

## Acceptance criteria
- Audit report exists before any fix.
- Every ChatGPT hypothesis answered with a reproduction or a disproof.
- Long-horizon simulations (8 listed cases) executed.
- verify:full green at final HEAD.

## Known failures
- (none recorded)

## Browser verification
npm run test:browser (inside verify:full) re-verifies the /vnext/ support-route drive end-to-end at both viewports

## Final result
Completed; required verification green on ending SHA.
