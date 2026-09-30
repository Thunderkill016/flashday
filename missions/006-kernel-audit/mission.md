---
{
  "id": "006-kernel-audit",
  "objective": "Independent adversarial audit of the vNext learning kernel at PR #66 head — reproduce or disprove the six ChatGPT hypotheses (lifetime pair bound, multi-demand consume, wrong-probe selection, capability-wide cancel, carrier-triggered demand, attribution coarseness), attack classes A-J plus long-horizon simulations, produce the audit report first, then fix only confirmed BLOCKER/HIGH defects on this branch.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "npm run test:browser (inside verify:full) re-verifies the /vnext/ support-route drive end-to-end at both viewports"
}
---

# Mission 006 — Independent Adversarial Audit of the Learning Kernel

## OBJECTIVE

Independently attack the complete vNext learning kernel at PR #66 head
(4d01ec0), especially the Mission 005 support-routing layer, to prove or
disprove defects before merge. Report first; fix only confirmed
BLOCKER/HIGH defects on this branch.

## WHY

ChatGPT control-room command. Self-review cannot certify its own work.
Green CI is evidence, not proof. PR #66 must not merge on trust.

## INVARIANTS

- Append-only evidence; no direct state mutation.
- Support remediation never mints target or support-capability mastery.
- unknown cause -> missingFunctions = [].
- Demands only from observed, verified, attributing misses on declared
  requiredFunctions with a registered provider.
- Deterministic replay; learner isolation; fail-closed semantics.
- No lifetime ban disguised as a loop bound; one probe must not resolve
  evidence it did not test; selected probe must be justified by the
  missing function; cancellation must be function-scoped, not
  capability-scoped (to be proven or disproven by the audit).

## IN SCOPE

- evaluators, bind, evidence, contracts, projection, policy, planner,
  mission-runner, curriculum-checks, fixtures, ui-session, persistence,
  pilot harness, all vNext tests.
- Attack classes A-J from the command + long-horizon simulations.
- Minimal regression tests + minimal fixes for CONFIRMED BLOCKER/HIGH
  defects only.

## OUT OF SCOPE

- Learner Model, Next For You, any new roadmap feature.
- Merging PR #66 (human authority only).
- Refactoring beyond confirmed-defect fixes.
- Deployment of any kind.

## ACCEPTANCE CRITERIA

- Audit report exists before any fix.
- Every ChatGPT hypothesis answered with a reproduction or a disproof.
- Long-horizon simulations (8 listed cases) executed.
- verify:full green at final HEAD.

## VERIFICATION

- `npm run verify:full` — full gate incl. browser + Firestore emulator

## BROWSER VERIFICATION

The /vnext/ support-route browser drive (tests/app-browser.test.mjs §23)
must still pass inside verify:full at both viewports.

## SAFETY CONSTRAINTS

- No merge, no force-push, no deploys, no secrets in reports.
- Fixes stay on devin/m005-support-routing to update PR #66.
- ChatGPT/Playwright consults advisory only; never send secrets, tokens,
  or private learner data.

## STOP CONDITIONS

- Report produced; confirmed BLOCKER/HIGH defects fixed and verified;
  then return to ChatGPT and wait.
- A defect requiring architecture redesign beyond minimal fix: report
  and consult ChatGPT instead of expanding scope.

## REPORT FORMAT

# Mission 006 Independent Learning-Kernel Audit
PR / SHA REVIEWED / MERGE BLOCKERS / HIGH FINDINGS / MEDIUM-LOW /
SUPPORT-DEMAND STATE MACHINE / COUNTEREXAMPLES / MASTERY LAUNDERING /
LONG-HORIZON SIMULATIONS / GATE ATTACKS / REPLAY-PERSISTENCE /
INVARIANTS VERIFIED / VERIFY:FULL RESULT / MERGE DECISION
ending with REVIEW RESULT: NO BLOCKING DEFECT FOUND or
REVIEW RESULT: BLOCKING DEFECTS FOUND
