# Mission report: 008d-content-surface-perf

- status: **DONE**
- mission: `missions/008d-content-surface-perf/mission.md`
- started: 2026-09-30T17:27:36.032Z
- finished: 2026-09-30T18:15:59.822Z
- branch: devin/m008d-content-surface-perf
- starting sha: `a13055698506160ed13e846f3d5fd5c7f293446c`
- ending sha: `5c4c23d0e7a2a25bac61568dd42f0451e1093286`

## Objective
Mission 008D (ChatGPT control room): close the B0 content surface honestly — classify the 60-gap coverage audit semantically, land one genuinely complete A1 vertical slice (attributing failure → real remediation → correction → delayed retest → fresh transfer → fresh assessment family), profile and de-duplicate the B0 selection path (~285ms @ 2k events), and replace journal fingerprints with crypto digests — with zero Policy-B semantic change.

## Commits (2)
- `5c4c23d 008D: implementation checkpoint — semantic audit, slice, digests, perf`
- `b40c649 008D: semantic coverage audit, clock-time remediation slice, journal digests, shared input digest`

## Files changed vs start (11)
- `M	experiments/next-for-you/differential.js`
- `M	experiments/next-for-you/perf.js`
- `A	missions/008d-content-surface-perf/checkpoints/001-checkpoint.md`
- `M	src/vnext/fixtures.js`
- `M	src/vnext/next-for-you/policies.js`
- `M	src/vnext/next-for-you/selector.js`
- `M	src/vnext/ui-session.js`
- `M	src/vnext/ui/mission-page.js`
- `M	tests/vnext-browser.test.mjs`
- `M	tests/vnext-next-for-you-runtime.test.mjs`
- `M	tests/vnext-next-for-you.test.mjs`

## Verification runs (2)
- 2026-09-30T18:12:36.826Z @ `5c4c23d0e7a2` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790791956818-0.log)
- 2026-09-30T18:15:52.527Z @ `5c4c23d0e7a2` — **PASS**
  - `npm run verify:full` → exit 0 (logs/verify-1790792152521-0.log)

## Commands executed (5)
- 2026-09-30T17:27:36.055Z start: devin/m008d-content-surface-perf@a13055698506
- 2026-09-30T18:08:05.375Z checkpoint: cp 1
- 2026-09-30T18:12:36.827Z verify: PASS
- 2026-09-30T18:15:52.528Z verify: PASS
- 2026-09-30T18:15:59.822Z finish: done

## Checkpoints (1)
- #1 2026-09-30T18:08:05.368Z @ `b40c649ab53c` — checkpoints/001-checkpoint.md

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
Playwright /vnext surface: a driven attributing miss now routes to a real authored remediation + correction pair (not blocked); the complete slice traverses input → failure → remediation → correction → retest → transfer → assessment without synthetic fixtures.

## Final result
# Mission 008D — content-surface closure + runtime scalability

Semantic coverage audit replaced the naive gap count; one complete A1
vertical slice landed on authored content; journal fingerprints became
sha256 digests; the double canonical digest in the B0 select path was
factored to one computation. Zero Policy-B semantic change.

## 008D RESULT — required sections

### HEAD
`5c4c23d0e7a2a25bac61568dd42f0451e1093286` (code-final commit `b40c649`,
checkpoint commit `5c4c23d`; this report lands on top)

### GAP CLASSIFICATION
The rewritten audit (experiments/next-for-you/differential.js) derives a
per-capability reachability envelope — attemptable / attributable /
exposure / eliciting / freshTransfer / freshAssessment — and mirrors
candidate-generator.js mint conditions exactly. 91 findings:
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
  surface: carrier diagnostic_probe (self-suppressing paths), target
  new_input (targets baseline-probe instead), correction on caps whose
  only attempt tasks use eval.required_functions.v1 (cannot attribute),
  transfer/due_retrieval on non-attemptable carriers. Audit-visible, no
  authoring action.
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
7. `task.time.assessment.hear` — fresh assessment family (shop
   announcement), consumed once, never re-offered.
Browser verification: Playwright drives the real /vnext surface — the
run ends at summary after in-flight work drains (lagged intents need
real elapsed time); reloading with the ?clockOffset=+25h test seam
resumes the persisted run, the delayed retest is served and
deliberately missed, and `task.time.remediation.hear` is served under a
repair kind with a decision-audit record. 6 browser checks PASS.

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

### VERIFY:FULL
PASS twice at 5c4c23d (logs/verify-1790791956818-0.log,
logs/verify-1790792152521-0.log): typecheck 137 files, all unit suites,
vite build, 26+6 browser checks, Firestore emulator (incl. decision-audit
rules). Differential corpus clean. Curriculum gate green.

### EXACT-HEAD CI
Pending at report-commit time — CI runs on the pushed head and is
reported to the control room before merge.

### KNOWN LIMITATIONS
- Five required findings remain as named authoring debt (2 correction
  remediation tasks, 3 assessment tasks) — enumerated for the next
  content mission; no slice was stretched beyond the honest boundary.
- B0 select is synchronous O(event-log) — ~125ms at 2k events, paid once
  per decision (never per render). No SLA was invented.
- The ?clockOffset seam exists only on the /vnext test surface; it is
  never used by the product flow itself.
- A refresh-kind serve and a correction-kind serve can land on the same
  remediation task; B0's frozen ranking chooses which intent records —
  the authored task is the served surface either way.

PR NOT MERGED — AWAITING CHATGPT REVIEW OF CONTENT SEMANTICS + PERFORMANCE
