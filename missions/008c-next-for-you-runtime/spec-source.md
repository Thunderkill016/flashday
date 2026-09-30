# MISSION 008C — source spec (ChatGPT control room, verbatim)

> Merge disposition + mission issue, captured from the control room after
> PR #69 merged. The HTML/markdown whitespace below is normalized; the
> section content is verbatim.

Đã chốt.

CI exact-head #261 SUCCESS. Re-fetched PR/head/mergeability/review state
immediately before merge and merged PR #69 under standing authorization.

- PR head: 51e73166cc580e5d0ffadb126155616b9b8bab99
- Merge commit: 16fd3a5a524e54a05adda6578a2f8fecdc1955e6
- main: 16fd3a5a524e54a05adda6578a2f8fecdc1955e6
- PR #69: merged
- Mission 008B: CLOSED

Note: `experiments/next-for-you/util.js` uses `node:crypto` — copying it
verbatim into `src/vnext` would break the browser build. 008C must do
real productionization.

---

MISSION 008C — NEXT FOR YOU PRODUCTION RUNTIME INTEGRATION

BASE
main @ 16fd3a5a524e54a05adda6578a2f8fecdc1955e6

ROLE
Production learning-systems engineer.

008B is now merged and is the approved semantic specification.

Mission 008C turns the hardened Policy-B decision architecture into a
production-grade vNext runtime path WITHOUT losing:

- evidence honesty
- replay determinism
- exact revision provenance
- learner isolation
- support-demand semantics
- browser compatibility
- auditability

This is NOT a UI redesign.
This is NOT an efficacy claim.
This is NOT an RL/bandit mission.

==================================================
0. FACTORY FIRST
==================================================

Create Mission 008C through the SWE Work Factory.

Fresh branch from exact main:

16fd3a5a524e54a05adda6578a2f8fecdc1955e6

Before coding, inspect current:

