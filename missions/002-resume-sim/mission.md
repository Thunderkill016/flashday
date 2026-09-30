---
{
  "id": "002-resume-sim",
  "objective": "Demonstrate resume: simulate an interrupted mission (BLOCKED), verify swe:resume reconstructs the full context packet for a fresh session, then complete it.",
  "verification": ["node tests/swe-factory.test.mjs"],
  "browserVerification": null
}
---

# Mission 002-resume-sim: resume behavior simulation

## OBJECTIVE
A fresh session can reconstruct working state from mission definition +
latest checkpoint + git state alone. Zero product changes.

## WHY
Resume is the factory's core guarantee — without it, state dies with
the session (issue #62).

## INVARIANTS
- No product code changes.
- Only missions/002-resume-sim/ artifacts written.

## IN SCOPE
- start → checkpoint --blocked → swe:resume → verify → finish.

## OUT OF SCOPE
- Product code, multi-mission scheduling.

## ACCEPTANCE CRITERIA
- [ ] BLOCKED checkpoint records the pause reason + next action
- [ ] swe:resume prints objective, SHAs, warnings, full last checkpoint
- [ ] resume unblocks the mission back to RUNNING
- [ ] mission completes DONE after verification

## VERIFICATION
- `node tests/swe-factory.test.mjs`

## BROWSER VERIFICATION
not required — headless tooling.

## SAFETY CONSTRAINTS
- No force-push, no discarding unrelated changes.

## STOP CONDITIONS
- Resume output missing a reconstructable next action.

## REPORT FORMAT
- resume packet captured, unblocking evidence, completion result.
