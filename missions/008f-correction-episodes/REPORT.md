# Mission report: 008f-correction-episodes

- status: **DONE**
- mission: `missions/008f-correction-episodes/mission.md`
- started: 2026-09-30T22:20:16.829Z
- finished: 2026-10-01T04:22:57.569Z
- branch: devin/m008f-correction-episodes
- starting sha: `f02a190c3a4956f58356531ec64972086fcb32a7`
- ending sha: `6ed520a143a366662321c13496837c51754aa823`

## Objective
Mission 008F (ChatGPT control room): model correction episodes (failed → repair → delay → independent retest → verified) as pure replay-derived state; build versioned B1 correction-intelligence policy in shadow/experiment that gates transfer/assessment certification on unresolved episodes; prove it on the clock-time/price/direction listening paths with full divergence classification — B0 remains the unchanged executable control.

## Commits (3)
- `6ed520a 008F: mission report + implementation checkpoint`
- `108b66f 008F: correction episode model + B1 shadow policy`
- `809b2f9 008F: mission scaffold — correction episode intelligence + delayed retest shadow`

## Files changed vs start (15)
- `A	docs/research/next-for-you/14-correction-episodes.md`
- `M	experiments/next-for-you/differential.js`
- `M	experiments/next-for-you/perf.js`
- `A	missions/008f-correction-episodes/REPORT.md`
- `A	missions/008f-correction-episodes/checkpoints/001-checkpoint.md`
- `A	missions/008f-correction-episodes/mission.md`
- `A	missions/008f-correction-episodes/spec-source.md`
- `A	src/vnext/correction-episodes.js`
- `M	src/vnext/next-for-you/constants.js`
- `M	src/vnext/next-for-you/decision-context.js`
- `M	src/vnext/next-for-you/policies.js`
- `M	src/vnext/next-for-you/selector.js`
- `M	src/vnext/next-for-you/validator.js`
- `M	src/vnext/ui-session.js`
- `M	tests/vnext-next-for-you-runtime.test.mjs`

## Verification runs (1)
- 2026-10-01T04:22:51.387Z @ `6ed520a143a3` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790828571384-0.log)

## Commands executed (3)
- 2026-09-30T22:20:16.850Z start: devin/m008f-correction-episodes@f02a190c3a49
- 2026-10-01T04:22:51.388Z verify: PASS
- 2026-10-01T04:22:57.570Z finish: done

## Checkpoints (0)
- (none)

## Acceptance criteria
- [x] Research synthesis persisted (source → claim → boundary → design
      implication → falsification); no invented optimal delay.
- [x] `deriveCorrectionEpisodes` pure/deterministic; episode identity
      carries learner/cap/missing-functions/source task@rev/event/time
      (provenance-hashed `cep:<sha256·20>` since the R2 patch).
- [x] Lifecycle covers OPEN → REPAIRING → REPAIRED_WAITING → RETEST_DUE
      → VERIFIED plus RELAPSED on retest failure.
- [x] Remediation/support success cannot close an episode; only delayed
      independent unaided retest on a non-burned surface verifies.
- [x] B1 gates transfer+assessment on unresolved episodes; B0 corpus
      parity preserved (B0-vs-B0 byte-identical).
- [x] Shadow differential: every divergence classified into declared
      categories; zero unclassified (incl. new SURFACE_RESERVED class).
- [x] Three real listening paths run end-to-end incl. relapse.
- [x] All adversarial cases have regressions (+ route isolation,
      identity, burn, validator-terminal, adapter regressions in R2).
- [x] Perf @2k reported vs ~125ms B0 baseline; no extra O(events)
      replay where equivalent derived state exists.
- [ ] `npm run verify:full` green; exact-head CI green.

## Known failures
- (none recorded)

## Browser verification
not required for v0 — B1 is shadow/experiment only; production B0 serving unchanged. (Browser legs exist for the shared session machinery.)

## Final result
Completed; required verification green on ending SHA.

---

# 008F POLICY FINAL PATCH RESULT

## HEAD
- Branch `devin/m008f-correction-episodes`; R1-reviewed head `f6c5db0`; final patch lands as the tip commit(s) of PR #74 (exact sha recorded in `checkpoints/002-final-patch.md` and the control-room report).
- Production default remains B0 (`vnext.selection-policy.b0.v1`); B1 is `vnext.selection-policy.b1.v1`, experiment/shadow only.

## PRODUCT-ROUTE ISOLATION
- `src/vnext/ui/mission-page.js` now resolves `?mode=` against the new `PRODUCT_ROUTE_MODES` allowlist (`selector.js`) — exactly the pre-008F set `{reference, b0, shadow_b0}`.
- `?mode=b1` and `?mode=shadow_b1` on the learner-facing URL fail closed to `reference` — identical to any unrecognized value. B1 stays reachable only via `createMissionSession`/`selectNextTask` (tests, tooling, experiments).
- Browser regression (`tests/vnext-browser.test.mjs`): both URLs serve the reference-identical screen sequence AND pin `reference|production.nextMissionTask` on the run record — never `vnext.selection-policy.b1.v1`.

