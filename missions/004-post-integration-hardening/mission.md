---
{
  "id": "004-post-integration-hardening",
  "objective": "Resolve three non-blocking correctness gaps found by the independent PR #64 review: pilot primitive/milestone asymmetry, response-type×purpose authoring wedge, and the unwired validateMissionContent gate.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "no UI-visible change intended; npm run test:browser (inside verify:full) re-verifies the /vnext/ flow end-to-end"
}
---

# Mission 004-post-integration-hardening

## OBJECTIVE
Each of the three review findings is reproduced, classified CONFIRMED or
DISPROVEN, and — if confirmed — closed by a minimal fix with regression
tests, without weakening any learning invariant.

## WHY
The independent adversarial review of PR #64 found no merge blockers but
three non-blocking correctness gaps worth fixing before the curriculum
expands:

- **A** `src/vnext/pilot-harness.js` integrity cross-checks are weaker
  than the milestone semantics they verify (`primitiveTransfer` lacks
  the novelty condition; `isUnaidedVerifiedSuccess` lacks
  `conditionsViolated`) — a false integrity alarm on legal evidence.
- **B** A `purpose: production` + `response.type: choice` task passes
  authoring validation but `bindAttempt` throws at commit — a
  fail-closed learner wedge that belongs in authoring validation.
- **C** `validateMissionContent` exists and is tested but is not invoked
  by `checkCurriculum`, so the authoritative curriculum gate can pass a
  mission that violates the declared language contract.

## INVARIANTS
- The pilot oracle stays an independent recomputation from primitive
  evidence — it may share predicates (`answerBearing`,
  `conditionsViolated`, `effectiveAllowedSupport`, `verifyEventTask`)
  but must not read milestones to verify milestones.
- No UI coercion of event types; invalid shapes are authoring errors.
- All 7 shipped missions remain valid under the strengthened gate.
- No learning invariant is weakened.

## IN SCOPE
- `src/vnext/pilot-harness.js` — primitive oracle semantics.
- `src/vnext/contracts.js` — shared emitted-event-type rule +
  `validateTask` rejection of incompatible shapes.
- `src/vnext/ui-session.js` — consume the shared rule (no local copy).
- `src/vnext/curriculum-checks.js` — wire `validateMissionContent` if
  the gap is confirmed.
- `tests/vnext-pilot.test.mjs`, `tests/vnext-contracts.test.mjs`,
  `tests/vnext-curriculum.test.mjs` — regression tests.

## OUT OF SCOPE
- #61 demand-driven support routing; new curriculum; factory V2.
- Other review notes (equal-timestamp ordering, SUPPORTED-from-unverified,
  local-store corrupt JSON, commit atomicity, occurred_at trust,
  RETAINED-vs-claim asymmetry, role overlap) — backlog only.

## ACCEPTANCE CRITERIA
- [ ] Finding A reproduced, classified; if confirmed, oracle fixed +
      regression tests for rehearsed-family transfer, novel transfer,
      conditions-violated success, and valid unaided success.
- [ ] Finding B reproduced, classified; if confirmed, incompatible
      response/purpose shapes rejected at authoring time via a reusable
      rule; valid choice combinations still accepted.
- [ ] Finding C investigated; if the gate was meant to be complete,
      `validateMissionContent` is wired into `checkCurriculum` with a
      regression test (structural-pass + content-fail → gate fails).
- [ ] All 7 shipped missions pass `checkCurriculum` and
      `validateMissionContent`.
- [ ] `npm run verify:full` green.

## VERIFICATION
- `npm run verify:full` — typecheck + all suites + build + browser +
  Firestore emulator.
- Focused during dev: `node tests/vnext-pilot.test.mjs`,
  `node tests/vnext-contracts.test.mjs`, `node tests/vnext-curriculum.test.mjs`.

## BROWSER VERIFICATION
No UI-visible change intended; `npm run test:browser` inside verify:full
re-verifies the /vnext/ mission flow at 390px + 1280px.

## SAFETY CONSTRAINTS
- Never force-push / reset --hard / delete branches.
- Never discard unrelated uncommitted changes.
- Never touch production secrets or deploy without the user.

## STOP CONDITIONS
- A finding turns out to require an architecture change to fix correctly.
- Required verification cannot run in this environment.

## REPORT FORMAT
- Per finding: CONFIRMED/DISPROVEN + root cause + regression test.
- Files changed, verify:full result, ending SHA, remaining notes,
  next recommended mission.
