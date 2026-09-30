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
10. `assessment_freshness` — assessment only post-TRANSFERRED and not
    already observed-success [KERNEL]. Re-probe of a consumed
    task/family is a POLICY choice, not a kernel invariant: production
    re-probes after remediation, B/C require a fresh semantic family
    (canonical `contextSignature` identity — a renamed `promptFamily`
    label on the same signature is still consumed) [SAFETY_PRIOR/
    EXPERIMENTAL — see §12.5, §13.4]. When no honestly fresh sample
    remains, B/C's honest state is assessment backlog/blocked.
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
  decisionId,                    // deterministic: dec:{episodeId}#{ordinal}:{policyVersion}:{inputDigest16}:{stub}
                                 // — the input digest makes same-ordinal decisions on
                                 //   different input states distinguishable (§12.8)
  selectionPolicyVersion, learnerModelVersion,
  missionId, missionRevision,    // exact mission revision the decision ran against
  learnerId, timestamp,
  chosen: { kind, capabilityId, taskId, taskRevision, tier,
            demandProvenance? },  // support_demand: targetCapabilityId|targetTaskId@rev|
                                  // missingFunction|sourceEventId|issuedAt|supportCapabilityId
  eligibilityEvidence: [...],      // which filters each candidate passed/failed
  preferenceReasons: [...],        // named ordinal contributions that decided it
  penalties: [...],
  beat: [{ kind, capabilityId, taskId@rev, tier, preferences, penalties,
           lostTo, lostBecause }], // every eligible loser — why-not-B is auditable
  suppressedAlternatives: [{ kind, capabilityId, reason }],
  tieBreak: {...},
  decisionContextSummary: {...}
}
```

Reconstructible answers: why candidate exists, why eligible, why it
beat each rival, which policy version decided [KERNEL].

## 9. Policies

- **Policy A** `vnext.selection-policy.a0.v1` — reference cascade:
  production kernel order over the SAME hard-filtered eligibility set
  as B/C (§12.4 — parity in safety, difference only in ordering) +
  the three 008A corrections. Baseline, not the winner.
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

Each log entry carries a canonical `stateFingerprint` = SHA-256 over
the decision-input snapshot (§12.2): every decision-relevant input —
ordered learner-scoped events with full provenance (id, task@rev,
type, outcome, occurredAt, `attempt.observed`, support flags,
evaluation contract + missingFunctions, context family), `now`,
learning policy, selection config, mission id@revision, the full task
revision surface (id@rev, purpose, capability, modality, prompt
family, required functions), roles, and the whole DecisionContext.
SHA-256 makes collisions overwhelmingly unlikely — "resistant", never
claimed "impossible" (§12.2). Replay at T also pins `now = T` — a
future clock leaks eligibility through due/age gates (§12.1). `append`
deep-clones + deep-freezes each entry, so post-append mutation of the
caller's decision object cannot rewrite history (§12.7).

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

## 12. Round-2 hardening contract (PR #69 review 5911702205)

Amendments to the v0 semantics above; where they conflict this section
wins.

### 12.1 Clock-safe replay
`replayAt(state, policy, T)` truncates events at `occurredAt ≤ T`,
rebuilds DecisionContext from `atDecision ≤ T`, AND pins `now = T`.
A future clock leaks eligibility through due/retention gates.
Regression: a cap due at T+30d replays its historical (non-due)
decision at T.

### 12.2 Canonical decision-input digest
`stateDigest` = SHA-256 over `decisionInputSnapshot` — canonical JSON
of every decision-relevant input (listed in §10). The mutation matrix
(support flags, `observed`, missing functions, prompt family, task
revision, policy, selection config, `now`, diagnostic context, mission
revision) must each change the digest; identical inputs must produce
identical digests. SHA-256 is collision-RESISTANT — never claimed
collision-free.

### 12.3 Revision-safe provenance
`chosen` stamps `taskId`, `taskRevision`, `missionId`,
`missionRevision`; `support_demand` additionally stamps full demand
provenance (`targetCapabilityId`, `targetTaskId@revision`,
`missingFunction`, `sourceEventId`, `issuedAt`, `supportCapabilityId`)
plus the serving task id@revision. The validator resolves the EXACT
task revision referenced — historical decisions against `X@v1` remain
auditable after `X@v2` exists, and a forged revision flags
`task_revision_missing`.

### 12.4 Policy A safety parity
All three policies run the SAME `hardFilter` envelope (purpose
compatibility, demand pending + probe covers function, failure
ceiling, identical-retry, per-cap episode repair bound, diagnostic
budget, refresh-on-observed-failure). A differs only in ordering
(cascade vs tier+ordinal) — never in what is permissible.

### 12.5 Assessment freshness is a POLICY choice
Production (mission-runner) re-probes a failed assessment task after
remediation — so "consumed forever" is NOT kernel truth. Policy A
mirrors production (`assessmentMode: 'production'`). Policies B/C run
`assessmentMode: 'fresh'` [SAFETY_PRIOR/EXPERIMENTAL]: a consumed
assessment task is hard-filtered (`assessment_consumed`); a different
unused assessment task on the plan is served instead; if none exists
the candidate stays visibly filtered (assessment-content backlog —
authoring gap, see §11).

### 12.6 BLOCKED ≠ IDLE
`chosen.kind === 'idle'` iff no candidate exists (genuinely empty
surface). `chosen.kind === 'blocked'` iff candidates or integrity
violations exist but nothing may honestly be served; `blocked`
decisions carry `blockedReasons` + `integrityViolations`. A decision
claiming `idle` while an eligible candidate stands is a validator
violation (`fabricated_idle`).

### 12.7 Immutable decision log + strict observation
`log.append` deep-clones + deep-freezes each decision (post-append
caller mutation cannot rewrite history). Direct verified evidence
requires `attempt.observed === true` — a missing/`false` flag is
context, never performance evidence; the validator re-checks the same
bar independently.

### 12.8 Bounded repair + starvation variants
Per-cap episode repair bound [SAFETY_PRIOR]: after
`repairMaxPerEpisodePerCap` (default 3) correction/refresh actions on
one capability in an episode, REPAIR stops monopolizing —
sideways/maintenance/forward work proceeds, or `blocked` if nothing
else is honestly servable. Alternating repair across two tasks on the
same cap cannot evade it. Starvation guard variants
(`review`/`balanced`/`forward` — limits 8/4/2) are a bounded escape
valve: when one tier monopolizes ≥ limit consecutive decisions and
other tiers have eligible work, one decision escapes. Eliminating
pathological variants only — no educational optimum claimed.

### 12.9 Validator coverage
`validateDecision` receives the ACTUAL learning policy, selection
config, and DecisionContext the decision ran under, and independently
re-verifies: task existence + exact revision + registry validity,
mission membership + revision match, capability/task modality
compatibility, purpose↔kind mapping, prerequisites, diagnostic budget,
failure ceiling, repair bound, exact support-demand provenance,
assessment/transfer freshness (policy-aware: A allows re-probe),
strict observation, learner isolation, future evidence, and
idle/blocked honesty.

## 13. Round-3 hardening contract (PR #69 review 5912421748)

### 13.1 Single authoritative selection config
`state.selection` is the ONLY configuration source. A policy call that
also receives a conflicting `options.selection` fails closed
(`selection_config_conflict`) rather than silently mixing two configs —
the same guard applies when both sources agree (no violation).

### 13.2 Policy A follows production ORDER inside the safety envelope
`policyRef` is the authoritative production reference (literal
`nextMissionTask` wrapper — see §14.3). Policy A is the
**safety-normalized cascade baseline**: production order — phase-0
baseline diagnostics first, then resume → due delayed-retrieval →
support demand → retry/remediation → transfer → independent attempt →
expose — applied over the shared candidate surface and hard-filter
envelope. Documented divergences (Z9): A filters a phase-0 probe when
the episode diagnostic budget is exhausted (production has no budget),
and A mints no baseline probe for a cap that is not NOT_SEEN
(production re-probes declared diagnostics on pre-known capabilities).

### 13.3 Resume and introduction serve pending-phase only
`resume_in_flight` and the introduction path both serve the next
UNCONSUMED pending-phase task (`pendingPhase`: unattempted-only exposure
first, else unattempted retrieval/production/interaction — the runner's
`pickPendingPhase` mirror). An exposure event already consumed the
in-flight task's freshness: it is never re-served, and on a
single-task capability the intent drops honestly rather than looping
the same exposure forever. `ELICITING_FOR_INTRO` deliberately excludes
`diagnostic` — probes are served solely by the `diagnostic_probe` intent;
a resume or introduction that surfaced a probe would smuggle phase-0
evidence collection into a continuation tier.

### 13.4 Assessment family freshness (B/C)
Assessment consumption is tracked at the PROMPT-FAMILY level, not per
task id: after an assessment is consumed, any other assessment task
sharing its `promptFamily`/familyClass is `assessment_family_consumed`
for B/C, while a genuinely different family remains fresh. Policy A
re-probes per production semantics (§12.5).

### 13.5 Fail-closed provenance + canonical digest
`decisionLog.append` fails closed when a decision lacks canonical
provenance (task@revision + mission@revision stamps). The state digest
covers the full decision-relevant surface — learner id, `now`, every
canonicalized event (with conflicting duplicate ids surfaced, never
deduped silently), capabilities, decision context, policy id, selection
config, mission id/revision, and each mission task's decision-relevant
fields (purpose, promptFamily, modality, context signature, required
response functions, revision).

### 13.6 Validator recomputes honest work
Terminal validation never trusts the decision's own candidate view:
the validator independently regenerates candidates under the real
policy/selection/context and applies the shared hard-filter envelope
(including the decision's own assessment-freshness mode). A forged
`idle` with servable work → `fabricated_idle`; a forged `blocked` →
`blocked_while_valid_work`; `blocked` with neither work nor integrity
violation nor prior candidates → `blocked_without_work`.

## 14. Round-4 micro-hardening (PR #69 review 5913237089)

### 14.1 Decision log trust boundary
`append` ALWAYS recomputes the state digest from the full canonical
input — a caller-supplied `digest` is a cross-check that must equal the
recompute, never sufficient provenance. Non-terminal decisions require
non-null mission@rev, learning-policy version, selection-policy
version, decision-context identity (episode+session), and a non-empty
task@rev surface; terminal decisions record available provenance.

### 14.2 Semantic assessment family identity
Family freshness derives from `canonicalFamilyId(capabilityId,
contextSignature)` — the same helper the family-integrity rules use —
not the `promptFamily` label. A renamed label on the same signature is
the same revealed family; only VERIFIED events (`verifyEventTask` +
exact revision) consume a family, so stale/malformed evidence cannot
poison freshness. The validator independently re-checks family
consumption for B/C (`assessment_resold_as_fresh`).

### 14.3 `policyRef` is the production reference; A is not
`policyRef` is a literal wrapper over shipped `nextMissionTask` — the
authoritative baseline for production-parity claims. Policy A is the
**safety-normalized cascade baseline**: production ORDER through the
shared candidate surface plus the 008B safety envelope. Documented
divergences (regression-locked): exhausted diagnostic budget (production
still serves phase-0; A filters), and declared baseline probes on
pre-known capabilities (production re-probes; A has no such candidate).
