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
- [ ] Research synthesis persisted (source → claim → boundary → design
      implication → falsification); no invented optimal delay.
- [ ] `deriveCorrectionEpisodes` pure/deterministic; episode identity
      carries learner/cap/missing-functions/source task@rev/event/time.
- [ ] Lifecycle covers OPEN → REPAIRING → REPAIRED_WAITING → RETEST_DUE
      → VERIFIED plus RELAPSED on retest failure.
- [ ] Remediation/support success cannot close an episode; only delayed
      independent unaided retest on a non-reused surface verifies.
- [ ] B1 gates transfer+assessment on unresolved episodes; B0 corpus
      parity preserved (B0-vs-B0 byte-identical).
- [ ] Shadow differential: every divergence classified into declared
      categories; zero unclassified.
- [ ] Three real listening paths run end-to-end incl. relapse.
- [ ] All 14 adversarial cases have regressions.
- [ ] Perf @2k reported vs ~125ms B0 baseline; no extra O(events)
      replay where equivalent derived state exists.
- [ ] `npm run verify:full` green; exact-head CI green.

## Known failures
- (none recorded)

## Browser verification
not required for v0 — B1 is shadow/experiment only; production B0 serving unchanged. (Browser legs exist for the shared session machinery.)

## Final result
Completed; required verification green on ending SHA.
