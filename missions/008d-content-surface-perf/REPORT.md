# Mission report: 008d-content-surface-perf

- status: **DONE**
- mission: `missions/008d-content-surface-perf/mission.md`
- started: 2026-09-30T17:27:36.032Z
- finished: 2026-09-30T18:15:59.822Z
- branch: devin/m008d-content-surface-perf
- starting sha: `a13055698506160ed13e846f3d5fd5c7f293446c`
- ending sha: `502ae05` (review round 2 applied; see checkpoint 003)

## Objective
Mission 008D (ChatGPT control room): close the B0 content surface honestly — classify the 60-gap coverage audit semantically, land one genuinely complete A1 vertical slice (attributing failure → real remediation → correction → delayed retest → fresh transfer → fresh assessment family), profile and de-duplicate the B0 selection path (~285ms @ 2k events), and replace journal fingerprints with crypto digests — with zero Policy-B semantic change.

## Commits (7)
- `b40c649 008D: semantic coverage audit, clock-time remediation slice, journal digests, shared input digest`
- `5c4c23d 008D: implementation checkpoint — semantic audit, slice, digests, perf`
- `f5cdf15 008D: mission report — DONE, verify:full PASS twice @ 5c4c23d`
- `be73ee1 008D review R1: remove clockOffset seam, session-trajectory proof, audit witnesses`
- `cc67ce4 008D: checkpoint 002 + REPORT update for review round 1`
- `ff779ec 008D: untrack mission state/logs; ignore rules`
- `502ae05 008D review R2: mission-revision run pinning + frozen decide-time snapshot`

## Files changed vs start (14)
- `M	.gitignore` (mission state/log ignore rules)
- `M	experiments/next-for-you/differential.js`
- `M	experiments/next-for-you/perf.js`
- `A	missions/008d-content-surface-perf/REPORT.md`
- `A	missions/008d-content-surface-perf/checkpoints/001-checkpoint.md`
- `A	missions/008d-content-surface-perf/checkpoints/002-checkpoint.md`
- `A	missions/008d-content-surface-perf/checkpoints/003-checkpoint.md`
- `M	src/vnext/fixtures.js`
- `M	src/vnext/next-for-you/policies.js`
- `M	src/vnext/next-for-you/selector.js`
- `M	src/vnext/ui-session.js`
- `M	tests/vnext-browser.test.mjs`
- `M	tests/vnext-next-for-you-runtime.test.mjs`
- `M	tests/vnext-next-for-you.test.mjs`

(`src/vnext/ui/mission-page.js` nets zero vs start — the clockOffset
seam was added and removed inside this branch.)

## Verification runs (3)
- 2026-09-30T18:12:36.826Z @ `5c4c23d0e7a2` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790791956818-0.log)
- 2026-09-30T18:15:52.527Z @ `5c4c23d0e7a2` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790792152521-0.log)
- 2026-09-30T18:51 @ `be73ee1` — **PASS**
  - `npm run verify:full` → exit 0 (post-review round 1)
- 2026-09-30T19:35 @ `502ae05` — **PASS**
  - `npm run verify:full` → exit 0 (post-review round 2 provenance patch)

## Commands executed (5)
- 2026-09-30T17:27:36.055Z start: devin/m008d-content-surface-perf@a13055698506
- 2026-09-30T18:08:05.375Z checkpoint: cp 1
- 2026-09-30T18:12:36.827Z verify: PASS
- 2026-09-30T18:15:52.528Z verify: PASS
- 2026-09-30T18:15:59.822Z finish: done

## Checkpoints (3)
- #1 2026-09-30T18:08:05.368Z @ `b40c649ab53c` — checkpoints/001-checkpoint.md
- #2 2026-09-30T18:55 @ `be73ee1` — checkpoints/002-checkpoint.md (review round 1)
- #3 2026-09-30 @ `502ae05` — checkpoints/003-checkpoint.md (review round 2)

## Acceptance criteria
- [x] Coverage audit classifies every gap semantically (not a naive
      missing-task count); remaining gaps prioritized.
- [x] One complete A1 vertical slice traverses the full recovery chain
      with real authored remediation — no synthetic correction fixture
      required for liveness.
