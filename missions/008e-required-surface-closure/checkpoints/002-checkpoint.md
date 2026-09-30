- checkpoint: 2
- at: 2026-09-30T21:30:00.000Z
- mission: 008e-required-surface-closure
- status: review round 1 applied — awaiting clearance
- current sha: 37d50a4 (devin/m008e-required-surface-closure)
- start sha: 765a5d86e2500ed16010315f0164ef9aee05715d
- commits since start: cdc7d7d implementation, 804d925 report,
  33d17ad CI record, 37d50a4 R1 content patch
- dirty tracked files: REPORT.md update pending this checkpoint
---
# 008E review round 1 — ChatGPT PR #72 comment 5919831496

## REVIEW VERDICT
Do not merge yet — structural closure accepted; two content-validity
blockers on the fresh assessment cues plus durable-truth corrections.

## WHAT CHANGED (37d50a4)

1. HIGH-1 — task.order.assessment.request: "Cold drinks! Who is next?"
   invited the correct-but-non-evidential reply "I'm next" (discourse
   inference, not request_item). Now "Yes? What can I get you?" — a
   service invitation whose immediate pragmatic response is the
   request; every token already inside the mission's practiced cues.
2. HIGH-2 — cue vocabulary + evaluator alignment:
   - name_signup: "For the sign-up sheet — your name, please?" →
     "Hi — tell me your name." (no uncomprehended 'sign-up sheet').
   - assessment.request: rebuilt per HIGH-1.
   - assessment.detail: "Do you work, or are you a student?" →
     "And where are you from?" — the work/student cue invited
     "I work.", which the deterministic matcher cannot accept.
   - Freshness now derives solely from the context signatures.
3. MEDIUM — durable truth: the "five witnesses" wording split into the
   two real failure modes (correction = mints + servableTask null;
   assessment = zero candidates mint because zero authored tasks to
   iterate). "teen/ty pair" wording removed. REPORT + PR body fixed.
4. New 008E-CUE regressions (runtime suite): pins each new prompt,
   asserts every cue token is covered by the mission's other practiced
   stimulus/declared-language surface, verifies naturally invited
   answers score success under the real evaluator, and asserts a
   turn-taking reply earns no request_item evidence.

## VERIFY (at 37d50a4)
- node tests/vnext-next-for-you-runtime.test.mjs — 196 checks PASS
- node tests/vnext-next-for-you.test.mjs — 932 checks PASS
- node tests/vnext-curriculum.test.mjs / vnext-slice / vnext-ui-session — PASS
- node experiments/next-for-you/differential.js — required=0, corpus
  1792 rows {EXPECTED:1009, MATCH:783}, 0 violations
- npm run verify:full — PASS (verify + browser 26+8 + firestore)
- Boundaries held: no Policy B / generator / classifier / learner-model
  edits; fixtures + tests only.
