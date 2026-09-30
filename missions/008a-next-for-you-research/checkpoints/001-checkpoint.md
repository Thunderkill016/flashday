<!-- stamped by swe:checkpoint -->
- checkpoint: 1
- at: 2026-09-30T11:12:42.803Z
- mission: 008a-next-for-you-research
- status: RUNNING
- current sha: 98553985c62b6656a670eda182d4e3cbe9919590 (devin/m008a-next-for-you-research)
- start sha: 98553985c62b6656a670eda182d4e3cbe9919590
- commits since start: none
- dirty tracked files: none
---
## MISSION OBJECTIVE
Research-only mission (008A): reconstruct current planner reality, run literature program A-T, compare decision architectures, produce 3-4 candidate policies + failure matrix, persist corpus under docs/research/next-for-you/. NO implementation of Next For You.

## CURRENT STATE
RUNNING — research corpus drafted, pending verification + commit.

## PROVEN FACTS
- planNext is a strict 9-rule lexicographic cascade (resume, delayed_retrieval, support_demand, retry, transfer, independent_attempt, expose-current-mission, introduce-new, idle); learner model is NOT consumed by planner today.
- Evidence map graded: STRONG = retrieval practice, spacing, CF-with-repair (prompts>recasts), frequency-driven input, CAT max-information selection. CONTRADICTED = universal interleaving (words g=-0.39), expanding-schedule requirement, engagement-as-learning proxy, always-immediate correction, any fixed challenge %.
- Learned sequence policies (bandits/RL): completion/engagement gains only, no demonstrated learning-gain superiority; reward-hacking risk real; rejected for v0.
- Missing planner signals: evidence thinness, uncertainty tiering, dependency-fade preference, session composition, recall probability, task cost.

## CHANGES MADE
- docs/research/next-for-you/: repo-reality.md, 00-research-question.md, 01-evidence-map.md, 02-retrieval-spacing.md, 03-correction-feedback.md, 04-input-output-interaction.md, 05-difficulty-cognitive-load.md, 06-adaptive-tutoring.md, 07-decision-architectures.md, 08-product-comparison.md, 09-vietnamese-learner-priors.md, 10-contradictions-boundaries.md, 11-design-hypotheses.md, sources.md
- No source code changes (research-only invariant preserved).

## CURRENT TEST STATUS
Docs-only; verify:full not required by mission spec. Will run npm run verify before commit per repo hygiene.

## CURRENT HYPOTHESIS
Policy B (hard filters + deterministic candidate scoring + reason output) is the recommended v0 architecture; Policy A = corrected cascade baseline; C = B + budgeted diagnostic leg; D deferred pending reward definition + benchmark.

## OPEN PROBLEMS
- Optimal review:new session ratio unstudied (tunable in B/C).
- latencyMs as effort signal recorded but unvalidated.
- 008B must formalize decision spec + simulation benchmark.

## IMPORTANT FILES
- docs/research/next-for-you/ (14 files)
- src/vnext/planner.js, src/vnext/learner-model.js (referenced, unchanged)

## NEXT EXACT ACTION
npm run verify; commit research corpus; finish mission; post MISSION 008A — RESEARCH SYNTHESIS to ChatGPT control room; wait for 008B.

## CURRENT SHA
98553985c62b6656a670eda182d4e3cbe9919590
