- checkpoint: 3
- at: 2026-09-30T22:05:00.000Z
- mission: 008e-required-surface-closure
- status: review round 2 applied — awaiting clearance
- current sha: pending commit (devin/m008e-required-surface-closure)
- start sha: 765a5d86e2500ed16010315f0164ef9aee05715d
- commits since start: cdc7d7d implementation, 804d925 report,
  33d17ad CI record, 37d50a4 R1 content patch, 510f340 R1 docs,
  R2 freshness patch pending
- dirty tracked files: this checkpoint + REPORT.md
---
# 008E review round 2 — ChatGPT PR #72 comment 5920114888

## REVIEW VERDICT
Do not merge yet — one freshness BLOCKER + two HIGHs +
durable-truth cleanup. R1 cue direction accepted.

## WHAT CHANGED (R2)

1. BLOCKER — learner-visible fresh context: the three fresh
   assessments claimed held-out contexts (organizer/community,
   vendor/drink_cart, host/homestay) that existed only as
   contextSignature metadata — mission-page.js renders a situation
   only when TASK_SITUATION has the task id, and none did.
   Added three Vietnamese situation lines naming the declared
   setting/partner/situation dims, so the English cue can stay
   deliberately simple and practiced.
2. HIGH — cue cover was not practiced-only: cueTokenCover counted
   fresh_transfer/fresh_assessment tasks, masking tokens that exist
   ONLY on held-out tasks ("tell me" lived solely on
   task.meet.transfer.name; "Yes?" solely on task.order.transfer.stall).
   Cover now = practiced-family tasks + mission declared language only.
   Cues simplified to the rehearsed direct forms the review named:
   name_signup → "What's your name?", order.request →
   "What can I get you?"; self-detail's "And where are you from?"
   already passes the restricted cover.
3. HIGH — stale task language metadata: task.self.assessment.detail
   still declared the removed work/student surface
   ("I work in …", work, study) — now "I'm from …" / "from", inside
   the mission's declared range.
4. Regressions: 008E-SIT (runtime) pins situation existence,
   signature-dim markers in the copy, and metadata↔accepted-answer
   freshness; the browser leg seeds a TRANSFERRED request_item history
   and asserts .vnext-situation precedes the prompt on the real render
   path (vnext-browser: 9 checks).
5. Durable truth: checkpoint-001's single-failure-mode claim corrected
   to the two real modes; REPORT acceptance wording aligned; CI lines
   refreshed.

## VERIFY (R2 head)
- runtime suite 221 checks PASS (was 196) — includes restricted-cover
  cue proofs and the SIT copy/metadata regressions
- browser 26+9 PASS — real DOM render-order assertion included
- curriculum / coverage / differential / verify:full — see REPORT
- Boundaries held: no Policy B / generator / classifier / evaluator /
  learner-model edits.
