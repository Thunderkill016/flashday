<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T11:58:28.565Z
- mission: 008b-next-for-you-spec
- status: RUNNING
- current sha: 9cd77eb75ab289c6ac41f28ecd2481f0fcaa1119 (devin/m008b-next-for-you-spec)
- start sha: 9cd77eb75ab289c6ac41f28ecd2481f0fcaa1119
- commits since start: none
- dirty tracked files: package.json
---
## MISSION OBJECTIVE
Mission 008B (ChatGPT control room): formal Next For You decision contract + A/B/C deterministic policy prototypes + falsification benchmark under experiments/next-for-you/. Engineering falsification only — not efficacy. Production planner unchanged.

## CURRENT STATE
RUNNING — implementation complete, all gates green, pre-commit.

## PROVEN FACTS
- Formal contract written: docs/specs/next-for-you-v0.md — eligibility≠priority, tier taxonomy, ordinal named preferences, DecisionContext, explanation + decision-log contracts, versioning, no-future-leakage, replay rules.
- Prototype pipeline implemented: candidate-generator → hardFilter → tier → ordinal pick → explanation. Policies A (corrected cascade reference), B (prototype), C (B + bounded information-value probes).
- Benchmark: synthetic archetypes over the 7 real authored missions; 634-check adversarial suite green.
- REAL PATHOLOGY FOUND+FIXED: a naive cascade retries the identical task 38× past the failure ceiling; identical-retry is now a hard filter with an alternative-task escape hatch.
- NO REAL VNEXT LEARNER EVENT CORPUS AVAILABLE — all trajectories synthetic, labeled.
- Production planner diff vs main: 0 lines.

## CHANGES MADE
- docs/specs/next-for-you-v0.md; docs/research/next-for-you/12-008b-decisions.md; 13-open-calibration-questions.md (all new)
- experiments/next-for-you/: constants.js, decision-context.js, candidate-generator.js, policies.js, decision-log.js, replay.js, scenarios.js, benchmark.js, util.js (all new)
- tests/vnext-next-for-you.test.mjs (new, 634 checks); package.json test wiring

## CURRENT TEST STATUS
npm run verify:full PASS at uncommitted HEAD — typecheck 127 files, all unit suites, vite build, browser 26 groups, Firestore emulator.

## CURRENT HYPOTHESIS
Policy B reproduces the cascade's safe behavior with explicit suppression traces; C adds bounded diagnostic preference. No efficacy claim.

## OPEN PROBLEMS
- Alternate-task escape lets a failing cap advance through several tasks per session — sanctioned by spec §17, flagged for ChatGPT review.
- Calibration knobs are safety priors (failureCeiling=3, diagnosticMaxPerEpisode=2, session pacing) — open questions cataloged.

## IMPORTANT FILES
experiments/next-for-you/{candidate-generator,policies,benchmark,scenarios,replay,decision-context,decision-log,constants,util}.js; docs/specs/next-for-you-v0.md; tests/vnext-next-for-you.test.mjs

## NEXT EXACT ACTION
Commit → swe:verify at HEAD → REPORT.md → swe:finish → push → PR → post required-format report to control room. NO merge before ChatGPT architecture review.

## CURRENT SHA
9cd77eb75ab289c6ac41f28ecd2481f0fcaa1119
