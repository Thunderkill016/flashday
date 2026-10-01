# Mission report: 008g-repair-reachability

- status: **DONE**
- mission: `missions/008g-repair-reachability/mission.md`
- started: 2026-10-01T05:41:04.740Z
- finished: 2026-10-01T06:36:53.253Z
- branch: devin/m008g-repair-reachability
- starting sha: `c9e80562a887773c2147b14a3d97c0b917dbd494`
- ending sha: `fc50e9d` (R1 patch head; verify green directly + CI pending→green)

## Objective
Mission 008G (ChatGPT control room): replace the full-task-registry repair-channel assumption with an explicit mission@revision + capability + missing-function reachability proof — episodes stay evidence-only, reservation moves to a routing-proof layer, B0 frozen byte-identical, B1 stays shadow/experiment.

## Commits (2)
- `3870b9f 008G: checkpoint + report — verify green @5b4f0ae`
- `5b4f0ae 008G: mission-local repair reachability proof`

## Files changed vs start (10)
- `A	missions/008g-repair-reachability/REPORT.md`
- `A	missions/008g-repair-reachability/checkpoints/cp-001.md`
- `M	package.json`
- `M	src/vnext/correction-episodes.js`
- `M	src/vnext/next-for-you/candidate-generator.js`
- `M	src/vnext/next-for-you/policies.js`
- `A	src/vnext/next-for-you/repair-proof.js`
- `A	src/vnext/next-for-you/task-resolver.js`
- `M	src/vnext/next-for-you/validator.js`
- `M	tests/vnext-next-for-you-runtime.test.mjs`

## Verification runs (2)
- 2026-10-01T06:32:45.476Z @ `5b4f0ae7811d` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790836365472-0.log)
- 2026-10-01T06:36:44.586Z @ `3870b9f8272c` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790836604580-0.log)

## Commands executed (4)
- 2026-10-01T05:41:04.763Z start: devin/m008g-repair-reachability@c9e80562a887
- 2026-10-01T06:32:45.476Z verify: PASS
- 2026-10-01T06:36:44.587Z verify: PASS
- 2026-10-01T06:36:53.253Z finish: done

## Checkpoints (0)
- (none)

## Acceptance criteria
- [x] `deriveCorrectionEpisodes` output carries no reservation fields.
- [x] Repair proof binds missionId+revision, episodeId, capabilityId,
      per-function witnesses with task@revision + candidate kind +
      hard-filter result; reserve iff `complete` — and per R1 review,
      `complete` additionally requires a route's ACTUAL served-next task
      (probes withheld) to cover EVERY remaining function.
- [x] All required attacks pinned by tests (see substantive report).
- [x] Metamorphic: adding out-of-mission tasks to the registry changes
      neither proof, reserved ids, B1 decision, nor B1 reason code.
- [x] clock-time / price / direction paths keep a positive
      mission-local repair proof.
- [x] B0 corpus byte-identical; B1 differential has no unclassified rows.
- [x] Perf: incremental overhead profiled; no second full replay or
      generateCandidates pass.
- [x] `npm run verify:full` green; exact-head CI green.

## Known failures
- (none recorded)

## Browser verification
not required — headless policy/routing change; B1 remains shadow/experiment only, production B0 serving unchanged.

## Final result
Completed; required verification green on ending SHA.

---

## Substantive report (008G)

### Old failure mode
`deriveCorrectionEpisodes()` owned `retestReservedTaskIds` and decided
"repair channel survives" by scanning the **full task registry**
(`(tasks ?? []).some(t => t.capabilityId === ep.capabilityId && covering && (remediation || burned))`).
A remediation task in *another* mission's taskIds could make B1 believe
repair existed and reserve this mission's fresh retest surfaces — registry
existence was treated as reachability.

### Proof contract — `vnext.mission-repair-proof.v1`
`src/vnext/next-for-you/repair-proof.js`: `deriveMissionRepairPlan` binds
`missionId` + `missionRevision` + `episodeId` + `capabilityId` +
`remainingFunctions[]`, with `witnesses[fn][]`, `required`, `complete`,
`reserved`, `reasonCode`. Reservation table: `OPEN` never ·
`REPAIRING`/`RELAPSED` iff every live repair route's actual next serve is
inert-or-covering and ≥1 is usable (R2 — see below) ·
`REPAIRED_WAITING` direct · `RETEST_DUE`/`VERIFIED` never.

