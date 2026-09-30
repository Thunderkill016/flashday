- checkpoint: 1
- at: 2026-09-30T21:35:00.000Z
- mission: 008e-required-surface-closure
- status: implementation complete — reporting
- current sha: cdc7d7d (devin/m008e-required-surface-closure)
- start sha: 765a5d86e2500ed16010315f0164ef9aee05715d
- commits since start: cdc7d7d (5 authored tasks + revisions + regressions)
- dirty tracked files: none at commit time
---
# 008E — required content-surface closure

## BEFORE (replayed on main@765a5d8)

All five audit witnesses CONFIRMED failing for the same reason —
candidate mints with `servableTask: null` (real reachability gap,
not a policy bug):

- correction @ buy_small_item | reception.listen.understand_spoken_price
- correction @ find_a_place | reception.listen.follow_short_direction
- assessment @ meet_new_person | production.speak.say_own_name
- assessment @ complete_small_order | interaction.request_item
- assessment @ talk_about_self_family | production.speak.state_basic_self_detail

## WHAT LANDED (cdc7d7d)

- 2 remediation tasks (practiced family, attributing choice contract,
  distinct substrates: number-catch vs direction-term), inserted ahead
  of the drill they repair.
- 3 fresh_assessment tasks (new contextSignatures F.ownNameSignup /
  OF.requestCart / MF.selfHost — distinct cue topology, setting,
  register, partner; zero pre-attempt support; single-capability
  capabilitySample on the target).
- Revisions: meet 3→4, order 1→2, buy 1→2, place 1→2, self 1→2.
- taskIds updated; no policy/generator/validator/classifier edits.

## REGRESSIONS (tests/vnext-next-for-you-runtime.test.mjs)

- 008E-WITNESS: identical preconditions → candidate mints bound to the
  authored task@revision, eligible, B0-selected, validator-clean.
- 008E-FAM: remediation provably shares the practiced family; the three
  fresh families collide with nothing (no diagnostic / retrieval /
  remediation / delayed / transfer / consumed-assessment family).
- 008E-REVPIN: all five missions supersede old-revision open runs,
  pin+resume matching-revision runs, stamp audit with the run's pinned
  revision.
- 008E-TRAJ: real createMissionSession drives — attributing miss on the
  lagged retest → authored remediation → success (recovery proven in
  the event log + repair-kind audit record); independent → retained →
  transferred → fresh assessment → consumed exactly once.
- Slice + ui-session scripted answer maps extended; pinned MEET
  sequence updated (name_signup serves before checkpoint, taskIds
  order).

## GATES

- coverage: required 5 → 0 (not_mintable 65, optional 21 — unchanged
  classifier)
- corpus: 1792 rows, {EXPECTED:1009, MATCH:783}, 0 BUG, 0 validator
  violations
- runtime 180 / selector 932 / curriculum gate PASS / slice PASS
- npm run verify (typecheck + tests + build) PASS
- browser 26+8 PASS; firestore emulator PASS
- perf @2k: b0 median 121.1ms p95 124.7ms — no regression vs 008D's
  ~125ms (content-only change)
