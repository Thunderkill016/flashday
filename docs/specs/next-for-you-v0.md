# Next For You — formal decision specification v0

Mission 008B contract. Status: **experimental prototype** — implements
`experiments/next-for-you/`; the production planner
(`src/vnext/planner.js`) is unchanged and remains authoritative.

Every substantive choice below is tagged `[KERNEL]` (existing kernel
invariant), `[EVIDENCE]` (literature-backed, graded in
`docs/research/next-for-you/01-evidence-map.md`), `[SAFETY_PRIOR]`
(hand-set bound, not a calibrated optimum), or `[EXPERIMENTAL]`
(unvalidated hypothesis — benchmarkable, never presented as fact).

## 1. Decision pipeline

```text
learnerId + events + capabilities + tasks + roles + policy + now
        + decisionContext
  → generateCandidates()      — one candidate per (capability, intent)
  → applyHardFilters()        — invariants; a violation kills the
                                candidate (it can never be out-scored)
  → classifyPriorityTier()    — eligible candidates → tier
  → applyOrdinalPreferences() — ordered contributions within/across
                                tiers; every comparison has a reason
  → deterministicTieBreak()   — total order, no jitter
  → chosen action + explanation trace
```

Eligibility ("may this action exist?") and preference ("should it go
first?") are separate stages. A rule is never smuggled across the
boundary: invariants and safety floors are filters; ordering lives in
tiers + ordinal preferences + tie-break. `[KERNEL]`

## 2. Action taxonomy

| kind | tier | provenance | generation condition |
|------|------|-----------|----------------------|
| `resume_in_flight` | MANDATORY | [KERNEL] | capability EXPOSED with no recorded attempt outcome |
| `support_demand` | REPAIR | [KERNEL] | pending demand from `deriveSupportLifecycle` (function-scoped) |
| `correction` | REPAIR | [EVIDENCE] prompts>recasts (Lyster & Saito 2010); bounded by failure ceiling [SAFETY_PRIOR] | taught cap (supported/independent milestone), `consecutiveFailures ≥ minConsecutiveFailures`, attributed `unresolvedFunctions` non-empty OR last failure attributing |
| `refresh` | REPAIR | [EVIDENCE] relearning-override boundary + [KERNEL] no-time-inference | verified fail/partial on a capability whose `milestones.independent` was demonstrated — i.e. currently failing a previously-demonstrated ability. Time alone never mints this. |
| `due_retrieval` | MAINTENANCE | [EVIDENCE] spacing+retrieval (Kim & Webb 2022; Latimier g=0.74) | independent milestone + `lastIndependentSuccessAt + minLagMs ≤ now` + last outcome not a miss |
| `assessment` | EVIDENCE | [KERNEL] mission assessmentPlan + freshness rules | mission requires assessment, cap TRANSFERRED, latest checkpoint not observed-success |
| `diagnostic_probe` | EVIDENCE | [EVIDENCE] CAT/info-selection analogy + [SAFETY_PRIOR] episode budget | cap `evidenceSufficient=false` with a servable diagnostic task; new target baseline (rule 8 semantics); non-attributing failure *may* admit one |
| `transfer` | PROGRESS | [KERNEL] novel-family freshness + [EVIDENCE] varied practice | `milestones.retained && !milestones.transferred` |
| `independent_attempt` | PROGRESS | [KERNEL] support→unaided ladder; [EVIDENCE] scaffolding fade (VanLehn) | `milestones.supported && !milestones.independent` |
| `mission_continuation` | PROGRESS | [KERNEL] mission-in-progress precedence | cap seen, not yet supported/independent, prereqs met, pending input/notice/eliciting task exists |
| `new_input` | INTRODUCE | [EVIDENCE] input frequency (Uchihara 2019) | cap NOT_SEEN, prereqs met; target→diagnostic probe per role semantics [KERNEL] |
| `blocked` | TERMINAL | [KERNEL] | candidates exist but all filtered; never silently mark learned |
| `idle` | TERMINAL | [KERNEL] | no valid action exists |
| `fluency` | — | reserved | **rejected unconditionally** until a calibrated contract exists [KERNEL] |

## 3. Tier order

`MANDATORY > REPAIR > MAINTENANCE > EVIDENCE > PROGRESS > INTRODUCE > TERMINAL`

- MANDATORY first: never abandon in-flight work [KERNEL].
- REPAIR above MAINTENANCE: an open attributed gap or pending demand
  blocks the capability chain; unresolved-error evidence supports
  prompt repair [EVIDENCE: CF timing + impasse literature] — but this
  ordering relative to due-retrieval is `[EXPERIMENTAL]` (the 008A
  cascade ran due>repair; the benchmark surfaces the divergence).
- EVIDENCE between MAINTENANCE and PROGRESS: probing thin evidence is
  informational, not a blocker; assessment is gated by sufficiency —
  it never competes with needed teaching.
- INTRODUCE last of the positive intents: forward progress is real but
  never displaces repair/maintenance/evidence obligations.

## 4. Hard filters (merge blockers — apply per candidate)

1. `learner_scope` — candidate facts derive only from `learnerId`
   events [KERNEL].
2. `modality_match` — task modality === capability modality [KERNEL].
3. `task_revision_valid` — task resolves at its registered revision;
   evidence bound to other revisions cannot serve [KERNEL].
4. `task_contract_valid` — `validateTask(t)` clean [KERNEL].
5. `prerequisite_closure` — intro/continuation requires all prereq caps
   INDEPENDENT [KERNEL].
6. `demand_function_scope` — a support_demand candidate must carry its
   demand's `missingFunction`; the serving task must declare it
   [KERNEL — post-#66 audit].
7. `support_cap_isolation` — support-role caps are reachable ONLY via
   support_demand [KERNEL].
8. `attribution_boundary` — correction candidates require attributed
   unresolved functions or an attributing last failure, and only
   *observed* failures count: `attempt.observed === false`
   (self-report) is context, never verified performance evidence
   [KERNEL + EVIDENCE].
9. `transfer_freshness` — transfer tasks must exercise a family not
   already rehearsed; a success on a rehearsed family is not novel
   transfer [KERNEL].
10. `assessment_freshness` — assessment only post-TRANSFERRED, not
    already observed-success, and *revision-scoped consumed*: a
    task@rev carrying any verified learner event is consumed forever —
    it is never re-served as a fresh sample. When no unused valid
    assessment remains after failure the honest state is
    backlog/blocked, not re-sale of the same checkpoint [KERNEL].
11. `curriculum_surface` — task must belong to the active mission's
    declared taskIds [KERNEL].
12. `no_fabricated_gap` — never stamp `missingFunctions` a task's
    contract can't attribute [KERNEL].
13. `no_time_only_forgetting` — no intent is generated from elapsed
    time alone; refresh requires an *observed* verified failure as the
    last observed attempt [KERNEL — Mission 007 boundary].
14. `no_exposure_claim` — input/notice tasks cannot carry claim-bearing
    intents (their candidates are MISSION_CONTINUATION/NEW_INPUT only)
    [KERNEL].
15. `no_purpose_substitution` — assessment≠transfer, transfer≠assessment,
    diagnostic≠assessment; intent→purpose mapping is fixed
    [KERNEL].
16. `servable` — a registered mission task compatible with the intent
    exists (else the intent is recorded skipped, cap's other intents
    still live) [KERNEL].
17. `failure_ceiling` — `consecutiveFailures ≥ failureCeiling`
    suppresses the identical-retry candidate (not the capability)
    [SAFETY_PRIOR].
18. `fluency_reserved` — FLUENCY candidates rejected [KERNEL].
19. `diagnostic_budget` — `context.counts.diagnostic <
    diagnosticMaxPerEpisode` else probe candidates filtered. The
    budget applies to EVERY probe, baseline included: an exhausted
    budget defers new-target introduction to a later episode rather
    than unbounding diagnostics through the baseline exemption
    [SAFETY_PRIOR].

## 5. DecisionContext (serializable, no hidden state)

```js
{
  decisionEpisodeId: string,
  sessionId: string,
  actionsChosen: [{ kind, capabilityId, taskId, atDecision }],
  counts: { diagnostic, assessment, retrieval, correction, support,
            transfer, newInput, continuation },
  recentCapabilities: string[],   // last N capability ids chosen
  recentTaskIds: string[],
  lastActedCapabilityId: string | null,    // any chosen action
  currentThreadCapabilityId: string | null // pedagogical thread only
}
```

**Thread ownership.** `currentThreadCapabilityId` (hysteresis anchor)
moves only on thread-owning kinds: `mission_continuation`, `new_input`,
`independent_attempt`, `correction`, `refresh`, `diagnostic_probe`,
`resume_in_flight`. Interruptions — `support_demand`, `due_retrieval`,
`transfer`, `assessment` — update `lastActedCapabilityId` but never
steal the thread, so the learner's thread survives a substrate probe or
a spaced review [KERNEL].

No `elapsedActiveMs` — session fatigue cannot be measured reliably and
is excluded rather than faked [SPEC §9]. Same inputs + context + policy
⇒ identical decision (replay determinism) [KERNEL].

## 6. Ordinal preferences (within-tier ordering)

Each is a named, provenance-tagged comparison — not a weight:

- REPAIR: pending `support_demand` > `correction`/`refresh`;
  recurring gap > first-time gap [EVIDENCE+SAFETY_PRIOR].
- MAINTENANCE: earliest due-timestamp first (age is an observable fact;
  no monotonic severity scaling [EXPERIMENTAL guard]).
- EVIDENCE: `assessment` only when `transfer.demonstrated` and mission
  plan requires; `diagnostic_probe` prefers caps with
  `thin_independent_evidence`/`no_independent_evidence` reason codes;
  non-attributing-failure probes do not outrank attributed repair.
- PROGRESS: `support.dependent` boosts `independent_attempt` (fade the
  scaffold) [EVIDENCE]; `currentThreadCapabilityId` gets bounded
  continuation preference (hysteresis) [SAFETY_PRIOR/UX]; pending
  `transfer` on retained caps [EVIDENCE].
- INTRODUCE: breadth is a tie-break hypothesis `breadthDebt`
  [EXPERIMENTAL]; never outranks any obligated intent.

## 7. Tie-break (total order)

`(tierRank, ordinalPreferenceRank, capabilityId ASC, taskId ASC,
intentKind ASC)` — identical inputs always produce identical output
[KERNEL].

## 8. Explanation contract

Every decision returns:

```js
{
  decisionId,                    // deterministic: dec:{episodeId}#{decision ordinal}:{policyVersion}:{kind}@{capabilityId}:{taskId|idle}
                                 // — derived from explicit inputs only; no module-global
                                 //   counters or time reads (same inputs ⇒ identical id)
  selectionPolicyVersion, learnerModelVersion,
  learnerId, timestamp,
  chosen: { kind, capabilityId, taskId, tier },
  eligibilityEvidence: [...],      // which filters each candidate passed/failed
  preferenceReasons: [...],        // named ordinal contributions that decided it
  penalties: [...],
  suppressedAlternatives: [{ kind, capabilityId, reason }], // why each lost
  tieBreak: {...},
  decisionContextSummary: {...}
}
```

Reconstructible answers: why candidate exists, why eligible, why it
beat each rival, which policy version decided [KERNEL].

## 9. Policies

- **Policy A** `vnext.selection-policy.a0.v1` — reference cascade:
  kernel order + the three 008A corrections (failure ceiling,
  non-attributing admission, refresh-on-verified-failure). Baseline,
  not the winner.
- **Policy B** `vnext.selection-policy.b0.v1` — full pipeline above.
- **Policy C** `vnext.selection-policy.c0.v1` — B + bounded
  information-value heuristic: thinness/conflicting-outcome/
  never-assessed reasons boost `diagnostic_probe` within budget.
  Coarse only — no CAT math (no item model exists).

## 10. Decision log & replay

Append-only records stamped with `selectionPolicyVersion` +
`learnerModelVersion` + at-time facts only. Replay at T truncates
BOTH the event log at `occurredAt ≤ T` AND the DecisionContext at
`atDecision ≤ T` (actions, counts, recent lists, thread state are
rebuilt from actions ≤ T) — future events *and* future context must
not influence candidates, tiers, preferences, or choice.
Counterfactual replay runs A/B/C on the same state without mutation.

Each log entry carries a canonical `stateFingerprint` digest over
every decision-relevant input: ordered event identities
(id, task@rev, type, outcome, occurredAt) for the scoped learner plus
the DecisionContext — two different histories can never share a
fingerprint (the old `eventCount:capabilityCount:lastEventId` summary
was provably collidable).

**Independent validation.** `validator.js` re-checks every chosen
decision against contracts + kernel facts recomputed *outside* the
generator/policy pipeline (task existence, revision currency, mission
membership, capability/task modality, purpose compatibility, pending
demand + probe function coverage, assessment/transfer freshness,
prerequisites, learner scope, no future evidence, no false
relearning). Benchmark metrics are measured, never assumed:
`hardViolationCount` counts validator violations;
`invalidCandidateCount` counts filtered candidates;
`supportDemandResolutionSteps` measures decisions from first
appearance in `openDemands` until the demand leaves the pending set
(probe consumed / cancelled / recovered), or run length if still
open.

## 11. Explicit open calibration questions (preserved, not guessed)

- review:new session ratio (starvation-guard variants are SAFETY
  PRIORS; no educational optimum claimed);
- any continuous overdue weighting [EXPERIMENTAL];
- failure-ceiling exact value [SAFETY_PRIOR];
- diagnostic budget exact value [SAFETY_PRIOR];
- hysteresis magnitude [SAFETY_PRIOR];
- whether `latencyMs` is a valid effort signal (unvalidated);
- learned weights/policies — deferred until real outcome data exists;
- **correction corpus gap**: no authored capability pairs an
  attributing (choice-contract) task with a `remediation` task — the
  only remediation task lives on `interaction.ask_name`, whose tasks
  are all non-attributing. Correction liveness is exercised via a
  labeled synthetic task; authoring a real remediation surface is
  content work for a later mission.