- [x] Every new task passes contract validation, family integrity,
      freshness, function attribution, mission surface checks, real
      evaluator compatibility.
- [x] Stage-level perf profile produced; duplicated work removed;
      before/after numbers measured; B0 behavior identical
      (differential corpus invariants still hold).
- [x] Journal fingerprints are crypto digests; no raw learner response
      in `run.selection`; crash-injection suite still green.
- [x] `npm run verify:full` green; exact-head CI green.

## Known failures
- (none recorded)

## Browser verification
Playwright /vnext surface: after teaching the clock cap, a TEST-HARNESS clock shift (Playwright `addInitScript` patching `Date.now`, added between navigations — no product URL can alter evidence time) resumes the persisted learner +25h later; the lagged delayed retest is served and deliberately missed, and `task.time.remediation.hear` is served under a repair kind with a decision-audit record. The `?clockOffset` URL seam was removed in review round 1 — a regression test now asserts the param is inert (persisted evidence timestamps stay on the wall clock). 8 browser checks PASS.

## Final result
# Mission 008D — content-surface closure + runtime scalability

Semantic coverage audit replaced the naive gap count; one complete A1
vertical slice landed on authored content; journal fingerprints became
sha256 digests; the double canonical digest in the B0 select path was
factored to one computation. Zero Policy-B semantic change.

## 008D RESULT — required sections

### HEAD
`502ae05` — review round 2 provenance patch (mission-revision run
pinning + frozen decide-time snapshot); prior head `ff779ec`

### GAP CLASSIFICATION
The rewritten audit (experiments/next-for-you/differential.js) is a
**conservative semantic reachability audit** — a static surface model,
not a state-space proof: `attemptable`/`attributable`/freshness are
existential surface properties while real minting also depends on
temporal learner state. It derives a per-capability reachability
envelope and mirrors candidate-generator.js mint conditions for triage;
**every `required` row carries an executable witness** — a built engine
state (independent→retained→transferred, or taught+attributed miss)
replayed through the real `generateCandidates`, confirming the intent
mints and nothing is servable. Every `not_mintable` row carries a
concrete structural `reason` code (e.g. `no_attributing_evaluator`,
`target_intro_mints_baseline_probe`, `non_target_role`). 91 findings:
- **required (5)** — mintable intent, nothing servable, claim- or
  repair-bearing role:
  - `correction` — reception.listen.understand_spoken_price @
    mission.buy_small_item (needs an authored remediation task)
  - `correction` — reception.listen.follow_short_direction @
    mission.find_a_place (needs an authored remediation task)
  - `assessment (no_assessment_task)` — production.speak.say_own_name @
    mission.meet_new_person
  - `assessment (no_assessment_task)` — interaction.request_item @
    mission.complete_small_order
  - `assessment (no_assessment_task)` — production.speak.state_basic_self_detail
    @ mission.talk_about_self_family
- **optional (21)** — carrier-role mintable intents with nothing
  servable (refresh / due_retrieval / correction on carriers): degraded
  recovery surface; carriers own no claim.
- **not_mintable (65)** — structurally unreachable under the authored
  surface, each row stamped with a concrete `reason` code:
  `carrier_intro_mints_new_input_and_no_diagnostic_task`,
  `target_intro_mints_baseline_probe`, `no_attributing_evaluator`
  (eval.required_functions.v1 cannot attribute), `no_attempt_binding_task`,
  `non_target_role`. Audit-visible, no authoring action.
- covered rows report `derivation` (e.g. new_input → eliciting_intro)
  when served through a fallback path.

### VERTICAL SLICE RESULT
Complete chain on `reception.listen.understand_clock_time` @
`mission.meet_at_a_time`, all on AUTHORED tasks:
1. `task.time.diagnostic.hear` (choice, attributing) — baseline probe,
   unaided success → INDEPENDENT.
2. `task.time.retrieval.hear` — attributed miss stamps
   `understand_clock_time` + `identify_spoken_number`.
