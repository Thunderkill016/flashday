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
| `RELEARNING` | — (new) | Teaching | Post-absence variant of retrieval: softer demand, re-exposure path; *not* a hard test |
| `SUPPORT_DEMAND` | rule 3 | Diagnostic+repair substrate | Kernel-defined; unchanged |
| `UNRESOLVED_CORRECTION` | rule 4 | Teaching (repair) | Only when failure is *attributed* |
| `DIAGNOSTIC_PROBE` | part of rule 8 + (new) | Diagnostic | Bounded budget; serves `evidenceSufficient=false` caps |
| `TRANSFER` | rule 5 | Teaching (generalization) | Novel-family only |
| `INDEPENDENT_ATTEMPT` | rule 6 | Teaching+evidence | Supported → unaided run |
| `MISSION_CONTINUATION` | rule 7 | Teaching (input/notice) | Exposure tasks; prerequisites met |
| `NEW_INPUT` | rule 8 | Teaching+Diagnostic | First eligible never-seen cap |
| `IDLE` | rule 9 | — | Terminal |
| `FLUENCY_PRACTICE` | — | — | **Reserved** — no calibrated contract; do not implement |

`ASSESSMENT` (checkpoint) folds into `DIAGNOSTIC_PROBE` budget —
assessment is the scheduled diagnostic pass (ALEKS lesson), not an
always-on overlay.

## Policy A — Conservative rule-based tutor

**Shape:** the current cascade + three surgical corrections, still
purely lexicographic (no scores).

Corrections (each tied to a contradiction in file 10):

- **A1 — failure escalation bound:** after `consecutiveFailures ≥ N`
  on an *attributed* gap → `SUPPORT_DEMAND`/`DIAGNOSTIC_PROBE`, not
  unbounded `retry` on the same failing task. Kills the failure loop.
- **A2 — non-attributing failure → diagnostic, not retry:** if
  `missingFunctions` is empty, remediation is blind; route to probe.
- **A3 — absence → RELEARNING:** `now − lastUnaidedSuccess ≥ absenceLag`
  → re-exposure intent instead of hard retrieval test.

Order (revised): resume → **relearning** → due_retrieval →
support_demand → **correction (attributed only, bounded)** → transfer
→ independent → diagnostic_probe (thin-evidence caps) → mission
continuation → new_input → idle.

- Pros: maximal safety, total explainability, zero reward-hacking
  surface, trivially deterministic.
- Cons: order still rigid — no severity weighting (a 3-day-overdue
  retrieval ties with a 25h one); session composition unhandled;
  starvation guards are implicit not explicit.

## Policy B — Constrained multi-factor ranking (hybrid J)

**Shape:** `filter → generate valid set → score → argmax + reason`.

- **Filters (hard, cannot be out-scored):** kernel invariants (in-flight
  resume, attempt-type honesty, modality match, prereq gating,
  demand lifecycle semantics, support-cap exclusion from direct
  introduction); safety floors (consecutive-failure ceiling → no more
  same-task candidates; non-attributing failure → no remediation
  candidate, probe instead).
- **Score:** `Σ w_i·f_i` over candidate features, all read from the
  learner model:
  - `overdueDepth` (how far past lag),
  - `unresolvedGapSeverity` (attributed unresolved functions,
    recurring),
  - `supportDependency` (dependent → unaided re-attempt boosted,
    re-support suppressed),
  - `evidenceThinness` (`evidenceSufficient=false` → diagnostic value),
  - `noveltyDebt`/`breadthDebt` (caps never-seen vs caps mastered —
    starvation guards made explicit),
  - `contextVariety` (families already exercised).
- Every feature is an existing fact or an explicit policy knob — no
  fake proxies.
- Pros: expresses real tradeoffs; explainable per-decision (feature
  breakdown); deterministic; simulatable offline; absorbs later
  calibrated weights.
- Cons: weight-setting needs 008B simulation benchmark to be
  defensible; more surface for design error than A.

## Policy C — Information-gain-aware ranking (B + explicit diagnostic leg)

Policy B plus a **budgeted information objective**: candidates scored on
*expected uncertainty reduction* (thinness, absent delayed evidence,
unassessed-but-plausible) as a first-class feature, gated by a
diagnostic budget (max K diagnostic actions per session / per streak).

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
- B: all intents on this cap score ~0 → session weight goes to weaker
  caps (breadthDebt). Correct — no wasted drilling.
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
| **Forgetful learner** | good — due retrievals dominate (right) | good | better — relearning vs retrieval distinguished if absence signal added | unknown |
| **Support-dependent** | ok — demand lifecycle caps it | better — dep explicitly suppresses re-support | better | risk: reward = easy aided wins |
| **Repeated failure** | **BAD** unbounded retry loop (fixed by A1/A2) | good — ceiling filter + probe/demand | good | danger: learns to avoid hard caps (starve) |
| **30-day return** | **BAD-ish** — hard retrieval on forgotten items | better — RELEARNING intent fixes it | better | unknown |
| **Rapid new-input learner** | fine until review debt accumulates — no starvation guard | good — breadthDebt/overdueDepth trade | good | risk: chases novelty |
| **Pathology: review starvation** | moderate risk (new caps via 7/8 can crowd review if retrieval never due — actually low risk since lag gates) | explicitly scored tradeoff | same | high risk |
| **Pathology: new-content starvation** | low-moderate (due retrieval + remediation can monopolize) | breadthDebt is the guard | same | moderate |
| **Pathology: assessment spam** | none today (no assessment rule!) — but C needs budget | needs diagnostic budget | **budgeted by design** | severe if reward = info |
| **Pathology: support loop** | lifecycle bounds it | dep-suppression adds guard | same | severe if reward = success-rate |
| **Pathology: failure loop** | unbounded (fix via A1) | ceiling filter | same | severe |
| **Pathology: easy-task loop** | low (rules prefer *needed* work) | needs `overdue`/need features to outrank easy wins | same | **highest risk** (success-reward hacking) |
| **Pathology: transfer starvation** | moderate — transfer only fires at RETAINED | same; variety feature helps | same | unknown |
| **Pathology: thrashing between caps** | low (strict order stabilizes) | needs stability term/hysteresis — real risk if scores tie-jitter | same | high |

## Recommendation for 008B adjudication

- **Default: Policy B** (filter → score → reason) with Policy A as the
  zero-weight fallback and regression baseline. B is the minimal
  architecture that (a) makes eligibility vs preference honest, (b) has
  an explanation contract, (c) preserves every kernel invariant as a
  filter, and (d) is simulatable offline.
- **Keep Policy C's diagnostic leg** as a bounded feature (`evidenceThinness`)
  inside B rather than a separate governing layer — the marginal
  architecture isn't justified until the uncertainty signal is richer.
- **A1/A2/A3 corrections are needed regardless of winner** — they're
  semantic fixes, not architecture.
- **D only after** a validated reward + logged corpus + simulation
  benchmark exist.
