# Spec source — Mission 008E (verbatim ChatGPT control-room issue)

Issued after 008D final-clear + merge of PR #71
(main = 765a5d86e2500ed16010315f0164ef9aee05715d).

---

MISSION 008E — A1 REQUIRED CONTENT-SURFACE CLOSURE

BASE
main @ 765a5d86e2500ed16010315f0164ef9aee05715d

GOAL
Drive the conservative content-coverage audit from:

5 REQUIRED
→ 0 REQUIRED

for the current 7 authored missions.

Do NOT blindly close the 21 optional carrier findings.

==================================================
1. REQUIRED DEBT TO CLOSE
==================================================

Exactly these current witnessed gaps:

A. correction remediation
- reception.listen.understand_spoken_price
  @ mission.buy_small_item

- reception.listen.follow_short_direction
  @ mission.find_a_place

B. fresh assessment
- production.speak.say_own_name
  @ mission.meet_new_person

- interaction.request_item
  @ mission.complete_small_order

- production.speak.state_basic_self_detail
  @ mission.talk_about_self_family

Before authoring, replay every witness from main and confirm all five
still fail for the same reason.

==================================================
2. DO NOT CHANGE POLICY B
==================================================

No changes to:

tier order
repair bounds
support-demand precedence
freshness semantics
assessment-family semantics
diagnostic budget
starvation behavior
learner-model truth

This is content-contract work.

If a required gap cannot be closed without changing policy semantics:
STOP and report.

==================================================
3. REMEDIATION CONTRACTS
==================================================

For both listening correction gaps:

inspect the existing:
diagnostic/retrieval
support capability
requiredFunctions
attributing evaluator
support-demand lifecycle
prompt families
context signatures

Author a remediation task only if its evidence meaning is defensible.

Required:

purpose = remediation

practiced semantic family

deterministic evaluator

failure attribution bounded to declared requiredFunctions

no transfer/assessment freshness contamination

no new fake capability dependency

no claim minted by support evidence

The remediation surface must be reachable through the REAL B0
correction/refresh path.

Do not copy the clock-time task mechanically.

Price and direction comprehension have different substrates.

==================================================
4. ASSESSMENT CONTRACTS
==================================================

Add one valid fresh assessment family for each missing target:

say_own_name
request_item
state_basic_self_detail

Each must:

- use a genuinely new contextSignature;
- receive a canonicalFamilyId consistent with that signature;
- use freshness.familyClass = fresh_assessment;
- require no pre-attempt answer-bearing support;
- sample the TARGET capability directly;
- stay within the declared language range;
- use the existing deterministic evaluator honestly;
- not disguise practiced prompts through renamed family labels.

Same semantic context with a renamed id is NOT fresh.

==================================================
5. MISSION REVISION DISCIPLINE
==================================================

Any mission whose task surface changes MUST bump mission revision.

Expected affected missions:

mission.buy_small_item
mission.find_a_place
mission.meet_new_person
mission.complete_small_order
mission.talk_about_self_family

Inspect actual current revisions first.

Do not assume every mission is revision 1.

Regression for every changed mission:

old revision open run
→ superseded

new revision run
→ pinned and reload-safe

historical decision/audit provenance
→ never reinterpreted under new mission revision.

==================================================
6. EXECUTABLE GAP CLOSURE
==================================================

The existing five witness states become regression tests.

For each former gap:

BEFORE:
intent mints
servableTask == null
or assessment cannot mint

AFTER:
same witness preconditions
→ valid candidate
→ exact authored task@revision
→ validator clean.

The content audit must end:

required = 0

Do not make the audit green by changing classification logic.

Any classification change requires an independent justification.

==================================================
7. REAL SESSION TRAJECTORIES
==================================================

For both remediation additions:

run through createMissionSession:

taught target
→ observed attributing miss
→ any legitimate support-demand step B0 chooses
→ authored remediation
→ successful recovery

For all three assessment additions:

real trajectory reaches:

independent
→ retained
→ transferred
→ fresh assessment
→ assessment consumed once.

Use injected test clocks only from test harnesses.

No production time seams.

==================================================
8. FAMILY COLLISION AUDIT
==================================================

Before accepting any new task, assert its canonical semantic family
against every task for that capability.

Required:

remediation:
may deliberately remain practiced.

assessment:
must NOT collide with
diagnostic
retrieval
remediation
delayed retrieval
transfer
another consumed assessment family.

Add explicit collision regressions.

==================================================
9. CONTENT QUALITY
==================================================

Do not optimize merely for passing the evaluator.

Prompts must represent plausible A1 communication.

Check:

natural wording
one clear communicative objective
no accidental answer leakage
distractors plausible but unambiguous
Vietnamese option copy natural where used
language range consistent with mission
no textbook-only nonsense solely to satisfy tests.

Record rationale per new task in the mission report.

==================================================
10. COVERAGE AUDIT AFTER AUTHORING
==================================================

Expected target:

required = 0

Optional findings may remain.

not_mintable findings may remain.

Report all three separately.

0 required means:
no currently proven claim/repair-bearing content dead end
on the seven-mission authored surface.

It does NOT mean:
curriculum complete
A1 complete
learning efficacy proven.

==================================================
11. PERFORMANCE / ENGINE BOUNDARY
==================================================

Do not optimize B0 in this mission.

Record perf once after content addition only to catch regression.

If B0 latency materially jumps merely from five new tasks:
profile and report.

Do not alter engine semantics to recover milliseconds.

==================================================
12. TEST GATES
==================================================

Required:

curriculum gate
family-id integrity
all five former witnesses
real remediation trajectories
real assessment trajectories
mission revision migration
Next For You benchmark
runtime suite
browser where useful
npm run verify:full
exact-head CI

Differential corpus:
0 BUG
0 unexplained divergence
0 validator violations.

==================================================
13. FINAL REPORT
==================================================

Return:

MISSION 008E — REQUIRED CONTENT-SURFACE CLOSURE

BASE SHA
ENDING SHA
PR

FIVE ORIGINAL WITNESSES

PRICE REMEDIATION
DIRECTION REMEDIATION

SAY-OWN-NAME ASSESSMENT
REQUEST-ITEM ASSESSMENT
SELF-DETAIL ASSESSMENT

MISSION REVISION BUMPS
FAMILY COLLISION RESULT

REAL SESSION TRAJECTORIES

COVERAGE BEFORE
COVERAGE AFTER

DIFFERENTIAL RESULT
PERFORMANCE REGRESSION CHECK

VERIFY:FULL
CI

OPEN OPTIONAL GAPS
KNOWN LIMITATIONS

End:

PR NOT MERGED — AWAITING CHATGPT CONTENT REVIEW

---

Post-008E direction note (verbatim):
"Sau 008E, nếu thật sự đạt required = 0, lúc đó mới đáng chuyển sang
bước lớn hơn: correction intelligence + delayed retest quality trên
nhiều loại lỗi, thay vì tiếp tục vá content từng chỗ."
