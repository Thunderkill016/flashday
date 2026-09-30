# 10 — Contradictions & boundary conditions

This file exists to record where the intuitive answer is *wrong* or
*load-limited*, so that Policy A/B/C don't encode folk pedagogy.

## Tested assumptions vs evidence

| Assumption | Verdict | Why |
|------------|---------|-----|
| Due retrieval always outranks new input | **PARTIALLY TRUE** | Spacing evidence is strong, but a *relearning* case (long absence → forgotten) is not a retrieval case; and a due retrieval on a mastered cap should not starve all forward progress forever — needs budgeting |
| Failure → immediate correction | **BOUNDED** | Immediate > delayed for proceduralizing skills (Li 2020), but high-confidence misconception errors hypercorrect; non-attributed failures need *diagnosis first*, not correction — blind re-drill through a non-attributing failure is wasted/minimally informative |
| Harder retrieval is always better | **CONTRADICTED** | Desirable-difficulty effects vanish under high element-interactivity (Chen 2018); for novices the material is already high-load — extra difficulty is *undesirable* |
| More personalization → more learning | **UNSUPPORTED/mixed** | Learner-control meta: motivation yes, cognition mixed. Learned-policy literature shows completion gains, not learning gains |
| Interleaving > blocking universally | **CONTRADICTED for words** | Brunmair & Richter: g=0.42 overall, **-0.39 for word-level materials** — vocabulary may prefer blocking |
| Expanding retrieval schedules required | **CONTRADICTED** | g=0.034 vs uniform (Latimier) |
| Engagement metrics proxy learning | **CONTRADICTED** | Duolingo HLR's deployment win was +12% engagement; LinUCB optimized completion. Neither measured learning gain |
| Assessment/test events = learning events | **PARTIALLY** | Testing effect is real (retrieval IS learning), but pure diagnostic probes *inform*, they don't teach — over-testing starves teaching time |
| Any observed failure opens a repairable gap | **CONTRADICTED** | Non-attributing evaluators produce `missingFunctions=[]` — no repairable signal; Mission 007 made this a HIGH fix |
| A scalar "mastery score" is sufficient state | **CONTRADICTED by design** | Learner model deliberately exposes categorical uncertainty + separate dimensions; collapsing to a number re-hides the blocking-gap semantics the kernel exists to preserve |

## Boundary conditions that matter for policy

1. **Novice boundary (load):** A1 = all material high-interactivity.
   Difficulty escalation must wait for demonstrated stability
   (INDEPENDENT + evidence sufficiency), not be inferred from momentum.
2. **Absence boundary (forgetting):** long gap → *relearning* semantics
   (`relearning override`, Nakata 2022). A due-retrieval on a forgotten
   item should be re-exposure+retrieval, not a hard test.
3. **Dependency boundary:** supported-but-dependent ≠ weak — it's a
   fade stage. The policy must prefer unaided re-attempts over endless
   re-support (dependency ceiling), and support demands are bounded per
   episode, not lifetime.
4. **Attribution boundary:** a failure is only actionable if attributed.
   Policy must route non-attributing failures toward diagnostic probes
   (information), not remediation loops (correction without diagnosis).
5. **Fatigue/session boundary:** no signal exists — the honest choice is
   to bound session composition by counts (max new items, max probes)
   rather than fake a fatigue estimator.
6. **Modality boundary:** capabilities are modality-scoped
   (listening vs speaking are different capabilities). Transfer and
   retrieval must respect modality — a reading success does not imply
   listening readiness.
7. **Starvation duals:** review starvation (forgetting because new
   content crowds out due retrievals) and new-content starvation
   (curriculum stagnates because every session is consumed by review).
   Every policy must guard *both*.

## Where the evidence is silent (honest gaps)

- Optimal ratio of review:new per session — no direct study; will be a
  Policy B/C tunable.
- How to compose multimodal coverage within a session (four strands are
  course-level, not decision-level).
- Whether `latencyMs` is a usable effort signal — recorded, never
  validated.
- Whether bounded learner choice (pick 1 of N valid actions) preserves
  the Patall motivation benefit without losing sequencing quality —
  plausible, unproven for this design.
