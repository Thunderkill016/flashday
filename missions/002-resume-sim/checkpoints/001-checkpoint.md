<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T06:55:48.907Z
- mission: 002-resume-sim
- status: BLOCKED
- current sha: 4d0df45c4478429571981670020ff6db5ff207a8 (devin/swe-factory-001)
- start sha: 4d0df45c4478429571981670020ff6db5ff207a8
- commits since start: none
- dirty tracked files: none
---
## MISSION OBJECTIVE
Prove a fresh session can resume a BLOCKED mission from disk artifacts
alone, then complete it.

## CURRENT STATE
BLOCKED intentionally — simulating an interrupted session (e.g. agent
process killed / context lost). This checkpoint is the resume payload.

## PROVEN FACTS
- swe:start succeeded; state.json written; status was RUNNING.
- This checkpoint transitions status to BLOCKED via --blocked.

## CHANGES MADE
None (invariant: product files untouched). Factory artifacts under
missions/002-resume-sim/ only.

## CURRENT TEST STATUS
Required check `node tests/swe-factory.test.mjs` not yet run inside
this mission — run it after resuming.

## CURRENT HYPOTHESIS
`npm run swe:resume` will print this checkpoint in full (objective, SHAs,
warnings, NEXT EXACT ACTION) and flip the mission back to RUNNING.

## OPEN PROBLEMS
- Simulated interruption only; no real defect expected.

## IMPORTANT FILES
- missions/002-resume-sim/mission.md + state.json
- scripts/swe.mjs — resume command
- tests/swe-factory.test.mjs — verification

## NEXT EXACT ACTION
`npm run swe:verify -- 002-resume-sim` → expect PASS →
`npm run swe:finish -- 002-resume-sim` → expect DONE + REPORT.md.

## CURRENT SHA
placeholder (stamped by swe:checkpoint)
