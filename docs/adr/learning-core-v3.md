# ADR: Learning core v3 — evidence-driven learner model (A1-ARCH-001)

Status: proposed (rev 2 — post-review fixes) — 2026-09-28
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
CanDoGoal            a1.cando.<lessonId>              (adapted from lesson.canDo)
  └── SkillTarget    fixed registry (below)
        └── KnowledgeComponent   <lessonId>:<chunkId>@<rev>   (revision-aware)
              └── RetrievalTask  <component>:<taskKind>
                    └── EvidenceEvent (append-only, projected)
                          └── LearnerState (derived, rebuildable)
                                └── Planner (pure, deterministic)
```

### Task kinds (v1)

| taskKind                | skillTarget               | Review front                     | Scored against |
| ----------------------- | ------------------------- | -------------------------------- | -------------- |
| `form_recognition`      | `lexical.form_recognition`| EN shown → recall meaning        | chunk.meaning  |
| `meaning_recall`        | `lexical.meaning_recall`  | VI cue → produce EN (typed)      | chunk.target   |
| `listening_recognition` | `reception.listening`     | audio only → recall meaning      | chunk.meaning  |
| `cued_production`       | `production.writing`      | VI + context → produce EN (typed)| chunk.target   |

`listening_recognition` is a **comprehension** task: the front is audio-only
and the expected answer is the Vietnamese meaning. It is not a dictation or
transcript-matching task — the prompt, the reveal and the score all measure
the same ability (heard → understood).

`spelling`, `pronunciation`, `interaction` task kinds are deliberately not
enrolled: dictation is not yet recorded as evidence, and Web Speech
transcript matching is not acoustic pronunciation assessment
(A1-SPEECH-001). Modeling them now would fake an interaction. The
`cued_production` badge reads "Viết lại" — a typed writing task must never
imply speaking evidence.

### Identity — revision-aware (round-2 fix)

Chunk ids `c1…c8` are positional. The repo already rewrote
`a1-s1-l1:c7/c8` in place ("How are you?" / "I'm fine…" → "My name is…" /
"And you?"), so `lesson:chunk:kind` identity would transfer one phrase's
FSRS memory onto a different phrase.

The fix: a KnowledgeComponent is `lesson:chunk@rev` where `rev =
contentRev(chunk.target)` — a deterministic fingerprint (fnv1a-32 over the
normalized target text) of the retrieval artifact itself.

- **Edit preserves identity** when the target text is unchanged (same text
  → same rev → history carries over).
- **Edit invalidates identity** when the target text changes (new rev → a
  new component; the old component is `superseded` — kept in state, counted,
  never presented as if it were today's text).
- Trivial whitespace/case edits do not change the rev (normalization).

`src/content/revisions.js` is a generated, frozen ledger
(`scripts/gen-content-revisions.mjs`) mapping each `lesson:chunk` to its
historical revisions with `since` timestamps mined from git history. It is
what lets **rev-less legacy keys resolve honestly**: `revAt(lesson, chunk,
at)` returns the revision that was live at the record's own timestamp, so a
rate logged before the c7 rewrite lands on the old phrase's component,
never the new one.

`adaptCourse()` registers live components AND every ledger revision —
superseded revisions stay resolvable (`chunk: null`, `superseded: true`),
so old evidence keeps pointing at a real (retired) component instead of
dangling.

RetrievalTask id: `${lessonId}:${chunkId}@${rev}:${taskKind}`. Legacy
shapes parse too: `l:c:kind` (rev-less) and `l:c` (pre-task-era) both
normalize through `revAt` at the record's timestamp.

## Evidence honesty (round-2 fix)

`src/core/evidence-projection.js` projects durable records to evidence:

- `lessonEvents` → lesson-level evidence. `componentIds` are the real
  domain component ids (`lesson:chunk@rev`), resolved at the event's own
  `submittedAt` — pre-edit events keep pointing at the retired revision.
- `reviewLog` rate entries → task-level evidence (`taskId`, grade outcome,
  provenance fields).
- **Provenance, recorded not inferred**: `review.js` freezes the typed
  response at reveal time and writes `attempt`, `attempted`, `revealed`,
  `aided` on every new rate entry. A grade with an observable pre-reveal
  attempt is unaided retrieval (`aided: false`); grading with no recorded
  attempt after the answer was shown is self-report (`aided: true`).
  Entries too old to carry provenance project `aided: null` — unknown is
  never laundered into `false`.
- **No grade before reveal**: the click handler and the keyboard handler
  both gate on `state.current.revealed`; the grade row lives inside the
  hidden back panel *and* the flag is checked — a score produced before
  seeing the answer is uninterpretable evidence and cannot reach the log.
- **One timestamp**: the grade handler takes a single `at = Date.now()` and
  passes it to both `rateTask()` and the log entry — local FSRS mutation
  and durable replay are byte-identical.
- `aided = true` on lesson events whenever a support flag fired
  (`translationViewed`, `transcriptViewed`, `modelRevealed`).
- Multiple-choice submits never project production evidence.
- Outcomes are observable facts: `failed | partial | success` for scored
  quizzes, `submitted` for production artifacts, FSRS grades 1–4 for
  review. There is no overall percentage and no mastery field anywhere.

## FSRS migration — canonical rebuild (round-2 fix)

Two strategies were weighed:

1. **Destructive rewrite**: rewrite reviewLog/fsrs keys in place.
   Rejected — it mutates the append-only truth, diverges from remote
   copies other devices may still hold (merge is by `id`), and forces a
   guess whenever a legacy rate could plausibly belong to several skills.
2. **Projection (chosen)**: the raw log is never modified. Replay
   normalizes legacy keys; `db.fsrs` stays a rebuildable cache.

### Canonical rule

There is exactly ONE path to task state: `rebuildFsrsFromLog(reviewLog)`.
Local `hydrateDb()` runs it on the stored log; cloud hydrate runs it on the
merged log — the same durable inputs produce the same state on every
device, byte-equivalent (regression test: `tests/learner-model.test.mjs` §4).

The stored `db.fsrs` cache only fills keys the log never mentions
(pre-log/lost-log data — preserved, never discarded); on any conflict the
log wins.

Rules:

- Legacy `chunkKey` (`lesson:chunk`, 2 segments) on any entry →
  `meaning_recall` task at the entry's timestamp. Rationale: the old review
  card asked for VI→EN recall — meaning_recall is its honest nearest match.
  It is *not* cloned to other kinds. **A legacy `enroll` creates exactly
  one task card** — the earlier draft expanded it to all four, which could
  mint listening/writing cards a learner never exercised.
- Enroll entries with `tasks` (mid-era format: bare kind names) resolve
  each kind through `revAt` at the entry's timestamp.
- New `enroll` entries record `tasks: [full revision-aware task ids]` —
  replay never has to guess which phrase was enrolled.
- New `rate` entries write `taskKey` (4 segments with rev). They also write
  `chunkKey` only when the task is `meaning_recall`, so a not-yet-updated
  client replays exactly its old semantics for that subset — conservative
  degrade, no phantom cross-skill credit.
- Re-running hydrate/rebuild is idempotent; no learner history disappears.

### Staged enrollment

A task enters the pool when its modality has actually been exercised:

- `prepare` submit → `form_recognition`, `meaning_recall`
- `listen` submit → `listening_recognition`
- `write` submit → `cued_production`
- checkpoint (no prepare) → all four on the first submitted step

This avoids scheduling `listening_recognition` for a learner who has never
heard the chunk.

## Bounded review queue (round-2 fix)

Card identity stays independent per ability, but the *queue* distinguishes
two classes:

- **Scheduled-due work** (`dueTasks`) — cards already exercised at least
  once (Learning/Review/Relearning) whose `due ≤ now`. These outrank new
  curriculum in the planner: spaced memory is a real obligation.
- **New-task introductions** (`reviewQueue().fresh`) — `State.New` cards
  that have never been rated. They are not overdue work: a submitted
  `prepare` must not trap the learner in a 16-card review wall before the
  lesson can continue.

`reviewQueue()` bounds introductions two ways:

- `NEW_TASK_BUDGET = 8` — max new cards per session.
- **Sibling bury** — at most one new task per component per session;
  introductions serve the easiest ability first (recognition → listening →
  recall → production, `TASK_INTRO_ORDER`), so "can you read it" is always
  asked before "can you write it".

`freshPending` reports the full backlog size so the UI can say "16 new
cards waiting" without pretending they are due. The planner's tail fallback
(step 6) introduces pending new tasks only when the curriculum is
exhausted — new cards ride the queue opportunistically, never gate it.

## Derived learner state

`src/core/learner-state.js` derives, per task: FSRS card, attempt count,
last grade/outcome, `lastAided` (`true | false | null` — null when the
durable record cannot say), last attempt time, `superseded`, `isNew`,
`isDue`. The same durable inputs on any device replay to the same state —
there is no hand-mutated "mastery" blob.

## Planner

`src/core/planner.js` — pure function `(db, session, lessons, now) →
action`. Priority order, all ties broken by (earliest `at`, then lexical
task id):

1. `resume` — in-flight draft with unsubmitted content (unchanged rule);
2. `review` — *scheduled* retrieval tasks due (New-state cards excluded);
3. `remediate` — the most recent quiz event per (lesson, step) was partial,
   and no later event for that pair fixed it;
4. `finish` — started lesson with steps still `todo` (course order);
5. `next` — first unstarted lesson in course order;
6. `review` — curriculum exhausted but new tasks await introduction;
7. `done`.

The planner never calls the tutor; AI output cannot select the next action.
Remediate picks the latest still-unresolved weak step, not the oldest —
the freshest failure is the one the learner still carries.

## Known limitations / non-goals

- Quiz evidence is lesson-level (components = the whole chunk set, resolved
  at event time). Making it component-exact requires tagging each drill
  with the chunk it probes — follow-up for A1-CONTENT-001.
- Review grading is still self-marked at the scoring level — but
  provenance is now recorded (frozen attempt, reveal flag, aided flag), so
  a "Nhớ" with an empty typed response is observable self-report, not
  silent certainty.
- Dictation, match-pairs, word bank and pronunciation checks produce UI
  feedback but no durable evidence events yet.
- `db.fsrs` is still a cache; truth = `reviewLog` + `lessonEvents`.
- No pronunciation/prosody claim anywhere — pending A1-SPEECH-001.
- `NEW_TASK_BUDGET = 8` is a policy choice sized to roughly one lesson's
  worth of single-ability introductions — tuned by use, not theory.

## Content adapter

`adaptLesson`/`adaptCourse` in `src/core/domain.js` derive goals,
components and tasks from the current schema without rewriting the 30
lesson files. The adapter throws on malformed input (non-`a1-sX-lY` id,
non-`cN` chunk ids, duplicate ids, missing targets) instead of inventing
learning targets — a malformed lesson fails the build, not silently.
`enrollTasks` likewise throws on a target-less chunk rather than minting a
phantom-revision card.
