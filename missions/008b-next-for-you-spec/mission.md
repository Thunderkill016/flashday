---
{
  "id": "008b-next-for-you-spec",
  "objective": "Mission 008B (ChatGPT control room): convert 008A evidence into a falsifiable formal decision contract + prototype/benchmark competing deterministic policies (A reference, B prototype, C minimal) under experiments/next-for-you/. Benchmark = engineering falsification only (pathologies, invariants, determinism, replay, explanation) — NOT educational efficacy. Production planner MUST NOT change.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "not required — isolated prototype/benchmark code; no product UI changes"
}
---

# Mission 008B — Next For You Formal Decision Spec + Policy Benchmark

## OBJECTIVE

Formalize the Next For You decision system as:

EVIDENCE + LEARNER MODEL + CURRICULUM + SESSION CONTEXT
→ hard eligibility/safety filters → pedagogically valid candidates →
deterministic policy preference → chosen action + machine-readable
explanation.

Separate ELIGIBILITY from PRIORITY. Every rule classified as HARD
INVARIANT / ELIGIBILITY CONDITION / SESSION BUDGET / POLICY PREFERENCE /
TIE BREAK / EXPERIMENTAL HYPOTHESIS.

## WHY

ChatGPT control-room Mission 008B (base = main post-#68 merge).
008A delivered research; 008B turns it into a falsifiable decision
contract and a benchmark of competing deterministic policies BEFORE any
production integration. Simulation eliminates pathologies; it cannot
calibrate learning weights.

## INVARIANTS

- Production planner (`src/vnext/planner.js`) and kernel UNCHANGED.
  Prototype lives under `experiments/next-for-you/` only.
- Hard kernel invariants are FILTERS — never out-scored by preference.
- No opaque floating-point learning score; ordinal preferences +
  deterministic tier/scorecard + deterministic tie-break.
- No time-only RELEARNING: elapsed absence may justify a check; refresh
  semantics require a verified failure on previously demonstrated
  ability. No decay model exists — DUE is a yes/no fact; age is logged.
- ASSESSMENT ≠ DIAGNOSTIC_PROBE (claim-bearing vs uncertainty).
- Non-attributing failure: probe admissible-not-forced; never fabricate
  substrate diagnosis.
- Every feature/heuristic provenance-tagged EVIDENCE / KERNEL /
  SAFETY_PRIOR / EXPERIMENTAL.
- Diagnostic budget is per decision-episode (session), a SAFETY PRIOR,
  not evidence-backed.
- Decision log records only at-time facts; historical decisions never
  mutated; replay at T must not observe events after T.
- Synthetic learners are labeled synthetic; NO efficacy claims.
- FLUENCY stays reserved; no learned/bandit/RL policy.
- Policy versioned independently (e.g. `vnext.selection-policy.b0.v1`);
  decision records stamp the version.

## IN SCOPE

- `docs/specs/next-for-you-v0.md` — formal contract: filters, candidate
  taxonomy, eligibility-vs-priority model, tier semantics, ordinal
  preferences, tie-break, explanation contract, decision-context schema,
  diagnostic budget, assessment/relearning/non-attributing semantics,
  policy versioning, decision log, no-future-leakage, traceability tags.
- `docs/research/next-for-you/12-008b-decisions.md` +
  `13-open-calibration-questions.md`.
- `experiments/next-for-you/`: candidate-generator, policy-a-reference
  (corrected cascade), policy-b-prototype (filters→tiers→ordinal
  prefs→tie-break→explanation), policy-c-prototype (B + bounded
  information-value heuristic), decision-log, replay/counterfactual
  harness, benchmark, scenarios.
- Benchmark over ALL authored mission contracts (meet a person,
  ordering, meet at a time, small order, buy a small item, find a
  place, self/family) with real Mission/Task/Capability contracts —
  synthetic learner EVENT HISTORIES only, labeled synthetic.
- Archetypes (≥14): fast, thin-evidence, failed-delayed-retrieval,
  30-day-return, support-dependent, recurring-substrate-gap,
  non-attributing-failure, transfer-blocked, assessment-failing,
  many-due-items, rapid-new-content, multi-modality, stuck-on-one-cap,
  mixed strong/weak.
- Forced pathological trajectories (all 21 listed in §21 of the spec).
- Behavioral metrics (§22): hardViolationCount, blockedDecisionCount,
  invalidCandidateCount, unservableChosenCount,
  decisionReplayMismatchCount, explanationMissingCount, sameTaskRepeat,
  maxConsecutiveRepair, maxDue/TransferDeferral, starvation lengths,
  diagnostic/assessment/support fractions, demandResolutionSteps,
  capabilitySwitchRate, idleWhileValidActionExists, falseRelearning,
  redundant diagnostic/assessment counts.
- Starvation-guard variants (REVIEW-HEAVY/BALANCED/FORWARD-PROGRESS) as
  safety priors — eliminate pathological variants only.
- Hysteresis/stability semantics; counterfactual A/B/C replay artifact.
- Executable tests: candidate determinism, hard-filter invariants,
  no-future-leakage, counterfactual replay, explanation completeness,
  pathology detection, policy-version stamping, duplicate/reorder
  replay, learner isolation, mission breadth.

## OUT OF SCOPE

- Replacing production planner / Next For You behavior.
- Calibrating weights from simulation; claiming educational efficacy.
- Learner-choice integration in the selection loop (architecture must
  permit it later; 008B selection stays deterministic).
- Real human event logs (none exist yet — state that explicitly).
- Production defect fixes discovered during work → reproduce + report,
  do not silently patch planner.
- FLUENCY action; RL/bandit; CAT psychometrics (no item model exists).

## ACCEPTANCE CRITERIA

- [ ] spec doc complete with eligibility/priority separation +
  provenance tags
- [ ] A runnable reference; B deterministic + full explanations; C
  bounded diagnostics
- [ ] all mission families + all archetypes run; starvation/thrash/
  failure-loop metrics reported
- [ ] counterfactual replay + future-leakage + duplicate/reorder +
  learner-isolation tests pass
- [ ] merge-blocker list (§37) all respected
- [ ] `npm run verify:full` green; production planner diff = zero

## VERIFICATION

- `npm run verify:full` + focused: learner-model, kernel-audit,
  support-demand, planner/mission-runner, curriculum, persistence,
  policy/benchmark/replay suites.

## BROWSER VERIFICATION

Not required — isolated experiment code, no product UI.

## SAFETY CONSTRAINTS

- No planner/kernel mutation; no deploys; no merge without human.
- No secrets/learner data; synthetic logs labeled synthetic.

## STOP CONDITIONS

- Independent production-kernel defect discovered → reproduce, report
  to ChatGPT, pause that seam.
- Benchmark cannot run on real mission contracts → checkpoint + report.

## REPORT FORMAT

MISSION 008B — FORMAL POLICY + BENCHMARK RESULTS: BASE SHA / ENDING SHA /
PR / FORMAL DECISION CONTRACT / HARD FILTERS / CANDIDATE TAXONOMY /
ELIGIBILITY VS PRIORITY MODEL / POLICY A / POLICY B / POLICY C / SESSION
CONTEXT / DIAGNOSTIC BUDGET / ASSESSMENT SEMANTICS / RELEARNING
SEMANTICS / NON-ATTRIBUTING FAILURE SEMANTICS / EXPLANATION CONTRACT /
POLICY VERSIONING / DECISION LOG / NO-FUTURE-LEAKAGE RESULT / MISSION
COVERAGE / BENCHMARK ARCHETYPES / PATHOLOGIES FOUND / PATHOLOGIES
PREVENTED / A/B/C COUNTERFACTUAL RESULTS / WHERE B IMPROVES OVER A /
WHERE A IS SIMPLER OR EQUAL / WHAT C ADDS / WHAT C BREAKS OR RISKS /
STARVATION RESULTS / THRASHING RESULTS / REAL-DATA STATUS /
RESEARCH-TRACEABILITY STATUS / VERIFY:FULL RESULT / KNOWN LIMITATIONS /
OPEN CALIBRATION QUESTIONS / QUESTIONS FOR CHATGPT
