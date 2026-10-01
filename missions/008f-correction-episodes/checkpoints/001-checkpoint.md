# 008F checkpoint 001 — implementation + all gates green

sha: `108b66f` (work commit on `devin/m008f-correction-episodes`,
parent `809b2f9` scaffold on `main@f02a190`).

## Done

1. Research synthesis `docs/research/next-for-you/14-correction-episodes.md`
   — D1..D6 with source→claim→boundary→design implication→falsification;
   no invented delay (reuses `policy.retention.minLagMs`).
2. `src/vnext/correction-episodes.js` — pure replay-derived episodes:
   OPEN→REPAIRING→REPAIRED_WAITING→RETEST_DUE→VERIFIED / RELAPSED.
   Evidence bar identical to the projection (verified events only,
   registered task@rev, attributing contract, taught precondition,
   canonical (occurredAt,id) order). Burned-surface set = every failure
   surface (opening miss + failed retests) ∪ consumed repair tasks.
3. `policyB1` = `vnext.selection-policy.b1.v1`: episode gate on
   transfer/assessment (`correction_episode_gate:<state>`),
   `correction_retest` candidate (REPAIR tier) at RETEST_DUE,
   `correction_content_backlog` when no honest surface exists.
   B0 byte/behavior-unchanged.
4. Selector: `SELECTION_MODES.B1`/`SHADOW_B1`, `POLICY_VERSION_FOR_MODE`
   (fixes the ui-session B-pinning bug for b1 runs), `classifyB0B1`
   (MATCH / CORRECTION_RETEST_DUE / CORRECTION_EPISODE_GATE /
   REPAIR_WAIT / CORRECTION_CONTENT_BACKLOG / RELAPSE_REPAIR / BUG).
5. Validator: re-derives episodes for b1-versioned decisions; retest
   must be due + covering + unburned; certification under an open
   episode fails closed.
6. Differential + perf harnesses evaluate B1 alongside B0; session
   mode 'b1'/'shadow_b1' plumbed through `createMissionSession`.

## Verification on this sha

- runtime suite: **289 checks PASS** (16 CEP lifecycle/adversarial +
  B1 policy/gate/classifier + VAL + 3 real 'b1' trajectories incl.
  PLACE retest-relapse + shadow_b1)
- `npm test` PASS; typecheck 138 files OK; `npm run verify` PASS
- `npm run verify:full` PASS (browser 26+9, Firestore emulator PASS —
  PERMISSION_DENIED lines are the expected negative-rule tests)
- differential corpus 1792 rows: b0-vs-b0 {EXPECTED 1009, MATCH 783};
  b0-vs-b1 {MATCH 1786, CORRECTION_RETEST_DUE 6}; violations 0/0
- perf @2k events: episodes 4.4ms median; b1 124–128ms ≈ b0 120–136ms;
  shadowB1 ~150ms; digest (109ms) dominates as before (~125ms baseline)

## Honest notes

- The three attributing listening caps need NO new content: price and
  clock-time have exactly one retest alternate; direction has two (the
  second is what makes the relapse path verifiable). Multi-function
  misses involving `identify_spoken_number` remain explicit backlog —
  no target-cap retest surface exists for it (authoring debt, surfaced).
- `node_modules/` untracked noise — never committed.
