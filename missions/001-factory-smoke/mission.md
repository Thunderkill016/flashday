---
{
  "id": "001-factory-smoke",
  "objective": "Validate the SWE work factory end-to-end on this repository: start → checkpoint → verify → finish → report, then resume simulation. Zero product-behavior changes.",
  "verification": ["node tests/swe-factory.test.mjs"],
  "browserVerification": null
}
---

# Mission 001-factory-smoke: factory self-validation

## OBJECTIVE
Prove the factory workflow functions on FlashDay itself: state persists
to disk, checkpointing produces a resumable snapshot, verification gates
the DONE transition, and a report is generated. The repository's product
behavior must be identical before and after.

## WHY
The factory exists to run real engineering missions later; a broken
orchestration layer would silently corrupt every mission built on it.
Dogfood first (issue #62).

## INVARIANTS
- No product code changes (src/, app files, package.json untouched).
- Only missions/001-factory-smoke/ artifacts may be written.
- No deploys, no force-push, no destructive git operations.

## IN SCOPE
- missions/001-factory-smoke/ artifacts (state, checkpoints, logs, report).
- Exercise: swe:start → swe:checkpoint → swe:verify → swe:finish → swe:resume.

## OUT OF SCOPE
- Any product source change.
- Multi-mission features, auto-queueing, dashboards.

## ACCEPTANCE CRITERIA
- [ ] mission starts cleanly on a clean tree
- [ ] checkpoint is written with all required sections + stamped SHA
- [ ] swe:verify executes the required check and records PASS/FAIL
- [ ] swe:finish produces DONE and REPORT.md only after green verify
- [ ] swe:resume prints a usable context packet for a fresh session
- [ ] git diff of product files vs start SHA is empty

## VERIFICATION
- `node tests/swe-factory.test.mjs` — the factory's own suite (21 checks)
  in a throwaway repo, covering every lifecycle transition.

## BROWSER VERIFICATION
not required — headless tooling change; `npm run test:browser` untouched.

## SAFETY CONSTRAINTS
- Never force-push / reset --hard / delete branches.
- Never discard unrelated uncommitted changes.
- Verification must use the existing test suite — no invented checks.

## STOP CONDITIONS
- A factory command behaves contrary to missions/README.md.
- Any product file shows up as modified mid-mission.
- Verification cannot run in this environment.

## REPORT FORMAT
- outcome + verification evidence (SHA, run count)
- artifacts created
- resume simulation result
- known limitations
