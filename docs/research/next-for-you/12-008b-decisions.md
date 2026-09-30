# 12 — Mission 008B implementation decisions

Status: prototype-only. Nothing in this file changes production behavior;
`src/vnext/planner.js` is untouched. The experiment layer lives in
`experiments/next-for-you/` and exists to falsify the 008A design
commitments, not to recommend a winner.

## D1 — Reference baseline is the kernel's own cascade, corrected

Policy A reproduces the production rule order (`src/vnext/planner.js`):
resume → due delayed-retrieval → support demand → retry/remediation →
transfer → independent attempt → expose/introduce → assessment-last.
One correction is applied at generation time, not in scoring: after
`failureCeiling` consecutive failures, the *identical* task cannot be
re-served. This is the single semantic defect the cascade had that a
hard filter can express without changing ranking.

## D2 — Eligibility is generated, not scored

`generateCandidates()` emits only pairs where the capability's derived
facts support the intent AND a contract-valid task exists. A candidate
whose mission surface has no compatible task carries `servableTask:
null` and is filtered, never ranked. This keeps "the mission has no
task for this" visible as an eligibility fact instead of a silent miss.

## D3 — Three named tiers of preference, no weights

Ordinal preferences are applied inside each tier as named rules
(`open_attributed_gap`, `support_dependency_fade`, `due`,
`thread_continuation`, `breadth`, …). Every preference and penalty
carries a provenance label (`KERNEL` / `EVIDENCE` / `SAFETY_PRIOR` /
`EXPERIMENTAL`) that lands in the explanation trace. No floating-point
learning score exists anywhere in the pipeline.

## D4 — The DecisionContext is serializable and episode-scoped

`decision-context.js` keeps: episode id, session id, per-kind counts,
recent capability/task rings, and `currentThreadCapabilityId` (the
hysteresis anchor). Deliberately absent: elapsed-time fatigue — it is
not measurable honestly in v0, so the contract omits it rather than
fake it. `recordChoice` is immutable: a logged context can never be
retro-mutated by a later decision.

## D5 — Diagnostics are budgeted per episode, baselines exempted

`diagnosticMaxPerEpisode` (default 2, `[SAFETY PRIOR]`) bounds
uncertainty-reduction probes. The baseline probe for a never-seen
TARGET capability is exempt: R6 role semantics already require it, and
denying it would leave targets unreachable when the budget is spent.
Non-attributing failures mint a probe candidate only when a servable
probe exists and budget remains — otherwise the capability is honestly
skipped, never re-drilled blindly and never diagnosed by fiat.

## D6 — Refresh is gated on verified failure, never on time

`refresh` candidates exist only when `lastAttemptOutcome` is
`fail`/`partial` on a capability that previously demonstrated
independence. A 30-day gap produces `due_retrieval` candidates, not
refresh. `falseRelearningCount` in the benchmark asserts this.

## D7 — Introduction uses pending-phase selection

Mirroring the runner: an introduction/continuation serves the next
unconsumed exposure task, else the next unconsumed eliciting task. This
is what lets `talk_about_self_family`'s carrier `say_own_name` (which
owns only a retrieval task) be introduced — exposure-first ordering is
for introductions, while baseline probes must target `diagnostic`
purpose specifically (a probe that serves an input task is a purpose
substitution and hard-filtered).

## D8 — Benchmark pacing models sessions, not wall-clock

`SESSION_LEN = 4` decisions per simulated session, then `now` jumps
24h. This is what exercises retention lag, distinct-session
independence, and the episode-scoped diagnostic budget. It is a pacing
device, not a claim about real session length.

## D9 — What the benchmark measured

`tests/vnext-next-for-you.test.mjs` (634 checks) covers: determinism
for all three policies, duplicate-event and reordered-event replay,
learner isolation, no-future-leakage at time T, hard-filter
inviolability across all 7 authored missions, no false relearning after
30-day gaps, diagnostic budget bounds, assessment⇄transfer
non-substitution, explanation completeness, the same-task retry
ceiling, counterfactual A/B/C replay, support-demand function scoping,
honest idle on exhausted curriculum, mission breadth, and the full
archetype matrix.

Observed pathologies *prevented*: identical retry past ceiling (real
defect in a naive cascade — measured at 38 consecutive repeats before
the fix), purpose substitution (probe serving an input task), duplicate
baseline/thin-probe candidates, and unbounded diagnostic spam.

## D10 — What was NOT established

No policy is claimed educationally better. A/B/C differ in ordering and
suppression behavior; the counterfactual report records *that* they
differ and *why*, not that one teaches more. All trajectories are
synthetic archetypes over real mission contracts.
