# 06 — Adaptive tutoring, sequencing & assessment architectures

## What the field has established

**Human tutors vs ITS (VanLehn 2011):** human tutoring d=0.79, ITS
d=0.76, CAI/answer-based d=0.3. The gap between human and ITS is small;
the granularity hypothesis (finer interaction grain = better) **plateaus**
— step-level ITS ≈ human. Practical consequence: FlashDay's
step-level (per-task) granularity is already in the effective range; no
need for sub-step dialogue to justify sequencing gains.

**What human tutors actually do (VanLehn, "What Do Human Tutors Do"):**
model → scaffold → fade; prompt before the learner attempts hard steps;
give correctness feedback with circumlocution rather than "wrong";
withdraw prompting first, then feedback; diagnose scaffolding needs
within minutes. Executable principles: (a) **fade support by default**,
(b) **prompt beats tell** (matches prompts>recasts), (c) **impasse is
required for learning** — over-helping prevents it.

**K-12 ITS meta (2025):** g=0.271 overall; worked-out examples a key
moderator; similar effects elementary/middle; weaker for low-resource
settings. → ITS works, effect modest, design choices matter more than
the "adaptive" label.

**Mastery learning (Bloom lineage; Black & Wiliam review):** high
criterion + feedback-then-restudy cycles improve outcomes; formative
assessment is the mechanism, not the label. The kernel's
INDEPENDENT→RETAINED→TRANSFERRED chain is a mastery progression with
honest evidence bars.

**CAT/IRT (assessment science):** maximum Fisher information item
selection minimizes test length for a given measurement precision;
time-efficient variants exist but gains are modest. Key design
transplant: **measurement-precision-driven selection is a different
objective than instructional selection** — a diagnostic action should be
chosen for information, a teaching action for gain.

**Knowledge tracing:** 25-year BKT review; JEDM empirical comparisons —
logistic-regression approaches beat DKT on moderate data; DKT needs
scale; most KT work predicts *answers*, far less validates against
learning mastery. Data-hungry.

## Bandits / RL for sequencing — the honest assessment

- LinUCB curriculum sequencing (2022): improved **completion rates**
  and engagement — objective was completion, not learning gain.
- MathBot contextual bandit: matched randomized-policy learning gains
  at lower experimentation cost — good for exploration economy, no
  learning superiority shown.
- Offline/counterfactual ITS policy learning (2025): retrospective
  improvements on logged policies — promising but unvalidated live.
- DABSEC and similar: benchmark rewards, not learning outcomes.

→ **Grade: TENTATIVE** for learning gain; **reward-hacking risk is
real** (optimize completion → easy task loops; optimize engagement →
streak mechanics). Any learned policy must run *inside* hard
pedagogical constraints and have an auditably separable objective.
Not justified for v0 (cold-start, no reward definition, determinism
requirements).

## Executable principles extracted for policy design

1. Separate **diagnostic actions** (information-optimal, bounded,
   sparse) from **teaching actions** (gain-oriented) — CAT vs ITS lesson.
2. Default direction is **fade** — support is scaffolding, scaffolding
   must withdraw or it becomes dependency (matches kernel demand
   consumption semantics).
3. Criterion-based progression (mastery) over time-in-sequence
   progression — the kernel already enforces this via states; the
   planner's job is *which unsatisfied criterion to work on next*.
4. Model-predictive/lightweight-step planning is feasible at task grain
   — no need for dialogue-grain control.
