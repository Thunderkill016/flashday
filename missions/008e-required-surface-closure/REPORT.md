# Mission report: 008e-required-surface-closure

- status: **DONE** — pending ChatGPT content review
- mission: `missions/008e-required-surface-closure/mission.md`
- branch: devin/m008e-required-surface-closure
- starting sha: `765a5d86e2500ed16010315f0164ef9aee05715d`
- ending sha: `cdc7d7d` (implementation) + report commit

## Objective

Drive the conservative content-coverage audit from 5 REQUIRED to
0 REQUIRED on the 7-mission A1 surface: author 2 correction-remediation
tasks and 3 fresh assessment families, bump the five touched mission
revisions, land executable gap-closure regressions and real session
trajectories — with zero Policy-B semantic change.

## Commits

- `cdc7d7d 008E: close all five required content-surface findings`

## Files changed vs start (5)

- `M src/vnext/fixtures.js` — 3 new context signatures, 5 authored
  tasks, 5 revision bumps, taskIds ordering
- `M tests/vnext-next-for-you-runtime.test.mjs` — 008E-WITNESS / FAM /
  REVPIN / TRAJ sections (+92 checks → 180 total)
- `M tests/vnext-slice.test.mjs` — scripted act + pinned sequence for
  `task.meet.assessment.name_signup`
- `M tests/vnext-ui-session.test.mjs` — scripted answer for
  `task.meet.assessment.name_signup`
- `A missions/008e-required-surface-closure/{mission.md,spec-source.md,
  checkpoints/001-checkpoint.md,REPORT.md}`

## Acceptance criteria

- [x] All five former witnesses replayed from `main@765a5d8` and
      confirmed failing for the same reason (candidate mints,
      `servableTask: null`) BEFORE authoring.
- [x] Two authored remediation tasks satisfy the remediation contract
      and are reachable via the real B0 correction/refresh path.
- [x] Three authored fresh assessments satisfy the assessment contract
      (new contextSignature, fresh_assessment class, zero answer-bearing
      support, target capability sampled directly).
- [x] Mission revisions bumped on all five touched missions; migration
      regressions green (supersede / resume-pinned / audit stamp).
- [x] Five former witness states now produce valid candidates bound to
      the authored task@revision, validator clean.
- [x] Real session trajectories pass for both remediation additions and
      all three assessment additions.
- [x] Family collision regressions green.
- [x] Coverage audit: required = 0; optional (21) and not_mintable (65)
      reported separately; classifier logic unchanged.
- [x] Differential corpus: 0 BUG / 0 unexplained divergence / 0
      validator violations (1792 rows: 1009 EXPECTED, 783 MATCH).
- [x] Perf recorded post-addition: b0 @2k median 121.1ms, p95 124.7ms —
      no regression vs the 008D-optimized ~125ms.
- [x] `npm run verify:full` green (see VERIFY:FULL); exact-head CI
      pending at push — see CI.

---

## FIVE ORIGINAL WITNESSES (replayed on base 765a5d8)

All five confirmed failing with `servableTask: null` — the candidate
mints, but no authored task exists to serve:

| mission | capability | kind | before |
| --- | --- | --- | --- |
| buy_small_item | understand_spoken_price | correction | no remediation task |
| find_a_place | follow_short_direction | correction | no remediation task |
| meet_new_person | say_own_name | assessment | no own assessment task |
| complete_small_order | request_item | assessment | no own assessment task |
| talk_about_self_family | state_basic_self_detail | assessment | no own assessment task |

## PRICE REMEDIATION — `task.price.remediation.hear`

- Mission `buy_small_item`, cap `reception.listen.understand_spoken_price`,
  listening, purpose `remediation`, practiced family (`SF.priceQAudio` —
  deliberate: repair is not freshness evidence).
- Content: audio line "Three dollars." → choice {3 / 13 / 8 đô-la}.
  Rationale: strips the price frame to a bare amount so the choice
  operationalizes exactly the substrate a price comprehension needs —
  catching the number word — while `requiredFunctions` still names the
  attributed pair (`understand_spoken_price` + `identify_spoken_number`),
  bounding failure attribution to the declared substrate. Distractors
  are the confusable teen/ty pair (three/thirteen) plus a far digit.
- taskIds: inserted before `task.price.retrieval.hear` so the
  correction/refresh pick lands on repair before re-drill.

## DIRECTION REMEDIATION — `task.place.remediation.follow`

- Mission `find_a_place`, cap `reception.listen.follow_short_direction`,
  listening, `remediation`, practiced family (`LF.directionAudio`).
- Content: audio "Turn right." → {Rẽ phải / Rẽ trái / Đi thẳng}.
  Rationale: a single isolated imperative operationalizes a different
  substrate from price — catching the direction term
  (`identify_basic_direction_term` + `follow_short_direction`). Not a
  copy of the clock-time pattern (which re-attends clock-face digits);
  Vietnamese option copy is natural and unambiguous.
- taskIds: inserted before `task.place.retrieval.follow`.

## SAY-OWN-NAME ASSESSMENT — `task.meet.assessment.name_signup`

- Mission `meet_new_person`, cap `production.speak.say_own_name`,
  spoken_production, `assessment`, `fresh_assessment`, zero support.