### Shared resolver
`src/vnext/next-for-you/task-resolver.js` — `resolveMissionTasks` +
`deriveTaskConsumption` + `createTaskResolver` extracted verbatim from the
candidate generator; `optionsFor`/`servable`/`pickTask`/`pendingPhase`
accept `excludeTaskIds`. `generateCandidates` returns `gen.resolver`; B0
never passes exclusions (byte-identical). The B1 proof asks the same
machinery the counterfactual "reachable while probes stay withheld".

### Function-level witnesses
`candidateKind` (correction|refresh — SUPPORT_DEMAND never repairs),
`taskId`, `taskRevision`, `purpose`, `missionMember`, `coversFunction`,
`hardFilterClean`, `filterReasons[]`, `consumesFreshRetestSurface`,
`servedNext` (audit flag: is this the route's primary). The load-bearing
record is `plan.servedNext[]` — one entry per live route with its natural
pick and `classification ∈ {usable, inert, dangerous}`.

### Positive proofs (real paths)
- clock-time `meet_at_a_time` REPAIRING → witness `task.time.remediation.hear@1`; reserves `task.time.retrieval.hear`.
- price `buy_small_item` REPAIRING → witness `task.price.remediation.hear@1`; reserves `task.price.retrieval.hear`.
- direction `find_a_place` REPAIRING → witness `task.place.remediation.follow@1`; reserves `{retrieval.follow, retrieval.follow_landmark}`.

### Attacks (342-check runtime suite, all green)
- cross-mission: remediation dropped from `taskIds` but present in registry → `mission_repair_channel_unproven`, nothing reserved; undeclared ghost task changes nothing.
- registry-invariance metamorphic: +ghost / −unrelated registry changes leave proof, reserved ids, and B1 decision canon-identical (modulo `decisionId` input digest).
- wrong capability / wrong function: no witness → proof false → no reservation.
- stale revision: registry bump to rev2 rebinds witness `taskRevision: 2`; mission revision bump rebinds `missionRevision` — no reuse.
- repair bound: saturated `actionsChosen` → every witness `repair_bound:3`-unclean → false, probes freed.
- failure ceiling: 3-fail streak ending on last non-probe surface → refresh serve is `identical_retry_after_failure_ceiling` → false, probe freed.
- alternate repick: PLACE refresh's natural next serve IS the reserved probe (`retrieval.follow`) → classified `inert/reserved_probe` (the reservation itself filters it dead); correction serves `remediation.follow` → `usable`; the exclusion-repick to `remediation.follow` stays in the refresh witness stream as audit evidence.
- cross-route (R2): REFRESH's actual serve is burned partial `retrieval.follow` (covers F1 only) while CORRECTION serves full-cover `remediation.follow` → refresh `dangerous` → `complete=false`, empty reservations; same arc in natural mission order (both routes land on the covering remediation) → proven.
- multi-function: DIR episode missing `{follow_short_direction, identify_basic_direction_term}` with only the first covered in-mission → `complete=false`, empty reservations — ∀-fn not ∃-task.
- relapse: burned retest surface leaves the probe set (repair-eligible); fresh alternate stays reserved — the reservation tracks the live surface set exactly.
- validator: forged B1 serve on a reserved probe → `correction_retest_surface_reserved`; identical serve in OPEN → clean. The validator re-derives plans+reservations in its own memoized rebuild, never trusting the decision payload.

### B0 parity / B1 differential
Frozen corpus `1792 rows {EXPECTED:1009, MATCH:783}`, b0 violations 0 —
byte-identical to pre-008G. B0↔B1 `MATCH:1744,
CORRECTION_RETEST_SURFACE_RESERVED:42, CORRECTION_RETEST_DUE:6`, b1
violations 0, BUG 0 — proof-based reservation reproduces the 008F
reservation set exactly on the real corpus.

### Performance @2k events (median)
`episodes` 3.9ms · `b1` 124.1ms vs `b0` 125.9ms · `shadowB1` 203.4ms ·
digest dominates ~118ms. The proof reuses the generator's resolver +
candidate set: **no second learner-model replay, no second
`generateCandidates` pass** on the policy path. Validator rebuild is
lazy/memoized.

### Gates
- `npm run verify:full` PASS on `5b4f0ae`, `3870b9f` (pre-R1) and
  `fc50e9d` (post-R1, direct run; factory verify is refused on a DONE
  mission). Typecheck 140
  files; node suites incl. now-wired runtime suite; vite build; browser
  26+10; Firestore emulator ×2 PASS).