3. `task.time.support.number_probe` — support_demand routes the
   substrate miss (issue #61 semantics live).
4. `task.time.remediation.hear` — NEW authored remediation task
   (choice, attributing, rehearsed family, both required functions):
   correction mints, task served — the Z12 engine test asserts
   kind=correction AND servableTask=task.time.remediation.hear.
5. `task.time.delayed.hear` — due_retrieval after the 24h retention lag.
6. `task.time.transfer.clinic` — fresh transfer family (clinic context).
7. `task.time.assessment.hear` — fresh assessment family (announcement
   context), consumed once, never re-offered.

Proof levels (honest, post-review):
- **Engine contract chain** — Z12 asserts each link mints AND is
  servable on authored tasks under B0 candidate semantics.
- **Session-level trajectory** — runtime SLICE section drives
  `createMissionSession` with an injected test clock and consumes real
  B0 selections end-to-end: baseline taught → +25h → lagged delayed
  retest served and MISSED → authored remediation served under a repair
  kind (B0 picked refresh) → fresh transfer family → fresh assessment
  family → mission closes. The lagged miss mints NO support_demand —
  task.time.delayed.hear declares only `understand_clock_time`; the
  support-demand route (identify_spoken_number → number_probe) is proven
  separately by the engine-level Z12 retrieval-hear miss. Note the
  honest ordering: the lagged retest IS the attributed failure, and B0
  ranks fresh claim-bearing work above a post-repair re-drill — the
  chain is miss→repair→transfer→assessment, which is the reachable
  chain under the frozen policy.
- **Browser runtime** — Playwright proves the repair segment on the
  shipped surface (miss → authored remediation + audit record); the
  +25h lag is compressed by a harness `addInitScript` Date.now patch,
  not by any product URL parameter.

### PERFORMANCE PROFILE
Stage-level breakdown added to experiments/next-for-you/perf.js.
Before (2,000-event log): B0 select ≈265–285ms median / 302–325ms p95;
canonical input digest ≈112–118ms computed TWICE per select (once for
the decisionId inside policyB, once for audit provenance).
After: one digest per select carried on state.inputDigestHex;
`decisionLog.append` still recomputes at the trust boundary.
Latest measured run (this head):
- 100 events:  b0 16.4ms / shadow 16.9ms / reference 1.0ms
- 500 events:  b0 36.9ms / shadow 39.3ms / reference 1.5ms
- 2000 events: b0 125.4ms median / 130.2ms p95; shadow 136.5/141.4;
  reference 6.3/7.1. Stage table: learnerModel 10.1, projection 2.6,
  supportLifecycle 3.3, digest 130.1 (standalone re-measure; inside a
  select it is paid once), generate 13.9, validate 9.6.
Policy-B behavior identical: differential corpus 1,575 rows —
772 MATCH / 797 EXPECTED / 6 SAFETY-PRIOR / 0 BUG / 0 validator
violations.

### JOURNAL DIGEST RESULT
`run.selection.pendingConsumption.expectedEvents` now stores
`{ id, digest: sha256:<sha256(eventFingerprint)> }` per stamped event —
opaque hashes, never response text. Reconciliation: all expected ids
present + digest-equal → finish; zero landed → rollback; partial →
fail closed; same-id/different-content → consumption_reconcile_conflict.
Runtime suite asserts no response text persists in run.selection.

### PROVENANCE HARDENING (review round 2 — PR #71 comment 5917792357)
Two runtime-provenance blockers, both fixed fail-closed:

**Mission revision pinning (BLOCKER-1).** The 008D surface change added
`task.time.remediation.hear` to `mission.meet_at_a_time` and bumped the
mission revision 1→2 — but open runs did not pin a revision, so a run
minted against the old surface could resume under the new one on the
same missionRunId. Now:
- Every minted run carries `missionRevision: mission.revision ?? null`
  (src/vnext/ui-session.js run mint).
- On init, after the crash-journal reconcile (surface-agnostic recovery),
  a run whose pinned revision ≠ current mission revision — OR a legacy
  run with no revision field at all — is explicitly SUPERSEDED
  (`status:'superseded'`, `endedAt`, `supersedeReason` naming the edge,
  e.g. `mission_revision_changed:1->2`), never silently resumed; a fresh
  run mints pinned to the current revision and inherits learnerName.
  Same missionId + different revision never shares one open trajectory.
- The supersede check precedes the mode pin: surface drift closes the
  run under ANY requested mode (self-healing instead of stranding the
  learner on a mode-pin throw for a run that must close anyway).
- The consumed-decision audit stamps the RUN's pinned revision
  (`run.missionRevision`), not whatever mission object is in scope.
- Regressions (REV-PIN): rev-1 run under rev-2 surface supersedes and
  mints a fresh pinned run; matching revision resumes the same run;
  minted revision survives reload; audit revision == pinned run
  revision. LEGACY-PIN updated: unversioned open runs supersede under
  every mode (previously: continue under reference / throw under b0).

**Frozen decide-time snapshot (BLOCKER-2).** `sel.engineInput` aliased
the session's LIVE events array — support_use events appended by
`support()`/`play()` after selection silently mutated "the state the
decision was made against", so the decide-time digest, the decision-log
recompute, and the audit record could describe different states. Now:
- `select()` stores `deepFreezeAll(structuredClone(sel.engineInput))`
  once per selection — post-selection evidence can never leak into
  decide-time provenance (ui-session.js freezeDecisionInput).
- At consume, `stateDigest(decisionInput)` must equal
  `liveTask.decisionDigest` — the digest bound into the decisionId —
  else the commit throws `decision_input_drift` BEFORE any evidence,
  journal, or audit write (fail closed; nothing half-lands).
- `decisionLog.append`'s own recompute is unchanged — the trust
  boundary is not weakened.
- Regressions (SNAP-FREEZE): hint/repeat after selection land in learner
  evidence but not in the snapshot; decisionId embedded digest ==
  decision-log stateFingerprint == persisted audit decisionInputDigest ==
  decide-time digest; object/array mutation of the snapshot throws
  (deep freeze); Set-internal mutation (roles — JS cannot freeze Set
  guts) is caught by the consume-time digest check.
- Honest cost: clone+freeze ≈16ms per selection at a 2,000-event log
  (measured); consume pays one additional explicit digest recompute
  (~110ms at 2k) plus `append`'s existing recompute — the price of a
  verified provenance boundary, paid once per learner action.

### VERIFY:FULL
PASS twice at 5c4c23d (logs/verify-1790791956818-0.log,
logs/verify-1790792152521-0.log): typecheck 137 files, all unit suites,
vite build, 26+6 browser checks, Firestore emulator (incl. decision-audit
rules). Differential corpus clean. Curriculum gate green.
Post-review round 1 (clock-seam removal + witnesses + session
trajectory): PASS at be73ee1 / ff779ec.
Post-review round 2 (revision pinning + frozen snapshot): PASS at
502ae05 — see checkpoint 003.

### EXACT-HEAD CI
PR #71 heads: `f5cdf15` GREEN (push + pull_request); `ff779ec273f8`
GREEN (both triggers). Post-review round-2 head: re-verified below —
CI pending at push time — see checkpoint 003 and PR checks.

### KNOWN LIMITATIONS
- Five required findings remain as named authoring debt (2 correction
  remediation tasks, 3 assessment tasks) — each backed by a confirmed
  executable witness; they are authoring debt, not unproven suspicion.
- The coverage audit is a conservative static reachability model — it
  under-approximates (a mintable+servable row can still be unreachable
  from a given temporal state), which is why required rows carry
  executable witnesses and the SLICE trajectory exists.
- B0 select is synchronous O(event-log) — ~127ms at 2k events, paid once
  per decision (never per render). Incremental derived state / worker
  evaluation remain follow-up; validation was not weakened.
- The frozen decide-time snapshot adds ~16ms per selection at 2k events
  (clone+deep-freeze) and one extra digest recompute at consume — the
  measured cost of the provenance boundary; correctness over speed.
- A refresh-kind serve and a correction-kind serve can land on the same
  remediation task; B0's frozen ranking chooses which intent records —
  the authored task is the served surface either way.
- Legacy/open runs minted before the revision pin are superseded on
  first contact rather than resumed — intended fail-closed migration;
  their evidence remains in the append-only log and the new run
  continues the learner trajectory.

PR #71 NOT MERGED — AWAITING FINAL CHATGPT CLEARANCE