- New signature `F.ownNameSignup`: organizer asks for the learner's
  name for a sign-up sheet — cueTopology `signup_name_request`,
  setting `community`, register `neutral`, interlocutor `organizer`,
  first_meeting. The practiced exchange rehearses the peer cue
  "What's your name?" and the transfer used a different context; an
  organizer's formulaic request is a genuinely new comprehension→
  production channel.
- `capabilitySample: ['production.speak.say_own_name']` — direct sample;
  previously the capability was only covered transitively inside the
  multi-capability checkpoint.

## REQUEST-ITEM ASSESSMENT — `task.order.assessment.request`

- Mission `complete_small_order`, cap `interaction.request_item`,
  spoken_interaction, `assessment`, `fresh_assessment`, zero support.
- New signature `OF.requestCart`: a drink-cart vendor calling the queue
  forward ("Cold drinks! Who is next?") — the learner must produce the
  request from the situation; there is no "what can I get you" cue to
  echo. Distinct cue topology, setting, register, partner from both the
  practiced stall order and the takeaway transfer.

## SELF-DETAIL ASSESSMENT — `task.self.assessment.detail`

- Mission `talk_about_self_family`, cap
  `production.speak.state_basic_self_detail`, spoken_production,
  `assessment`, `fresh_assessment`, zero support.
- New signature `MF.selfHost`: a homestay host's arrival question
  ("Do you work, or are you a student?") — distinct from the peer
  small-talk teaching context and the office-registration transfer
  context (different cue topology, setting, partner).

## MISSION REVISION BUMPS

meet_new_person 3→4 · complete_small_order 1→2 · buy_small_item 1→2 ·
find_a_place 1→2 · talk_about_self_family 1→2.

REVPIN-008E regressions (per mission): open run at `rev-1` supersedes
with `mission_revision_changed:a->b` + `endedAt`; fresh run mints
pinned at the new revision; matching-revision run resumes pinned;
consumed-decision audit stamps the run's pinned revision — historical
provenance never reinterpreted.

## FAMILY COLLISION RESULT

- Remediation tasks share the practiced family deliberately and collide
  only with practiced tasks of the same capability — asserted.
- All three fresh assessments collide with NOTHING: no diagnostic /
  retrieval / remediation / delayed-retrieval / transfer / consumed-
  assessment family shares their canonical id — asserted per task via
  `canonicalFamilyId` recomputation across the whole registry.

## REAL SESSION TRAJECTORIES (createMissionSession, b0)

- `understand_spoken_price`: teach → +25h → attributing miss on
  `task.price.delayed.hear` → `task.price.remediation.hear` served
  (repair-kind audit record) → success event = recovery proven.
- `follow_short_direction`: same chain via `task.place.delayed.follow`
  → `task.place.remediation.follow`.
- `say_own_name`: independent → retained → `task.meet.transfer.name` →
  `task.meet.assessment.name_signup` served once; extra driving
  confirms no re-serve.
- `request_item`: … → `task.order.transfer.stall` →
  `task.order.assessment.request` once.
- `state_basic_self_detail`: … → `task.self.transfer.office` →
  `task.self.assessment.detail` once.

## COVERAGE BEFORE → AFTER

`required: 5 → 0`. `not_mintable: 65`, `optional: 21` — unchanged
classifier, unchanged counts; the five former required rows are gone
entirely (authored coverage), not reclassified.

## DIFFERENTIAL RESULT

1792 rows — {EXPECTED: 1009, MATCH: 783}, 0 BUG, 0 SAFETY-PRIOR
violations, 0 b0 validator violations.

## PERFORMANCE REGRESSION CHECK

perf.js @2k events: generate 9.1ms, policyB 119.3ms, validate 7.6ms,
**b0 median 121.1ms / p95 124.7ms**, shadow 129.6ms, reference 7.0ms.
No regression vs the 008D-optimized baseline (~125ms) — content-only
change; digest remains the single dominant stage (112ms), unchanged.

## VERIFY:FULL

- `npm run verify` (typecheck 137 files + 26 node suites + build): PASS
- `npm run test:browser`: 26 app groups + 8 vnext checks PASS
- `npm run test:firestore`: emulator PASS (evidence immutability,
  owner/learner pinning, idempotent append, replay parity, decision
  audit rules)
- Combined verify:full legs all green at head `cdc7d7d` (firestore leg
  run separately after a local `java` PATH fix; identical content).

## CI

Pending — see PR.

## OPEN OPTIONAL GAPS

21 carrier-recovery findings remain optional by design (e.g.
carrier `due_retrieval`/`correction`/`refresh` degradation) — the
mission explicitly leaves them; they are demand-routed niceties, not
claim-bearing dead ends.

## KNOWN LIMITATIONS

- Browser-leg for the five new surfaces was not added: the runtime
  trajectories exercise the identical `createMissionSession` → B0 →
  validator → consume path that the browser drives (the 008D browser
  slice already proves the mechanism end-to-end through the DOM).
- Remediation ordering relies on taskIds position (repair before
  re-drill) — this is authored ordering, not a policy change.
- required=0 closes *proven* dead ends only; it does not assert A1
  completeness or learning efficacy.

---

`PR NOT MERGED — AWAITING CHATGPT CONTENT REVIEW`
