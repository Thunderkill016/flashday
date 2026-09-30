---
{
  "id": "008c-next-for-you-runtime",
  "objective": "Mission 008C (ChatGPT control room): promote the hardened 008B Policy-B decision engine into src/vnext/next-for-you/ as a production runtime path — browser-safe canonical hashing, REFERENCE/B0/SHADOW_B0 selection modes, runStore-persisted DecisionContext, live-decision lock, consume-once semantics, append-only decision audit, shadow differential corpus — without losing evidence honesty, replay determinism, revision provenance, learner isolation, support-demand semantics, or auditability.",
  "verification": [
    "npm run verify:full"
  ],
  "browserVerification": "Playwright against the real /vnext surface: fresh mission → diagnostics → input → attempt → feedback → next decision; support-demand, delayed-retrieval, transfer, assessment routes; B0 blocked assessment-content-backlog; reload mid-prompt; reload after commit; 100 screen() calls burn no context budgets."
}
---

# Mission 008C — Next For You Production Runtime Integration

Base: `main @ 16fd3a5a524e54a05adda6578a2f8fecdc1955e6` (merge of PR #69).
Full source spec: `missions/008c-next-for-you-runtime/spec-source.md`
(ChatGPT control-room issue, 34 sections — the contract below is a
condensation; the source file is authoritative).

## OBJECTIVE

The hardened 008B Policy-B decision architecture runs as a
production-grade vNext runtime path. `experiments/next-for-you/` stops
being the semantic source: `src/vnext/next-for-you/` owns the engine,
experiments become harnesses/thin wrappers around it. The `/vnext`
learner surface can serve B0 selections; legacy callers keep REFERENCE
semantics by default.

## WHY

008B proved the decision engine in simulation. Productionization has
real constraints the experiment never faced: browser builds (no
`node:crypto`), synchronous canonical hashing, persisted decision
context across reloads, render-vs-consume separation, decision audit
provenance, and a shadow mode that compares B0 against the shipped
reference on identical pre-decision state. This is NOT a UI redesign,
NOT an efficacy claim, NOT an RL/bandit mission.

## INVARIANTS

- `nextMissionTask` stays the shipped REFERENCE selector — never deleted,
  never silently redefined. policyRef remains the executable control
  group; Policy A is NOT production truth.
- `src/vnext/**` never imports `experiments/**` — dependencies flow
  src ← experiments/tests only.
- `screen()` / renders are never scheduler mutations: 100 renders change
  DecisionContext zero times. A decision is consumed exactly once by a
  learner action (view()/continue commit for exposure; committed attempt
  for eliciting).
- Live-decision lock: support()/play()/view()/commit() act against the
  exact displayed task@revision + decisionId; the selector never re-runs
  underneath an active learner interaction.
- consumeDecision is idempotent: duplicate commit/retry delivery never
  double-consumes a decisionId.
- Reload invariant: consume → append → persist → reload → next decision
  equals uninterrupted execution; reload BEFORE consume does not count
  the decision and recomputes the identical deterministic decision.
- Evidence honesty: no fabricated evidence on persistence failure — fail
  closed / surface a recoverable error.
- Assessment freshness stays semantic-family based
  (`canonicalFamilyId`); failed assessment + repair with no fresh family
  is an explicit `assessment_content_backlog` BLOCKED reason — never a
  re-sold stale family, never a silent production fallback.
- No runtime-invented task content for the correction gap; honest
  unservable/blocked/alternate-path only.
- Support stays practice-purpose only; diagnostic / delayed_retrieval /
  transfer / assessment remain unaided under B0 too.
- No LLM call anywhere in selection.
- memory = NOT_MODELED; no FSRS/recall probability added.
- No deploy of Firestore rules; emulator tests only.

## IN SCOPE

- New `src/vnext/next-for-you/` runtime modules (candidate-generator,
  decision-context, decision-log, policies, selector, validator,
  canonical, constants — exact layout may adapt to repo conventions).
- Browser-safe synchronous SHA-256 (small audited impl/dependency) +
  standard digest test vectors; proof that no Node builtin reaches the
  browser bundle.
- `selectNextTask({...})` adapter with REFERENCE / B0 / SHADOW_B0 modes
  and the B0→legacy decision-shape adapter (§14).
- DecisionContext as versioned run bookkeeping on `selection` inside the
  run record; backward-compat init for pre-schema runs (§32).
- `consumeDecision(context, decision, ts)` idempotent commit; thread
  ownership rules preserved (support/due/transfer/assessment
  interruptions never steal the learning thread).
- Append-only decision audit record (compact provenance fields per §11);
  `users/{uid}/vnext_decisions/{decisionId}` persistence if cleanly
  supported (code + emulator tests only, no rules deploy; §13 no full
  snapshot in Firestore).
- Runtime fail-closed validator hook for B0 selections (§21).
- Shadow differential corpus: reference vs B0 across all 7 missions and
  the state matrix (fresh/pre-known/supported/independent/due/
  support-demand/observed-fail/unobserved-fail/transfer-ready/
  assessment-ready/assessment-failed/returning/large-due-backlog/
  repair-bound); every divergence classified EXPECTED / BUG /
  CONTENT_GAP / SAFETY-PRIOR — none unexplained (§18).
- Performance measurement at 100/500/2000 events (median/p95-ish local)
  — measure, no speculative optimization (§22).
- Adversarial regressions A–R (§25); self-red-team checklist (§31).
- Experiments migrated to thin wrappers/benchmark over the production
  engine (§26): simulation and runtime must not drift.

## OUT OF SCOPE

- No UI redesign/polish: no dashboard, gamification, streaks,
  recommendation carousel, AI teacher avatar, explanation panel.
- No change to the legacy FlashDay learning loop; no silent flip of
  learners to B0; no public deployment.
- No Firestore rules deployment (code + emulator tests only).
- No authored-content work for the correction/assessment content gaps —
  record them for the content mission.
- No semantic change from 008B Policy B — if one is required, STOP,
  document, return to control room.
- No efficacy claims of any kind.

## ACCEPTANCE CRITERIA

- [ ] Policy B lives in production `src/`, not experiments (success 1)
- [ ] Browser-safe canonical hashing with digest test vectors (2, 3)
- [ ] REFERENCE selector unchanged and available; regression-locked (4, 19)
- [ ] B0 produces normalized mission-task outputs; adapter is honest (5)
- [ ] Shadow mode compares exact same immutable pre-decision state and
      cannot alter learner behavior (6, 20)
- [ ] DecisionContext survives reload; renders never consume; learner
      action consumes exactly once; live task locked to decision (7-10)
- [ ] B0 validator violations fail closed (11)
- [ ] Semantic-family assessment freshness; `assessment_content_backlog`
      honest blocked (12, 18)
- [ ] Support-demand provenance survives runtime (13)
- [ ] blocked vs idle stays honest (14)
- [ ] Append-only decision audit; emulator persistence if implemented (15, 16)
- [ ] All 7 missions traverse under B0 without semantic substitution (17)
- [ ] Benchmark exercises the production implementation (21)
- [ ] verify:full green; browser tests green (22, 23)
- [ ] No efficacy claim; no deploy (24, 25)

## VERIFICATION

- `npm run verify:full` — typecheck + full unit chain + build +
  browser suite + Firestore emulator suite.

## BROWSER VERIFICATION

Playwright against the real `/vnext` surface (§24): fresh mission →
diagnostics → input → attempt → feedback → next decision;
support-demand route; delayed-retrieval route; transfer route;
assessment route; B0 blocked assessment-content-backlog; reload
mid-prompt; reload after commit; many screen() calls burn no budgets;
browser back/refresh if relevant. No brittle sleeps/selectors.

## SAFETY CONSTRAINTS

- Never force-push / reset --hard / delete branches.
- Never discard unrelated uncommitted changes.
- Never touch production secrets or deploy without the user.
- ChatGPT/Playwright consults are advisory only; never send secrets,
  tokens, or private learner data.
- PR gate (§33): DO NOT merge before reporting to ChatGPT — 008C
  changes learner-visible selection semantics and receives one
  independent integration review.

## STOP CONDITIONS

- Firestore persistence coupling proves unsafe → STOP and report before
  substituting a weaker design (§12).
- A semantic change from approved 008B Policy B seems required → STOP,
  document, return to control room (§20).
- Mission file contradicts observed repo reality.
- Scope keeps expanding beyond the declared contract.

## REPORT FORMAT (§34)

MISSION 008C — PRODUCTION RUNTIME INTEGRATION report answering:
BASE SHA · ENDING SHA · PR · PRODUCTION MODULES · BROWSER-SAFE HASH
RESULT · REFERENCE SELECTOR STATUS · B0 SELECTOR STATUS · SHADOW MODE ·
DECISION CONTEXT LIFECYCLE · RELOAD RESULT · LIVE DECISION LOCK ·
DECISION AUDIT LOG · FIRESTORE DECISION PERSISTENCE · ASSESSMENT BACKLOG
BEHAVIOR · CORRECTION CONTENT GAP · REFERENCE-vs-B0 DIFFERENTIAL MATRIX ·
ALL-7-MISSION RESULT · ADVERSARIAL TESTS · PERFORMANCE MEASUREMENTS ·
BROWSER PLAYWRIGHT RESULT · VERIFY:FULL · CI · KNOWN LIMITATIONS · ANY
SEMANTIC CHANGE FROM 008B · RECOMMENDATION FOR NEXT MISSION.

End with: `PR NOT MERGED — AWAITING CHATGPT INTEGRATION REVIEW`.