## EPISODE IDENTITY
- `episodeId` is now `cep:` + first 20 hex of `sha256(canon({learnerId, capabilityId, sourceEventId, sourceTaskId, sourceTaskRevision, openedAt}))` — provenance-bound, never ordinal. `learnerId` is a first-class episode field; the digest carries it too.
- Regressions (CEP-ID): same capability across two learners → distinct ids; an earlier closed episode inserted into history does not renumber an existing later episode; reversed delivery order derives identical ids; a relapse retains the opening-failure id.

## REPAIR/RETEST SURFACE FRESHNESS
- Burned set is now complete (`burnedSurfaces`): every failure surface (opening miss + failed retests) ∪ consumed remediation tasks ∪ `repairSurfaceTaskIds` (every independent success that established/re-established repair, ANY purpose) ∪ `practicedRetestTaskIds` (retest-eligible surfaces exposed during the lag).
- Reservation: while an episode is `REPAIRING`/`REPAIRED_WAITING`/`RELAPSED`, B1 withholds still-fresh retest surfaces (`retestReservedTaskIds`, `correction_retest_surface_reserved` filter reason) — but only where a repair channel survives without them (covering remediation or an already-burned surface), so reservation can never starve repair. During `OPEN` nothing is reserved — the first covering success legitimately IS the repair.
- Regressions (CEP-BURN): repair riding a retest-eligible surface burns it → `pickRetestSurface` empty → backlog; pre-lag probe practice burns → backlog; exhausted surfaces emit `correction_content_backlog`, never a recycled probe.
- Consequence verified end-to-end: all three listening paths still reach VERIFIED (BUY via `retrieval.hear`, TIME via `retrieval.hear`, PLACE relapse via `follow_landmark` with the failed retest surface permanently banned).

## VALIDATOR TERMINAL TRUTH
- `validateDecision` now reconstructs B1 due-retest work independently: `RETEST_DUE` episodes with an honest surface (mission-scoped `pickRetestSurface` over the latest revision per task id) count as work — it never trusts `decision.correctionEpisodes`.
- Regressions (VAL-TERM, single-task mission so generic work is ∅): forged `idle` → `fabricated_idle`; forged `blocked` → `blocked_while_valid_work`; due + no surface → real `blocked` decision validates clean.
- Chosen-side burned check now enforces the identical `burnedSurfaces` set the derivation computes.

## CONTENT-BACKLOG ADAPTER
- `b0ToSelection` promotes `correction_content_backlog` (from `explanation.suppressed`) to a first-class selection `reasonCode` with preserved reason text — no collapse into generic blocked.
- Regression (SEL-ADAPTER): `selectNextTask({mode:'b1'})` on the exhausted-surface state → `status:'blocked'`, `reasonCode:'correction_content_backlog'`, reason text intact.

## B0 PARITY
- Frozen corpus byte-identical: 1792 rows, `EXPECTED:1009 / MATCH:783`, 0 B0 validator violations — same numbers as the pre-patch run. `episodes`/`retestReservedTaskIds` reach `hardFilter` only inside B1/shadow_B1 envs.

## B1 DIFFERENTIAL
- 1792 frozen rows: `MATCH:1744`, `CORRECTION_RETEST_SURFACE_RESERVED:42`, `CORRECTION_RETEST_DUE:6`, **0 BUG**, 0 B1 validator violations, 0 unclassified.
- New declared class `CORRECTION_RETEST_SURFACE_RESERVED`: B0 picked a still-fresh probe; B1 withheld it and rerouted repair/practice to a non-probe surface.

## PERFORMANCE
- @2000 events: `episodes` derivation 5.1ms median / 6.3ms p95; `b1` 146.3ms vs `b0` 143.1ms median; `shadow_b1` 175.1ms worst case. `digest` remains the dominant stage (~124ms).

## RESEARCH/DURABLE REPORT
- `docs/research/next-for-you/14-correction-episodes.md`: D3 falsification now states a real boundary (gate is falsified if delayed-vs-immediate verification shows no calibration difference, or retest backlog strands already-verified abilities); D5 design implication + condensed contract updated to the full burn/reserve semantics.

## VERIFY:FULL
- `npm run verify:full` — all legs green: typecheck 138 files; node suites (runtime 303 checks incl. CEP-ID/CEP-BURN/VAL-TERM/SEL-ADAPTER + 3 B1 trajectories); vite build; browser 26+10; Firestore emulator PASS.

## CI
- Exact-head `Verify FlashDay` runs: recorded below (post-push).

## OPEN LIMITATIONS
- B1 remains an unproven validity hypothesis — divergence classes count reroutes, not learning outcomes.
- Reservation prefers content freshness over extra pre-lag practice; caps with a single retest surface will backlog rather than verify if that surface is ever exposed early — honest, but the backlog queue is authoring debt to schedule.
- `retestReservedTaskIds` is derived on the full task registry; mission-scoped pools see the same set by construction (extra ids are simply never minted).

PR #74 NOT MERGED — AWAITING FINAL CHATGPT CLEARANCE
