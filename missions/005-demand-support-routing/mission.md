---
{
  "id": "005-demand-support-routing",
  "objective": "Implement issue #61: deterministic demand-driven support routing — evaluator missingFunctions → providesFunctions resolution → SUPPORT_DEMAND intent → scoped support probe → bounded return to target — with support evidence never minting target or support-capability mastery.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "support demand is exercised through the /vnext/ browser path if the served mission surfaces it; npm run test:browser (inside verify:full) re-verifies the mission flow end-to-end at both viewports"
}
---

# Mission 005-demand-support-routing (#61)

## OBJECTIVE
When a learner fails a target task and the evaluator can attribute the
miss to a declared function substrate, the planner mints a bounded
SUPPORT_DEMAND that routes a pre-authored support probe, then returns
the learner to the target's normal path. Support is demand-driven only —
it never free-runs and never mints claim-bearing evidence.

## WHY
Issue #61 / ChatGPT Mission 005 instruction. R7 removed dead
supportCapabilities declarations; this mission installs the actual
mechanism so demand-routed support is real.

## INVARIANTS
- `missingFunctions` is evidence-grounded: only evaluator contracts that
  directly probe the declared functions may attribute a miss; unknown
  cause → `missingFunctions = []`; entries are always ⊆ the task's
  `response.requiredFunctions`.
- `support_attempt` events mint NO milestones on any capability —
  support work is remediation context, not ability proof; it can never
  produce target or support-capability INDEPENDENT/RETAINED/TRANSFERRED.
- Support-role capabilities receive no normal planner intents; only an
  unresolved demand routes them.
- Demands are bounded: one support cycle per (target capability,
  function); a spent demand never re-fires.
- Demand source/consumer events must verify against the registry —
  forged missingFunctions or unverified support attempts cannot create
  or satisfy demand.
- Replay determinism: demands derive from the canonical event order.

## IN SCOPE
- `src/vnext/evidence.js` — `support_attempt` event type.
- `src/vnext/evaluators.js` — `missingFunctions` signal +
  attribution-capable contract marking.
- `src/vnext/contracts.js` — `support` purpose, event-type mapping,
  task validation, emittedEventType.
- `src/vnext/bind.js` — stamp `evaluation.missingFunctions` bounded to
  declared requiredFunctions.
- `src/vnext/planner.js` — demand derivation + `support_demand` intent;
  support caps exempted from normal intents.
- `src/vnext/mission-runner.js` — intent→purpose mapping, repeatable,
  non-fatal skip.
- `src/vnext/curriculum-checks.js` — support role gate checks.
- `src/vnext/policy.js` — `supportDemand.maxCyclesPerPair` knob.
- `src/vnext/ui-session.js`, `src/vnext/ui/copy.js` — commit path +
  honest copy for support steps.
- `src/vnext/fixtures.js` — activate the documented number-support route
  on `mission.meet_at_a_time` only.
- New `tests/vnext-support-demand.test.mjs` + additions to existing
  vnext suites.

## OUT OF SCOPE
- Learner Model, Next For You, fluency, new SRS, AI diagnosis.
- Broad curriculum expansion; factory V2.
- Backlog review notes from mission 004.

## ACCEPTANCE CRITERIA
- [ ] missingFunctions deterministic, bounded, empty when unattributable.
- [ ] Provider resolution deterministic (coverage then id), fail-safe
      when no provider.
- [ ] SUPPORT_DEMAND carries provenance (target cap, source task,
      function, provider) and cannot free-run.
- [ ] Support success mints no milestones on target or support cap.
- [ ] Support consumed → target retries under normal contract; failed
      support → bounded explicit state (maxCyclesPerPair).
- [ ] Curriculum gate: support∩(targets|carriers|prereqs) rejected;
      provider-coverage + routable-probe required; support caps only
      hold support-purpose tasks.
- [ ] 15 adversarial cases covered; replay/dup/foreign-learner safety.
- [ ] All 7 missions valid (meet_at_a_time intentionally activates the
      number-support route).
- [ ] `npm run verify:full` green; factory DONE gate passes.

## STOP CONDITIONS
- Attributing comprehension misses honestly requires richer evidence
  than the event log carries (then scope shrinks to choice probes only).
- The mission would force weakening an existing learning invariant.

## VERIFICATION
- `npm run verify:full` — typecheck + all suites + build + browser +
  Firestore emulator.
- Focused during dev: `node tests/vnext-support-demand.test.mjs` plus
  the existing vnext evaluator/planner/curriculum/pilot/ui-session
  suites.

## BROWSER VERIFICATION
The /vnext/ mission flow is re-verified end-to-end at 390px + 1280px by
`npm run test:browser` inside verify:full; support steps render through
the generic task screen with an honest 'practice substrate' frame.

## SAFETY CONSTRAINTS
- Never force-push / reset --hard / delete branches.
- Never discard unrelated uncommitted changes.
- Never touch production secrets or deploy without the user.
- Do not merge — the user is merge authority.

## REPORT FORMAT
CURRENT PIPELINE BEFORE CHANGE / MISSINGFUNCTIONS SEMANTICS /
SUPPORT RESOLUTION RULE / SUPPORT_DEMAND CONTRACT / EVIDENCE INVARIANTS /
MISSIONS UPDATED / ADVERSARIAL TESTS / SIMULATION RESULT /
BROWSER RESULT / VERIFY:FULL RESULT / ENDING SHA / KNOWN LIMITATIONS /
NEXT RECOMMENDED MISSION
