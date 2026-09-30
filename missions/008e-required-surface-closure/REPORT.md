# Mission report: 008e-required-surface-closure

- status: **DONE** — pending ChatGPT content review
- mission: `missions/008e-required-surface-closure/mission.md`
- branch: devin/m008e-required-surface-closure
- starting sha: `765a5d86e2500ed16010315f0164ef9aee05715d`
- ending sha: `d4def77` (R2 freshness patch; verify:full PASS) + report commits

## Objective

Drive the conservative content-coverage audit from 5 REQUIRED to
0 REQUIRED on the 7-mission A1 surface: author 2 correction-remediation
tasks and 3 fresh assessment families, bump the five touched mission
revisions, land executable gap-closure regressions and real session
trajectories — with zero Policy-B semantic change.

## Commits

- `cdc7d7d 008E: close all five required content-surface findings`
- `804d925 008E: mission report + implementation checkpoint`
- `33d17ad 008E: record exact-head CI green on 804d925`
- `37d50a4 008E R1: construct-valid assessment cues + cue-alignment
  regressions` (PR comment 5919831496)
- `510f340 008E: R1 checkpoint + report truth corrections + CI record`
- `d4def77 008E R2: learner-visible fresh context + practiced-only cue
  cover` (PR comment 5920114888)

## Files changed vs start (7)

- `M src/vnext/fixtures.js` — 3 new context signatures, 5 authored
  tasks, 5 revision bumps, taskIds ordering; R2 cue simplification +
  self-detail language metadata
- `M src/vnext/ui/copy.js` — TASK_SITUATION entries for the three fresh
  assessments (learner-visible held-out context, R2)
- `M tests/vnext-next-for-you-runtime.test.mjs` — 008E-WITNESS / FAM /
  CUE / SIT / REVPIN / TRAJ sections (+133 checks → 221 total)
- `M tests/vnext-browser.test.mjs` — seeded-history drive proving the
  fresh assessment's situation renders before the prompt (9 checks)
- `M tests/vnext-slice.test.mjs` — scripted act + pinned sequence for
  `task.meet.assessment.name_signup`
- `M tests/vnext-ui-session.test.mjs` — scripted answer for
  `task.meet.assessment.name_signup`
- `A missions/008e-required-surface-closure/{mission.md,spec-source.md,
  checkpoints/,REPORT.md}`

## Acceptance criteria

- [x] All five former witnesses replayed from `main@765a5d8` and
      confirmed failing BEFORE authoring — via the two distinct modes
      detailed under FIVE ORIGINAL WITNESSES (corrections mint a
      candidate with `servableTask: null`; assessments mint zero
      candidates — no authored task existed to iterate).
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

Two distinct failure modes, stated exactly:

- **Correction gaps (2):** the correction intent mints a candidate but
  no remediation task exists to bind — `servableTask: null`.
  - buy_small_item | `reception.listen.understand_spoken_price`
  - find_a_place | `reception.listen.follow_short_direction`
- **Assessment gaps (3):** the transferred precondition is reachable,
  but with ZERO authored assessment tasks for the capability, ZERO
  assessment candidates can mint at all.
  - meet_new_person | `production.speak.say_own_name`
  - complete_small_order | `interaction.request_item`
  - talk_about_self_family | `production.speak.state_basic_self_detail`

(Corrected per review R1 — the earlier draft wrongly claimed all five
were `servableTask: null` mints.)

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
  are a confusable same-onset digit (three/thirteen) plus a far digit.
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
- Signature `F.ownNameSignup` (unchanged): organizer name-request
  context — cueTopology `signup_name_request`, setting `community`,
  register `neutral`, interlocutor `organizer`, first_meeting.
