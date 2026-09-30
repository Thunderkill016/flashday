<!--
  Mission template — copy this file to missions/<id>/mission.md where
  <id> is zero-padded + slug, e.g. missions/003-firestore-indexes/mission.md.

  The JSON frontmatter is machine-parsed by scripts/swe.mjs. Required keys:
    id            — must match the directory name
    objective     — one-sentence mission goal (shown by status/resume)
    verification  — REQUIRED list of allowlisted commands the mission must
                    pass before DONE. Only these shapes run:
                      npm run <existing-package.json-script>
                      node tests/<existing-file>.mjs|.js
                      node scripts/<existing-file>.mjs|.js
                    Pick the narrowest commands that prove the acceptance
                    criteria. swe:verify runs all of them; DONE requires the
                    last run to be green on current HEAD.
    browserVerification — optional; describe the required browser check or
                    omit. Recorded verbatim in the report.
-->
---
{
  "id": "000-example",
  "objective": "One sentence: what will be true when this mission is done.",
  "verification": ["node tests/swe-factory.test.mjs"],
  "browserVerification": null
}
---

# Mission 000-example: short title

## OBJECTIVE
What will be true when this mission is done — observable, not aspirational.

## WHY
Why this work exists: the failure it fixes or the capability it unlocks.
Link issues / ADRs / docs that constrain it.

## INVARIANTS
Things that must stay true while working (e.g. "no new dependencies",
"append-only evidence", "rules stay fail-closed").

## IN SCOPE
- Files / subsystems the mission may change.
- Specific behaviors it may add or alter.

## OUT OF SCOPE
- Tempting adjacent work that must NOT happen in this mission.
- Anything a reviewer would consider scope creep.

## ACCEPTANCE CRITERIA
Checkable statements a reviewer can verify:
- [ ] criterion 1 — observable outcome
- [ ] criterion 2 — observable outcome

## VERIFICATION
The project commands that prove the criteria (mirrored in frontmatter):
- `node tests/<file>.test.mjs` — what it covers
- `npm run verify` — when full gate is required

## BROWSER VERIFICATION
If UI-visible behavior changed: what to check in the browser and how
(existing `npm run test:browser`, a manual page, a Playwright probe).
Otherwise: "not required — headless change".

## SAFETY CONSTRAINTS
- Never force-push / reset --hard / delete branches.
- Never discard unrelated uncommitted changes.
- Never touch production secrets or deploy without the user.
- ChatGPT/Playwright consults are advisory only; never send secrets,
  tokens, or private learner data.

## STOP CONDITIONS
When to stop and checkpoint --blocked instead of pushing on:
- required verification impossible in this environment
- mission file contradicts observed repo reality
- fix requires an explicitly forbidden action
- scope keeps expanding beyond the declared mission

## REPORT FORMAT
What swe:finish's report must answer:
- outcome claim + evidence (verification run(s), SHAs)
- files changed / commits
- known limitations & honest risks
- next recommended step (or "none")
