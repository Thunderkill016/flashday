# Mission report: 008b-next-for-you-spec

- status: **DONE**
- mission: `missions/008b-next-for-you-spec/mission.md`
- started: 2026-09-30T11:31:46.428Z
- finished: 2026-09-30T12:01:27.148Z
- branch: devin/m008b-next-for-you-spec
- starting sha: `9cd77eb75ab289c6ac41f28ecd2481f0fcaa1119`
- ending sha: `5f618426aca8755a908f72e68a60ff466e0d5785`

## Objective
Mission 008B (ChatGPT control room): convert 008A evidence into a falsifiable formal decision contract + prototype/benchmark competing deterministic policies (A reference, B prototype, C minimal) under experiments/next-for-you/. Benchmark = engineering falsification only (pathologies, invariants, determinism, replay, explanation) — NOT educational efficacy. Production planner MUST NOT change.

## Commits (1)
- `5f61842 vnext: Next For You formal spec + A/B/C policy prototypes + falsification benchmark (Mission 008B)`

## Files changed vs start (15)
- `A	docs/research/next-for-you/12-008b-decisions.md`
- `A	docs/research/next-for-you/13-open-calibration-questions.md`
- `A	docs/specs/next-for-you-v0.md`
- `A	experiments/next-for-you/benchmark.js`
- `A	experiments/next-for-you/candidate-generator.js`
- `A	experiments/next-for-you/constants.js`
- `A	experiments/next-for-you/decision-context.js`
- `A	experiments/next-for-you/decision-log.js`
- `A	experiments/next-for-you/policies.js`
- `A	experiments/next-for-you/replay.js`
- `A	experiments/next-for-you/scenarios.js`
- `A	experiments/next-for-you/util.js`
- `A	missions/008b-next-for-you-spec/checkpoints/001-checkpoint.md`
- `M	package.json`
- `A	tests/vnext-next-for-you.test.mjs`

## Verification runs (1)
- 2026-09-30T12:00:24.088Z @ `5f618426aca8` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790769624081-0.log)

## Commands executed (4)
- 2026-09-30T11:31:46.449Z start: devin/m008b-next-for-you-spec@9cd77eb75ab2
- 2026-09-30T11:58:28.584Z checkpoint: cp 1
- 2026-09-30T12:00:24.088Z verify: PASS
- 2026-09-30T12:01:27.148Z finish: done

## Checkpoints (1)
- #1 2026-09-30T11:58:28.578Z @ `9cd77eb75ab2` — checkpoints/001-checkpoint.md

## Acceptance criteria
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

## Known failures
- (none recorded)

## Browser verification
not required — isolated prototype/benchmark code; no product UI changes

## Mission report — full results

### BASE SHA
`9cd77eb75ab289c6ac41f28ecd2481f0fcaa1119`

### ENDING SHA
`ed8db7f` (branch `devin/m008b-next-for-you-spec`; code head `5f61842`)

### FORMAL DECISION CONTRACT
`docs/specs/next-for-you-v0.md` — serializable episode-scoped
DecisionContext; generateCandidates → hardFilter → tier → ordinal
preferences → deterministic tie-break → explanation.

### HARD FILTERS
`no_servable_task`, `purpose_substitution`, `demand_no_longer_pending`,
`probe_does_not_cover_function`, `failure_ceiling`,
`identical_retry_after_failure_ceiling`, `diagnostic_budget`,
`no_verified_failure`. Filters are binary violations — never score-
compensated. Kernel invariants (learner isolation, revision validity,
modality, prerequisites, function-scoped demands) enforced at
generation via `verifyEventTask` + the shared support lifecycle.

### CANDIDATE TAXONOMY
`resume_in_flight`, `due_retrieval`, `refresh`, `correction`,
`support_demand`, `transfer`, `independent_attempt`, `diagnostic_probe`,
`mission_continuation`, `new_input`, `assessment`. Tiers: MANDATORY →
REPAIR → MAINTENANCE → EVIDENCE → PROGRESS → INTRODUCE → TERMINAL.

### ELIGIBILITY VS PRIORITY
Eligibility = contract validity + kernel invariants + session budgets.
Priority = tier → named ordinal preferences (`pending_demand`,
`verified_failure_on_demonstrated`, `open_attributed_gap`,
`support_dependency_fade`, `due`, `mission_assessment_plan`,
`unattributed_failure`, `information_value`, `baseline_probe`,
`transfer_pending`, `thread_continuation`, `breadth`) → deterministic
tie-break. Every preference provenance-tagged KERNEL/EVIDENCE/
SAFETY_PRIOR/EXPERIMENTAL.

### POLICY A / B / C
- A: corrected cascade reference (production order + identical-retry
  ceiling as filter). Not the winner claim.
- B: full filter→tier→ordinal→tie-break pipeline with suppression trace.
- C: B + bounded `information_value` probe preference — categorical
  uncertainty only, no psychometrics.

