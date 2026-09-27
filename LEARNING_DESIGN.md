# FlashDay Learning Design

## Status and product promise

**Status: research-backed product direction, not a claim that FlashDay already
delivers language proficiency.**

### Implementation checkpoint — 2026-09-27

The meeting-change cluster remains a practice pilot, not a proficiency assessment.
The final-time gate checks the scenario time and explicit time mentions; overall
sentence quality and spoken attempts remain self-check evidence. Quiz feedback
survives progress updates, and attempts are retained separately from best scores.

Unit identity now includes the learner-selected meaning. Equal spellings with
multiple meanings are not automatically assigned a sense. Source links, cards,
encounters and FSRS histories follow the selected Unit ID; existing IDs stay intact.

`npm run verify:full` runs syntax/Node checks, production build, browser regression
at 390px and 1280px, and Firestore emulator tests. Browser cases use fresh local
preview data, including a synthetic two-meaning source. Emulator cases cover
concurrent observation writes, owner isolation, idempotency and cursor pagination.
These are engineering checks, not real-learner outcome evidence or production
OAuth acceptance. CI runs the same gate with Java 21 and Chromium.

Cloud observations merge inside a Firestore transaction. Scheduler payloads are
rebuildable caches, not durable evidence. The existing singleton has a conservative
750 KiB JSON guard: exceeding it rejects cloud sync explicitly and preserves local
data. Splitting long histories into individual documents remains future capacity
work. Existing owner update/delete policy for review events is unchanged; the app's
append-only convention is not a server-enforced immutable ledger.

### Audit follow-up — session isolation and delayed transfer

Two reproduced failures were corrected after the checkpoint above:

- Cloud listeners previously attached after hydration, leaving a window for an
  old account response to affect the next account. Listeners now attach before
  awaiting hydration; queued work pins its account, client and namespace, and
  stale results are discarded. The Firebase adapter also rejects owner changes.
  A browser regression delays both database/profile responses, switches accounts,
  and verifies no stale upload or overwrite. Its transport is synthetic; actual
  production OAuth switching remains unverified.
- Delayed Unit transfer accepted missing review grades and caller-supplied source
  IDs, and hid the task after an attempt that had not been self-reviewed. It now
  requires a valid earliest unaided Write review, an elapsed 24-hour delay and the
  actual source event. Submission time comes from the application clock. Saved
  unreviewed responses remain resumable; reviewed retries preserve both records.
  This is client-side practice evidence, not tamper-proof or proficiency evidence.

Regression coverage includes invalid grades/timestamps, forged source IDs,
chronologically unordered reviews, duplicate attempts, resume/review behavior,
and exclusion of unrelated personal-unit attempts from guided-lesson evidence.
The browser suite checks the resumed flow at 390px as well as account isolation.

FlashDay helps Vietnamese-speaking learners retain and retrieve English that
they can use. Its purpose is not to make a learner finish a card queue; it is
to help them understand, say, read and write useful English in ordinary
situations, then carry those skills into a real exchange with another person.

Flashcards are the **memory and retrieval layer** of that journey. They are
valuable, but they are not a complete conversation partner, listening course,
or writing course. A learner cannot prove conversational ability merely by
recognising a translation or giving themself a green rating.

The target must be written as an observable _can-do_ for a chosen level and
situation, for example:

> In an everyday conversation, understand a simple plan, ask for clarification
> when needed, state availability, and agree on a time and place.

