# 02 — Retrieval practice & spacing

## Claims and evidence

**C1. Retrieval practice is the single best-supported learning event.**
Adesope, Trevisan & Sundararajan (2017, *Review of Educational
Research*): practice tests beat restudy and all other comparators across
moderator analyses. Rowland (2014, *Psych Bulletin*) meta of the
testing effect. L2-specific instantiations: Barcroft (2007) word
retrieval; Kang, Gollan & Pashler (2013) retrieval>imitation for foreign
vocabulary. → **Grade: STRONG.** The kernel's RETRIEVE stage is on
solid ground.

**C2. Spacing amplifies retrieval; the two combine, not substitute.**
Kim & Webb (2022) meta of L2 spaced practice: 98 effect sizes, N=3411,
medium-to-large spacing benefit. Latimier, Peyre & Ramus meta of
spaced-*retrieval*: **g=0.74 spaced vs massed**. → **STRONG.**

**C3. Longer intervals help delayed retention, hurt nothing immediate.**
Kim & Webb: shorter spacing ≈ longer on immediate tests but **worse at
delayed**. → **MODERATE.** Implication: `minLag` should err long, not
short, when the goal is durable retention — but the *optimal* lag is
an interaction (lag × retention-interval), not a constant. Current
fixed-lag gate is a reasonable v0, not refuted.

**C4. Expanding schedules are NOT required.**
Latimier et al. subset 2: expanding vs uniform **g=0.034** (null).
Nakata (2015): equal ≈ expanding for L2 vocab. The expanding advantage
appears only with high exposure counts. → **CONTRADICTED** as a
design requirement. A vNext policy does not need geometric expansion;
interval adequacy matters more than interval shape.

**C5. Retrieval count vs efficiency tradeoff is real.**
Nakata (2017): 5-7 within-session retrievals best absolute retention,
but **1 retrieval best gain-per-minute**. → **MODERATE.** Policy must
not equate "more drilling" with "more learning" — this is direct
evidence for the per-minute objective shape.

**C6. Absolute spacing matters more than relative shape.**
Karpicke & Bauernschmidt (2011): total spacing predicts retention
regardless of schedule pattern. → **MODERATE.**

**C7. Pretesting has value even when the learner fails.**
Test-potentiated learning: attempting before instruction improves
later encoding. Supports kernel's diagnostic-probe-first rule 8.
→ **MODERATE.**

## Contradictions / boundaries

- Retrieval benefits require the attempt to be *successful or
  correctable* — pure failure without feedback is weak (feedback must
  follow; see 03).
- Massed retrieval within a session shows diminishing *efficiency*
  (C5); the kernel's per-attempt architecture must not translate
  "retrieval is good" into "repeat retrieval now."
- Relearning overrides spacing benefits at the boundary (Nakata,
  Suzuki & He 2022): relearning forgotten material is not equivalent
  to retrieval of retained material — post-30-day-absence learners
  need *relearning*, not retrieval.

## Implications for Next For You

1. `DUE_RETRIEVAL` deserves high (but not absolute) precedence —
   evidence-grade STRONG.
2. Due-ness should ideally be probability-based (recall likelihood),
   not just elapsed-lag — but vNext has no memory model; elapsed lag is
   the honest v0.
3. A post-absence learner is a *relearning* case, not a retrieval case —
   the policy should detect long-gap return and soften the demand.
4. Session-level retrieval budgeting (not in current planner) is the
   mechanism that turns Nakata-2017 into a bound: cap massed re-probes
   per capability per session.
