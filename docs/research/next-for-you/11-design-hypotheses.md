# 11 — Design hypotheses: candidate policies & failure matrix

All policies below operate on the **same state**: `buildLearnerModel`
output + the event log + registry + `policy.js` knobs + `now`. None
invent signals. Worked examples use *real* learner-model snapshots
generated from `meet_at_a_time` fixtures (see bottom).

## Action taxonomy (revised)

| Intent | Source rule(s) today | Teaching or Diagnostic? | Notes |
|--------|---------------------|--------------------------|-------|
| `RESUME` | rule 1 | — | Hard invariant: never abandon in-flight work |
| `DUE_RETRIEVAL` | rule 2 | Teaching (retrieval IS the learning event) | Due = `lastUnaided + lag ≤ now` |
| `REFRESH/RELEARNING` | — (new) | Teaching | **Eligible ONLY on direct evidence**: verified failure on a previously demonstrated capability. Long absence may justify *scheduling a check* — it must NEVER mint this intent by itself (time-as-expiry was removed from the model; no decay model exists) |
| `SUPPORT_DEMAND` | rule 3 | Diagnostic+repair substrate | Kernel-defined; unchanged |
| `UNRESOLVED_CORRECTION` | rule 4 | Teaching (repair) | Only when failure is *attributed* |
| `DIAGNOSTIC_PROBE` | part of rule 8 + (new) | Diagnostic | Uncertainty-resolution / baseline; serves `evidenceSufficient=false` caps; bounded per decision-episode |
| `ASSESSMENT` | checkpoint events | Claim-bearing evidence | Distinct from DIAGNOSTIC_PROBE: assessment mints *fresh claim-bearing* evidence (checkpoint events); probing resolves uncertainty. Both retrieve; semantics must stay separate — never fold assessment into the probe budget |
| `TRANSFER` | rule 5 | Teaching (generalization) | Novel-family only |
| `INDEPENDENT_ATTEMPT` | rule 6 | Teaching+evidence | Supported → unaided run |
| `MISSION_CONTINUATION` | rule 7 | Teaching (input/notice) | Exposure tasks; prerequisites met |
| `NEW_INPUT` | rule 8 | Teaching+Diagnostic | First eligible never-seen cap |
| `IDLE` | rule 9 | — | Terminal |
| `FLUENCY_PRACTICE` | — | — | **Reserved** — no calibrated contract; do not implement |

`DIAGNOSTIC_PROBE` carries a bounded budget per decision-episode
(session), not per streak — a streak is an engagement construct, not a
learning boundary. `ASSESSMENT` is separately gated by its own
evidence-sufficiency conditions (it must not become constant testing,
and it is not interchangeable with probing).

## Policy A — Conservative rule-based tutor

**Shape:** the current cascade + three surgical corrections, still
purely lexicographic (no scores).

Corrections (each tied to a contradiction in file 10):

- **A1 — failure escalation bound:** after `consecutiveFailures ≥ N`
  on an *attributed* gap → `SUPPORT_DEMAND`/easier scaffolded work, not
  unbounded `retry` on the same failing task. Kills the failure loop.
- **A2 — non-attributing failure handling:** `missingFunctions=[]`
  means *no justified attribution* — candidate generation may admit a
  diagnostic/clarification action when a valid one exists and budget
  allows, and may keep meaningful retry or mission continuation valid;
  it must never fabricate a substrate diagnosis.
- **A3 — refresh semantics, not time semantics:** elapsed absence never
  mints a relearning intent. It may make a check/retrieval candidate
  reasonable on a justified schedule; refresh becomes eligible only
  after a verified failure on a previously demonstrated capability.

Order (revised): resume → due_retrieval → support_demand →
**correction (attributed only, bounded; else admit-not-force probe)** →
**refresh (only on verified failure of demonstrated ability)** →
transfer → independent → diagnostic_probe (thin-evidence caps,
episode-budgeted) → mission continuation → new_input → idle.

- Pros: maximal safety, total explainability, zero reward-hacking
  surface, trivially deterministic.
- Cons: order still rigid — no severity weighting (a 3-day-overdue
  retrieval ties with a 25h one); session composition unhandled;
  starvation guards are implicit not explicit.

## Policy B — Constrained multi-factor ranking (hybrid J)

**Shape:** `filter → generate valid set → tier/scorecard → deterministic
tie-break → action + reason`. **v0 does not use an arbitrary floating-
point weighted sum presented as calibrated** — preferences are ordinal
and rule-attributable.

