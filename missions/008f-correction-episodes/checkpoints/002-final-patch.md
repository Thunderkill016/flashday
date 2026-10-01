# 008F checkpoint 002 — R1 review blockers resolved (policy final patch)

sha: `c92f820` on `devin/m008f-correction-episodes` (parent `f6c5db0`,
the R1-reviewed head). Mission record is DONE @`6ed520a`; this patch is
the PR-review-driven follow-up the control room required before merge
clearance.

## Done

1. **Product-route isolation** — `mission-page.js` resolves `?mode=`
   against `PRODUCT_ROUTE_MODES` (pre-008F allowlist); `?mode=b1` and
   `?mode=shadow_b1` fail closed to `reference`. Browser regression:
   reference-identical serve + run pin `reference|production.nextMissionTask`.
   B1 remains reachable via `createMissionSession`/`selectNextTask`.
2. **Provenance-stable identity** — `episodeId = cep:<sha256·20>` over
   `canon({learnerId, capabilityId, sourceEventId, sourceTask@rev,
   openedAt})`; `learnerId` is a first-class field. Regressions:
   cross-learner uniqueness, historical-insert stability, permutation
   stability, relapse persistence.
3. **Complete burn set** — `burnedSurfaces` = failures ∪ remediation
   tasks ∪ `repairSurfaceTaskIds` (any-purpose repair successes) ∪
   `practicedRetestTaskIds` (pre-lag probe exposure). Plus
   `retestReservedTaskIds`: B1 withholds still-fresh probes while
   REPAIRING/REPAIRED_WAITING/RELAPSED where a repair channel survives
   without them — keeps the spec's verify trajectories reachable under
   strict burn semantics. Validator enforces the identical set.
4. **Validator terminal truth** — `dueRetestWork` independently
   reconstructs B1 due-retest work (never trusts the decision digest):
   forged `idle`/`blocked` on due+surface → `fabricated_idle` /
   `blocked_while_valid_work` (single-task-mission regression isolates
   the new path); due+no-surface stays a valid `blocked`.
5. **Backlog adapter** — `b0ToSelection` promotes
   `correction_content_backlog` to `reasonCode` with reason text;
   `selectNextTask({mode:'b1'})` regression.
6. **Classifier** — new declared class `CORRECTION_RETEST_SURFACE_RESERVED`;
   differential back to zero unclassified.
7. **Durable truth** — substantive report restored under the factory
   metadata; research D3 falsification is now real; D5 + condensed
   contract document the full burn/reserve semantics.

## Verification on this sha

- runtime suite: **303 checks PASS** (14 new: CEP-ID, CEP-BURN,
  VAL-TERM, SEL-ADAPTER; all three listening paths still verify)
- differential: b0-vs-b0 unchanged `{EXPECTED 1009, MATCH 783}`;
  b0-vs-b1 `{MATCH 1744, CORRECTION_RETEST_SURFACE_RESERVED 42,
  CORRECTION_RETEST_DUE 6}`; violations 0/0, BUG 0
- typecheck 138 files OK; `npm run verify:full` PASS (browser 26+10
  incl. route-isolation leg; Firestore emulator PASS)
- perf @2k: episodes 5.1ms median; b1 146.3ms ≈ b0 143.1ms;
  shadowB1 175.1ms; digest (~124ms) still dominates

## Honest notes

- Reservation is additive to the reviewer's burn rule: it prevents the
  policy itself from spoiling probes; any exposure that still happens
  (other entry points, ordering edges) is burned by the derivation.
- Caps with a single retest surface will backlog (never verify) if
  that surface is exposed early — honest authoring debt, surfaced as
  `correction_content_backlog`, now visible at the selection boundary.
