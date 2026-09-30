---
{
  "id": "007-learner-model",
  "objective": "Build the vNext learner model: a pure deterministic read-model derived from the evidence kernel (per-capability achievement/evidence/support/failure/retention/transfer/assessment/uncertainty dimensions plus a categorical system profile) — rebuildable from events, learner-isolated, replay-identical, with no fake mastery score and no planner changes.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "not required — headless read-model; verify:full's browser suite re-verifies the kernel is untouched"
}
---

# Mission 007 — vNext Learner Model

## OBJECTIVE

`buildLearnerModel({ learnerId, events, capabilities, tasks, policy, now })`
returns a serializable derived read-model answering "what can this
learner currently demonstrate, supported by which evidence, with what
uncertainty" — never "what should they do next".

## WHY

ChatGPT control-room Mission 007 (post-#66). Higher product logic needs
a coherent honest learner read-model before Next For You can exist.

## INVARIANTS

- Pure deterministic function of events + registries + policy + now.
- Same valid event set → identical model regardless of arrival order.
- Learner-isolated; foreign events cannot contaminate.
- No universal mastery/proficiency/CEFR score; categorical uncertainty
  with explicit evidence-backed reasons.
- Support dependency is evidence-backed; support_attempt never counts
  as target ability.
- Historical milestone facts immutable; recency is a fact, not a
  demotion. Memory state is NOT_MODELED (capability evidence ≠ FSRS).
- Unverified/stale-revision/duplicate evidence cannot strengthen claims.
- Planner untouched; no Next For You; no new curriculum; no UI polish.

## IN SCOPE

- New src/vnext/learner-model.js + tests/vnext-learner-model.test.mjs.
- Minimal export of deriveSupportDemands from planner.js so the model
  shares demand semantics with the planner (no second derivation).
- npm test chain wiring.

## OUT OF SCOPE

- Next For You ranking, planner consumption changes, CEFR/fluency
  scores, FSRS port, new SRS, curriculum expansion, profile UI,
  engagement features.

## ACCEPTANCE CRITERIA

- [ ] model rebuilds from events; order/dup/revision/foreign-proof
- [ ] nine separate dimensions per capability + categorical system view
- [ ] support dependency phases distinguishable (offered/attempted/
      passed/target-recovered/unresolved)
- [ ] unresolved + remediated + recurring function gaps represented
- [ ] evidenceSufficient + reasons[] — categorical, explainable
- [ ] memory: 'NOT_MODELED' boundary documented
- [ ] 18-case adversarial suite + 6-archetype long-horizon snapshots
- [ ] verify:full green

## VERIFICATION

- `npm run verify:full` — the authoritative gate

## BROWSER VERIFICATION

Not required — headless read-model. verify:full's browser suite
re-verifies the kernel is untouched.

## SAFETY CONSTRAINTS

- No planner mutation, no second source of truth, no deploys, no
  merges (human authority).

## STOP CONDITIONS

- Semantic ambiguity on support-dependency / recency / policy-version
  interpretation → checkpoint + consult ChatGPT with evidence.
- A requirement that forces planner/contract redesign → report, don't
  expand scope.

## REPORT FORMAT

CURRENT MODEL BEFORE CHANGE / LEARNER MODEL CONTRACT / FIELDS /
EVIDENCE SOURCES / SUPPORT-DEPENDENCY SEMANTICS / ERROR-GAP SEMANTICS /
RECENCY SEMANTICS / UNCERTAINTY SEMANTICS / MEMORY BOUNDARY /
ADVERSARIAL TESTS / LONG-HORIZON SIMULATION / VERIFY:FULL / ENDING SHA /
KNOWN LIMITATIONS / NEXT RECOMMENDED MISSION
