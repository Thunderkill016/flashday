# Mission report: 005-demand-support-routing

- status: **DONE**
- mission: `missions/005-demand-support-routing/mission.md`
- started: 2026-09-30T08:49:17.081Z
- finished: 2026-09-30T09:21:50.573Z
- branch: main
- starting sha: `647b5065742e880e4768fe86e389db47ec8499c5`
- ending sha: `1c9ed407c4e5df35961cfeda0350481c0c14f713`

## Objective
Implement issue #61: deterministic demand-driven support routing — evaluator missingFunctions → providesFunctions resolution → SUPPORT_DEMAND intent → scoped support probe → bounded return to target — with support evidence never minting target or support-capability mastery.

## Commits (1)
- `1c9ed40 vnext: demand-driven support routing (#61)`

## Files changed vs start (15)
- `A	missions/005-demand-support-routing/mission.md`
- `M	package.json`
- `M	src/vnext/bind.js`
- `M	src/vnext/contracts.js`
- `M	src/vnext/curriculum-checks.js`
- `M	src/vnext/evaluators.js`
- `M	src/vnext/evidence.js`
- `M	src/vnext/fixtures.js`
- `M	src/vnext/mission-runner.js`
- `M	src/vnext/planner.js`
- `M	src/vnext/policy.js`
- `M	src/vnext/ui-session.js`
- `M	src/vnext/ui/copy.js`
- `M	tests/app-browser.test.mjs`
- `A	tests/vnext-support-demand.test.mjs`

## Verification runs (1)
- 2026-09-30T09:20:55.678Z @ `1c9ed407c4e5` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790760055672-0.log)

## Commands executed (4)
- 2026-09-30T08:49:17.111Z start: main@647b5065742e
- 2026-09-30T09:14:21.891Z checkpoint: cp 1
- 2026-09-30T09:20:55.679Z verify: PASS
- 2026-09-30T09:21:50.574Z finish: done

## Checkpoints (1)
- #1 2026-09-30T09:14:21.884Z @ `647b5065742e` — checkpoints/001-checkpoint.md

## Acceptance criteria
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

## Known failures
- (none recorded)

## Browser verification
support demand is exercised through the /vnext/ browser path if the served mission surfaces it; npm run test:browser (inside verify:full) re-verifies the mission flow end-to-end at both viewports

## Final result
# Mission 005 — Demand-Driven Support Routing (#61)

## OUTCOME

DONE. Demand-driven support routing is implemented, verified, and bounded.

The full path is live: an attributing failure on a target task →
evaluator-stamped `missingFunctions` → intersection with support
capabilities' `providesFunctions` → `SUPPORT_DEMAND` planner intent →
a `support`-purpose probe task → return to the target's own teaching
path — with support evidence minting zero claims on any capability.

## STARTING SHA / ENDING SHA

