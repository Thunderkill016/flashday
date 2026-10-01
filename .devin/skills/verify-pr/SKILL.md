---
name: verify-pr
description: Verify the current PR — exact-HEAD local gate, CI on the same SHA, PR state, unresolved limitations; never merges
triggers:
  - user
  - model
permissions:
  allow:
    - Exec(git status)
    - Exec(git diff)
    - Exec(git log)
    - Exec(git rev-parse)
    - Exec(gh pr checks)
    - Exec(gh pr view)
    - Exec(gh pr list)
    - Exec(gh pr diff)
    - Exec(npm run)
    - Exec(npm test)
    - Exec(node tests/)
---

Verify a PR before reporting it. Call the repo's own commands — do not
reimplement the Work Factory (`scripts/swe.mjs`, `missions/README.md`).
Report state; NEVER merge — the user is merge authority.

1. `git rev-parse HEAD` and `git status` — record the exact SHA and
   whether the tree is clean.
2. Run the focused checks the caller supplied, if any.
3. Run the repo-required gate: `npm run verify`, or the mission's
   `verification:` list / `npm run verify:full` when required.
4. **Commit-after-verify check** — if any commit landed after the gate
   started, verification is stale: rerun it on the current HEAD.
5. **CI on the exact HEAD** — `gh pr checks <pr>` and confirm the checks
   attach to the current head SHA (`gh pr view --json headRefOid`), not
   an older commit. Pending, failed, or stale checks are reported as
   such — never narrated past.
6. Report: PR number/URL, local HEAD SHA, gate result and the SHA it ran
   on, per-check CI status, unresolved limitations, and anything you did
   not prove.
