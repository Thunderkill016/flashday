---
{
  "id": "008e-required-surface-closure",
  "objective": "Mission 008E (ChatGPT control room): drive the conservative content-coverage audit from 5 REQUIRED to 0 REQUIRED on the 7-mission A1 surface — author 2 correction remediation tasks (understand_spoken_price @ buy_small_item, follow_short_direction @ find_a_place) and 3 fresh assessment families (say_own_name @ meet_new_person, request_item @ complete_small_order, state_basic_self_detail @ talk_about_self_family) — with mission revision bumps, executable gap-closure regressions, real session trajectories, and zero Policy-B semantic change.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "Playwright /vnext surface where useful: driven attributing miss routes to each new authored remediation; fresh assessment families serve under real B0 with an injected harness clock — no production time seams."
}
---

# Mission 008E — A1 Required Content-Surface Closure

Base: `main @ 765a5d86e2500ed16010315f0164ef9aee05715d` (merge of PR #71).
Full source spec: `missions/008e-required-surface-closure/spec-source.md`
(ChatGPT control-room issue — authoritative).

## OBJECTIVE

The semantic audit proved exactly 5 required authoring debts with
executable witnesses. Close all five: required = 0 means no currently
proven claim/repair-bearing content dead end on the seven-mission
authored surface. It does NOT mean curriculum complete / A1 complete /
learning efficacy proven.

## WHY

A policy that mints `correction` but finds no remediation task serves
honest `blocked` — correct, but useless for the learner. A transferred
capability with no fresh assessment family can never close a mission.
These are the last proven dead ends on the authored surface.

## INVARIANTS

- Policy-B semantics unchanged: tier order, repair bounds, support-demand
  precedence, freshness semantics, assessment-family semantics,
  diagnostic budget, starvation behavior, learner-model truth.
- Content-contract work only — if a required gap cannot close without
  changing policy semantics, STOP and report.
- Remediation contracts: purpose=remediation, practiced semantic family,
  deterministic evaluator, failure attribution bounded to declared
  requiredFunctions, no transfer/assessment freshness contamination, no
  fake capability dependency, no claim minted by support evidence;
  reachable via the REAL B0 correction/refresh path.
- Assessment contracts: genuinely new contextSignature + consistent
  canonicalFamilyId, freshness.familyClass=fresh_assessment, no
  pre-attempt answer-bearing support, samples the TARGET capability
  directly, declared language range, existing deterministic evaluator,
  no renamed-family relabeling.
- Mission revision discipline: every mission whose task surface changes
  bumps revision; stale/unversioned open runs supersede (008D mechanics).
- Evidence honesty + append-only stores unchanged; no production time
  seams — injected test clocks live only in test harnesses.
- Audit classification logic untouched: required=0 must come from real
  authored coverage, not classifier edits.

## IN SCOPE

1. Two remediation tasks:
   - `reception.listen.understand_spoken_price` @ `mission.buy_small_item`
   - `reception.listen.follow_short_direction` @ `mission.find_a_place`
   Each inspected against its mission's diagnostic/retrieval tasks,
   support capability, requiredFunctions, attributing evaluator,
   support-demand lifecycle, prompt families, context signatures.
   Price and direction comprehension have different substrates — do not
   copy the clock-time task mechanically.
2. Three fresh assessment families:
   - `production.speak.say_own_name` @ `mission.meet_new_person`
   - `interaction.request_item` @ `mission.complete_small_order`
   - `production.speak.state_basic_self_detail` @
     `mission.talk_about_self_family`
3. Mission revision bumps for all five touched missions + migration
   regressions (old-revision open run → superseded; new revision run →
   pinned + reload-safe; historical provenance never reinterpreted).
4. Executable gap closure: the five existing witness states become
   regressions — same preconditions → valid candidate → exact authored
   task@revision → validator clean.
5. Real session trajectories: remediation — taught target → observed
   attributing miss → any legitimate support-demand step B0 chooses →
   authored remediation → successful recovery; assessment —
   independent → retained → transferred → fresh assessment → consumed
   once. Injected test clocks only from harnesses.
6. Family collision audit: remediation may deliberately remain
   practiced; assessment must NOT collide with diagnostic / retrieval /
   remediation / delayed retrieval / transfer / another consumed
   assessment family — explicit regressions.
7. Content quality: plausible A1 communication, one clear communicative
   objective, no answer leakage, plausible-unambiguous distractors,
   natural Vietnamese option copy where used, declared language range;
   rationale recorded per task in the report.
8. Perf recorded once after content addition (regression check only —
   no engine optimization this mission).

## OUT OF SCOPE

- Policy-B / engine semantic changes of any kind.
- Closing the 21 optional carrier findings (they may remain).
- B0 optimization; UI work; gamification.
- Deploys of any kind; Firestore rules deploy.
- Mass content generation beyond the five named tasks.

## ACCEPTANCE CRITERIA

- [ ] All five former witnesses replayed from main and confirmed
      failing for the same reason BEFORE authoring.
- [ ] Two authored remediation tasks satisfy the remediation contract
      and are reachable via the real B0 correction/refresh path.
- [ ] Three authored fresh assessment families satisfy the assessment
      contract (new contextSignature, fresh_assessment class, zero
      answer-bearing support, target capability sampled directly).
- [ ] Mission revisions bumped on all five touched missions; migration
      regressions green.
- [ ] Five former witness states now produce valid candidates bound to
      the authored task@revision, validator clean.
- [ ] Real session trajectories pass for both remediation additions and
      all three assessment additions.
- [ ] Family collision regressions green.
- [ ] Coverage audit: required = 0; optional and not_mintable reported
      separately; classifier logic unchanged.
- [ ] Differential corpus: 0 BUG / 0 unexplained divergence / 0
      validator violations.
- [ ] Perf recorded once post-addition; no material regression or
      profiled and reported.
- [ ] `npm run verify:full` green; exact-head CI green.

## VERIFICATION

- `npm run verify:full` at the final head.
- Runtime suite: witness before/after regressions, session trajectories,
  revision migration, family collision checks.
- `node experiments/next-for-you/differential.js` — audit ends
  required=0; corpus invariants hold.
- Curriculum gate + family-id integrity + all five former witnesses.

## BROWSER VERIFICATION

Playwright /vnext where useful: a driven attributing miss routes to each
new authored remediation; fresh assessment families serve under real B0
via harness `addInitScript` clock patching — no product URL time seams.

## SAFETY CONSTRAINTS

- Never weaken validation, contracts, or evidence honesty.
- Never persist learner response text outside the append-only log.
- No semantic change to B0 — the benchmark and corpus must pass
  unmodified.
- No deploys; no PR merge without user/ChatGPT clearance.

## STOP CONDITIONS

- A required gap cannot close without changing policy semantics — STOP
  and report instead.
- Content authoring that requires inventing evaluation contracts the
  registry cannot validate.
- Any conflict with the evidence-honesty invariants.

## REPORT FORMAT

- `MISSION 008E — REQUIRED CONTENT-SURFACE CLOSURE`
- `BASE SHA` / `ENDING SHA` / `PR`
- `FIVE ORIGINAL WITNESSES`
- `PRICE REMEDIATION` / `DIRECTION REMEDIATION`
- `SAY-OWN-NAME ASSESSMENT` / `REQUEST-ITEM ASSESSMENT` /
  `SELF-DETAIL ASSESSMENT`
- `MISSION REVISION BUMPS` / `FAMILY COLLISION RESULT`
- `REAL SESSION TRAJECTORIES`
- `COVERAGE BEFORE` / `COVERAGE AFTER`
- `DIFFERENTIAL RESULT` / `PERFORMANCE REGRESSION CHECK`
- `VERIFY:FULL` / `CI`
- `OPEN OPTIONAL GAPS` / `KNOWN LIMITATIONS`

End the report with:
`PR NOT MERGED — AWAITING CHATGPT CONTENT REVIEW`
