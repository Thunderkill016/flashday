# 13 — Open calibration questions (008B)

These are the values the prototype exposes as knobs where no evidence,
kernel rule, or defensible prior justified fixing them. Every one must
be resolved by measurement, not by intuition, before any of these
policies graduates past `experiments/`.

## Q1 — `failureCeiling` (default 3)

How many consecutive failures on a capability justify suppressing the
identical task? Too low starves legitimate remediation; too high
recreates the retry loop. Evidence from the research corpus (008A) gives
no defensible number — suppression should probably consider whether
failures are *identical* vs *diverse* across functions.

## Q2 — `diagnosticMaxPerEpisode` (default 2)

Chosen as a safety prior against diagnostic spam. Unknown: whether
baseline probes should stay exempt when the budget is exhausted (they
currently are, by R6 role semantics — but that exemption could
starve-learn in missions with many targets), and whether the budget
should scale with episode length.

## Q3 — Review : forward-progress ratio

The benchmark measures `reviewStarvationLength` and
`newInputStarvationLength` but asserts no optimum. The 008A corpus found
no defensible "85% rule"; spacing evidence supports due-retrieval
checks, not a fixed mix. Requires real learner data to calibrate.

## Q4 — Hysteresis strength (`thread_continuation`)

The current-thread bonus sits low in the preference ladder — any
kernel/evidence rung outranks it. Whether that is strong enough to stop
A/B/A/B thrashing on near-tied states, and whether a *harder* hysteresis
(e.g. stick unless tier changes) trades off too much responsiveness, is
open. `capabilitySwitchRate` measures it; no target value is claimed.

## Q5 — Information-value signal in Policy C

`information_value` boosts probes on thin/conflicting evidence. The
rung order puts it below teaching actions deliberately. Whether it
reduces decisions-to-evidence-sufficiency without inflating
`diagnosticFraction` is measurable only with outcome tracking the
prototype does not have.

## Q6 — Transfer deferral bound

`maxTransferDeferralActions` is recorded but unbounded by policy. How
long a transferred-able capability may wait before its transfer probe
is a research question — too early wastes the held-out family, too late
risks measuring decayed ability.

## Q7 — Session boundary semantics

The benchmark assumes a session = N decisions. Real sessions end on
exit, timeout, or context switch. The `DecisionContext` carries episode
counts but not elapsed-active time; if a session-boundary detector is
added, it must be measured, not assumed.

## Q8 — Alternative-task selection within a failed capability

`pickTask` prefers any other task on the capability past the ceiling.
Whether the alternative should prefer a different *modality*, a
different prompt family, or the easiest remaining task is undecided —
each hypothesis is tagged EXPERIMENTAL until measured.

## Non-questions (resolved by contract, not calibration)

- Time alone never creates relearning — structural rule.
- Assessment never substitutes for transfer, or vice versa — kernel.
- Support attempts never mint mastery — kernel.
- Diagnostics are always budgeted — safety prior regardless of number.
