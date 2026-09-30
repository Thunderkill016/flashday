---
{
  "id": "003-vnext-stack-integration",
  "objective": "Integrate the complete vNext stack through PR #60 (head 55b2271, containing current main 0e44ad2 + rebuild/vnext line) together with the SWE Work Factory branch onto one verified integration candidate targeting main — no new features.",
  "verification": ["npm run verify:full"],
  "browserVerification": "tests/app-browser.test.mjs covers the vNext mission flow at 390px + 1280px inside verify:full"
}
---

# Mission 003: vNext stack integration

## OBJECTIVE
One integration branch containing current main + the cumulative vNext
stack through PR #60 (55b2271) + the SWE work factory, fully verified
by `npm run verify:full`, shipped as a single PR to main.

## WHY
Six stacked PRs (#48→#51→#53→#56→#58→#60) plus pre-stack merges
(#43, #46 via rebuild/vnext) hold months of evidence-engine work that
main lacks. They must land as one trustworthy unit without losing the
factory's integrity guarantees.

## INVARIANTS
- append-only evidence; attempt-only credit; supported ≠ independent;
  practiced ≠ novel transfer; policy-versioned claims; replay parity;
  learner isolation (vNext invariants 1–20 in the mission brief).
- No stacked branch is force-rewritten — this branch is new.
- R7 corrections stay superseded: no resurrected supportCapabilities,
  no fake prerequisite edges.
- Factory DONE gate must pass on final HEAD.
- Curriculum gate: do not weaken it to make integration pass.

## IN SCOPE
- integration branch + merge resolution + mission artifacts
- integration-only bug fixes with regression tests, if any surface

## OUT OF SCOPE
- #61 demand-driven support routing; new missions/capabilities; UI
  redesign; factory V2; any feature work.

## ACCEPTANCE CRITERIA
- [ ] ancestry proven: all stack tips + rebuild/vnext ⊆ 55b2271; main ⊆ stack
- [ ] one integration branch holds main + stack + factory
- [ ] package.json keeps vNext tests AND swe:* commands + factory test
- [ ] npm run verify:full green on final HEAD (typecheck, units, browser, Firestore)
- [ ] curriculum gate: 7 missions, 0 problems
- [ ] pilot harness: replay determinism, learner isolation, no integrityFailures
- [ ] integration PR to main opened; stacked PRs left open as provenance
- [ ] working tree clean; swe:finish DONE on final HEAD

## VERIFICATION
- `npm run verify:full` — the authoritative gate
- `node tests/vnext-curriculum.test.mjs` — curriculum gate during resolution
- `node tests/vnext-pilot.test.mjs` — pilot harness during resolution

## BROWSER VERIFICATION
`npm run test:browser` (inside verify:full) covers the vNext mission flow
at 390px + 1280px: baseline → support → commit → retry → reload-resume.

## SAFETY CONSTRAINTS
- Never force-push or rewrite rebuild/vnext or any devin/vnext-* branch.
- Never resolve conflicts by blanket ours/theirs — determine semantics.
- ChatGPT-via-Playwright advisory only; never send secrets.

## STOP CONDITIONS
- #60 head proven NOT cumulative (ancestry hole).
- A conflict resolution requires weakening the curriculum gate or a
  documented invariant.
- verify:full cannot run in this environment (e.g. missing Java).

## REPORT FORMAT
Per mission brief: SHAs, ancestry proof, conflict resolutions,
integration-only fixes, test counts, gate results, PR number, risks.