- **Filters (hard, cannot be out-preferenced):** kernel invariants
  (in-flight resume, attempt-type honesty, modality match, prereq
  gating, demand lifecycle semantics, support-cap exclusion from
  direct introduction); safety floors (consecutive-failure ceiling →
  no more same-task candidates; `missingFunctions=[]` → remediation
  candidate suppressed while diagnostic/continuation/retry candidates
  remain admissible).
- **Tier/scorecard + ordinal contributions:** each candidate reports
  the model *facts* and *hypotheses* it satisfies:
  - facts from the model: `dueStatus`/`evidenceAge` (observable age —
    NOT a monotonic "the-more-overdue-the-better" weight; continuous
    overdue scaling is an **experimental hypothesis** since no recall-
    probability model exists), `unresolvedFunctions`, `recurring`
    gaps, `support.dependent`, `consecutiveFailures`,
    `evidenceSufficient`/reasons (`thin_independent_evidence`,
    `no_delayed_evidence`, `no_transfer_evidence`), `retained`,
    `transfer.demonstrated`, `assessment.demonstrated`.
  - **policy hypotheses** (explicitly NOT evidence-backed facts —
    benchmarkable as starvation guards/tie-breaks, not calibrated):
    `breadthDebt`, `noveltyDebt`, `contextVariety`, session-composition
    budgets.
- Every contribution is an existing fact, a labeled hypothesis, or an
  explicit policy knob — no fake proxies, no hidden precision.
- Pros: expresses real tradeoffs while keeping "why A beat B"
  rule-attributable; deterministic; replay-safe; cold-start viable;
  simulatable offline (simulation falsifies pathologies and compares
  behavior — it cannot calibrate true learning-effect weights; those
  wait for human data).
- Cons: preference ordering still needs 008B benchmarking for
  pathology-freedom (not optimality claims); more design surface
  than A.

## Policy C — Information-gain-aware ranking (B + explicit diagnostic leg)

Policy B plus a **budgeted information objective**: candidates score on
*expected uncertainty reduction* (thinness, absent delayed evidence,
unassessed-but-plausible) as a first-class contribution, gated by a
diagnostic budget scoped to the **decision-episode/session** — a streak
is an engagement construct, not a learning boundary.

- Pros: only architecture that correctly handles "two equally-weak
  capabilities, one barely observed" — CAT's core lesson; prevents
  both under- and over-assessment via the budget.
- Cons: information value is only as honest as the uncertainty model —
  `evidenceSufficient`/reasons are coarse; the budget bounds the
  downside.

## Policy D — Learned/contextual (deferred)

Contextual bandit over the Policy B feature space *inside the same
filters*. Requires: validated reward (e.g., retained-gain proxy),
logged decisions+outcomes, pinned determinism scheme. Not justified
today (06 evidence: completion ≠ learning gains); explicitly an 008C+
question, gated on a simulator/benchmark existing.

## Worked examples (real snapshots, `meet_at_a_time` target cap
## `reception.listen.understand_clock_time`)

**S1 — Fast learner (full chain done, +3d):**
`{state:TRANSFERRED, indep:5, dep:false, unresolved:[], assessed:true,
transfer:true, retained:true, sufficient:true, reasons:[]}`

- A: rules 2-8 all miss → continues to other caps / `idle`. Correct.
- B: this cap offers no positive contributions → preference moves to
  weaker caps (breadthDebt, a labeled hypothesis, would break the tie
  toward never-seen work). Correct — no wasted drilling.
- C: `sufficient:true` → zero diagnostic value. Same as B.

**S2 — Support-dependent learner (probe served, aided win only):**
`{state:SUPPORTED, indep:0, dep:true, unresolved:[NUM_FN],
consec:0, assessed:false, reasons:[only_supported_attempts,
unresolved_function_gap, support_dependent]}`

- A: demand pending → support_demand (if pending) else rule 6
  `independent_attempt` — correct: the *aided* win minted nothing, so
  an unaided attempt is the right next move.
- B: `independent_attempt` scores high (dep→unaided boost), probe
  suppressed (already served). Same choice, better rationale.
- C: also flags `evidenceSufficient=false` → candidate diagnostic
  *if* budget allows — extra info, but the unaided attempt is both
  teaching AND diagnostic here, so argmax lands the same.

**S3 — Thin independent (one unaided success, +2h):**
`{state:INDEPENDENT, indep:1, dep:false, assessed:false, transfer:false,
retained:false, sufficient:false, reasons:[thin_independent_evidence,
no_delayed_evidence, no_transfer_evidence]}`

- A: INDEPENDENT + not yet due (2h < 24h lag) → falls through to
  rules 6-8 → moves to next capability. **A leaves thin evidence
  unexamined** — this is the honest gap in the cascade.
