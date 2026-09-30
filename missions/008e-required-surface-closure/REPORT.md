# Mission report: 008e-required-surface-closure

- status: **DONE**
- mission: `missions/008e-required-surface-closure/mission.md`
- started: 2026-09-30T20:15:20.032Z
- finished: 2026-09-30T22:15:48.825Z
- branch: devin/m008e-required-surface-closure
- starting sha: `765a5d86e2500ed16010315f0164ef9aee05715d`
- ending sha: `53b739aef4520476ef8d302a36d936daf358c7a8`

## Objective
Mission 008E (ChatGPT control room): drive the conservative content-coverage audit from 5 REQUIRED to 0 REQUIRED on the 7-mission A1 surface — author 2 correction remediation tasks (understand_spoken_price @ buy_small_item, follow_short_direction @ find_a_place) and 3 fresh assessment families (say_own_name @ meet_new_person, request_item @ complete_small_order, state_basic_self_detail @ talk_about_self_family) — with mission revision bumps, executable gap-closure regressions, real session trajectories, and zero Policy-B semantic change.

## Commits (8)
- `53b739a 008E: record exact-head CI green on d9a5a4b`
- `d9a5a4b 008E R2: checkpoint + report truth for the freshness patch`
- `d4def77 008E R2: learner-visible fresh context + practiced-only cue cover`
- `510f340 008E: checkpoint 002 + REPORT updated for review round 1`
- `37d50a4 008E R1: construct-valid assessment cues + cue-alignment regressions`
- `33d17ad 008E: record exact-head CI green on 804d925`
- `804d925 008E: mission report + implementation checkpoint`
- `cdc7d7d 008E: close all five required content-surface findings`

## Files changed vs start (12)
- `A	missions/008e-required-surface-closure/REPORT.md`
- `A	missions/008e-required-surface-closure/checkpoints/001-checkpoint.md`
- `A	missions/008e-required-surface-closure/checkpoints/002-checkpoint.md`
- `A	missions/008e-required-surface-closure/checkpoints/003-checkpoint.md`
- `A	missions/008e-required-surface-closure/mission.md`
- `A	missions/008e-required-surface-closure/spec-source.md`
- `M	src/vnext/fixtures.js`
- `M	src/vnext/ui/copy.js`
- `M	tests/vnext-browser.test.mjs`
- `M	tests/vnext-next-for-you-runtime.test.mjs`
- `M	tests/vnext-slice.test.mjs`
- `M	tests/vnext-ui-session.test.mjs`

## Verification runs (1)
- 2026-09-30T22:15:40.160Z @ `53b739aef452` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790806540154-0.log)

## Commands executed (3)
- 2026-09-30T20:15:20.054Z start: devin/m008e-required-surface-closure@765a5d86e250
- 2026-09-30T22:15:40.161Z verify: PASS
- 2026-09-30T22:15:48.825Z finish: done

## Checkpoints (0)
- (none)

## Acceptance criteria
- [ ] All five former witnesses replayed from main and confirmed
      failing for the same reason BEFORE authoring.
- [ ] Two authored remediation tasks satisfy the remediation contract
      and are reachable via the real B0 correction/refresh path.
- [ ] Three authored fresh assessment families satisfy the assessment
      contract (new contextSignature, fresh_assessment class, zero
      answer-bearing support, target capability sampled directly).
- [ ] Mission revisions bumped on all five touched missions; migration
      regressions green.
- [ ] Five former witness states now produce valid candidates bound to
      the authored task@revision, validator clean.
- [ ] Real session trajectories pass for both remediation additions and
      all three assessment additions.
- [ ] Family collision regressions green.
- [ ] Coverage audit: required = 0; optional and not_mintable reported
      separately; classifier logic unchanged.
- [ ] Differential corpus: 0 BUG / 0 unexplained divergence / 0
      validator violations.
- [ ] Perf recorded once post-addition; no material regression or
      profiled and reported.
- [ ] `npm run verify:full` green; exact-head CI green.

## Known failures
- (none recorded)

## Browser verification
Playwright /vnext surface where useful: driven attributing miss routes to each new authored remediation; fresh assessment families serve under real B0 with an injected harness clock — no production time seams.

## Final result
Completed; required verification green on ending SHA.
