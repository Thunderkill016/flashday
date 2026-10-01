# Mission 008G — Mission-Local Repair Reachability Proof — REPORT

## §0 Identity

- **Base SHA**: `e98a6e7a8e9017cb83fae4600fd160ef36084eb5` (main @ merge of PR #74)
- **Ending SHA**: `5b4f0ae7811d39c81576b71bb13a8a22b54b4abe` (implementation HEAD at
  `swe:verify` time; final head may gain doc/checkpoint commits on top)
- **Branch**: `devin/m008g-repair-reachability`
- **PR**: opened after finish — see §CI (not merged; user is merge authority)

## §1 Old failure mode

`deriveCorrectionEpisodes()` owned `retestReservedTaskIds` and decided
"repair channel survives" by scanning the **full task registry**:

```js
(tasks ?? []).some((t) =>
  t.capabilityId === ep.capabilityId &&
  (t.response?.requiredFunctions ?? []).some((f) => remainingOf(ep).includes(f)) &&
  (t.purpose === 'remediation' || burned.has(t.id)))
```

A remediation task in **another mission's** taskIds made B1 believe repair
existed and reserve this mission's fresh retest surfaces — existence in the
registry was treated as reachability. Equally, a task the live routes could
never serve satisfied the check.

## §2 Proof contract

`vnext.mission-repair-proof.v1` — `deriveMissionRepairPlan({episode, mission,
tasks, candidates, resolver, selection, decisionContext, pendingDemands,
roles, episodes, hardFilter})` in `src/vnext/next-for-you/repair-proof.js`.
Machine-readable plan bound to `missionId` + `missionRevision` + `episodeId`
+ `capabilityId` + `remainingFunctions[]`, with `witnesses[fn][]`, `required`,
`complete`, `reserved`, `reasonCode`.

Reservation table (per episode state):
`OPEN` → never reserved (a probe success may legitimately BE the repair) ·
`REPAIRING`/`RELAPSED` → reserved **iff** ∀ missing fn ∃ clean witness ·
`REPAIRED_WAITING` → reserved directly (repair already demonstrated) ·
`RETEST_DUE`/`VERIFIED` → nothing.

## §3 Mission task resolver

`src/vnext/next-for-you/task-resolver.js` — extracted verbatim from
candidate-generator routing: `resolveMissionTasks` (integrity + mission
taskIds → current revisions), `deriveTaskConsumption` (verified-event
consumption, lastAttempt/observedFailStreak), `createTaskResolver` exposing
`optionsFor` / `servable` / `pickTask` / `pendingPhase`, all accepting
`excludeTaskIds`. `generateCandidates` now delegates to the shared resolver
and returns it as `gen.resolver`; B0 never passes exclusions → identical
behavior. The B1 proof calls the same machinery **with the fresh retest
probe set excluded** — witnesses must be reachable even while probes stay
protected.

## §4 Function-level witnesses

Each witness records: `candidateKind` (correction|refresh — SUPPORT_DEMAND
is never a repair route), `taskId`, `taskRevision`, `purpose`,
`missionMember`, `coversFunction`, `hardFilterClean`, `filterReasons[]`,
`consumesFreshRetestSurface`, `servedNext` (the route's own next serve under
probe exclusion). Witnesses come from the route's **live** fn-covering
servable stream under `excludeTaskIds=probes`; a route the generator
suppressed (failure ceiling, budget) is not claimed as reachable.

## §5 Positive proofs (real paths)

- **clock-time** `mission.meet_at_a_time` REPAIRING → witness
  `task.time.remediation.hear@1` (correction + refresh), reserves
  `task.time.retrieval.hear`.
- **price** `mission.buy_small_item` REPAIRING → witness
  `task.price.remediation.hear@1`, reserves `task.price.retrieval.hear`.
- **direction** `mission.find_a_place` REPAIRING → witness
  `task.place.remediation.follow@1`, reserves
  `{retrieval.follow, retrieval.follow_landmark}`.

## §6 Attack results (335-check runtime suite, all green)

- **Cross-mission**: remediation dropped from `taskIds` but held by the
  registry → `mission_repair_channel_unproven`, nothing reserved. A
  remediation-shaped ghost registered but never declared changes nothing.
- **Registry-invariance (metamorphic)**: adding an out-of-mission task —
  even one that WOULD serve — and removing an unrelated task leave proof,
  reserved ids, and the B1 decision canon-identical (modulo `decisionId`,
  which legitimately binds the changed input digest).
- **Wrong capability / wrong function**: in-mission remediation on the wrong
  cap or covering a different fn yields no witness → proof false → no
  reservation.
- **Stale revision**: bumping registry remediation to rev2 rebinds the
  witness to `taskRevision: 2` (latest-revision resolution); mission
  `revision` bump rebinds `missionRevision` — proofs are never reused.
- **Repair bound / failure ceiling**: saturated `actionsChosen` makes every
  witness `repair_bound:3`-unclean; a 3-fail streak ending on the last
  non-probe surface makes the refresh serve `identical_retry_after_failure_
  ceiling`-unclean — both falsify the proof and free the probe.
- **Alternate repick**: on PLACE the refresh route's natural next serve IS
  the reserved probe (`task.place.retrieval.follow`); under probe exclusion
  the route repicks `task.place.remediation.follow` — `servedNext` proves it.
- **Multi-function**: DIR episode missing `{follow_short_direction,
  identify_basic_direction_term}` where only the first has an in-mission
  witness → `complete=false`, reservations empty — ∀-fn, not ∃-task.
- **Relapse**: post-relapse the burned retest surface leaves the probe set
  (becomes repair-eligible) while the still-fresh alternate stays reserved —
  `reserved` tracks the live surface set exactly.
- **Validator**: forged B1 serve on a reserved probe →
  `correction_retest_surface_reserved`; identical serve in OPEN → clean.
  The validator re-derives plans + reservations via its own memoized
  rebuild — never the decision's `correctionEpisodes` payload.

## §7 B0 parity / B1 differential

Frozen corpus: `1792 rows {EXPECTED:1009, MATCH:783}`, b0 violations 0 —
byte-identical to pre-008G. B0↔B1: `MATCH:1744,
CORRECTION_RETEST_SURFACE_RESERVED:42, CORRECTION_RETEST_DUE:6`, b1
violations 0, BUG 0 — the proof-based reservation reproduces the 008F
registry-scan reservation **exactly** on the real corpus (the proof is
strictly more honest, and the corpus shows it is not strictly smaller).

## §8 Performance (@2k events, median)

`episodes` derivation 3.9ms · `b1` 124.1ms vs `b0` 125.9ms · `shadowB1`
203.4ms worst case · digest dominates (~118ms). The proof reuses the
generator's resolver and candidate set — **no second learner-model replay,
no second `generateCandidates` pass** on the policy path. The validator's
independent rebuild is lazy/memoized.

## §9 Gates

- `npm run verify:full` — green on `5b4f0ae` (typecheck 140 files; node
  suites incl. newly-wired runtime suite — see §10; vite build; browser
  26+10; Firestore emulator ×2 PASS).
- `swe:verify 008g-repair-reachability` — **PASS @ 5b4f0ae**.
- `node tests/vnext-next-for-you-runtime.test.mjs` — 335 checks PASS.

## §10 What is now proven

- Repair-channel existence is a per-episode, per-function **reachability
  proof inside the serving mission** — not registry presence.
- Reservations are a routing artifact produced only by a complete proof
  (or the demonstrated-repair waiting state); no proof ⇒ no silent
  reservation.
- Every witness is mission-member, fn-covering, hard-filter-clean, and
  probe-preserving, bound to the exact task revision the route would serve.
- Fresh retest probes survive REPAIRING/RELAPSED only when repair can be
  carried by remediation-purpose or already-burned surfaces.

## §11 Known limitations

- `REPAIRED_WAITING` reserves directly without a witness set — repair was
  demonstrated; the proof obligation attaches to states that still owe
  repair. Documented in the module contract.
- The witness check enumerates each route's fn-covering servable stream;
  fine at fixture scale, quadratic-ish only in adversarial streams.
- B1 remains experimental/shadow-only; product route continues to serve
  B0. `?mode=b1` still fails closed to reference.
- The orphaned runtime suite is now wired into `npm test` (package.json) —
  it ran standalone since 008E and was never in the verify chain; this
  closes that gap going forward.

## §12 Merge status

**Not merged.** PR awaits policy review / control-room verdict; the user is
merge authority. CI recorded in §CI of the checkpoint thread once pushed.
