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

## INVARIANTS

- Policy-B pedagogical semantics unchanged: tiers, freshness, support
  precedence, repair bounds, and the differential corpus invariants
  (718 MATCH / 759 EXPECTED / 6 SAFETY-PRIOR / 0 BUG / 0 validator
  violations on the 1483-row corpus) still hold exactly.
- Evidence honesty: support, self-report, and unobserved success never
  mint stronger states; transfer requires changed context + novel
  family; assessments bind fresh families + zero support.
- Consumption stays crash-consistent: same id + same digest → valid;
  same id + different digest → conflict; partial landing → fail
  closed; nothing fabricates learner evidence.
- Learner response text lives only in the append-only evidence log —
  never in run.selection, the journal, or decision audits.
- Validation is never weakened to buy speed: the validator, contract
  gate, family integrity, and freshness checks run exactly as before.
- Append-only stores; same-id different-content conflicts throw; retry
  dedupe ignores server arrival timestamps.

## IN SCOPE

1. Semantic gap classification of the 60-row coverage audit:
   REAL REQUIRED GAP / INTENT NOT MINTABLE FOR THAT ROLE / OPTIONAL
   PEDAGOGIC COVERAGE / DUPLICATE/DERIVABLE — the audit itself must
   become capability/intent-semantic, not a missing-task count.
2. One complete A1 vertical slice on real contracts: attributing
   failure → real remediation → correction → delayed retest → fresh
   transfer → fresh assessment family. No synthetic correction fixture
   required for the liveness test afterward. Priority targets:
   correction/remediation authoring gap; target capabilities missing
   assessment; fresh semantic assessment families; carrier coverage
   only where actual candidate semantics require it.
3. Stage-level performance profile at 100/500/2000 events: projection,
   learner model, support lifecycle, candidate generation, policy,
   validator, canonical digest — each measured separately; remove
   obviously duplicated work; compare repeated full replay vs
   memoized/incremental derived state vs immutable snapshot cache vs
   Web Worker feasibility; produce a measured architecture for larger
   histories. No invented SLA.
4. Journal data minimization: `pendingConsumption.expectedEvents[].`
   `fingerprint` becomes a `sha256:` content digest computed by the
   browser-safe canonical hasher.

## OUT OF SCOPE

- Gamification, UI redesign, audit-summary UI.
- RL/bandit selection, FSRS/memory-model changes.
- Public deploy; Firestore Rules deploy.
- Mass content generation without contract review.
- Changes to Policy-B pedagogical semantics.
- Remote decision-store sync policy (deferred — follows content
  completeness).

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

## VERIFICATION

- `npm run verify:full` at the final head.
- Focused runtime suite must cover: journal digest reconcile (same/
  different digest, partial, empty), perf regression shape (no
  per-render re-selection), slice liveness on real content.
- Differential corpus invariants unchanged after any perf work.

## BROWSER VERIFICATION

Playwright against the real /vnext surface: a driven attributing miss
routes to a real authored remediation + correction pair (no longer
blocked); the complete slice traverses input → failure → remediation →
correction → retest → transfer → assessment without synthetic fixtures.

## SAFETY CONSTRAINTS

- Never weaken validation, contracts, or evidence honesty for speed.
- Never persist learner response text outside the append-only evidence
  log.
- Unknown selection modes still fail closed; open-run policy pinning
  (mode + version + legacy runs) is untouched.
- No semantic change to B0 — the 907-check benchmark and differential
  corpus must pass unmodified.
- No deploys of any kind.

## STOP CONDITIONS

- Any required fix that would change Policy-B decision semantics —
  surface it, don't ship it.
- Content authoring that requires inventing evaluation contracts the
  registry cannot validate.
- Perf work that would need a worker migration to stay correct — do
  the measured comparison first, document feasibility, do not force it.
- Any conflict with the learner-safety invariants above.

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
