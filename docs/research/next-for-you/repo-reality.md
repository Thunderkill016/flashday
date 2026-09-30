# Repository Reality — what FlashDay actually does today

Mission 008A deliverable §0. Reconstructed from source at `main@9855398`
(branch `devin/m008a-next-for-you-research`). Every claim cites code.

## 1. The full decision chain today

```text
EvidenceEvent[]                       (src/vnext/evidence.js — schema/validation)
  → projectCapabilities(events,…)     (src/vnext/projection.js)
  → deriveSupportLifecycle(…)         (src/vnext/planner.js, exported for learner-model)
  → buildLearnerModel(…)              (src/vnext/learner-model.js — READ-ONLY; planner does not consume it)
  → planNext(…) / planSession(…)      (src/vnext/planner.js — the actual decision maker)
  → nextMissionTask(…)                (src/vnext/mission-runner.js — resolves plan → concrete task)
  → UI commit path                    (src/vnext/ui-session.js — binds attempts, emits events)
```

Important: **the learner model is not in the planning loop today.** `planNext`
re-derives its own facts from the raw event log + `policy.js` knobs. The
learner model is a read-model for humans/future policies; no decision consumes
it yet.

## 2. `planNext` rule order (exact, src/vnext/planner.js)

Rules are evaluated as a **strict priority cascade** — first match wins, no
scoring, no weighting. Order at `9855398`:

| # | Rule (intent) | Condition | Notes |
|---|---------------|-----------|-------|
| 1 | `resume` | An encounter started but no attempt recorded | Continuation always wins — never abandon in-flight work |
| 2 | `delayed_retrieval` | Capability INDEPENDENT and `lastUnaidedSuccess + minLag ≤ now` | `minLag` from `policy.js`; **not an expiry** — a re-probe trigger |
| 3 | `support_demand` | Pending demands exist from `deriveSupportDemands` | Routes the support substrate probe; function-scoped after audit fixes |
| 4 | `retry` (remediation) | `consecutiveFailures ≥ policy threshold` on a target | Feedback + self-repair loop |
| 5 | `transfer` | Capability RETAINED but never proven in a novel context family | Transfer tasks bound to `transfer_attempt` events |
| 6 | `independent_attempt` | Capability SUPPORTED but no unaided success | Unaided run to mint INDEPENDENT |
| 7 | `expose` (mission continuation) | Started-mission capability seen but not yet supported/independent, prerequisites met | Input/notice tasks only — cannot mint attempts |
| 8 | `diagnostic_probe` / `expose` | First eligible never-seen capability by role | Target → diagnostic probe if declared; carrier → input; **support caps never introduced directly** |
| 9 | `idle` | Nothing eligible | Terminal |

## 3. Hard invariants vs policy choices

**Invariants (kernel-level, not negotiable by a future policy):**

- Only `ATTEMPT_TYPES` events mint performance milestones
  (`projection.js`). `exposure`, `support_use`, `feedback`,
  `support_attempt` never advance state.
- Independent evidence requires: observed attempt + unaided success +
  contract-backed attributing evaluator + deterministic/human authority +
  correct task↔capability binding + learner match.
- Support is sticky within an attempt boundary (`supportByAttempt` is
  `taskId::attemptId` scoped — projection.js:~192).
- Support demands: function-scoped issue/consume/cancel; episode-bounded;
  learner-isolated (post-M006 audit fixes, `d5309a4`).
- `support_attempt` events mint nothing — probes are substrate tests, not
  learner evidence.
- FLUENT state reserved; unreachable until a calibrated fluency contract
  exists.
- `RETENTION_DELAY_MS = 24h` defines RETAINED milestone.

**Policy choices (legitimately contestable in 008B):**

- The strict order 2→8 itself. E.g., due retrieval outranking
  remediation; support demand outranking transfer.
- `consecutiveFailures` threshold (policy knob).
- `minLag` value per capability (policy knob; global default today).
- Which candidates are even *generated* per rule (e.g., rule 7 gates on
  prerequisites but has no novelty/variability logic).
- No cross-rule tradeoffs: a due retrieval on capability X always beats a
  pending remediation on capability Y regardless of severity.
- No session-level composition: each `planNext` call picks ONE action;
  there is no budget/debt notion (e.g., "at most N new items per session").

## 4. What the current planner cannot see

- **Evidence thinness.** `thin_independent_evidence`,
  `no_delayed_evidence`, `no_transfer_evidence` exist in the learner model
  (`uncertainty.reasons`) but `planNext` never reads them. A capability
  with one lucky unaided success is treated identically to one with five.
- **Uncertainty tiering.** `evidenceSufficient` exists; unused by planner.
- **Support dependency as a ranking signal.** `support.dependent` exists;
  planner uses demands (binary issue) but does not *prefer* fading support
  on dependent-but-demanded-served capabilities vs. introducing new work.
- **Session/time state.** No fatigue, session position, or time-on-task
  signal exists anywhere in the kernel. Events carry `occurredAt` and
  `latencyMs` (attempts) but nothing aggregates them into load/fatigue.
- **Diagnostic value.** Nothing distinguishes "capability with strong
  evidence of weakness" from "capability with almost no evidence" at
  decision time — the latter is exactly what an information-gain policy
  needs (`evidenceSufficient`/`reasons` now expose it).
- **Recall probability.** vNext has no FSRS/memory model. `minLag` is a
  fixed gate, not a decay-aware prediction. The legacy A1 product
  (`src/core/`) has real FSRS over review tasks — that machinery is a
  *reference implementation only*, on different artifacts.
- **Cost.** No task-duration model; a 30s probe and a 5-min production
  task are equally weighted candidates.

## 5. Persistence reality

`src/vnext/persist.js` round-trips events through snake_case Firestore
docs. The learner model is replay-deterministic over these docs (proven
by round-trip test). Any future Next For You policy must therefore be
computable from `events + registry + tasks + now` — no hidden mutable
state — or it breaks the determinism invariant the kernel guarantees.

## 6. Boundary verdict

The current planner is a **lexicographic rule cascade**: hard order, no
scores. Its order already embeds defensible pedagogical priors (safety of
in-flight work, due retrieval before new exposure, support demand before
remediation retry). Its blind spots are all in dimensions the learner
model now exposes but the planner does not read: uncertainty, thin
evidence, dependency fading preference, and session composition. That is
the honest gap Mission 008A must design against — not "add AI," but
**decide under uncertainty over rankable candidates while preserving
kernel invariants.**
