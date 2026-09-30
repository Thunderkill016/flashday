---
{
  "id": "008a-next-for-you-research",
  "objective": "Mission 008A (ChatGPT control room): research + decision-theory foundation for Next For You — reconstruct repo decision reality, run literature program A–T, compare decision architectures, produce competing candidate policies + failure matrix, persist corpus under docs/research/next-for-you/. NO implementation.",
  "verification": [
    "npm run typecheck"
  ],
  "browserVerification": "not required — docs/research deliverable only; no product code changes"
}
---

# Mission 008A — Next For You: Research + Decision Theory

## OBJECTIVE

Answer from evidence + explicit product objectives: given the honest
Learner Model and the available curriculum, what should FlashDay
optimize when choosing the learner's next activity? Deliver
knowledge + testable hypotheses — zero product code required.

## WHY

ChatGPT control-room Mission 008A (post-#67, base main@9855398).
Next For You is the first layer that decides what a learner does next;
a wrong policy makes a correct kernel teach badly — deterministically.
The first deliverable is therefore research + candidate policies, not
code.

## INVARIANTS

- No implementation of Next For You; no planner/kernel changes.
- Mark transferability assumptions explicitly (math/STEM ≠ L2).
- Engagement metrics are never the primary objective.
- No policy winner on elegance; worked examples on real model
  snapshots are required.
- Persist corpus under docs/research/next-for-you/ with citations;
  never copy copyrighted papers into the repo.
- Hard constraints vs rankable candidates must be separated, not
  blended.

## IN SCOPE

- §0 repo-reality doc: evidence→projection→support lifecycle→learner
  model→planner; which decisions exist vs what Next For You owns;
  hard constraints vs rankable candidates.
- Literature program A–T (retrieval, spacing, interleaving, desirable
  difficulties, cognitive load, corrective feedback, feedback timing,
  self-repair vs reveal, input, pushed output, task repetition,
  transfer, formative assessment, mastery learning, ITS sequencing,
  knowledge tracing, bandits/RL, learner choice, fatigue, L2-specific
  adaptive systems) with per-source capture schema.
- Contradiction search on each proposed rule.
- Decision architectures A–J comparison.
- Candidate action taxonomy validation.
- Precedence-vs-ranking analysis, challenge-controller signals,
  diagnostic-vs-teaching value split, learning-gain/time metrics,
  human-tutor principles, product comparison, Vietnamese priors.
- Persist corpus under docs/research/next-for-you/ (13 files) with
  citations/DOIs.

## OUT OF SCOPE

- Implementing Next For You or touching the planner/kernel.
- Engagement-metric optimization as the primary objective.
- Declaring a policy winner on elegance.
- Copying copyrighted papers; citing them is required.
- Inventing difficulty percentages or fake proxies.

## ACCEPTANCE CRITERIA

- [ ] docs/research/next-for-you/ corpus complete (13 files) with sources.md
- [ ] evidence map: each mechanism rated STRONG/MODERATE/TENTATIVE/UNSUPPORTED/CONTRADICTED
- [ ] 3–4 competing policies with worked examples on current model snapshots
- [ ] failure/pathology matrix over the 10 learner archetypes
- [ ] hard constraints vs rankable candidates separated
- [ ] `npm run typecheck` green; repo otherwise untouched

## VERIFICATION

- `npm run typecheck` — docs-only mission; guards tree integrity.

## BROWSER VERIFICATION

Not required — no product code changes.

## SAFETY CONSTRAINTS

- No planner/kernel mutation, no deploys, no merges without the human.
- No secrets or learner data in research output.

## STOP CONDITIONS

- Evidence that forces kernel redesign → report, do not patch.
- Literature program finds a decisive contradiction to a core premise →
  checkpoint + flag to the control room.

## REPORT FORMAT

MISSION 008A — RESEARCH SYNTHESIS: STRONGEST FINDINGS / CONTRADICTORY
FINDINGS / WHAT CURRENT FLASHDAY GETS RIGHT / WHAT CURRENT PLANNER GETS
WRONG / DECISION ARCHITECTURES COMPARED / 3–4 CANDIDATE POLICIES /
FAILURE MODES / DATA CURRENTLY MISSING / RESEARCH GAPS / SOURCES /
YOUR RECOMMENDATION / QUESTIONS FOR CHATGPT
