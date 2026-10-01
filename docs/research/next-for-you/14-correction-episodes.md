# 14 — Correction episodes & delayed retest (Mission 008F)

Question this file answers: what does the evidence say about treating a
post-correction success as *resolved* vs. *verified-later*? Mission 008F
designs the correction-episode contract + B1 shadow policy from it.

Every claim ends with a **boundary** (where it does not hold), a
**design implication** (what B1 does about it), and a **falsification
condition** (what would make the design wrong).

## Claims and evidence

**D1. Immediate post-correction success is performance, not retention.**

The CF meta-analytic convention itself treats *delayed* post-tests as
the durability evidence: Lyster & Saito (2010) measure CF effects on
delayed post-tests precisely because immediate ones conflate working
knowledge with retention. Soderstrom & Bjork (2015, "Learning versus
performance" integrative review): conditions that boost immediate
performance systematically inflate estimates of durable learning — the
"current performance" vs "stored learning" dissociation is one of the
best-replicated findings in the field. Nelson & Dunlosky's delayed-JOL
work makes the same point at the metacognition level: immediate ease of
recall is not a valid predictor of delayed recall; only retrieval after
a delay is (see 02/sources). → **STRONG.**

- *Boundary:* the dissociation is about *evidence interpretation*, not
  about whether immediate repair attempts should happen — correcting
  immediately is still the better-supported move (D3). What the evidence
  rejects is *certifying* on immediate evidence.
- *Design implication:* a remediation success can never close the
  correction episode. It opens the waiting phase (`REPAIRED_WAITING`);
  only a post-lag independent success can verify (`VERIFIED`).
- *Falsification:* if immediate post-repair accuracy predicted delayed
  accuracy at ceiling (no dissociation for this population/material),
  the lag gate would be pure friction. B1 must log both so the corpus can
  measure the gap instead of assuming it.

**D2. Spaced/delayed retrieval is the honest check; the lag may reuse
`retention.minLagMs`.**

Kim & Webb (2022) L2 spacing meta (98 ES, N=3411): spacing benefits
delayed retention; shorter spacing ≈ longer on immediate tests but worse
at delayed (02 C3). Karpicke & Roediger (2007): delaying the *first*
retrieval attempt is what drives long-term gain; Karpicke & Bauernschmidt
(2011): absolute spacing enhances learning regardless of relative
spacing. No study pins a single optimal retest delay for A1 functional
language — the evidence supports "meaningful delay", not a number. →
**STRONG for delay-existing; WEAK for any specific value.**

- *Boundary:* the 24h `retention.minLagMs` is a v0 policy prior, not an
  empirically-derived optimum for correction retests. Kim & Webb's lag
  interacts with material type; the honest move is to reuse the existing
  named constant rather than invent a second uncalibrated one.
- *Design implication:* retest eligibility = `occurredAt ≥ repairedAt +
  retention.minLagMs` — one lag constant, one provenance, no invented
  parameter. Falsification: if B1/B0 divergence shows retests failing
  systematically right at 24h (recurrence rate implausible), the lag is
  a candidate for revision — as a *policy version bump*, never a silent
  retune.

**D3. Repair should still happen immediately — correction timing and
verification timing are different constructs.**

Fu & Li (2020): immediate CF beats delayed CF for L2 skill development.
The misinformation-correction studies that favor *delayed* feedback
(Butler/Karpicke line; interference-perseveration hypothesis) concern
correcting *factual errors*, not skill procedures — and Yang et al.'s
cued-error replication challenged even that mechanism. L2 vocabulary
timing studies (Sagepub 2014) find feedback timing has little effect
when lag-to-test is controlled. → **MODERATE** (03 C4/C5 already grade
this); the consistent synthesis: correct early, verify late.

- *Boundary:* hypercorrection (Metcalfe) means high-confidence errors
  correct *better* when delayed — the evidence does not forbid immediate
  repair here because the served remediation is a prompt-type
  self-repair (03 C2), not answer-feeding.
- *Design implication:* B1 does NOT delay remediation — the repair path
  (support demand → correction) is unchanged. What changes is only
  *what certifies*: transfer/assessment wait for delayed retest
  evidence, not for the repair success itself.
- *Falsification:* none needed for the gate to be safe — worst case it
  adds a lag the evidence says is neutral-to-helpful.

**D4. Errors recur after correction — a relapse path is not optional.**

Metcalfe's hypercorrection work shows corrected errors can persist and
return; Nakata, Suzuki & He (2022, already in sources.md) document a
"relearning override effect" where re-exposed errors interfere again.
The CF literature's own durability claim (Lyster & Saito 2010 "durable
effects") is only *durable on average* — the delayed post-test exists
because immediate gains decay measurably. → **MODERATE-STRONG.**

- *Boundary:* recurrence rate in a typed/choice A1 app is unknown;
  classroom CF recurrence may not transfer directly.
- *Design implication:* `RETEST_DUE → RELAPSED` must be a first-class
  transition, and a relapsed episode must route back through repair +
  a restarted lag — never silently reopen as a fresh episode and never
  carry over "repaired" status.
- *Falsification:* if retest failures never occur in practice, the
  relapse path is dead code — the corpus must measure relapse
  frequency, and B1's log records it per episode.

**D5. Post-correction practice should vary the context (repair is not
the retest surface).**

Transfer/varied-practice evidence (04, Kim & Webb generalized spacing)
plus the kernel's own freshness doctrine: a retest on the *same* failed
item measures memorization of that item, not recovery of the function.
The support-demand lifecycle already encodes "success that never
exercised the function proves nothing" (planner.js issue #61) — the
same principle applied to surfaces: a retest on a rehearsed remediation
surface proves less than on an alternate one. → **MODERATE** (partly a
kernel-consistency argument rather than a direct empirical result — the
honest grade).

- *Boundary:* "alternate surface" means alternate *task*, not alternate
  *capability*: the retest must still exercise the missed function(s)
  or it is evidence of nothing.
- *Design implication:* retest eligibility excludes EVERY burned
  surface — the opening failure's task AND every task a failure was
  later recorded on inside the episode (a retest that itself relapsed
  is a failed item; re-serving it would be reselling the miss) — AND
  every remediation task consumed during the episode, and requires
  `requiredFunctions` coverage of the still-missing functions.
  Where no such surface exists, B1 emits an explicit
  `correction_content_backlog` — authoring debt, never silent
  fallthrough.
- *Falsification:* none — this is a validity requirement, not an
  efficacy claim.

**D6. Only authoritative failures may open an episode.**

03's boundary already established: non-attributing evaluators produce
`missingFunctions=[]`, and Mission 007 made "no fabricated diagnosis" a
HIGH-severity fix. `contractAttributesFunctions` bounds attribution to
the choice contract; `verifyEventTask` bounds evidence to registered
task@revision. → **STRONG (kernel-inherited).**

- *Boundary:* none — this is a security/validity property.
- *Design implication:* episodes open only from `observed===true`,
  verified, attributing failures on a *taught* capability (a baseline
  probe miss is information, not a broken ability). Supported successes
  can neither repair nor verify. Foreign-learner, stale-revision and
  malformed events are context, never episode evidence.
- *Falsification:* validator + adversarial suite must show the opposite
  inputs never mint episodes.

## What the evidence does NOT establish

- An optimal retest delay value → reuse `retention.minLagMs` (D2).
- That B1's gating produces better learning → B1 is a *validity*
  hypothesis (it stops over-certification), evaluated counterfactually;
  the mission must not claim a teaching advantage.
- That one retest suffices → VERIFIED is "resolved once", not "immune";
  a later attributed failure opens a NEW episode on the same capability.

## Design contract condensed

```
failure (observed, verified, attributing, on a taught capability)
  → OPEN        accumulate further failures; union missingFunctions
  → REPAIRING   remediation-purpose attempt seen (any outcome)
  → REPAIRED_WAITING   independent success covering ≥1 missing function
                       (any non-support surface — demonstrated recovery
                       is the repair, matching the demand lifecycle's rule)
  → RETEST_DUE         now ≥ repairedAt + retention.minLagMs
  → VERIFIED    every missing function independently demonstrated
                post-lag on a task carrying no failure or repair record
                in this episode
RETEST_DUE → RELAPSED   new authoritative failure while unresolved
                        → repair path returns; lag restarts at the new
                        repairedAt; the just-failed surface joins the
                        burned set and may never re-serve as retest
```

B1 gates `transfer`/`assessment` on unresolved-episode capabilities and
elevates a `correction_retest` candidate (REPAIR tier) while a retest is
due; no surface → explicit `correction_content_backlog`, never fallback
to a stale surface.