- **R1→R2 cue fixes:** the original "For the sign-up sheet —" cue
  loaded the learner with uncomprehended vocabulary; R1's
  "Hi — tell me your name." still drew `tell`/`me` from a held-out
  *transfer* task, not the practiced surface. R2 stimulus is the
  mission's rehearsed direct cue `What's your name?` — every token
  provably practiced; freshness comes from the learner-visible
  Vietnamese situation (`TASK_SITUATION`: community sign-up, organizer
  asks the learner's name) plus the context signature, never from
  lexical novelty. Bare "Linh", "I am Linh", "My name is Linh" all
  score success under the deterministic matcher (asserted in 008E-CUE).
- `capabilitySample: ['production.speak.say_own_name']` — direct sample;
  previously the capability was only covered transitively inside the
  multi-capability checkpoint.

## REQUEST-ITEM ASSESSMENT — `task.order.assessment.request`

- Mission `complete_small_order`, cap `interaction.request_item`,
  spoken_interaction, `assessment`, `fresh_assessment`, zero support.
- Signature `OF.requestCart` (unchanged): drink-cart vendor context —
  cueTopology `cart_order_call`, setting `drink_cart`, interlocutor
  `vendor`.
- **R1→R2 cue fixes:** the original "Cold drinks! Who is next?"
  invited the correct but non-evidential reply "I'm next", measuring
  discourse inference, not `request_item`. R1's "Yes? What can I get
  you?" still drew `Yes?` from a held-out transfer cue. R2 stimulus is
  the mission's rehearsed service invitation `What can I get you?` —
  the drink-cart/vendor context is carried by the learner-visible
  Vietnamese situation line. Pinned regressions: `a tea please` /
  `can i have a tea` / `tea please` succeed; `i am next` stays
  non-evidence.

## SELF-DETAIL ASSESSMENT — `task.self.assessment.detail`

- Mission `talk_about_self_family`, cap
  `production.speak.state_basic_self_detail`, spoken_production,
  `assessment`, `fresh_assessment`, zero support.
- Signature `MF.selfHost` (unchanged): homestay-host context —
  cueTopology `host_arrival_detail`, setting `homestay`, interlocutor
  `host`.
- **R1→R2 fixes:** stimulus is `And where are you from?` — the
  mission's already-practiced personal-detail question frame. The
  original "Do you work, or are you a student?" invited the valid
  answer "I work." which the deterministic matcher cannot accept (it
  requires `I work in/at/as…` or `I am a …`) — an evaluator
  false-negative on a natural response. The where-from cue invites
  `I'm from Vietnam` / `I come from Vietnam` — all accepted forms.
- **R2 metadata fix:** `language.requiredChunks/requiredVocabulary`
  still declared the removed work/student surface (`I work in …`,
  `work`, `study`); now declares the response construct actually
  invited — `I'm from …` / `from` — inside the mission's declared
  language range, with a staleness regression in 008E-SIT.

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

- `npm run verify:full` at `d4def77`: PASS — verify (typecheck 137
  files + all node suites + build), browser 26+9 (includes the
  fresh-assessment situation render-order leg), Firestore emulator
  (evidence immutability, owner/learner pinning, idempotent append,
  replay parity, decision-audit rules).

## CI

Exact-head green on `510f340` (push `36779272463`, pull_request
`36779277695`). R2 head `d4def77` CI pending — updated after push.

## OPEN OPTIONAL GAPS

21 carrier-recovery findings remain optional by design (e.g.
carrier `due_retrieval`/`correction`/`refresh` degradation) — the
mission explicitly leaves them; they are demand-routed niceties, not
claim-bearing dead ends.

## KNOWN LIMITATIONS

- The R2 browser leg proves the fresh assessment's situation renders
  before the prompt on `task.order.assessment.request`; the other two
  tasks share the identical render path and are pinned copy-side
  (008E-SIT). A full in-browser trajectory to each assessment remains
  uncovered — runtime trajectories exercise the same session path.
- `TASK_SITUATION` coverage is opt-in per task id; nothing forces a
  `freshness.required` task to declare a situation — a general
  contract-level requirement is future work.
- Remediation ordering relies on taskIds position (repair before
  re-drill) — this is authored ordering, not a policy change.
- required=0 closes *proven* dead ends only; it does not assert A1
  completeness or learning efficacy.

---

`PR #72 NOT MERGED — AWAITING FINAL CHATGPT CLEARANCE`
