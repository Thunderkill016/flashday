# 05 — Challenge, difficulty & cognitive load

## The two opposing forces

**Desirable Difficulties (Bjork):** spacing, interleaving, generation,
varied practice, intermittent feedback, testing — conditions that slow
acquisition but improve retention/transfer. Legitimate, replicated
foundation.

**Cognitive Load Theory (Sweller):** learning fails when working memory
is exceeded; extraneous load is always bad, intrinsic load must be
managed to fit capacity, and for beginners the *task itself* is already
high element-interactivity.

**Reconciliation (Chen et al. 2018; comparative review 2024):**
desirable difficulties are desirable *only when WM is not already
overloaded*. For high element-interactivity material (novel content for
a novice), adding difficulty is *undesirable*. The moderator is
material complexity × learner expertise. → **MODERATE**, and it is the
single most important boundary on "make it harder" policies.

**Challenge Point Framework (Guadagnoli & Lee 2004):** optimal challenge
is a function of task difficulty and learner skill — there is a
functional difficulty region, not a universal optimum. Wilson et al.
(2019, *Nature Comms*) derived ~85%/15% error-rate optimum **for binary
classification under gradient-descent assumptions** — mathematically
elegant, domain-narrow, and NOT a defensible number for A1 language
sequencing. → **MODERATE** for the *region* concept; **UNSUPPORTED**
for any specific percentage.

## Operational challenge taxonomy (no fake thresholds)

Three zones, definable from learner-model facts without inventing a %:

- **Too easy:** consistent unaided successes, no failures, evidence
  already sufficient — learning value of repeating is near-zero; the
  action's marginal teaching value is ~0.
- **Productive challenge:** independent evidence thin or absent;
  capability in SUPPORTED/EXPOSED; failures present but *attributed*
  (a repairable `missingFunction` exists) or alternating with success.
- **Overload/repeated failure:** `consecutiveFailures` high AND
  (failures non-attributing OR demands already pending/recurring).
  Additional same-task attempts have negative expected value — the
  learner needs substrate support, easier scaffolded work, or rest.

## Missing signals (honest gap list)

To run a real challenge controller the model would need:

1. **Response latency calibrated** — `latencyMs` is recorded but never
   validated; hesitation is the cheapest overload signal.
2. **Session position/load** — no session counter or fatigue signal
   exists in the kernel.
3. **Per-task difficulty priors** — no difficulty parameter on tasks;
   CAT-style difficulty estimation would need either content metadata
   or empirical response data.
4. **Self-reported confidence** — exists only implicitly (self-report
   is excluded from independent evidence but could still inform
   challenge zoning).

None of these should be faked with proxies in v0. The honest v0
controller is: `consecutiveFailures` + `unresolvedFunctions` +
`evidenceSufficient` + `support.dependent` — all already exposed.

## Implications

1. Never raise difficulty merely because a learner is succeeding —
   that exploits the performance/learning confusion Bjork warns about.
   Raise demand only when the *evidence* supports sufficiency.
2. Never keep drilling through consecutive failures — CLT boundary +
   CF evidence both say change the move.
3. Novice status raises overload *risk*, but element-interactivity is
   task/material-dependent — do not assert "A1 = all high-interactivity."
   Bias toward supported/input work early on genuinely novel, multi-
   element material; the kernel's SUPPORTED stage before INDEPENDENT
   already encodes that ordering.
