# Mission report: 008a-next-for-you-research

- status: **DONE**
- mission: `missions/008a-next-for-you-research/mission.md`
- started: 2026-09-30T11:00:56.620Z
- finished: 2026-09-30T11:14:14.190Z
- branch: devin/m008a-next-for-you-research
- starting sha: `98553985c62b6656a670eda182d4e3cbe9919590`
- ending sha: `5d415fcb5279ce686f0ee6907c288a258e2f1f48`

## Objective
Mission 008A (ChatGPT control room): research + decision-theory foundation for Next For You — reconstruct repo decision reality, run literature program A–T, compare decision architectures, produce competing candidate policies + failure matrix, persist corpus under docs/research/next-for-you/. NO implementation.

## Commits (2)
- `5d415fc chore: untrack 008a mission state.json (factory rewrites it)`
- `bf358ee vnext: Next For You decision-theory research corpus (Mission 008A)`

## Files changed vs start (16)
- `A	docs/research/next-for-you/00-research-question.md`
- `A	docs/research/next-for-you/01-evidence-map.md`
- `A	docs/research/next-for-you/02-retrieval-spacing.md`
- `A	docs/research/next-for-you/03-correction-feedback.md`
- `A	docs/research/next-for-you/04-input-output-interaction.md`
- `A	docs/research/next-for-you/05-difficulty-cognitive-load.md`
- `A	docs/research/next-for-you/06-adaptive-tutoring.md`
- `A	docs/research/next-for-you/07-decision-architectures.md`
- `A	docs/research/next-for-you/08-product-comparison.md`
- `A	docs/research/next-for-you/09-vietnamese-learner-priors.md`
- `A	docs/research/next-for-you/10-contradictions-boundaries.md`
- `A	docs/research/next-for-you/11-design-hypotheses.md`
- `A	docs/research/next-for-you/repo-reality.md`
- `A	docs/research/next-for-you/sources.md`
- `A	missions/008a-next-for-you-research/checkpoints/001-checkpoint.md`
- `A	missions/008a-next-for-you-research/mission.md`

## Verification runs (2)
- 2026-09-30T11:13:34.149Z @ `bf358ee0167f` — **PASS**
  - `npm run typecheck` → exit 0 (logs/verify-1790766814145-0.log)
- 2026-09-30T11:14:07.647Z @ `5d415fcb5279` — **PASS**
  - `npm run typecheck` → exit 0 (logs/verify-1790766847644-0.log)

## Commands executed (5)
- 2026-09-30T11:00:56.644Z start: devin/m008a-next-for-you-research@98553985c62b
- 2026-09-30T11:12:42.824Z checkpoint: cp 1
- 2026-09-30T11:13:34.149Z verify: PASS
- 2026-09-30T11:14:07.648Z verify: PASS
- 2026-09-30T11:14:14.191Z finish: done

## Checkpoints (1)
- #1 2026-09-30T11:12:42.817Z @ `98553985c62b` — checkpoints/001-checkpoint.md

## Acceptance criteria
- [ ] docs/research/next-for-you/ corpus complete (13 files) with sources.md
- [ ] evidence map: each mechanism rated STRONG/MODERATE/TENTATIVE/UNSUPPORTED/CONTRADICTED
- [ ] 3–4 competing policies with worked examples on current model snapshots
- [ ] failure/pathology matrix over the 10 learner archetypes
- [ ] hard constraints vs rankable candidates separated
- [ ] `npm run typecheck` green; repo otherwise untouched

## Known failures
- (none recorded)

## Browser verification
not required — docs/research deliverable only; no product code changes

## Final result
## OUTCOME
DONE — research corpus persisted; no implementation performed (per scope).

## DELIVERABLES
docs/research/next-for-you/ — 14 files: repo-reality.md, 00 research question, 01 evidence map (28 graded mechanisms), 02-06 topical reviews, 07 ten-architecture comparison, 08 product comparison, 09 Vietnamese priors, 10 contradictions/boundaries, 11 design hypotheses (Policies A/B/C + deferred D, real-snapshot worked examples, 7-archetype failure matrix), sources.md.

## KEY FINDINGS
- Current planner = strict lexicographic cascade; learner model not yet consumed. Its order embeds defensible priors; its blind spots are uncertainty/thinness/dependency/session-composition signals the model now exposes.
- Recommended v0: Policy B — hard pedagogical filters + deterministic candidate scoring + reason output. Corrections needed regardless: bounded failure escalation, non-attributing-failure→probe routing, absence→relearning intent.
- Rejected for v0: bandits/RL (no learning-gain evidence, reward-hacking risk, determinism conflict).

## VERIFICATION
npm run verify PASS (units + build). Factory verify PASS (typecheck) @5d415fc.
