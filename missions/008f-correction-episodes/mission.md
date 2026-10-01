---
{
  "id": "008f-correction-episodes",
  "objective": "Mission 008F (ChatGPT control room): model correction episodes (failed → repair → delay → independent retest → verified) as pure replay-derived state; build versioned B1 correction-intelligence policy in shadow/experiment that gates transfer/assessment certification on unresolved episodes; prove it on the clock-time/price/direction listening paths with full divergence classification — B0 remains the unchanged executable control.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "not required for v0 — B1 is shadow/experiment only; production B0 serving unchanged. (Browser legs exist for the shared session machinery.)"
}
---

# Mission 008F — Correction Episode Intelligence + Delayed Retest Shadow

Base: `main @ f02a190c3a4956f58356531ec64972086fcb32a7` (merge of PR #72).
Full source spec: `missions/008f-correction-episodes/spec-source.md`
(ChatGPT control-room issue — authoritative).

## OBJECTIVE

Distinguish "can do immediately after correction" from "still can after
the feedback has gone cold": a remediation success today proves only an
immediate post-repair success, never that the original error is
resolved. Model correction episodes deterministically from evidence;
build `vnext.selection-policy.b1.v1` in shadow that withholds
transfer/assessment certification on a capability while its correction
episode is unresolved, and requires an honest delayed independent
retest to verify resolution.

## WHY

On merged main, a learner who fails → repairs → succeeds immediately can
still be walked straight into fresh transfer and assessment on the same
capability. That ordering certifies a claim the evidence doesn't
support — the loop never tests whether the correction survived a delay.

## INVARIANTS

- B0 unchanged: no edits to its ranking, intents, or semantics — it is
  the regression-locked control (byte/behavior parity on the corpus).
- Evidence append-only; episodes are pure replay-derived projections —
  no mutable mastery truth, no float mastery score, no LLM/bandit
  selection.
- Remediation success NEVER resolves an episode; only a delayed,
  independent, unaided retest on a fresh honest surface can verify.
- No support-bearing attempt may close an episode.
- Missing retest content → explicit CONTENT BACKLOG, never a silent
  fallthrough to claim-bearing work.
- Support-demand lifecycle semantics intact; substrate success closes
  no target episode.
- Any authored task-surface change bumps the mission revision.

## IN SCOPE

- `src/vnext/` — new correction-episode derivation module, B1 policy
  version, selector/shadow wiring that leaves B0 untouched.
- `experiments/next-for-you/` — B0-vs-B1 shadow differential +
  divergence classification, metrics, perf profile.
- `src/vnext/fixtures.js` — MINIMAL alternate delayed-retest surfaces
  for the three attributing listening paths if the audit proves none
  honest (with revision bumps).
- `tests/` — episode model, lifecycle trajectories, adversarial
  regressions, differential, shadow-session coverage.
- `missions/008f-correction-episodes/` — spec, research synthesis,
  checkpoints, report.

## OUT OF SCOPE

- Any B0 behavior change, production default switch, or UI redesign.
- FSRS/fluency/CEFR work; general A1 content expansion; remote sync.
- Production or Firestore-rules deployment.
- Claiming B1 teaches better — it is a hypothesis under comparison.

## ACCEPTANCE CRITERIA

- [ ] Research synthesis persisted (source → claim → boundary → design
      implication → falsification); no invented optimal delay.
- [ ] `deriveCorrectionEpisodes` pure/deterministic; episode identity
      carries learner/cap/missing-functions/source task@rev/event/time.
- [ ] Lifecycle covers OPEN → REPAIRING → REPAIRED_WAITING → RETEST_DUE
      → VERIFIED plus RELAPSED on retest failure.
- [ ] Remediation/support success cannot close an episode; only delayed
      independent unaided retest on a non-reused surface verifies.
- [ ] B1 gates transfer+assessment on unresolved episodes; B0 corpus
      parity preserved (B0-vs-B0 byte-identical).
- [ ] Shadow differential: every divergence classified into declared
      categories; zero unclassified.
- [ ] Three real listening paths run end-to-end incl. relapse.
- [ ] All 14 adversarial cases have regressions.
- [ ] Perf @2k reported vs ~125ms B0 baseline; no extra O(events)
      replay where equivalent derived state exists.
- [ ] `npm run verify:full` green; exact-head CI green.

## VERIFICATION

- `npm run verify:full` — typecheck + node suites + build + browser +
  Firestore emulator.

## BROWSER VERIFICATION

Not required for v0 — B1 is a shadow/experiment policy; production
serving is B0-unchanged and its DOM path is already covered.

## SAFETY CONSTRAINTS

- Never force-push / reset --hard / delete branches.
- Never weaken evidence verification for performance.
- ChatGPT/Playwright consults are advisory; never send secrets or
  learner data.

## STOP CONDITIONS

- An honest episode semantics cannot be expressed without mutating B0
  or weakening evidence contracts.
- Required verification impossible in this environment.
- Scope expands beyond the declared mission.

## REPORT FORMAT

`MISSION 008F — CORRECTION EPISODE INTELLIGENCE` with the section list
from spec-source.md §16, ending `PR NOT MERGED — AWAITING CHATGPT
POLICY REVIEW`.
