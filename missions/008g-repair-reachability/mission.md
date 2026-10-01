---
{
  "id": "008g-repair-reachability",
  "objective": "Mission 008G (ChatGPT control room): replace the full-task-registry repair-channel assumption with an explicit mission@revision + capability + missing-function reachability proof — episodes stay evidence-only, reservation moves to a routing-proof layer, B0 frozen byte-identical, B1 stays shadow/experiment.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "not required — headless policy/routing change; B1 remains shadow/experiment only, production B0 serving unchanged."
}
---

# Mission 008G — Mission-Local Repair Reachability Proof

Base: `main @ e98a6e7a8e9017cb83fae4600fd160ef36084eb5` (merge of PR #74).
Full source spec: `missions/008g-repair-reachability/spec-source.md`
(ChatGPT control-room issue — authoritative).

## OBJECTIVE

`deriveCorrectionEpisodes()` currently proves "a repair channel survives"
by scanning the **full task registry** — a remediation task in another
mission can make B1 believe repair exists and reserve the current
mission's fresh retest surfaces (theoretical false dead-end / false
reservation). Replace that assumption with a machine-readable,
mission@revision + capability + per-missing-function reachability proof.

## WHY

Post-merge technical note from the 008F review: reservation semantics must
prove *the serving mission* can repair every still-missing function —
"task exists in the registry" is not "task reachable through this
mission's real policy routes". Same distinction the episode model makes
between evidence truth and routing truth.

## INVARIANTS

- B0 behavior and the frozen 1792-row B0 corpus remain byte/behavior
  identical.
- B1 stays shadow/experiment — no product-route exposure, no rollout.
- `deriveCorrectionEpisodes` stays evidence-only: episodes, missing
  functions, burned surfaces, state. It must NOT conclude which tasks
  can still serve.
- Reservation fires only when the repair proof is complete for EVERY
  unresolved function; no proof ⇒ no silent reservation.
- Append-only evidence; replay-derived; deterministic; fail-closed.

## IN SCOPE

- `src/vnext/correction-episodes.js` — remove reservation/reachability
  bookkeeping; keep evidence truth only.
- New pure routing-proof layer (e.g. `deriveMissionRepairPlan` +
  `deriveRetestReservations`) bound to missionId+revision, episodeId,
  capabilityId, remainingFunctions, witness task@revision, candidate
  kind, filter result.
- Shared deterministic mission task resolver extracted from
  candidate-generator routing (`resolveMissionTaskOptions` with
  `excludeTaskIds`) — B0 calls it with `[]` (identical behavior), B1
  proof calls it with the fresh retest set.
- `src/vnext/next-for-you/policies.js`, `validator.js`, `selector.js` —
  wire the proof layer; B1 reserves only on complete proofs.
- Tests: the 12 required attacks + metamorphic registry-invariance +
  clock-time/price/direction positive proofs + B0 parity.

## OUT OF SCOPE

- No B1 rollout, no product-route changes for B1.
- No new learner-facing content; backlog remains honest authoring debt.
- No second learner-model/projection replay; no second full
  generateCandidates pass merely for proof.
- No widening of what counts as a repair route without an explicit
  contract change (SUPPORT_DEMAND is never a repair witness).

## ACCEPTANCE CRITERIA

- [ ] `deriveCorrectionEpisodes` output carries no reservation fields.
- [ ] Repair proof binds missionId+revision, episodeId, capabilityId,
      per-function witnesses with task@revision + candidate kind +
      hard-filter result; reserve iff `complete` for every remaining fn.
- [ ] All 12 required attacks pinned by tests.
- [ ] Metamorphic: adding out-of-mission tasks to the registry changes
      neither proof, reserved ids, B1 decision, nor B1 reason code.
- [ ] clock-time / price / direction paths keep a positive
      mission-local repair proof.
- [ ] B0 corpus byte-identical; B1 differential has no unclassified rows.
- [ ] Perf: incremental overhead profiled; no second full replay or
      generateCandidates pass.
- [ ] `npm run verify:full` green; exact-head CI green.

## VERIFICATION

- `npm run verify:full` — full gate (typecheck, node suites, build,
  browser, Firestore emulator).

## SAFETY CONSTRAINTS

- Never force-push / reset --hard / delete branches.
- Never discard unrelated uncommitted changes.
- Never touch production secrets or deploy without the user.
- ChatGPT/Playwright consults are advisory only; never send secrets,
  tokens, or private learner data.

## STOP CONDITIONS

- Required verification impossible in this environment.
- The mission file contradicts observed repo reality.
- The fix requires an explicitly forbidden action.
- Scope expands beyond the declared mission.

## REPORT FORMAT

Per the control-room spec: BASE SHA, ENDING SHA, PR, OLD FAILURE MODE,
PROOF CONTRACT, MISSION TASK RESOLVER, FUNCTION-LEVEL WITNESSES,
CLOCK-TIME/PRICE/DIRECTION PROOF, the four named attacks, B0 PARITY,
B1 DIFFERENTIAL, PERFORMANCE, VERIFY:FULL, CI, WHAT IS NOW PROVEN,
KNOWN LIMITATIONS — ending "PR NOT MERGED — AWAITING CHATGPT POLICY
REVIEW".
