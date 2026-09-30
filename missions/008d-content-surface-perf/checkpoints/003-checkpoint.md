<!-- stamped manually — swe:checkpoint unavailable post-finish -->
- checkpoint: 3
- at: 2026-09-30T21:10:00.000Z
- mission: 008d-content-surface-perf
- status: DONE (review round 2 applied)
- current sha: 502ae05 (devin/m008d-content-surface-perf)
- start sha: a13055698506160ed13e846f3d5fd5c7f293446c
- commits since start: b40c649 implementation, 5c4c23d checkpoint,
  f5cdf15 report, be73ee1 review R1, cc67ce4 checkpoint+report,
  ff779ec untrack mission state, 502ae05 review R2 provenance
- dirty tracked files: none
---
# 008D review round 2 — ChatGPT PR #71 comment 5917792357

## REVIEW VERDICT
Do not merge yet — two provenance/versioning blockers: mission surface
mutated without a run-level revision pin, and the decide-time engine
input aliased the live session event array.

## WHAT CHANGED

1. BLOCKER-1 — mission revision pinned per run (src/vnext/ui-session.js,
   src/vnext/fixtures.js):
   - mission.meet_at_a_time revision bumped 1→2 for the authored
     task-surface change (task.time.remediation.hear).
   - Run mints stamp `missionRevision`; on init a run whose pinned
     revision ≠ the current mission revision — or a legacy run with no
     revision field — is explicitly superseded (status + endedAt +
     supersedeReason edge, e.g. `mission_revision_changed:1->2`) and a
     fresh run mints pinned to the current revision, inheriting
     learnerName. Same missionId + different revision never shares one
     open trajectory.
   - The crash-journal reconcile runs BEFORE the pin check: recovery of
     a journaled consumption is surface-agnostic and must resolve before
     the run may close.
   - The pin precedes the mode pin so surface drift self-heals under
     any requested mode instead of stranding on a throw.
   - Consumed-decision audit stamps the RUN's pinned revision.
   - Regressions (REV-PIN, LEGACY-PIN): stale revision supersedes;
     matching revision resumes the same run; minted revision survives
     reload; audit revision == pinned run revision; unversioned legacy
     runs supersede under b0/shadow/reference alike.

2. BLOCKER-2 — decide-time input is an immutable snapshot:
   - select() stores deepFreezeAll(structuredClone(sel.engineInput)) —
     the live events array can no longer be aliased by recorded
     provenance; post-selection support_use events land in learner
     evidence but never in the snapshot.
   - consumeLiveDecision re-verifies stateDigest(decisionInput) ===
     liveTask.decisionDigest and throws decision_input_drift before any
     evidence/journal/audit write on mismatch. decisionLog.append's
     own recompute is unchanged.
   - Regressions (SNAP-FREEZE): post-selection support events absent
     from the snapshot yet present in evidence; decisionId-embedded
     digest == decision-log stateFingerprint == persisted audit
     decisionInputDigest; frozen field writes throw; Set-internal
     mutation (roles) caught by the consume-time check.
   - New introspection seam: session.liveDecisionInput() returns the
     frozen snapshot (test seam).
   - Measured cost: clone+freeze ≈16ms/select at 2k events; consume
     pays one extra explicit digest recompute (~110ms) — the price of
     a verified boundary, once per learner action.

3. Report truth: removed the claim that the session-level delayed miss
   minted support_demand (task.time.delayed.hear declares only
   understand_clock_time; the demand path is proven separately by the
   Z12 retrieval-hear miss). Checkpoint 002 corrected likewise.

## VERIFY
- node tests/vnext-next-for-you-runtime.test.mjs — 88 checks PASS
  (incl. REV-PIN, SNAP-FREEZE, updated LEGACY-PIN)
- node tests/vnext-next-for-you.test.mjs — 907 checks PASS
- npm run typecheck — 137 files OK
- npm run verify:full — PASS at 502ae05
- selector-level perf unchanged: b0 @2k ≈127ms median (freeze lives in
  the session layer, not the selector)
