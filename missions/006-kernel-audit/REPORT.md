# Mission 006 — Independent Learning-Kernel Audit

## PR / SHA REVIEWED

PR #66, head `4d01ec0` (`devin/m005-support-routing`), plus the complete
vNext kernel it modifies. Reviewed independently — Mission 005's report
was not trusted; the state machine was reconstructed from code.

## SUPPORT-DEMAND STATE MACHINE (reconstructed from code)

`deriveSupportDemands` (planner.js:44) replays the learner's verified,
observed, canonical-ordered event log. Per `(targetCapabilityId|fn)`:

- issue: verified observed fail/partial on a non-support cap under an
  attributing evaluator, `missingFunctions ⊆ task.requiredFunctions`,
  a declared support cap provides the function, `cycles < maxCycles`.
- consume: ANY verified `support_attempt` on the provider cap clears
  ALL pending demands routed to that cap (capability-scoped).
- cancel: ANY verified success on the target cap clears ALL its
  pending demands (capability-scoped).
- bound: `cycles` counts consumed demands per pair across the whole
  event history — lifetime, not per-episode.

Runner: `INTENT_PURPOSES.support_demand=['support']`; `pick` selects
the first unattempted support task on the provider cap — function-blind.

## MERGE BLOCKERS / HIGH FINDINGS (all reproduced)

- **A — LIFETIME SUPPORT BAN** (planner.js:80,97,123): the cycle bound
  is per `cap|fn` over the full log. After one consumed episode and a
  genuine recovery, a re-miss 30 days later routes `retry`, never
  `support_demand`. Loop-prevention became a lifetime prohibition.
  Repro: `tests/vnext-audit-kernel.test.mjs` A / SIM-1 / SIM-4.
- **B — PROVIDER-WIDE CONSUMPTION** (planner.js:91-100): one verified
  `support_attempt` on cap S consumes EVERY pending demand routed to S,
  including demands for functions the probe never exercised. Repro: B
  (fn_b demand vanished after a fn_a probe), F.
- **C — CAPABILITY-SCOPED PROBE SELECTION** (mission-runner.js:228 +
  pick:190): `support_demand` picks the first unattempted support task
  on the cap — `plan.demand.missingFunction` is never consulted. Demand
  for fn_b was served probeA(fn_a). Combined with B-fixed consumption
  this would serve the wrong probe forever. Repro: C, C2.
- **D — CAPABILITY-WIDE CANCELLATION** (planner.js:105-110): any
  verified success on the target cap cancels all its pending demands.
  `task.time.delayed.hear` requires only `understand_clock_time` — a
  pass there cancels an `identify_spoken_number` demand with zero
  substrate evidence. Repro: D (cancelled), D2 (correct cancel still
  works).
- **I — GATE DOES NOT PROVE SERVABILITY** (curriculum-checks.js:176):
  a support cap providing `fn_b` whose only probe tests `fn_a` passes
  the gate — a declared route the runtime can never correctly serve.
  Also: a probe testing a function the cap never provides passes —
  misprovenanced substrate evidence. Repro: I, I2.

## MEDIUM / LOW FINDINGS

- **F — attribution coarseness (MEDIUM, documented assumption)**:
  `eval.choice.correct.v1` attributes ALL declared `requiredFunctions`
  on any miss; the contract does not verify that the option set
  isolates those functions. Bounded: only declared functions, only
  mission-declared providers, worst case is a wasted probe — never a
  false claim. Authoring rule: an attributing choice task must declare
  only functions its options discriminate. Documented in evaluators.js;
  no static gate possible.
- **J-note — policy-versioned cycles**: `maxCyclesPerPair` re-reads at
  every `planNext`; a policy bump retroactively reinterprets history.
  Consistent with policy versioning; noted.

## FINDINGS DISPROVED / SAFE

- **E — carrier-triggered demand: INTENDED AND SAFE.** Reproduced: a
  verified attributing miss on a carrier task routes a demand (E,
  SIM-7). Evidence semantics: attribution is task-scoped, the provider
  must be mission-declared, and the gate requires the function be
  mission-required — carrier misses surface real substrate evidence
  early without widening scope. Demands mint no claims. Documented.
- **G — mastery laundering: none found.** support_attempt mints zero
  milestones on support or target caps (G); stale task revisions cannot
  issue demands (G2); attemptId support union is task-scoped — no
  cross-task leak, and same-task same-attemptId retries correctly stay
  contaminated (G3); forged/malformed `missingFunctions` rejected at
  binder + bounded at planner (suite §2/§5).
- **H — priority/pathology**: due retrieval outranks pending demands
  (H); multi-demand order is canonical by occurredAt, not arrival (H2);
  demands cannot route to undeclared providers or across mission scope
  (H3); unservable demands are non-fatal (suite §11, C2).
- **J — replay/persistence**: duplicate event ids change nothing (J);
  JSON round-trip replays identically (J2); learner isolation holds
  (J3); pending dedupe is pair-keyed.

## LONG-HORIZON SIMULATIONS

Executed in the audit suite: gap→support→recovery→re-gap (SIM-1,
currently fails — A), two targets sharing one provider (B), one
provider two probes (C), recurring forgetful learner (SIM-4, fails — A),
support-dependent learner stays bounded (SIM-5), failed-probe loop
bounded (SIM-5), carrier-only weakness routes (SIM-7), due-retrieval
interleave (H).

## INVARIANTS VERIFIED

Append-only derivation; verified+observed+attributing gate; learner
isolation; deterministic order; support caps never free-run;
support_attempt excluded from milestone-bearing types; unknown cause →
empty missingFunctions; bounded re-issue exists (but lifetime-scoped —
defect A).

## FIXES APPLIED (minimal, function-scoped semantics)

- planner.js — `support_attempt` consumes a pending demand only when
  the probe task's `requiredFunctions` include the demand's
  `missingFunction` (B). A verified success cancels only demands whose
  function the succeeding task itself requires, and that same
  demonstrated recovery resets the pair's cycle budget — the bound is
  per unresolved episode, not lifetime (A, D). Event-id dedup added for
  replay parity with the projection (J-hardening).
- mission-runner.js — `pick` accepts `requiresFunction` and filters
  support candidates to probes that test `plan.demand.missingFunction`
  (C). An uncovered demand is skipped non-fatally, never substitutes a
  wrong probe (C2).
- curriculum-checks.js — a support cap's mission-relevant
  `providesFunctions` must each be covered by ≥1 probe's
  `requiredFunctions`; a probe testing a function the cap does not
  provide is rejected as misprovenanced (I, I2).
- tests/vnext-audit-kernel.test.mjs — the 25-check audit suite is now
  the permanent regression gate (wired into `npm test`).

## VERIFY:FULL RESULT

PASS on the fixed working tree — typecheck 124 files, all unit suites
(13-check support-demand + 25-check audit kernel + pilot/contracts/
curriculum/persist/policy/slice/ui-session/swe-factory), Vite build,
browser 26 groups at both viewports (§23 support route re-verified),
both Firestore emulator suites.

## MERGE DECISION

# REVIEW RESULT: BLOCKING DEFECTS FOUND — FIXED

Five confirmed HIGH findings (A lifetime ban, B provider-wide consume,
C wrong-probe pick, D capability-wide cancel, I gate servability) —
matching the control-room's three suspected bugs plus function-scoped
cancellation and gate coverage. All fixed on this branch; the audit
suite guards every fix. `npm run verify:full` is green.

Merge authority remains the human — PR #66 is updated for review.
