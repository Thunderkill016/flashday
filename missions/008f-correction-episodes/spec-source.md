# Mission 008F — source spec (ChatGPT control room, verbatim)

Issued after 008E final clearance; PR #72 merged →
`main = f02a190c3a4956f58356531ec64972086fcb32a7`.

Context from the issuer: the remaining weakness is the learning loop —
after error → remediation success, B0 may still advance straight to
transfer/assessment. Remediation success only proves "can do
immediately after correction", not that the error survives a delay.

---

MISSION 008F — CORRECTION EPISODE INTELLIGENCE + DELAYED RETEST SHADOW

BASE
main @ f02a190c3a4956f58356531ec64972086fcb32a7

GOAL

Research, model and experimentally implement the missing distinction:

FAILED
→ REPAIR
→ "can do immediately after correction"

is NOT the same as:

FAILED
→ REPAIR
→ DELAY
→ independent successful retest
→ correction resolved

The current production B0 remains the executable control.

Do NOT silently mutate B0.

Build a versioned B1 correction-intelligence policy in SHADOW /
experiment first.

==================================================
1. RESEARCH FIRST
==================================================

Before policy code, review evidence on:

- corrective feedback;
- retrieval after feedback;
- delayed retesting;
- repeated retrieval;
- immediate vs delayed post-tests;
- error recurrence / relearning;
- feedback timing;
- contextual variation after correction.

Use the existing FlashDay evidence hierarchy.

Persist:

source
→ claim
→ boundary/contradiction
→ design implication
→ falsification condition.

Do not claim an optimal delay if literature does not establish one.

If no stronger parameter is justified, B1 v0 may reuse the current
retention.minLagMs rather than inventing another magic number.

==================================================
2. CORRECTION EPISODE MODEL
==================================================

Create a PURE deterministic replay-derived model.

Conceptually:

deriveCorrectionEpisodes({
  learnerId,
  events,
  tasks,
  capabilities,
  policy,
  now
})

No mutable mastery truth.

An episode must originate from an authoritative observed attributed
failure.

Identity must preserve provenance such as:

learner
capability
missing function(s)
source task@revision
source event/attempt
failure time

Avoid collapsing unrelated failures into one vague capability flag.

Possible lifecycle:

OPEN
→ REPAIRING
→ REPAIRED_WAITING
→ RETEST_DUE
→ VERIFIED

and on retest failure:

RETEST_DUE
→ RELAPSED / OPEN

Exact names may differ.

==================================================
3. HARD SEMANTIC RULE
==================================================

A remediation success MUST NOT itself resolve the original error.

It proves only:

"successful immediately after repair".

The episode becomes resolved only after:

- required lag;
- independent attempt;
- no answer-bearing support;
- valid evaluator;
- correct target/missing-function coverage;
- delayed retest success.

No time-only forgetting.

No fabricated mastery score.

==================================================
4. CLAIM-BEARING GATE
==================================================

While a target capability has an unresolved correction episode:

TRANSFER
and
ASSESSMENT

must not certify that capability.

This is the central hypothesis to test.

B1 should prefer the honest correction lifecycle over advancing to
claim-bearing work.

B0 must remain unchanged for comparison.

==================================================
5. RETEST FRESHNESS
==================================================

Do NOT simply resell the failed item.

Audit the current clock-time / price / direction correction paths.

For a post-repair delayed retest:

- failed source task cannot be reused as "fresh";
- remediation task cannot be reused as retest;
- no support;
- independent evidence;
- use an alternate authored surface/context when available.

If no honest alternate retest exists:

return explicit CONTENT BACKLOG.

Do not silently allow transfer/assessment.

==================================================
6. CONTENT AUDIT BEFORE AUTHORING
==================================================

Start with the three real attributing listening correction paths:

- understand_clock_time
- understand_spoken_price
- follow_short_direction

For each determine:

failure task
missing functions
support-demand path
remediation task
available delayed retest alternatives
freshness/family collisions

Author ONLY the minimum alternate retest surfaces required by the
approved episode semantics.

Do not mass-generate tasks.

Any mission task-surface change requires mission revision bump.

==================================================
7. SUPPORT-DEMAND RELATIONSHIP
==================================================

Keep support lifecycle semantics intact.

If authoritative failure reports a missing substrate function:

target failure
→ support demand
→ support probe
→ target remediation

But:

support success
does not close target correction episode.

remediation success
does not close it either.

