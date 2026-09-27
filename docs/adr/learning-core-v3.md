# ADR: Learning core v3 — evidence-driven learner model (A1-ARCH-001)

Status: proposed — 2026-09-28
Issue: #30 — Replace chunk-only progress with evidence-driven learner model

## Problem

Before this change the learner model collapsed an entire chunk into one
memory state:

```
lesson → chunk → 1 FSRS card (`lessonId:chunkId`) → Nhớ/Quên
```

`scheduler.js` keyed FSRS by `${lessonId}:${chunkId}`. `evidence.js`
recorded step-level events (`drill/read/listen/write/speak`) with no
statement about *which ability* was exercised. `progress.js::suggestNext()`
walked course order: resume → finish → next lesson. Consequence: a learner
who recognized `Where are you from?` in a quiz was scheduled identically to
one who could produce it unaided, and listening vs reading vs recall could
not diverge — which is exactly the failure the issue describes.

## Target model

```
CanDoGoal            a1.cando.<lessonId>         (adapted from lesson.canDo)
  └── SkillTarget    fixed registry (below)
        └── KnowledgeComponent   <lessonId>:<chunkId>   (today: chunks only)
              └── RetrievalTask  <component>:<taskKind>
                    └── EvidenceEvent (append-only, projected)
                          └── LearnerState (derived, rebuildable)
                                └── Planner (pure, deterministic)
```

### Task kinds (v1)

| taskKind                | skillTarget               | Review front                     |
| ----------------------- | ------------------------- | -------------------------------- |
| `form_recognition`      | `lexical.form_recognition`| EN shown → recall meaning        |
| `meaning_recall`        | `lexical.meaning_recall`  | VI cue → produce EN (typed)      |
| `listening_recognition` | `reception.listening`     | audio only → recall meaning      |
| `cued_production`       | `production.writing`      | VI + context → produce EN (typed)|

`spelling`, `pronunciation`, `interaction` task kinds are deliberately not
enrolled: dictation is not yet recorded as evidence, and Web Speech
transcript matching is not acoustic pronunciation assessment
(A1-SPEECH-001). Modeling them now would fake an interaction.

### Identity

RetrievalTask id: `${lessonId}:${chunkId}:${taskKind}` — e.g.
`a1-s1-l1:c1:meaning_recall`. It inherits the stability guarantees the
schema already enforces (`a1-s{stage}-l{order}`, `c1–c8`), survives content
edits (text changes never rename a task), and stays parseable segment-wise
for migration and legacy replay. A later grammar/discourse component type
can join the same `component:kind` scheme without a format change.

SkillTarget ids are a closed registry in `src/core/domain.js`
(`lexical.form_recognition`, `lexical.meaning_recall`, `reception.reading`,
`reception.listening`, `production.writing`, `production.speaking`,
`interaction.spoken`). There is no `pronunciation.*` target yet on purpose.

CanDoGoal ids are `a1.cando.<lessonId>` — one explicit goal per lesson,
adapted from the existing free-form `canDo` string. Finer-grained can-do
decomposition is a content task, not this one.

## Evidence honesty

`src/core/evidence-projection.js` projects durable records to evidence:

- `lessonEvents` → lesson-level evidence. Skill target comes from the step;
  `componentIds` lists the lesson's chunks because quiz results cannot be
  attributed to one chunk (a real limitation — see Known limitations).
- `reviewLog` rate entries → task-level evidence (`taskId`, grade outcome).
- `aided = true` whenever a support flag fired (`translationViewed`,
  `transcriptViewed`, `modelRevealed`) or the review card's target was
  revealed before grading. Aided evidence exists and counts as activity,
  but `LearnerState.unaidedSuccess` is computed only from unaided events.
- Multiple-choice submits never project production evidence; review
  self-grades record `response` so "graded with empty attempt" stays
  visible instead of laundered into certainty.
- Outcomes are observable facts: `failed | partial | success` for scored
  quizzes, `submitted` for production artifacts, FSRS grades 1–4 for
  review. There is no overall percentage and no mastery field anywhere.