- `node tests/vnext-next-for-you-runtime.test.mjs` — 342 checks PASS
  (R2 head; 338 at R1, 335 at first submission).
- CI: **Verify FlashDay** green on `9d3690c` (push `36825803861` + pr
  `36825837191`) and on R1 `fc50e9d` (push `36827937771` + pr
  `36827941112`). R2 head CI is recorded in the PR thread.

### Extra fix in this diff
`package.json` `test` script now includes `tests/vnext-next-for-you-runtime.test.mjs` —
the suite carried all 008F/008G behavioral coverage but had been orphaned
from `npm test`/`verify`/CI since 008E.

### R1 patch — servedNext is load-bearing
First submission proved `complete` by collecting a witness **per function
independently** across each route's fn-filtered stream. Counterexample
from review: F1+F2 missing, task A covers F1, task B covers F2, repair
bound has 1 action left — A serves next and exhausts the bound, so B is
unreachable, yet the per-fn streams claimed both covered.
Patch (narrow, no new planner): in REPAIRING/RELAPSED the proof now
requires SOME live repair route whose **actual next serve under probe
exclusion** is mission-local, hard-filter-clean, non-probe, AND covers
EVERY remaining function. Per-fn witness streams remain for audit;
`servedNext` is the completeness condition, not an audit field.
Pinned by `MRP-SERVEDNEXT` regression pair (split coverage under
bound→false; covers-all→proven). Differential counts unchanged —
remediation tasks on all three real paths cover their caps' full
missing-function sets.

### R2 patch — every live route is load-bearing
R1 accepted the proof if ONE route's served-next covered everything.
Counterexample from review: REFRESH → burned retrieval B covering F1
only, CORRECTION → remediation A covering F1+F2; the policy may prefer
REFRESH, serve B, and burn the last repair action before A gets a turn.
"A safe route exists" ≠ "the policy will take it".
Patch (conservative, no planner): each live CORRECTION/REFRESH route is
evaluated on its **natural pick — no exclusions**, i.e. exactly what the
policy would serve, and classified:
- `inert` — pick is a fresh probe (the reservation under evaluation
  filters it dead), a hard-filter-rejected task, or nothing;
- `usable` — mission-local, clean, repair-eligible, non-probe, covers
  ALL remaining functions;
- `dangerous` — choosable (clean, non-probe) but fails any repair
  condition (out-of-mission, not repair-eligible, partial coverage).
`complete ⇔ ∃ usable ∧ ∄ dangerous`. A non-repair-eligible pick is never
skipped — if the policy can choose it, it falsifies the proof.
Pinned by `MRP-XROUTE` (conflict → false / both-covering dual → proven).
The PLACE refresh case now records `inert/reserved_probe` instead of an
exclusion repick. Differential unchanged
(`1792 {1009,783}`; `MATCH:1744 + RESERVED:42 + DUE:6`; 0 violations).

### Known limitations
- `REPAIRED_WAITING` reserves directly without witnesses (repair already
  demonstrated); proof obligation attaches only to states that owe repair.
- Carried-over 008F limitation (recorded, not fixed in 008G): an episode
  enters REPAIRED_WAITING after a success covering ≥1 missing function,
  not necessarily all — the servedNext/covers-all semantics is strongest
  in REPAIRING/RELAPSED; generalising multi-function repair needs
  `repairedFunctions` tracking or redefined partial-repair semantics.
- Witness enumeration scales with the fn-covering servable stream; fine at
  fixture scale, quadratic-ish only under adversarial streams.
- B1 remains shadow/experiment; `?mode=b1` fails closed to reference.

### Merge status
Not merged — PR awaits policy review; the user is merge authority.