- Base: `647b506` (main after PR #65 merge)
- Work commit: `1c9ed40` on `devin/m005-support-routing`
- Verified at: `1c9ed40` (`swe:verify` → `npm run verify:full` PASS)

## WHAT CHANGED

### Evaluator signal (`src/vnext/evaluators.js`)
- `EVALUATORS[*].attributesFunctions` — a contract declares whether it
  may attribute a miss to substrate functions.
- `eval.choice.correct.v1` attributes: the option set operationalizes
  the declared `requiredFunctions`, so a miss reports them as missing.
- `eval.required_functions.v1` refuses attribution: an absent produced
  function proves formulation failure, not which substrate failed —
  `missingFunctions` stays `[]` (unknown cause never routes).
- `contractAttributesFunctions(contractId)` — planner-side trust check.

### Evidence (`src/vnext/evidence.js`)
- New event type `support_attempt` — deliberately outside the
  milestone-bearing `ATTEMPT_TYPES` in `projection.js`.
- `validateEvent` rejects non-string-list `evaluation.missingFunctions`.

### Contracts (`src/vnext/contracts.js`)
- New task purpose `support`; `EVENT_TYPES_FOR_PURPOSE.support =
  ['support_attempt']`; `emittedEventType` maps it.
- `validateTask`: support tasks must elicit a response and live in a
  practiced family (probes are never held-out evidence).

### Binder (`src/vnext/bind.js`)
- `evaluation.missingFunctions` is stamped ⊆ `task.response.requiredFunctions`;
  anything outside is forged provenance → throws.

### Policy (`src/vnext/policy.js`)
- `supportDemand.maxCyclesPerPair` (default 1) — validated, versioned,
  overridable via `makePolicy`.

### Planner (`src/vnext/planner.js`)
- `deriveSupportDemands` replays the learner's canonical log:
  - **issue**: verified + observed + fail/partial on a non-support cap +
    attributing contract + `missingFunctions ∩ providesFunctions`;
  - **consume**: a later verified observed `support_attempt` on the
    routed provider spends the pair's cycle;
  - **cancel**: a later verified observed success on the target cap
    kills the pending demand (the miss resolved itself);
  - **bound**: `(targetCap, function)` cycles capped by policy — a
    spent pair falls back to normal remediation, never loops.
- `SUPPORT_DEMAND` intent at rule 3 (after resume/due-retrieval, before
  remediation) carrying `{targetCapabilityId, targetTaskId,
  missingFunction, supportCapabilityId, sourceEventId, issuedAt}`.
- Provider pick is deterministic: declared support caps that actually
  provide the missing function, most coverage of this failure's misses,
  tie-break on capability id.
- `isSupportCap` guard on every normal rule — support caps are
  demand-driven only; they cannot free-run.

### Runner (`src/vnext/mission-runner.js`)
- `INTENT_PURPOSES.support_demand = ['support']` — only a real
  support-purpose task serves a demand.
- `support` added to `REPEATABLE` — one probe may serve later distinct
  demands; bounding lives in the planner's pair-cycle cap.
- An unservable demand is a skipped intent on a support cap — recorded
  in `skippedIntents`, never fatal (support ∉ target surfaces).

### Curriculum gate (`src/vnext/curriculum-checks.js`)
- Support declarations must be real: `providesFunctions` must cover at
  least one mission task's `requiredFunctions`; each support cap must
  own ≥1 support-purpose probe; a support cap may own ONLY support
  tasks; a support-purpose task may live only on a declared support
  cap; a capability holds exactly one mission role.

### Fixtures (`src/vnext/fixtures.js`)
- `mission.meet_at_a_time` declares `reception.listen.identify_spoken_number`
  as its support route.
- Both clock-time choice tasks (`task.time.diagnostic.hear`,
  `task.time.retrieval.hear`) now declare `identify_spoken_number` in
  `requiredFunctions` — catching the number word is genuinely required.
- New probe `task.time.support.number_probe` (listening choice, new
  `TF.numberSpot` family, `eval.choice.correct.v1`).

### UI (`src/vnext/ui-session.js`, `src/vnext/ui/copy.js`)
- `commit()` stamps `evaluation.missingFunctions` from the evaluator
  result — the demand signal enters evidence at the real path.
- `PURPOSE_FRAME.support` — "Luyện phần nền" (practice the substrate),
  framed as a quick repair step back to the main task, never progress.
- `progressLines()` excludes support caps — substrate is not a goal.

## ADVERSARIAL TESTS (tests/vnext-support-demand.test.mjs — 13 checks)

- choice miss attributes declared functions; text miss yields `[]`;
  unknown contract → no attribution
- binder rejects `missingFunctions` outside `requiredFunctions` and
  non-list shapes; `validateEvent` rejects malformed entries
- fresh learner + declared support → NO demand (no free-run)
- success → no demand; empty attribution → no demand; unprovided
  function → no demand
- forged (unverifiable) event carrying `missingFunctions` → no demand
- unobserved (self-reported) failure → no demand
- stamped signal on a non-attributing contract → no demand
- demand carries target/task/event provenance; provider covers the
  actual missing function
- selector serves the probe once, then hands back to the target cap
- `support_attempt` mints zero milestones on support AND target caps
- probe consumes (pass or fail); target self-recovery cancels; pair
  bound stops re-issue; `maxCyclesPerPair: 2` allows exactly one re-issue
- stale prior substrate evidence never consumes a fresh demand
- duplicate event delivery does not double-issue
- replay-order independence + learner isolation (foreign log neither
  issues nor consumes)
- full mission trace: probe interposes exactly once, only via demand;
  substrate ends with zero claim-bearing milestones
- unservable demand → skipped intent, mission continues (non-fatal)
- curriculum gate rejects: dead `providesFunctions`, probe-less support,
  claim-bearing task on support cap, support probe on non-support cap,
  role overlap
- UI session end-to-end: commit stamps attribution → probe card
  interposes → `support_attempt` minted → mission resumes

## INVARIANTS PRESERVED

- Append-only evidence; deterministic replay by `(occurredAt, id)`.
- Support is remediation, not mastery evidence — `support_attempt` is
  not an attempt type; projections mint nothing from it.
- Transfer/retention/assessment semantics untouched; no learning
  invariant weakened (all prior suites still green).
- Learner isolation: demands re-derive per-learner from filtered events.
- Fail-closed at every seam: binder (provenance bound), verification
  (registry), attribution (contract flag), selection (mission taskIds).

## VERIFY:FULL

PASS @ `1c9ed40` — typecheck 123 files; all unit suites incl.
`vnext-support-demand` (13 checks) and `swe-factory` (33 checks);
`vite build` clean; browser 26 groups incl. the new §23 drive of
`?mission=mission.meet_at_a_time` (attributing miss → probe once →
resume); both Firestore emulator suites PASS.

Factory: `swe:verify` recorded PASS at `1c9ed40`
(`logs/verify-1790760055672-0.log`).

## BUGS FOUND DURING IMPLEMENTATION

- Initial `pickProvider` could select a provider not covering the
  specific function under consideration — fixed by filtering on actual
  `providesFunctions` membership per function.
- `deriveSupportDemands` initially lacked the `observed` gate —
  self-reported misses/consumers could route/consume support;
  aligned to the projection's observed-evidence bar.
- Stale planner comment claimed rules 1–6a could still reach support
  caps — corrected; every rule now excludes them.

## KNOWN RISKS / NOTES

- Attribution granularity is contract-coarse: a choice miss attributes
  ALL declared requiredFunctions; functions without providers simply
  produce no demand. Finer substrate isolation needs richer evaluator
  contracts later.
- `supportDemand.maxCyclesPerPair = 1` is intentionally strict — one
  probe cycle per (target, function); policy-versioned if pedagogy
  later wants more.
- Support caps keep `state: EXPOSED` after probes — honest (the learner
  did encounter the substrate); no claim-bearing milestone is minted.
- Equal-timestamp ordering, SUPPORTED-from-unverified nuance, and the
  other PR #64 review notes remain on the backlog.

## NEXT RECOMMENDED MISSION

Per the roadmap control — do NOT start Learner Model. Next: an
independent adversarial audit of the complete learning kernel
(including this routing layer) before adaptive work proceeds.