## FSRS migration — projection, not rewrite

Two strategies were weighed:

1. **Destructive rewrite**: rewrite reviewLog/fsrs keys in place.
   Rejected — it mutates the append-only truth, diverges from remote
   copies other devices may still hold (merge is by `id`), and forces a
   guess whenever a legacy rate could plausibly belong to several skills.
2. **Projection (chosen)**: the raw log is never modified. Replay
   normalizes legacy keys; `db.fsrs` stays a rebuildable cache.

Rules:

- Legacy `chunkKey` (`lesson:chunk`, 2 segments) on a `rate` entry →
  `meaning_recall` task. Rationale: the old review card asked for
  VI→EN recall — meaning_recall is its honest nearest match. It is *not*
  cloned to other kinds.
- Legacy `enroll` entries have no `tasks` field → expand to all four kinds;
  the three without history start FSRS-new (their own schedule).
- `db.fsrs` keys are normalized on hydrate (DB v2→v3): 2-segment keys are
  renamed to `:meaning_recall`; the derived map is rebuilt from the log on
  cloud merge anyway.
- New `rate` entries write `taskKey` (3 segments). They also write
  `chunkKey` only when the task is `meaning_recall`, so a not-yet-updated
  client replays exactly its old semantics for that subset and ignores the
  rest — conservative degrade, no phantom cross-skill credit.
- New `enroll` entries record `tasks: [kinds]` (staged enrollment, below).
- Re-running hydrate/rebuild is idempotent; no learner history disappears.

### Staged enrollment

A task enters the pool when its modality has actually been exercised:

- `prepare` submit → `form_recognition`, `meaning_recall`
- `listen` submit → `listening_recognition`
- `write` submit → `cued_production`
- checkpoint (no prepare) → all four on the first submitted step

This avoids scheduling `listening_recognition` for a learner who has never
heard the chunk, and keeps the first review queue closer to its old size
(2 cards per chunk after prepare instead of 4).

## Derived learner state

`src/core/learner-state.js` derives, per task: FSRS card, attempt count,
last grade/outcome, aided-vs-unaided last result, last attempt time. The
same durable inputs (lessonEvents + reviewLog) on any device replay to the
same state — there is no hand-mutated "mastery" blob.

## Planner

`src/core/planner.js` — pure function `(db, session, lessons, now) →
action`. Priority order, all ties broken by (earliest `at`, then lexical
task id):

1. `resume` — in-flight draft with unsubmitted content (unchanged rule);
2. `review` — due retrieval tasks exist;
3. `remediate` — the most recent quiz event per (lesson, step) was partial,
   and no later event for that pair fixed it;
4. `finish` — started lesson with steps still `todo` (course order);
5. `next` — first unstarted lesson in course order;
6. `done`.

The planner never calls the tutor; AI output cannot select the next action.
Remediate picks the latest still-unresolved weak step, not the oldest —
the freshest failure is the one the learner still carries.

## Known limitations / non-goals

- Quiz evidence is lesson-level (components = the whole chunk set). Making
  it component-exact requires tagging each drill with the chunk it probes —
  follow-up for A1-CONTENT-001.
- Review grading is self-marked; a learner can grade "Nhớ" with an empty
  typed response. The `response` field keeps that observable instead of
  pretending otherwise.
- Dictation, match-pairs, word bank and pronunciation checks produce UI
  feedback but no durable evidence events yet.
- `db.fsrs` is still a cache; truth = `reviewLog` + `lessonEvents`.
- No pronunciation/prosody claim anywhere — pending A1-SPEECH-001.

## Content adapter

`adaptLesson`/`adaptCourse` in `src/core/domain.js` derive goals,
components and tasks from the current schema without rewriting the 30
lesson files. The adapter throws on malformed input (non-`a1-sX-lY` id,
non-`cN` chunk ids, duplicate ids, missing targets) instead of inventing
learning targets — a malformed lesson fails the build, not silently.
