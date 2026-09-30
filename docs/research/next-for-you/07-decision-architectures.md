# 07 — Decision architectures compared

Ten candidate architectures for the `STATE → action` mapping, evaluated
against FlashDay's constraints: deterministic replay, inspectability,
cold-start viability, kernel invariants, no-cloud-AI, honest objectives.

## A. Fixed priority rules (status quo shape)

Strict ordered cascade; first match wins.

- Explainability: **highest** (rule number = reason).
- Cold start: perfect (no data needed).
- Safety: excellent if the order is right — order is *the whole policy*.
- Replay determinism: total.
- Reward hacking: none (no reward).
- Blind spots: no cross-rule tradeoffs; cannot weight severity of a
  due-retrieval vs a pending remediation; cannot express "either is
  fine, pick cheaper"; cannot exploit uncertainty information.
- Verdict: strong safety skeleton, weak optimality surface.

## B. Weighted deterministic ranking

Candidates generated, each scored `Σ w_i·f_i`, argmax wins.

- Explainability: good (feature contributions inspectable).
- Cold start: needs hand-set weights — defensible priors, not learned.
- Safety: weights can accidentally let a low-severity item outrank a
  safety-critical one unless invariants are enforced as *filters* not
  weights.
- Determinism: total (pure function).
- Reward hacking: only if weights reward proxies.
- Verdict: workable; the danger is weights silently overriding
  invariants — must be `filter → score`, never `score` alone.

## C. Lexicographic constraints + ranking (filter → sort → score)

Hard eligibility filters (kernel invariants + safety) → candidate set →
deterministic scoring within the set.

- This is B with safety made non-negotiable. Equivalent to A where the
  cascade degenerates, strictly more expressive where A's order was
  arbitrary.
- Verdict: the natural v0 architecture.

## D. Mastery-learning policy

Progress is gated: no new capability until current one hits a state
bar (e.g., INDEPENDENT). Kernel already implements the bars; a mastery
*policy* makes new-content admission depend on mastery rate.

- Strength: never outruns the evidence.
- Weakness: pure mastery sequencing starves breadth — a stuck learner
  is trapped on one capability (failure loop). Needs an escape valve
  (move sideways after bounded failures — which is what remediation +
  demand routing already encode).
- Verdict: a *component* (admission gate), not a whole policy.

## E. Information-gain policy

Choose the action that most reduces model uncertainty (like CAT's
max-Fisher-information).

- Strength: correctly probes thin-evidence capabilities — something no
  rule in the current cascade does.
- Weakness: pure information-maximization = assessment spam; teaches
  nothing. Must be a *bounded budget* within a larger policy
  ("if evidenceSufficient=false and diagnostic available → spend the
  diagnostic budget").
- Verdict: a candidate-scoring *feature* or a bounded intent, not a
  governing architecture.

## F. Spaced-retrieval scheduler + curriculum planner (two-layer)

A memory/retrieval layer owns "what's due" (HLR/FSRS-style or fixed-lag);
a curriculum layer owns "what's next pedagogically." Compose by
arbitration rules.

- This is essentially the *de facto* current split: rules 2-6 are the
  memory/maintenance layer; rules 7-8 are the curriculum layer.
- Making it explicit clarifies the design question: **which arbitration
  between layers, and is it rule-based or scored?**
- Verdict: correct decomposition; the arbitration is the policy.

## G. Contextual bandit

State→features, per-action reward model (LinUCB/Thompson), explore-
exploit online.

- Requires: a scalar reward (what? durable gain is delayed and
  confounded), enough data (cold-start kills it), and tolerance for
  exploration cost on real learners.
- Evidence (06): completion gains, not learning gains; bandit ≈
  randomized policy in the honest comparison.
- Breaks determinism unless frozen/thompson seeds pinned — conflicts
  with replay-audit invariant.
- Verdict: **not justified at v0**; revisit when reward = validated
  learning proxy and logged data exists.

## H. Reinforcement learning (sequential, MDP)

Full state-transition policy; optimize long-horizon reward.

- All bandit problems plus: horizon confounding, simulator fidelity
  requirements, off-policy evaluation difficulty. No demonstrated
  learning-gain win over simpler methods in tutoring literature.
- Verdict: rejected for v0; the sophistication is not earned.

## I. Model-predictive / simulated planning

Roll forward candidate sequences under a learner simulator; pick the
sequence with best predicted durable-gain.

- Strength: directly optimizes the actual objective *if* the simulator
  is honest.
- Weakness: simulator fidelity is the whole problem — a bad sim
  optimizes the sim. vNext has no memory/decay model to simulate with.
- Verdict: becomes viable *after* 008B's benchmark + a memory model
  exist; the simulation benchmark is precisely what would validate it.

## J. Hybrid: hard constraints + deterministic scoring + later calibration

Recommended-shape candidate:

```text
STATE (learner model + events + tasks + policy)
  → eligibility filters        (kernel invariants + safety floors)
  → pedagogically valid set    (one entry per defensible intent)
  → candidate facts            (all read from learner-model evidence)
  → deterministic tier/scorecard + ordinal preference list
                               (NOT a calibrated weighted sum at v0)
  → deterministic tie-break
  → chosen action + reason     (explanation = the deciding rule/features)
```

- Explainability: high (tier + feature-level rationale; why A beat B is
  answerable).
- Cold start: preference orderings are explicit versioned priors; any
  continuous weighting stays *experimental* until validated by real
  learner outcomes — simulation can falsify pathologies, it cannot
  calibrate pedagogical weights.
- Safety: invariants are filters — cannot be out-scored.
- Determinism: total; replay-safe; no hidden state.
- Reward hacking: limited to weight design review.
- Offline eval: simulatable over event logs (008B benchmark).
- Can absorb learned components later as *calibrated weights*, not as
  a black-box policy.
- Verdict: best fit for FlashDay constraints.

## The one-vs-set question

`STATE → ONE ACTION` (current) vs `STATE → valid set → select`:
the evidence favors the set architecture because (a) the choice between
two valid intents is often a *ranking* question not an *eligibility*
question (due retrieval vs remediation severity), and (b) bounded
learner choice (Patall motivation effect) can only be offered over an
explicit valid set. The kernel's strict cascade conflates eligibility
with preference — separating them is the core architectural insight.