Only the delayed independent target retest may verify resolution.

==================================================
8. B1 POLICY
==================================================

Do not edit B0 in place.

Create a new explicit version, conceptually:

vnext.selection-policy.b1.v1

Pipeline remains deterministic:

evidence
→ learner model
→ correction episodes
→ hard eligibility
→ candidates
→ deterministic policy
→ machine explanation.

No float mastery score.
No LLM curriculum choice.
No RL/bandit.

==================================================
9. SHADOW DIFFERENTIAL
==================================================

Run B0 and B1 over the same immutable state.

Classify every divergence.

Expected new divergence categories may include:

CORRECTION_EPISODE_GATE
REPAIR_WAIT
CORRECTION_RETEST_DUE
CORRECTION_CONTENT_BACKLOG
RELAPSE_REPAIR

No unclassified divergence.

B0 is control behavior, not "wrong".
B1 is hypothesis, not "better".

==================================================
10. REQUIRED REAL TRAJECTORIES
==================================================

For clock-time, price and direction:

failure
→ correct attribution
→ support demand if applicable
→ remediation
→ remediation success
→ BEFORE lag:
   no transfer/assessment certification
→ AFTER lag:
   alternate independent correction retest
→ success:
   episode VERIFIED
→ transfer becomes eligible
→ assessment becomes eligible.

Also test:

retest failure
→ episode reopens
→ repair path returns.

==================================================
11. ADVERSARIAL CASES
==================================================

Attack at least:

- same failed task relabeled and reused;
- remediation task masquerades as delayed retest;
- supported retest closes episode;
- malformed/unobserved failure creates episode;
- stale task revision creates episode;
- foreign learner evidence creates episode;
- support success closes target failure;
- immediate retest closes episode before lag;
- transfer occurs while episode unresolved;
- assessment occurs while episode unresolved;
- second failure incorrectly closes/replaces first episode;
- replay/permutation changes episode identity;
- reload changes episode state;
- content backlog silently falls through to transfer.

Every confirmed attack gets a regression.

==================================================
12. METRICS
==================================================

Engineering / future pilot metrics only:

correction episodes opened
repair reached
repair immediate success
delayed retest attempted
delayed retest success
relapse
time-to-resolution
support usage
content backlog rate

Do NOT call these learning efficacy yet.

Future useful metric:

CORRECTION RESOLUTION RATE
=
episodes independently passed after delay
/
eligible correction episodes

Keep cohort/time-window definitions explicit.

==================================================
13. PERFORMANCE
==================================================

Correction episode derivation must not add another full O(events)
replay for every subsystem if equivalent derived state already exists.

Profile first.

Do not weaken evidence verification to optimize.

Keep the current ~125ms @2k baseline visible in before/after reporting.

==================================================
14. NON-GOALS
==================================================

No UI redesign.
No gamification.
No fluency model.
No FSRS.
No CEFR expansion.
No remote sync redesign.
No production deployment.
No Firestore Rules deployment.
No general A1 content expansion.
No claim that B1 teaches better.

==================================================
15. SUCCESS CRITERIA
==================================================

008F succeeds if:

- correction episodes are deterministic and evidence-derived;
- remediation success != correction resolution;
- delayed independent retest is required;
- unresolved correction blocks target transfer/assessment in B1;
- B0 remains byte/behavior regression-locked;
- three real listening correction paths run end-to-end;
- same-item / support / immediate-retest shortcuts fail closed;
- missing retest content becomes explicit backlog;
- B0-vs-B1 divergences are fully classified;
- no unexplained validator violation;
- verify:full green;
- exact-head CI green.

==================================================
16. FINAL REPORT
==================================================

Return:

MISSION 008F — CORRECTION EPISODE INTELLIGENCE

BASE SHA
ENDING SHA
PR

RESEARCH SYNTHESIS
CORRECTION EPISODE CONTRACT
EPISODE REPLAY RESULT

CLOCK-TIME PATH
PRICE PATH
DIRECTION PATH

RETEST FRESHNESS
CONTENT BACKLOG

B0 STATUS
B1 STATUS
B0-vs-B1 DIFFERENTIAL

RELAPSE RESULT
ADVERSARIAL TESTS

PERFORMANCE

VERIFY:FULL
CI

WHAT THIS PROVES
WHAT THIS DOES NOT PROVE
KNOWN LIMITATIONS

End:

PR NOT MERGED — AWAITING CHATGPT POLICY REVIEW
