# 00 — Research question & objective discipline

## The governing question

> Given an honest Learner Model and the available curriculum, what should
> FlashDay optimize when choosing the learner's next activity?

Operational form:

> Which sequence-selection policy maximizes **durable, transferable,
> independently-demonstrated** second-language ability per unit learner
> time — without violating the kernel's evidence invariants?

## Objective hierarchy (draft for 008B adjudication)

Primary (the thing being maximized):

1. **Durable independent capability gain** — capabilities that reach
   INDEPENDENT and stay there under delayed evidence (`retained`,
   `assessed` demonstrations), not momentary task success.
2. **Transfer** — demonstration in a genuinely new context family
   (`transfer.demonstrated`), which is the kernel's honest stand-in for
   "usable in the wild."

Secondary constraints (cannot be sacrificed, but are not the objective):

- **Fatigue/cognitive load** — a binding constraint, not an optimization
  term (no fatigue signal exists yet; see repo-reality §4).
- **Breadth/curriculum progress** — a fairness/continuity constraint;
  forward progress must not starve, and review must not stagnate it.
- **Support fading** — dependency is a *cost*, not a capability;
  `support.dependent` should push toward unaided re-evidence, not be a
  terminal state.
- **Fluency/automaticity** — explicitly out of scope until a calibrated
  contract exists (kernel invariant).

Explicitly NOT objectives (may be secondary UX metrics only):

- Streak, session length, return probability, XP, lesson-completion
  count, clicks. Duolingo's own HLR work optimized *engagement* (+12%
  daily use) as a proxy — that is a business metric, not a learning
  metric, and this research treats it accordingly (Settles & Meeder 2016).

## Why "expected durable learning gain / minute" is the right *shape* but
## not yet the operative formula

It correctly penalizes cheap-but-empty wins (assessment spam, easy-task
loops) and expensive-but-ineffective ones (over-drilling). But it cannot
be computed honestly today because:

- No latency→learning causal link is measured (attempt `latencyMs` is
  recorded but never validated as an effort/fluency proxy).
- No memory model exists to convert "due now" into "expected recall
  probability."
- No cost model distinguishes a 20s probe from a 4-min interaction.

So the research output is a **decision architecture and candidate
policy set** that keeps this objective shape as the north star while
using only computable signals. The formula is the direction, not the
v0 mechanism.

## Two separable value questions every policy must answer

1. **Teaching value** — does this action likely cause the learner to
   gain capability?
2. **Diagnostic value** — does this action reduce the model's
   uncertainty about capability (expose thin evidence, confirm a gap,
   verify retention)?

CAT/IRT research shows these are *different* item-selection objectives
(max Fisher information vs instructional gain). A policy that only
optimizes teaching value will never probe a thin-but-plausible
capability; one that only optimizes information turns into assessment
spam. The design must hold both as *distinct, bounded* action
intentions — matching the kernel's existing `diagnostic`/`assessment`
purpose types.

## Scope bounds for this mission

- vNext kernel only (`src/vnext/`). Legacy `src/core/` FSRS/planner is
  reference material, not the target surface.
- Research-only: no implementation, no planner semantics changes.
- All claims graded STRONG/MODERATE/TENTATIVE/UNSUPPORTED/CONTRADICTED
  in `01-evidence-map.md`.
