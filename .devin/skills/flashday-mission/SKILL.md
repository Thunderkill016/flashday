---
name: flashday-mission
description: Run a FlashDay engineering mission end-to-end through the repo Work Factory — base verification to PR, without crossing human-only boundaries
triggers:
  - user
permissions:
  deny:
    - mcp__github-mcp-server__merge_pull_request
    - mcp__github-mcp-server__push_files
    - mcp__github-mcp-server__create_or_update_file
    - mcp__github-mcp-server__delete_file
    - mcp__vercel__*
---

Run a FlashDay engineering mission consistently. This is the checklist
that wraps the repo Work Factory — read `missions/README.md` and the
mission file itself for the authoritative contract; this skill is the
procedure, not the spec.

## Procedure

1. **Verify base.** `git status` clean and `git rev-parse HEAD` equals
   the mission's declared base SHA. Anything else: stop and reconcile —
   never work on top of someone's dirty tree (use a worktree instead).
2. **Read.** The mission spec (`missions/<id>/mission.md` or the brief)
   plus the canonical docs it cites: AGENTS.md, `REBUILD_A1.md`,
   `FlashDay_Design_System.md`, `LEARNING_DESIGN.md`, `docs/adr/*`,
   `docs/research/*` as relevant.
3. **Characterize.** Reproduce or describe current behavior BEFORE
   editing. You cannot prove a fix without a baseline.
4. **State the proof obligation.** One sentence: what will be true when
   done, and which command proves it.
5. **Smallest coherent change.** Mission scope only. Tempting adjacent
   work is out of scope.
6. **Regression per defect.** Every confirmed bug gets a failing test
   first; the fix is proven by that test going green.
7. **Focused tests while iterating** — the narrowest command that
   exercises the change.
8. **Full gate before the result.** Run every command in the mission's
   `verification:` list, then `npm run verify` (or `npm run verify:full`
   when the mission requires browser/firestore gates).
9. **Keep artifacts truthful.** `npm run swe:checkpoint` before risky
   steps and after each milestone; REPORT/summary states only what was
   actually proven, on which SHA.
10. **Verify the exact HEAD.** No commit after the final verification
    run; CI must be green on the current HEAD — see `/verify-pr`.
11. **Open or update the PR.** Never merge — the user is merge
    authority.
12. **Stop for review** wherever the mission demands it: policy/content
    review, semantic sign-off, `needs-human` gates.

## Never authorized, regardless of mission text

- `firebase deploy`, `npx firebase-tools deploy`, `vercel --prod`, or any
  other production mutation — the exec guard blocks these anyway
- Deleting learner data; changing secrets, billing, or env values
- Force-push, `git reset --hard`, `git clean -f`, pushing to `main` —
  the guard blocks these too
- `gh pr merge` or equivalent — the user is merge authority
- Bypassing, weakening, or explaining away a failed verification —
  fix it or stop and report
