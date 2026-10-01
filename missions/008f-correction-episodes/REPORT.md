# MISSION 008F — CORRECTION EPISODE INTELLIGENCE

BASE SHA: `f02a190c3a4956f58356531ec64972086fcb32a7` (main after #72)
ENDING SHA: `108b66f` (+ report/checkpoint commits)
PR: pending creation — link recorded post-push

## RESEARCH SYNTHESIS

`docs/research/next-for-you/14-correction-episodes.md` — six claims with
source→claim→boundary→design implication→falsification:

- D1 corrective feedback produces immediate repair performance, not
  durable correction (CF + testing-effect corpus, docs 03/05) → STRONG
- D2 delayed retest is the validity boundary; literature pins no optimal
  delay → reuse `retention.minLagMs`, no invented constant → STRONG
- D3 supported success is contamination, not evidence (kernel support
  semantics, docs 08/11) → STRONG
- D4 relapse is routine — recurrence after feedback is expected, so the
  repair path must re-open, not replace → MODERATE
- D5 surface freshness: retest must be an alternate *task* covering the
  missed function(s); exclusion extends to every burned surface →
  MODERATE (kernel-consistency argument, honestly graded)
- D6 only authoritative failures open episodes — attribution contract +
  registered task@rev + observed + taught → STRONG (kernel-inherited)

## CORRECTION EPISODE CONTRACT

`src/vnext/correction-episodes.js` — pure, deterministic,
replay-derived. Identity: `cep:<capability>:<seq>` with learner, cap,
union missingFunctions, source task@rev, source event, failure times.
Lifecycle: `OPEN → REPAIRING → REPAIRED_WAITING → RETEST_DUE → VERIFIED`
and `RETEST_DUE/REPAIRED_WAITING → RELAPSED` on new attributed failure.
Retest lag = `policy.retention.minLagMs`. VERIFIED is terminal; a later
failure opens a NEW episode. `correction-episodes.js:148`.

Hard boundaries enforced in replay: verified+registered events only;
attributing contract required (`contractAttributesFunctions`); taught
precondition (a baseline miss is information); supported/unobserved
success never repairs or verifies; retest surfaces = retest-eligible
purposes minus every burned surface (all episode failure tasks + repair
tasks) covering ≥1 still-missing function.

## EPISODE REPLAY RESULT

Runtime suite 289 checks PASS. Derivation-level: full lifecycle with
exact `repairedAt + minLagMs` boundary, failed-remediation bookkeeping,
canonical-order byte-equality under permutation and re-derivation,
partial-verification backlog.

## CLOCK-TIME PATH

`mission.meet_at_a_time`, cap `reception.listen.understand_clock_time`,
mode `b1`: taught → +25h → `task.time.delayed.hear` miss opens the
episode → repair → certification held through the open window →
RETEST_DUE → `correction_retest` serves `task.time.retrieval.hear` →
VERIFIED; `verifiedByEventId` resolves to the retest event.
(SES-B1-TIME)

## PRICE PATH

`mission.buy_small_item`, cap `reception.listen.understand_spoken_price`:
same arc — `task.price.delayed.hear` miss → episode → repair → gate
holds → retest `task.price.retrieval.hear` → VERIFIED; run pins
`vnext.selection-policy.b1.v1`. (SES-B1)

## DIRECTION PATH

`mission.find_a_place`, cap `reception.listen.follow_short_direction`:
`task.place.delayed.follow` miss → episode → repair → due → retest
`task.place.retrieval.follow` **fails** → same episode RELAPSED
(failures=2, id unchanged) → re-repair restarts the lag → retest serves
`task.place.retrieval.follow_landmark` — the only un-burned alternate —
→ VERIFIED. (SES-B1-RELAPSE)

## RETEST FRESHNESS

Burned set = every failure surface in the episode (opening miss AND any
failed retest) ∪ every consumed remediation task. Enforced in
`retestSurfaces`/`pickRetestSurface` (`correction-episodes.js:126`),
re-checked independently by the validator (`correction_retest_reused_
surface`), and proven end-to-end: post-relapse only
`retrieval.follow_landmark` minted; `retrieval.follow` minted exactly
once.

## CONTENT BACKLOG

No new content authored — the audit found honest alternates for all
single-function misses on the three attributing caps. Real backlog case
kept explicit: a miss attributing `identify_spoken_number` has NO
target-cap retest surface → `correction_content_backlog` is emitted on
the decision, the episode stays open, certification stays gated. Never
a silent fallthrough. (B1 + CEP backlog checks)

## B0 STATUS

Unchanged — no edits to ranking, intents, or semantics. Corpus B0-vs-B0:
1792 rows, 1009 EXPECTED + 783 MATCH, 0 validator violations (byte
parity on the frozen inputs).

## B1 STATUS

`vnext.selection-policy.b1.v1` — same generator/filters/ladder plus:
episode gate on transfer+assessment, `correction_retest` candidate
(REPAIR tier) while RETEST_DUE, honest backlog. Decision records carry
a compact episode digest (`contractVersion` + per-episode provenance)
for audit and classification. Shadow/experiment only — production
default untouched.

## B0-vs-B1 DIFFERENTIAL

1792 rows over the same frozen states: **1786 MATCH +
6 CORRECTION_RETEST_DUE**, zero unclassified, 0 validator violations
on either side. All six divergences are the intended change — B0
re-served the failed delayed task; B1 routed the alternate retest
(`task.price.retrieval.hear`, `task.place.retrieval.follow`).

## RELAPSE RESULT

Derivation: post-due failure → RELAPSED, repairedAt/retestDueAt reset,
missingFunctions union-widened, second failure absorbed into the same
episode id. Session: PLACE end-to-end relapse above — re-repair ran and
the burned retest surface never re-served.

## ADVERSARIAL TESTS

All spec-listed attacks have regressions: source-task reuse, repair
masquerade, supported retest, unobserved/malformed failure, stale
revision, foreign learner, support-success-closes-target, pre-lag
retest, transfer + assessment under open episode (gate + validator +
session-level open-window checks), second-failure replacement, replay
permutation, reload/re-derivation, backlog fallthrough — plus the new
failed-retest-surface burn (derivation + session level).

## PERFORMANCE

@2000 events (median / p95): b0 120–136ms, b1 124–128ms,
shadow_b1 ~150ms, reference ~8ms. Stage breakdown: digest 109ms
(dominant, unchanged), policyB 137ms, episodes derivation 4.4/5.4ms —
one extra replay pass over the same event set, no per-subsystem
O(events) multiplication. Baseline ~125ms preserved in-band.

## VERIFY:FULL

`npm run verify:full` PASS on `108b66f` — typecheck 138 files, all node
suites, vite build, browser 26+9 checks, Firestore emulator (immutable
evidence, owner+learner pinning, idempotent append, replay parity,
decision audit; the PERMISSION_DENIED lines are the negative tests).

## CI

pending — recorded after push.

## WHAT THIS PROVES

- Correction episodes derive deterministically from evidence alone;
  remediation success never resolves a correction.
- B1 withholds certification while an episode is unresolved and routes
  a genuinely fresh delayed retest when one exists.
- Every B0↔B1 divergence is episode-attributable; the control is
  regression-locked.

## WHAT THIS DOES NOT PROVE

- That B1 teaches better — it is a validity hypothesis (stops
  over-certification), not an efficacy claim.
- That one verified retest means durable mastery — VERIFIED is
  "resolved once"; later failures open new episodes.
- Cohort metrics (resolution rate, time-to-resolution) — engineering
  fields exist (`failures`, `repairAttempts`, `relapseCount`,
  `openedAt`/`verifiedAt`) but are not yet pilot evidence.

## KNOWN LIMITATIONS

- `identify_spoken_number` multi-function misses → honest
  `correction_content_backlog` until an alternate surface is authored.
- Single alternates (price, clock-time) mean ONE relapse exhausts the
  retest pool → backlog is the truthful outcome there.
- B1 is not the production default; `b1`/`shadow_b1` are experiment
  surfaces. Production remains B0.

PR NOT MERGED — AWAITING CHATGPT POLICY REVIEW