### SESSION CONTEXT / DIAGNOSTIC BUDGET / ASSESSMENT / RELEARNING / NON-ATTRIBUTING FAILURE
- Episode-scoped context, immutable recordChoice, thread preserved
  across sessions; no fatigue proxy.
- `diagnosticMaxPerEpisode=2` [SAFETY PRIOR]; baseline probes exempt
  (R6 introduction path); non-attributing failure → budgeted probe or
  honest skip, never fabricated diagnosis.
- Assessment requires mission plan + `transferred`; re-probe only after
  non-success; never substitutes for transfer, nor vice versa.
- Refresh only on verified fail/partial on demonstrated capability —
  30-day gap yields `due_retrieval`, `falseRelearningCount=0` verified.

### EXPLANATION / VERSIONING / DECISION LOG / LEAKAGE
- Every decision: whyExists, tier, preferences, penalties, beat,
  suppressed, context summary.
- `vnext.selection-policy.{a0,b0,c0}.v1` stamped per decision,
  independent of learner-model/learning-policy versions.
- Append-only decision log; no retro-mutation.
- replayAt(T) truncates events at occurredAt≤T — byte-identical
  decisions with later evidence appended (test §4, B and C PASS).

### MISSION COVERAGE / ARCHETYPES
All 7 authored missions × all policies: 0 unservable choices, 0
task/cap mismatches. 14 synthetic archetypes (labeled synthetic).

### PATHOLOGIES FOUND → PREVENTED
- FOUND: identical retry 38× past ceiling on a naive cascade —
  `identical_retry_after_failure_ceiling` hard filter + alternate-task
  escape hatch now enforced.
- FOUND: purpose substitution (probe served input task) — hard-filtered.
- FOUND: duplicate probe generation for never-seen targets — gated.
- PREVENTED: wrong-function probe, foreign-learner contamination, dup/
  reorder drift, future leakage, unservable picks, false relearning,
  assessment⇄transfer substitution, diagnostic spam, silent
  stuck-capability blocking.

### A/B/C COUNTERFACTUAL RESULTS
`counterfactual()`/`counterfactualReport()` run all policies over the
same frozen state; differences logged as `kind@capability` divergences
with explanations. On mixed/failure states B differs from A in probe
ordering and suppression visibility; C surfaces thin-evidence probes
within budget.

### WHERE B IMPROVES OVER A / WHERE A IS EQUAL
B: explicit suppression trace, named ordinal reasons, ceiling applied
to every kind. A: simpler and equal on all-success/fresh trajectories.

### WHAT C ADDS / RISKS
Adds: bounded information-value probe preference on thin/conflicting
evidence. Risks: over-probing on thin-heavy states — budget caps it.

### STARVATION / THRASHING RESULTS
Starvation + deferral metrics recorded per run; no optimal ratio
claimed. `capabilitySwitchRate` measured; `thread_continuation` is a
bounded preference — no A/B/A/B observed in the suite.

### REAL-DATA STATUS
NO REAL VNEXT LEARNER EVENT CORPUS AVAILABLE — all synthetic.

### RESEARCH-TRACEABILITY STATUS
Every heuristic provenance-tagged to the 008A corpus; decisions and
open numbers in `12-008b-decisions.md` / `13-open-calibration-questions.md`.

### VERIFY:FULL RESULT
PASS at `5f61842` — typecheck 127 files, all unit suites (next-for-you
634 checks), vite build, browser 26 groups, Firestore emulator.
`src/vnext/planner.js` diff vs main: 0 lines.

### KNOWN LIMITATIONS
Synthetic learners only; alternate-task escape unbounded per-session
by design (spec §17), pacing is SESSION_LEN=4 modeling choice;
counterfactual differences are descriptive, not causal.

## Final result
Completed; required verification green on ending SHA.

---

## Round-2 hardening (post-review 5911702205, head 557bca4)

13 findings → reproduced red-first → fixed → green. New/updated
semantics in `docs/specs/next-for-you-v0.md` §12. Suite: 907 checks
(sections K–Y added). `verify:full` PASS; GitHub CI green on 557bca4.
Production planner: zero diff vs main.

| Finding | Fix |
|---------|-----|
| replay clock leak | `replayAt` pins `now=T` (replay.js) |
| no revision stamps | `chosen.taskRevision` + `missionId@rev`; validator exact-match |
| weak digest | SHA-256 canonical input snapshot (decision-log.js) |
| registry fail-open | pre-model integrity → `blocked` (generator) |
| demand provenance | `chosen.demandProvenance` exact identity |
| blocked≡idle | distinct terminal kinds + `fabricated_idle` violation |
| A skips filters | shared `hardFilter`, `assessmentMode` split |
| freshness mislabeled | A=production re-probe, B/C=fresh `[SAFETY_PRIOR]` |
| infinite alternation | `repairMaxPerEpisodePerCap` bound |
| validator thin | real policy/ctx; budget/ceiling/bound/demand checks |
| `observed!==false` | strict `===true` generator+validator |
| shallow log | clone+deep-freeze on append |
| thin trace | per-loser `lostTo`/`lostBecause` + tieBreak |
