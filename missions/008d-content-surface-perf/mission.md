---
{
  "id": "008d-content-surface-perf",
  "objective": "Mission 008D (ChatGPT control room): close the B0 content surface honestly — classify the 60-gap coverage audit semantically, land one genuinely complete A1 vertical slice (attributing failure → real remediation → correction → delayed retest → fresh transfer → fresh assessment family), profile and de-duplicate the B0 selection path (~285ms @ 2k events), and replace journal fingerprints with crypto digests — with zero Policy-B semantic change.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "Playwright /vnext surface: a driven attributing miss now routes to a real authored remediation + correction pair (not blocked); the complete slice traverses input → failure → remediation → correction → retest → transfer → assessment without synthetic fixtures."
}
---

# Mission 008D — B0 Content-Surface Closure + Runtime Scalability

Base: `main @ 78fce4da6f00727e0a4e9807a215e08f87d082e4` (merge of PR #70).
Full source spec: `missions/008d-content-surface-perf/spec-source.md`
(ChatGPT control-room issue — authoritative).

## OBJECTIVE

B0 now correctly *decides* correction/assessment — but the authored
surface cannot always *serve* the intent (60 gaps), and one-shot
selection at ~285ms on 2k-event logs is potentially UI-blocking. This
mission makes the content surface honest, makes the runtime fast enough
to be a real scheduler, and minimizes what the crash journal persists.

## WHY

A policy that decides correction but finds no remediation task to serve
produces honest `blocked` — correct, but useless for the learner. And a
scheduler that blocks the main thread for ~285ms on large logs cannot
ship. Both must be fixed before vNext can leave the bench.

## SCOPE

1. Gap classification (semantic, not a task-count):
   - REAL REQUIRED GAP (author);
   - INTENT NOT MINTABLE FOR THAT ROLE (fix the audit's enumeration —
     e.g. a carrier role where the intent is never generated);
   - OPTIONAL PEDAGOGIC COVERAGE (documented, not authored now);
   - DUPLICATE/DERIVABLE GAP (servable through an existing task).
2. One complete A1 vertical slice with real contracts:
   attributing failure → real remediation → correction → delayed retest
   → fresh transfer → fresh assessment family. No synthetic correction
   fixture may be required for the liveness test afterward.
3. Performance: stage-level profiling (projection, learner model,
   support lifecycle, candidate generation, policy, validator,
   canonical digest) at 100/500/2000 events; remove obviously
   duplicated work; compare replay vs memoized/incremental vs snapshot
   cache vs worker — measured, no invented SLA, zero B0 semantic change.
4. Journal data minimization: `pendingConsumption.expectedEvents`
   fingerprints become `sha256:` digests; reconcile semantics
   unchanged (same id+same digest → valid, same id+different digest →
   conflict, partial → fail closed). Learner response text must never
   persist in `run.selection`.

## NON-GOALS

- No gamification or UI redesign; no audit-summary UI.
- No RL/bandit; no FSRS/memory-model work.
- No public deploy; no Firestore Rules deploy.
- No mass content generation without contract review.
- No Policy-B pedagogical semantic change (tiers, freshness, support
  precedence, repair bounds).

## ACCEPTANCE CRITERIA

- [ ] Coverage audit classifies every gap semantically (not a naive
      missing-task count); remaining gaps prioritized.
- [ ] One complete A1 vertical slice traverses the full recovery chain
      with real authored remediation — no synthetic correction fixture
      required for liveness.
- [ ] Every new task passes contract validation, family integrity,
      freshness, function attribution, mission surface checks, real
      evaluator compatibility.
- [ ] Stage-level perf profile produced; duplicated work removed;
      before/after numbers measured; B0 behavior identical
      (differential corpus invariants still hold).
- [ ] Journal fingerprints are crypto digests; no raw learner response
      in `run.selection`; crash-injection suite still green.
- [ ] `npm run verify:full` green; exact-head CI green.

## REPORT FORMAT

- `008D RESULT`
- `HEAD`
- `GAP CLASSIFICATION` (counts per class + how each was resolved)
- `VERTICAL SLICE RESULT` (the complete chain, real tasks named)
- `PERFORMANCE PROFILE` (stage timings before/after, what was removed)
- `JOURNAL DIGEST RESULT`
- `VERIFY:FULL`
- `EXACT-HEAD CI`
- `KNOWN LIMITATIONS`

End the report with:
`PR NOT MERGED — AWAITING CHATGPT REVIEW OF CONTENT SEMANTICS + PERFORMANCE`