- B: low teaching value on this cap (not due, already independent);
  breadth wins. Same as A — acceptable.
- C: `thin_independent_evidence` + `no_delayed_evidence` → at `now`
  the diagnostic value is *deferred but scheduled*: C knows it must
  re-probe at lag to test retention, not just trust the single success.
  Difference: C's intent is *deliberate*, A/B's is incidental.

**S4 — Stuck learner (3 consecutive attributed fails):**
`{state:EXPOSED, dep:true, unresolved:[NUM_FN], recurring:[NUM_FN],
consec:3, reasons:[no_independent_evidence, currently_failing,
unresolved_function_gap, support_dependent]}`

- A (unmodified cascade): rule 4 `retry` — **the defect**: a 4th
  identical attempt on an unresolved attributed gap. With A1 bound:
  demand/probe instead. This is the concrete case where A-without-fix
  is wrong.
- B: filters kill the retry candidate (failure ceiling) → argmax lands
  on `SUPPORT_DEMAND` (if pending) or `DIAGNOSTIC_PROBE` (re-probe
  substrate). Correct.
- C: same; recurring gap also raises probe value.

## Failure/pathology matrix — each policy × learner archetype

| Archetype | A (fixed rules) | B (ranking) | C (+info) | D (learned) |
|-----------|------------------|-------------|-----------|-------------|
| **Fast learner** | clean; minor risk of over-serving transfer early | good — zero score on mastered caps pushes breadth | good | risk: explores junk actions |
| **Forgetful learner** | good — due retrievals dominate (right) | good | same | unknown |
| **Support-dependent** | ok — demand lifecycle caps it | better — dep explicitly suppresses re-support | better | risk: reward = easy aided wins |
| **Repeated failure** | **BAD** unbounded retry loop (fixed by A1/A2) | good — ceiling filter + demand/probe candidates | good | danger: learns to avoid hard caps (starve) |
| **30-day return** | risk: hard retrieval that *may* be on forgotten items — but time alone never declares forgetting; the check is legitimate, the honest fix is refresh-eligibility only after a verified failure | same (check candidate; no relearning inference from calendar) | same | unknown |
| **Rapid new-input learner** | fine until review debt accumulates — no starvation guard | good — breadthDebt (hypothesis) + due-status trade | good | risk: chases novelty |
| **Pathology: review starvation** | moderate risk (new caps via 7/8 can crowd review if retrieval never due — actually low risk since lag gates) | explicitly scored tradeoff | same | high risk |
| **Pathology: new-content starvation** | low-moderate (due retrieval + remediation can monopolize) | breadthDebt is the guard | same | moderate |
| **Pathology: assessment spam** | none today (no assessment rule!) — but C needs budget | needs diagnostic budget | **budgeted by design** | severe if reward = info |
| **Pathology: support loop** | lifecycle bounds it | dep-suppression adds guard | same | severe if reward = success-rate |
| **Pathology: failure loop** | unbounded (fix via A1) | ceiling filter | same | severe |
| **Pathology: easy-task loop** | low (rules prefer *needed* work) | due-status/gap contributions must outrank easy wins | same | **highest risk** (success-reward hacking) |
| **Pathology: transfer starvation** | moderate — transfer only fires at RETAINED | same; variety hypothesis helps | same | unknown |
| **Pathology: thrashing between caps** | low (strict order stabilizes) | needs a stability contribution/hysteresis — real risk if preferences tie-jitter | same | high |

## Recommendation for 008B adjudication

- **Default: Policy B** — hard eligibility/safety filters →
  pedagogically valid candidate set → deterministic tier/scorecard with
  ordinal preference contributions → deterministic tie-break → action
  + machine-readable explanation — with Policy A as the corrected-cascade
  baseline and reference oracle. v0 is NOT a calibrated weighted sum;
  preference orderings are explicit versioned priors.
- **Keep Policy C's information objective** as a bounded contribution
  (`evidenceThinness` facts + episode-scoped diagnostic budget) inside
  B rather than a separate governing layer — the marginal architecture
  isn't justified until the uncertainty signal is richer.
- **A1/A2/A3 corrections are needed regardless of winner** — they're
  semantic fixes, not architecture. Note A3 is deliberately *narrow*:
  refresh eligibility only on verified failure of previously
  demonstrated ability; time alone mints nothing.
- **Simulation bounds:** the 008B benchmark can falsify pathologies
  (loops, starvation, invalid ordering, thrash) and compare behavior —
  it CANNOT calibrate pedagogical weights. Learning-effect weights wait
  for real learner outcomes.
- **D only after** a validated reward + logged corpus + simulation
  benchmark exist.