This follows the CEFR's action-oriented view of a learner as a social agent.
Its descriptors distinguish reception, production, interaction and mediation;
they include oral, written and online interaction rather than treating
vocabulary recognition as communication. [Council of Europe, CEFR Companion
Volume (2020)](https://book.coe.int/en/attachment?id_attachment=2186)

Communicate normally is not a measurable binary state. FlashDay should let a
learner choose a level and a set of everyday situations, then prove progress
on those can-dos through delayed and transfer tasks. It must not award a
fluency or mastery badge from card activity.

## What the research permits us to claim

Spaced practice is a sound foundation for FlashDay: a meta-analysis of 48 L2
experiments with 3,411 participants found a medium-to-large advantage for
spacing and better delayed performance with longer than shorter gaps; equal
and expanding schedules were statistically equivalent. That supports preserving
the frozen Bespoke scheduler rather than inventing another one.
[Kim & Webb (2022)](https://onlinelibrary.wiley.com/doi/10.1111/lang.12479)

But word-focused practice is not guaranteed learning. A meta-analysis of
flashcards, word lists, writing and fill-in-the-blank activities found sizable
variation and substantially lower delayed than immediate gains. FlashDay must
therefore test later retrieval and not count a first successful review as
learning. [Webb, Yanagisawa & Uchihara (2020)](https://onlinelibrary.wiley.com/doi/10.1111/modl.12671)

Meaning-focused reading and listening matter alongside intentional flashcard
study, but they are not a shortcut either: a meta-analysis found highly variable
incidental vocabulary gains across reading, listening, reading-while-listening
and viewing. [Webb, Uchihara & Yanagisawa (2023)](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0261444822000507)

```text
real communicative goal
  -> useful context and input
  -> deliberate retrieval with a flashcard
  -> spaced return on another day
  -> transfer into an unfamiliar message or exchange
```

The evidence above is drawn from peer-reviewed meta-analyses and the Council
of Europe framework, not vendor claims or generic study advice. It supports
memory practice and outcome design; it does **not** prove a particular session
length, new-card quota, audio provider, or automatic speaking score.

### Cross-source conclusion

The wider research base does not support turning FlashDay into either a
translation-card-only app or an AI conversation app. The defensible middle
position is a **communicative retrieval system**: structured memory practice,
immediate usable feedback, and repeated small tasks that require the learner to
produce language for a purpose.

| Convergence across sources                                                                                                                                                                                                           | FlashDay decision                                                                                                                   | Important limit                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vocabulary apps disproportionately teach receptive breadth; productive retrieval and social/affective strategies are less common.                                                                                                    | Keep separate listen, speak, read and write attempts and add short interaction missions.                                            | A review of technology-assisted tools finds heterogeneous methods and warns against generalising effect claims. [Zhou et al. (2024)](https://doi.org/10.1007/s10639-023-12423-y); [Simonnet, Loiseau & Lavoué (2025)](https://onlinelibrary.wiley.com/doi/10.1111/jcal.13096)                                                       |
| Oral corrective feedback has significant, durable effects in classroom studies; prompts that make learners construct or repair an answer outperformed recasts.                                                                       | After an answer, give a concise model and one repair/retry opportunity; do not only reveal the back of a card.                      | This supports feedback on a target feature, not an automatic pronunciation or fluency verdict. [Lyster & Saito (2010)](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/oral-feedback-in-classroom-sla/4999EE1C8379B2BF026B148EAF373CA1)                                                      |
| Repeating a meaningful oral task can improve oral performance, but accuracy and complexity vary by task and learner.                                                                                                                 | Repeat a short situation with one changed detail, then record transfer separately from same-task success.                           | A repeated task is practice evidence, not proof of general conversation ability. [Abdi Tabari, Zhuang & Farahanynia (2025)](https://doi.org/10.1016/j.system.2025.103868)                                                                                                                                                           |
| Learning direction interacts with proficiency in a small EFL study: lower-proficiency learners benefited more from English-to-meaning retrieval, while higher-proficiency learners benefited more from meaning-to-English retrieval. | Make cue direction configurable by level and test it in the Vietnamese pilot; do not use one permanent card direction for everyone. | This is a small Japanese EFL study, so it is a product hypothesis, not a universal rule. [Terai, Yamashita & Pasich (2021)](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/effects-of-learning-direction-in-retrieval-practice-on-efl-vocabulary-learning/159EE50F4B8835207764FB1B11077F29) |
| Audio, captions and audiovisual context can help, but outcomes depend on learner, caption type, frequency and task; the review reports mixed comparisons.                                                                            | Treat verified audio/text context as an optional quality upgrade for a Unit, never as a prerequisite for all cards.                 | Media alone does not replace retrieval or interaction practice. [Wei & Fan (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9136233/)                                                                                                                                                                                               |

This conclusion changes the product in one practical way: a FlashDay review
must ask the learner to **do** something appropriate to the mode, receive clear
feedback, and later use it in a changed situation. Otherwise it remains a
memory drill, not English communication practice.

## The learning object: a Communicative Unit

A FlashDay Unit is not a loose word translation. It is a small piece of English
that lets a learner do something in a situation: a word in a useful collocation,
a chunk, a request, a repair phrase, or a sentence pattern.

Every reviewed Unit needs:

| Field                            | Why it exists                                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target and true forms            | The specific English form to retrieve. A form is an actual surface-form variant, not a different expression with a similar meaning.                                               |
| Meaning and communicative intent | Vietnamese support for early learning plus an explicit intent such as _ask someone to repeat_ or _say that you are late_.                                                         |
| A believable context             | Prevents a learner from memorising a translation without knowing when the phrase fits.                                                                                            |
| Example exchange or sentence     | Shows the Unit with neighbouring language, register and response expectation.                                                                                                     |
| Skill assets                     | Verified audio for listening/speaking cards; readable text for reading/writing cards. A missing asset disables that skill card rather than silently substituting a product claim. |
| Origin and review state          | Curated, learner-created or permitted-source origin; separate history for listen, speak, read and write.                                                                          |

Accepted answers remain a response/validation aid, never a shortcut for Unit
identity. For an open production prompt, a learner may produce several natural
answers; the product must not label a valid alternative wrong just because it
is not the target. It can check an exact constrained exercise, show a model
answer, or ask the learner/teacher to judge an alternative honestly. It cannot
pretend that string matching evaluates communication.

## A four-skill flashcard loop

The existing Bespoke modes (listen, speak, read, write) are the right minimum
state boundary. They schedule **separate attempts**, because recognising a
sentence does not establish that a learner can say or write it.

| Mode   | Front: what the learner gets                      | Required response                                              | Back / feedback                                                  | Count as evidence only when                                                                                                                           |
| ------ | ------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listen | A verified English audio clip, without text first | Choose or state the intended meaning; replay after committing  | Transcript, meaning, context, audio replay                       | There was real audio and an observable answer. Browser TTS is practice fallback, not original-listening evidence.                                     |
| Speak  | Vietnamese intention, image or situation          | Say the target aloud before revealing                          | Model audio, target, context and optional learner recording      | The learner records or explicitly self-rates a spoken attempt. Recording is evidence of an attempt, not an automatic pronunciation/proficiency score. |
| Read   | English message/sentence                          | Identify the intent, missing information or best next response | Meaning, context, explanation of the relevant chunk              | The learner answers before reveal. Mere reading is exposure, not recall.                                                                              |
| Write  | Situation or Vietnamese intent                    | Type a short target response before revealing                  | Model answer, highlighted target, permitted variants where known | The response is preserved and checked at the appropriate level: exact for constrained form practice, otherwise transparent self/teacher review.       |

One Unit should have the smallest set of cards needed to cover its desired
can-do, not four cosmetic copies. A learner who needs to understand and answer
Could you say that again? needs listening discrimination plus spoken retrieval;
an email/DM phrase needs reading and typed production. Content authors specify
which modes matter for the Unit.

### The missing fifth activity: interaction transfer

Interaction is not another card face to fake with a multiple-choice button. It
is a short mission that reuses several reviewed Units in a new context:

```text
Scenario: a friend changes the meeting plan.
Learner: listen/read the new plan -> ask for clarification -> state availability
         -> agree on a revised time.
```

FlashDay can present this as a one-turn recorded reply, a typed reply, a paired
practice prompt, or a real-world task such as sending a message. A result can
be saved as _attempted_, _self-reviewed_ or _reviewed by a person_; it must not
be auto-labelled can communicate until the evidence method supports that
claim. This is how cards feed communication rather than replace it.

## Organise content around life situations, not word lists

Decks should begin with a chosen learner use case and its CEFR-aligned can-dos,
then derive the few Units necessary to accomplish it. Initial useful domains
are everyday social contact, plans and time, getting goods/services, asking for
and giving information, work/study coordination, and communication repair.

For each domain, build a small **situation cluster**:

```text
Can-do: arrange a simple meeting
  -> understand time/place language
  -> propose a time
  -> say you are late / on the way
  -> ask for repetition or clarification
  -> confirm the final plan
  -> perform one changed-detail transfer task later
```

This deliberately favours chunks, collocations, response pairs and sentence
patterns over decontextualised lists. Single words remain useful when they are
needed to complete the situation, but they are not the deck's organising goal.

## Learning progression for one situation cluster

1. **Encounter.** Show a short dialogue, message or audio in a believable
   situation. Clarify meaning, intent and the target Unit with low cognitive
   load.
2. **Guided retrieval.** Use one constrained listen/read/speak/write prompt so
   the learner retrieves rather than only re-reads. Give the model answer and
   concise context feedback.
3. **Scheduled mixed review.** Bespoke schedules the relevant skill state on a
   later date. Review mixes Units from older clusters so a learner must choose
   the right expression, not repeat the last screen.
4. **Cold transfer.** Change a relevant detail: different time, person, place
   or communication channel. The learner must produce a response without the
   original sentence as a cue.
5. **Real or paired use.** When the learner has enough Units for a small
   exchange, prompt a recorded or live interaction. A later card can bring back
   the error/correction only with the learner's permission and clear provenance.

The order is outcome -> minimal example -> guided practice -> independent
transfer. It keeps cognitive load manageable and makes the assessment resemble
the intended use, rather than rewarding isolated recognition.

## Evidence model: distinguish activity from learning

FlashDay needs four separate records. None can stand in for the next one.

| Record                             | What it supports                                     | What it does **not** support                       |
| ---------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Review event                       | Learner saw/revealed/rated a card at a time          | Retention, pronunciation, or communication ability |
| Delayed mode check                 | Later recall for one Unit in listen/speak/read/write | Use in a new situation or conversation             |
| Transfer mission                   | Reuse of several Units after a changed prompt        | Broad fluency or ability with a person             |
| Human/partner-reviewed interaction | Evidence from a sampled real exchange                | A permanent global proficiency label               |

Pilot evaluation should compare a learner's baseline and later performance on
predefined can-dos, use delayed checks rather than only same-session scores,
and retain failure reasons: missing vocabulary, comprehension, form,
pronunciation intelligibility, turn-taking, or confidence. That diagnosis tells
us what to improve; a streak does not.

## Implemented A1 pilot: meeting plans that change

The first product slice now implements one A1 situation cluster, **Hẹn gặp và
đổi kế hoạch**. It has one observable outcome: a learner can understand a
simple plan, propose a time, report a change, and reconfirm it. The cluster
contains five short learning steps and 20 curated Units:

```text
ask for clarification
  -> state a simple plan
  -> propose a time
  -> reschedule when something changes
  -> confirm the revised plan
```

Three Units already in the starter set are reused; installing the cluster adds
the remaining 17 Units. The worked dialogue and its five steps stay collapsed
until the learner asks for them, so they support understanding without turning
the learning screen into a word-list dashboard.

After all 20 Units are available, FlashDay unlocks one changed-detail transfer
mission: Alex moves a 6pm café meeting to 7pm. The learner must either type an
English reply or explicitly confirm that they spoke one before a model reply is
shown. They can then self-review and save the attempt. That attempt is stored
separately from card reviews and never changes FSRS/Bespoke scheduling.

This is an integrity baseline, not a proficiency assessment. The current
mission does **not** yet require a delayed date, validate pronunciation,
evaluate open-ended English automatically, or replace a human/partner-reviewed
exchange. This first pilot also has text and browser-TTS practice only; it does
not claim verified source audio or listening evidence.

## Product decisions this design makes now

- **Do next:** run the implemented A1 cluster with learners, record the
  obstacle behind each failed can-do, and add a delayed changed-detail check
  only after the pilot establishes that it is useful and understandable.
- **Treat media as optional quality infrastructure:** imported/source audio can
  create stronger listening cards, but learner-created and curated text cards
  remain first-class. Raw-media transcription is not the next prerequisite.
- **Do not do yet:** claim automatic pronunciation grading, add an AI tutor,
  optimise a new scheduler, mass-generate unreviewed cards, or turn completion
  into a fluency score.

The first implementation milestone is complete only when a small group can use
one curated situation cluster, return later, and produce a changed-detail
spoken or written response with an honestly recorded result. Only then should
FlashDay decide whether its largest observed bottleneck is content quality,
audio, voice feedback, interaction practice, or something else.