src/vnext/mission-runner.js
src/vnext/ui-session.js
src/vnext/store-memory.js
src/vnext/persist.js
src/vnext/planner.js
src/vnext/learner-model.js
src/vnext/contracts.js
experiments/next-for-you/*
docs/specs/next-for-you-v0.md

Reconstruct the complete runtime call chain:

learner action
→ UI session
→ task selector
→ task
→ evaluator
→ binder
→ append-only evidence
→ learner model/projection
→ next selection

Checkpoint the integration plan before changing production code.

==================================================
1. KEY ARCHITECTURE
==================================================

Do NOT rewrite Mission 008B semantics from scratch.

Promote the proven decision engine into production source.

Preferred shape:

src/vnext/next-for-you/
  candidate-generator.js
  decision-context.js
  decision-log.js
  policies.js
  selector.js
  validator.js
  canonical.js
  constants.js

Exact layout may adapt to repo conventions.

After promotion:

PRODUCTION src/ modules are the semantic source of truth.

experiments/next-for-you/
must import/re-export/use the production modules where possible.

Do NOT maintain two independently evolving Policy-B implementations.

Regression:

for a frozen corpus of 008B benchmark states,

old-approved B behavior
==
productionized B behavior

before deleting/reducing prototype duplication.

==================================================
2. BROWSER COMPATIBILITY IS A HARD GATE
==================================================

Current experiment util imports:

node:crypto

That is NOT acceptable in learner-facing browser runtime.

Production code must have ZERO Node-only dependencies.

Need synchronous collision-resistant canonical fingerprinting because the
current selection/session path is synchronous.

Choose a browser-safe solution.

Acceptable directions:

- a small well-audited browser-safe SHA-256 implementation/dependency;
- another collision-resistant synchronous implementation with clear tests.

Do NOT downgrade back to:

32-bit hash
Math.random
timestamp identity
JSON.stringify without canonicalization

Add standard digest test vectors.

Browser/Vite build must prove no Node polyfill dependency leaked in.

==================================================
3. PRESERVE THE CURRENT PRODUCTION REFERENCE
==================================================

Do NOT delete nextMissionTask.

It remains the shipped reference selector.

Expose an adapter such as:

selectNextTask({
  mode,
  learnerId,
  mission,
  tasks,
  capabilities,
  roles,
  events,
  policy,
  selection,
  decisionContext,
  now
})

Supported runtime modes:

REFERENCE
  → literal current nextMissionTask behavior

B0
  → hardened Next For You Policy B

SHADOW_B0
  → learner is served REFERENCE
  → B0 evaluates THE EXACT SAME PRE-DECISION STATE
  → differences are logged
  → B0 cannot affect learner behavior

Names may differ.

But semantics must not.

policyRef remains the production baseline for comparisons.

Policy A is NOT production truth.

==================================================
4. NO IMPORTS FROM experiments/ IN RUNTIME
==================================================

src/vnext/** must never import:

experiments/**

Production dependencies flow one direction:

src
↑
experiments/tests

not:

src
→ experiments

Add a static/regression check if useful.

==================================================
5. DECISION CONTEXT MUST BECOME REAL RUNTIME STATE
==================================================

Policy B requires DecisionContext.

Current ui-session does not maintain it.

Integrate it carefully.

DecisionContext is BOOKKEEPING.

It is NOT learner evidence.

It must survive reload of an open mission run.

Use the existing runStore boundary where appropriate.

An open run should carry a versioned selection state, conceptually:

selection: {
  mode,
  policyVersion,
  decisionContext
}

Do not mutate evidence to fake session context.

==================================================
6. NEVER COUNT SCREEN RENDERS AS DECISIONS
==================================================

This is critical.

session.screen()
may run many times because of:

render
resize
UI refresh
support reveal
framework behavior

That MUST NOT increment:

diagnostic count
repair count
new-input count
thread state
starvation streak

A decision becomes consumed exactly once when the learner ACTS on the
selected task:

Exposure/input:
  explicit view()/continue commit

Eliciting task:
  committed attempt

The same visible task may render 100 times:
DecisionContext changes ZERO times until a learner action consumes it.

==================================================
7. LIVE DECISION LOCK
==================================================

The learner must never see Task A and accidentally submit against Task B.

Current liveTask protects this.

Extend it to include the decision:

liveTask = {
  task,
  capability,
  decision
}

Once displayed:

support()
play()
view()
commit()

must act against that exact task@revision + decisionId.

Do not re-run Next For You underneath an active learner interaction.

After the learner consumes it:

record decision context exactly once
clear live task
select again.

==================================================
8. DECISION-CONTEXT COMMIT
==================================================

Implement an idempotent helper conceptually:

consumeDecision(context, decision, timestamp)

It must:

- reject double consumption of the same decisionId;
- record exact kind;
- capabilityId;
- taskId@revision;
- timestamp;
- update counts;
- update recent tasks/caps;
- update lastActedCapability;
- update learning thread according to 008B ownership rules.

Support / due / transfer / assessment interruptions
MUST NOT steal the learning thread.

Persist updated run bookkeeping BEFORE exposing the subsequent task.

If persistence fails:

do not fabricate evidence;
do not advance silently.

Fail closed / surface a recoverable runtime error.

==================================================
9. RELOAD INVARIANT
==================================================

Required end-to-end test:

state S
→ B chooses decision D
→ learner consumes D
→ events appended
→ DecisionContext saved
→ destroy session
→ reconstruct session from eventStore + runStore
→ next decision

must equal uninterrupted execution.

Also:

reload BEFORE learner consumes D

must not count D.

It should recompute the same deterministic D from unchanged state/context.

==================================================
10. SHADOW MODE
==================================================

Before B0 can become a normal vNext selection path, implement shadow mode.

For each selection state:

run policyRef
run B0

against the exact same immutable pre-decision inputs.

Produce a compact comparison:

{
  reference: {
    status,
    taskId@revision,
    purpose
  },

  b0: {
    kind,
    taskId@revision,
    decisionId
  },

  sameTask,
  divergenceReason
}

No synthetic "better/worse" label.

A difference is evidence of POLICY DIFFERENCE,
not evidence B teaches better.

==================================================
11. PRODUCTION DECISION AUDIT RECORD
==================================================

Use the 008B decision-log trust boundary in runtime.

A consumed B0 decision should create an append-only audit record.

Do NOT store a giant complete learner snapshot document.

Persist compact audit provenance:

decisionId
learnerId
missionId@revision
taskId@revision
capabilityId
selectionPolicyVersion
learningPolicyVersion
decisionInputDigest
decisionEpisodeId
sessionId
chosenKind
timestamp
important reason codes
shadow reference choice if available
context version

Do not duplicate learner response text in decision records.

Learner responses already belong to evidence events.

==================================================
12. FIRESTORE PERSISTENCE
==================================================

If the current vNext persistence architecture supports it cleanly,
add:

users/{uid}/vnext_decisions/{decisionId}

Properties:

create/read
append-only semantics
no client update
no client delete
owner-scoped

Same deterministic decisionId + identical document:
dedupe.

Same id + different content:
CONFLICT.

Add:

toDecisionDoc
fromDecisionDoc if needed
appendVnextDecision(s)
loadVnextDecisions if useful

Firestore emulator tests required.

DO NOT DEPLOY FIRESTORE RULES.

Code + tests only.
Deployment remains a human-authorized external action.

If repository reality makes this persistence coupling unsafe for 008C,
STOP and report before silently substituting a weaker design.

==================================================
13. DO NOT STORE FULL CANONICAL INPUT SNAPSHOT IN FIRESTORE
==================================================

The canonical input snapshot may become large.

Do not risk Firestore document limits by storing:

entire event history
entire task registry
entire learner model

Store:

digest
version/revision identities
compact audit fields

Historical reconstruction uses:

append-only event log
versioned contracts
decision provenance

Keep the canonical snapshot in-memory only for hashing/validation.

==================================================
14. B0 TASK ADAPTER
==================================================

Policy B returns an honest decision object.

The mission UI needs the old normalized shape.

Create ONE adapter.

Conceptually:

B0 decision:

ready action
→ {
    status: 'ready',
    taskId,
    taskRevision,
    capabilityId,
    purpose,
    reason,
    decision
  }

blocked
→ {
    status: 'blocked',
    ...
  }

idle
→ {
    status: 'idle',
    ...
  }

Never choose a semantic-purpose substitute just to satisfy the old UI.

==================================================
15. PURPOSE / SUPPORT INVARIANTS MUST SURVIVE
==================================================

The UI currently enforces:

support available only on practice purposes

diagnostic
delayed retrieval
transfer
assessment

must be unaided.

B0 integration MUST NOT alter that.

Test B-selected:

support_demand
correction
refresh
due_retrieval
transfer
assessment
diagnostic

through the REAL ui-session path.

Evidence produced must verify under the original contracts.

==================================================
16. ASSESSMENT BACKLOG
==================================================

B0 has stricter semantic-family freshness.

Current authored curriculum has only one assessment family per capability.

Therefore after failed assessment + repair:

B0 may have NO honest fresh assessment available.

Runtime must represent this honestly.

Do NOT:

re-sell same assessment as fresh
mark mission completed
fall back silently to production assessment
fabricate another prompt

Return an explicit BLOCKED reason such as:

assessment_content_backlog

Exact code can differ.

The UI summary may show generic safe copy for now.

No redesign.

Record this authoring gap for the content mission.

==================================================
17. CORRECTION CONTENT GAP
==================================================

008B also found:

no real authored capability currently pairs:

attributing failure
+
remediation task

for the desired correction route.

Do NOT invent runtime task content in 008C.

Production integration must expose honest:

unservable / blocked / alternate valid path

according to the decision engine.

Content authoring comes later.

==================================================
18. SHADOW DIFFERENTIAL CORPUS
==================================================

Run reference vs B0 across:

all 7 missions

and states including:

fresh learner
pre-known learner
supported learner
independent learner
due learner
support demand
observed fail
unobserved fail
transfer-ready
assessment-ready
assessment-failed
returning learner
large due backlog
repair-bound case

Classify every divergence:

EXPECTED — documented Policy B change
BUG — semantic disagreement
CONTENT GAP
SAFETY-PRIOR DIFFERENCE

No unexplained divergence allowed.

==================================================
19. RUNTIME MODE DEFAULT
==================================================

Do NOT silently flip every existing learner to B0.

Required migration policy:

Existing generic/legacy callers:
REFERENCE remains default.

Explicit vNext pilot/runtime:
may enable B0 deliberately.

If there is a dedicated experimental `/vnext` learner surface,
wire THAT surface to B0 only after all runtime/browser tests are green.

Do NOT change the legacy FlashDay learning loop in this mission.

No public deployment.

==================================================
20. B0 RUNTIME VERSION
==================================================

Stamp a real runtime version.

Example:

vnext.selection-policy.b0.v1

If implementation changes no semantics from 008B,
keep the approved semantic version.

If you discover a semantic change is required:

STOP,
document it,
return to ChatGPT.

Do not quietly call changed behavior the same policy.

==================================================
21. DECISION ENGINE VALIDATION IN PRODUCTION
==================================================

Do not run the independent validator only in tests.

For B0 selection during development/runtime:

decision
→ validateDecision(decision, exact input)

If validator returns any hard violation:

FAIL CLOSED.

Never serve the task.

For production build, choose whether this remains always-on or
dev/pilot-on based on measured bundle/runtime cost.

But correctness tests must exercise the same validator.

==================================================
22. PERFORMANCE
==================================================

Current candidate engine may replay:

learner model
projection
support lifecycle

multiple times.

Measure it.

Do NOT optimize speculatively.

Benchmark realistic current A1 logs:

100 events
500 events
2,000 events

Measure:

candidate generation
Policy B
validator
reference+B shadow

Browser-compatible environment where possible.

Record median / p95-ish repeated timing locally.

No hard SLA invented yet.

If selection becomes obviously UI-blocking,
profile first and report.

==================================================
23. NO AI CALL IN SELECTION
==================================================

Next For You remains deterministic.

No LLM call may decide:

next capability
next task
mastery
failure attribution
assessment pass
transfer proof

Generative AI later may create content variants INSIDE verified contracts.

It does not own selection truth.

==================================================
24. REAL BROWSER PATH
==================================================

Use Playwright against the actual vNext surface.

Test at least:

fresh mission
→ diagnostics
→ input
→ attempt
→ feedback
→ next decision

support-demand route

delayed-retrieval route

transfer route

assessment route

B0 blocked assessment-content-backlog

reload mid-prompt

reload after commit

many calls to screen() do not burn context budgets

browser back/refresh if relevant

No brittle sleeps/selectors.

==================================================
25. REQUIRED ADVERSARIAL TESTS
==================================================

At minimum:

A. same state/context → same decision

B. 100 screen renders → context unchanged

C. one commit → context increments exactly once

D. duplicate commit/retry delivery → no double decision consumption

E. reload before commit → no consumption

F. reload after commit → context survives

G. support action before commit → does not itself count task selection

H. wrong task submitted against stale live decision → impossible

I. assessment-family backlog stays blocked

J. support cap never free-runs

K. unobserved failure never drives direct repair

L. task revision changes do not reinterpret historical decision

M. foreign learner cannot affect decision

N. malformed event cannot consume task/family

O. REFERENCE path remains byte/task-compatible with current runner

P. B0 runtime decisions match approved 008B Policy-B fixtures

Q. shadow mode never alters served reference task

R. browser build has zero node:crypto / Node builtin dependency

==================================================
26. MIGRATION OF EXPERIMENT CODE
==================================================

After production modules exist:

experiments/next-for-you/

should become:

benchmark/scenario harnesses
thin wrappers
or imports from src runtime.

Avoid deleting useful falsification infrastructure.

The benchmark should now test THE SAME engine production will use.

This is important:

simulation
and
runtime

must not drift into two implementations.

==================================================
27. NO UI POLISH
==================================================

Do NOT redesign For You.

Do not build:

dashboard
gamification
streaks
recommendation carousel
AI teacher avatar
explanation panel

008C is headless/runtime integration.

Learner UI should only receive enough safe state to run the selected task.

==================================================
28. NO MEMORY MODEL
==================================================

Still true:

memory = NOT_MODELED.

Do not add FSRS or recall probabilities here.

Due retrieval retains the currently approved policy semantics.

No time-only forgetting.

==================================================
29. TELEMETRY NEEDED FOR FUTURE HUMAN PILOT
==================================================

Decision audit data should eventually let us answer:

what did B choose?
what would reference have chosen?
what learner evidence existed then?
what happened after the choice?

But DO NOT infer causality.

Ensure records can later join:

decisionId
→ selected task
→ resulting attempt/event
→ later retention/transfer outcomes.

Prefer stamping decisionId onto run/audit linkage.

If adding decisionId into evidence schema would alter trust contracts,
do NOT do it casually.

Use missionRunId + task@rev + timestamp/audit references unless a clean
backward-compatible provenance field is proven safe.

==================================================
30. SUCCESS CRITERIA
==================================================

008C succeeds only if:

1. Policy B lives in production src, not experiments;
2. browser-safe canonical hashing exists;
3. no Node builtin reaches browser runtime;
4. reference selector remains available;
5. B0 selector produces normalized mission-task outputs;
6. shadow mode compares exact same pre-decision state;
7. DecisionContext survives reload;
8. rendering cannot consume decisions;
9. learner action consumes a decision exactly once;
10. live task is locked to live decision;
11. B0 hard violations fail closed;
12. assessment freshness remains semantic-family based;
13. support-demand provenance survives runtime;
14. blocked vs idle remains honest;
15. append-only decision audit works;
16. Firestore emulator decision persistence works if implemented;
17. all 7 missions traverse under B0 without semantic substitution;
18. known content gaps remain explicit;
19. production reference behavior is regression-locked;
20. shadow mode cannot change learner behavior;
21. benchmark uses runtime implementation;
22. full verification is green;
23. browser tests are green;
24. no educational efficacy claim is made;
25. no public deploy is performed.

==================================================
31. SELF-RED-TEAM BEFORE PR
==================================================

Before opening PR, attack:

"Can B0 show a different task than the one commit binds?"

"Can repeated renders burn diagnostic budget?"

"Can reload reset repair/starvation context?"

"Can stale context survive into a new run?"

"Can shadow evaluation mutate state?"

"Can B0 silently fall back to reference on blocked?"

"Can decision log accept unverifiable provenance?"

"Can same assessment context be relabeled and reused?"

"Can a Node-only module get bundled?"

"Can decision logging failure falsely mint evidence?"

"Can an old run created before DecisionContext schema still resume?"

"Can one learner's decision context load into another learner?"

Add regressions for every confirmed attack.

==================================================
32. BACKWARD COMPATIBILITY
==================================================

Existing run records may lack:

decisionContext
selection mode
selection version

Handle them explicitly.

Do NOT guess learner evidence.

Allowed migration:

missing decision context
→ initialize empty context for the open run
→ version it
→ continue

Document that starvation/diagnostic counters prior to migration are unknown
and begin from migration point.

Do NOT reconstruct fake past decisions.

==================================================
33. PR GATE
==================================================

At completion:

factory DONE
focused runtime tests green
Next For You benchmark green
kernel audit green
learner model green
support-demand green
mission-runner/ui-session green
persistence/emulator green
browser green
npm run verify:full green

Open PR.

Wait exact-head CI.

DO NOT merge 008C before reporting to ChatGPT.

008C changes learner-visible task selection semantics on the vNext runtime,
so it receives one independent integration review.

==================================================
34. FINAL REPORT
==================================================

Return:

MISSION 008C — PRODUCTION RUNTIME INTEGRATION

BASE SHA

ENDING SHA

PR

PRODUCTION MODULES

BROWSER-SAFE HASH RESULT

REFERENCE SELECTOR STATUS

B0 SELECTOR STATUS

SHADOW MODE

DECISION CONTEXT LIFECYCLE

RELOAD RESULT

LIVE DECISION LOCK

DECISION AUDIT LOG

FIRESTORE DECISION PERSISTENCE

ASSESSMENT BACKLOG BEHAVIOR

CORRECTION CONTENT GAP

REFERENCE-vs-B0 DIFFERENTIAL MATRIX

ALL-7-MISSION RESULT

ADVERSARIAL TESTS

PERFORMANCE MEASUREMENTS

BROWSER PLAYWRIGHT RESULT

VERIFY:FULL

CI

KNOWN LIMITATIONS

ANY SEMANTIC CHANGE FROM 008B

RECOMMENDATION FOR NEXT MISSION

End with:

PR NOT MERGED — AWAITING CHATGPT INTEGRATION REVIEW

Start now.

---

Closing principles (verbatim):

> Một nguyên tắc quan trọng cho 008C: không cho screen() trở thành hidden
> scheduler mutation. Nếu render 100 lần mà diagnostic budget giảm 100 lần
> thì toàn bộ B0 hỏng dù policy toán học đúng.
>
> Và từ đây policyRef có một nhiệm vụ rất rõ: nó không phải policy chúng
> ta muốn mãi mãi; nó là control group executable để mọi thay đổi của B0
> đều có thể so với thứ FlashDay thực sự đang làm trước đó.
>
> SWE-2 bắt đầu 008C ngay từ main@16fd3a5.
