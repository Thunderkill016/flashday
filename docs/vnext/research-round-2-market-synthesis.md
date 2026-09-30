# FlashDay vNext — Research Round 2
## Cross-system synthesis for Vietnamese English learners

Status: **research synthesis / design input**
Parent epic: #39
Learning doctrine: #41
Research issue: #44

> Scope note: this review covers the major current product archetypes and representative systems, not literally every English-learning product in existence. The aim is mechanism coverage, not brand completeness.

---

## 1. Research rule

Popularity proves adoption and habit formation. It does **not** prove communicative proficiency.

Evidence hierarchy used here:

1. systematic reviews / meta-analyses;
2. independent controlled or quasi-experimental studies;
3. transparent efficacy studies run with external assessments;
4. official product documentation;
5. marketing or anecdotal claims, clearly treated as product claims.

The system must preserve:

```
ACTIVITY != LEARNING
LEARNING != RETENTION
RETENTION != TRANSFER
TRANSFER != PROFICIENCY
```

---

# 2. Market map

## A. Structured curriculum systems

### Duolingo

**Current design pattern**
- CEFR-aligned human-authored curriculum.
- Linear/path-style progression.
- Small lessons, repeated practice, personalized difficulty.
- Richer contextual layers now include Stories, listening content, Adventures, and Video Call.
- Independent efficacy framework distinguishes engagement, learning, transfer, and proficiency.

**Strongest lesson for FlashDay**
- curriculum constrains personalization;
- review belongs inside forward progress;
- engagement system must be separated from learning evidence;
- AI conversation needs level/purpose constraints, not free-chat only.

**Main risk**
- streak/XP/path completion can become psychologically equivalent to learning.
- course progress/Score is not the same thing as independently assessed proficiency.

Sources:
- https://blog.duolingo.com/duolingo-efficacy-research-framework/
- https://blog.duolingo.com/ai-and-video-call/
- https://blog.duolingo.com/video-call-research-report/
- https://blog.duolingo.com/duolingo-score/

### Busuu

**Current design pattern**
- expert-authored CEFR-aligned course.
- placement test, vocabulary/grammar review, checkpoint quizzes.
- gradual introduction of words/phrases followed by speaking/writing production.
- community corrections create real human feedback.
- personalized Study Plan organizes time/goals.

**Strongest lesson**
- explicit CEFR/curriculum discipline;
- controlled practice followed by freer output;
- human/community corrections are a useful bridge beyond deterministic exercises.

**Main risk**
- product still exposes course-level/progress metrics that can be mistaken for ability.
- community feedback quality is variable by contributor.

Sources:
- https://help.busuu.com/hc/en-us/articles/15936615354641-What-is-Busuu
- https://www.busuu.com/en/how-to/corrections
- https://www.busuu.com/en/english/personalized-study-plan-busuu-premium

### Babbel

**Current design pattern**
- expert-written lessons built around real-life dialogues.
- large structured course library.
- adaptive behavior-driven experience.
- speaking exercises use speech recognition.
- evidence program includes WebCAPE and oral-proficiency studies.

**Strongest lesson**
- conversational goals and authored dialogue can coexist with explicit grammar/vocabulary.
- structured course can still produce measurable speaking gains.

**Evidence note**
Babbel published independent/academic studies with CUNY/USC, Michigan State and Yale collaborators. These studies support measurable gains, but often in Spanish-learning cohorts and should not be treated as direct evidence for Vietnamese English learners.

Sources:
- https://www.babbel.com/press/en-us/downloads/studies_research
- https://www.babbel.com/press/en-us/releases/2019-01-10-Babbel-SPA-2018-Study.html
- https://www.babbel.com/press/en-us/releases/2019-07-25-How-learning-with-babbel-develops-conversational-skills-in-a-new-language.html
- https://support.babbel.com/hc/en-us/articles/19211305815570-Speech-recognition

### EF English Live

**Current design pattern**
- English-only specialization.
- placement into 16 levels aligned to CEFR A1-C2.
- structured units/lessons + teacher-led individual/group classes.
- AI/personalized study plans plus human teachers.
- explicit speaking-from-start philosophy.

**Strongest lesson**
- self-study + live interaction is stronger architecture than pretending one mode can do everything.
- humans are most valuable for open interaction, nuanced feedback, and accountability.

**Main risk**
- course certificates / end-of-level completion are not automatically independent external proficiency certification.

Sources:
- https://englishlive.ef.com/en/
- https://englishlive.ef.com/en/teachers/
- https://myenglishlive.ef.com/help-me-article?ArticleID=4&CategoryID=11

### ABA English

**Current design pattern**
- CEFR A1-C1.
- unit starts from a short live-action film/dialogue.
- listen/imitate, write, dub/interpret, grammar and exercises.
- teacher guidance and conversation classes.

**Strongest lesson**
- begin with contextualized story/dialogue rather than isolated form.
- use the same situation across listening, speaking and writing from different angles.

**Main risk**
- fixed multi-skill unit templates can become mechanically repetitive.

Sources:
- https://www.abaenglish.com/en/
- https://www.abaenglish.com/en/online-english-course/sections/

### Rosetta Stone

**Current design pattern**
- Dynamic Immersion: target-language words/images/audio, little or no translation.
- structured units/lessons/skill activities.
- inductive grammar/context learning.

**Strongest lesson**
- meaning can be grounded directly in context rather than translated word-for-word.
- visual contextual inference is useful.

**Main risk**
- banning L1 support by ideology can create unnecessary ambiguity for true beginners.

Sources:
- https://support.rosettastone.com/What-is-Dynamic-Immersion/
- https://support.rosettastone.com/sapphire-learning-path/

---

## B. Speaking-first AI systems

### Speak

**Core loop**
```
LEARN
→ PRACTICE
→ APPLY
```

- expert-authored curriculum;
- useful phrases/patterns;
- repeated spoken production;
- then freer AI conversation;
- pronunciation/phrasing feedback.

**Strongest lesson**
- oral production should appear early;
- open conversation is safer after structured preparation;
- phrase/pattern automation is a distinct stage before free interaction.

**Main risk**
- speaking-heavy design can underweight reading, writing, and broad input if used as the whole system.

Source:
- https://www.speak.com/

### Praktika

**Current pattern**
- AI avatar tutor.
- native-language beginner support.
- personalized study plan.
- real-time grammar/pronunciation/vocabulary feedback.
- free conversation.
- claims use of retrieval practice, comprehensible input, output and interaction.

**Strongest lesson**
- L1 scaffolding and low-pressure AI rehearsal can reduce beginner friction.
- corrections can be embedded gently rather than stopping every turn.

**Main risk**
- current efficacy evidence is much thinner than product-feature documentation.
- an adaptive AI tutor must not become the authority on proficiency.

Sources:
- https://praktika.ai/
- https://intercom.help/praktika-ai/en/articles/10707916-learning-process
- https://intercom.help/praktika-ai/en/articles/11684894-feedback-features

### Loora

**Current pattern**
- English-specific conversational AI.
- first conversation estimates starting level.
- real-world scenarios.
- real-time pronunciation/grammar corrections.
- deliberately limits spoken correction to roughly 2–3 per session while keeping other feedback visual.

**Strongest lesson**
- preserve conversation flow;
- choose a small number of high-value spoken corrections;
- give full review afterward.

**Main risk**
- conversation practice alone does not guarantee systematic curriculum coverage.

Sources:
- https://www.loora.com/support/getting-started/what-is-loora
- https://www.loora.com/support/features/feedback-and-corrections

---

## C. Pronunciation-specialist systems

### ELSA Speak

**Current pattern**
- speech recognition designed for non-native English.
- sound/syllable, stress, intonation, fluency feedback.
- scripted and spontaneous speech.
- personalized lesson plans and role-play.

**Strongest lesson**
- pronunciation deserves a specialized diagnostic/remediation subsystem;
- segmental and suprasegmental feedback should be separated.

**Research context**
ASR pronunciation meta-analysis found a medium overall positive effect (Hedges g around 0.69), with stronger effects for explicit corrective feedback and segmental work than suprasegmentals.

**Main risk**
- speech-recognition score is not equivalent to communicative intelligibility.
- pronunciation specialization is not a complete English-learning system.

Sources:
- https://elsaspeak.com/en/faqs/how-does-elsas-pronunciation-feedback-work
- https://elsaspeak.com/en/new-homepage/
- https://www.cambridge.org/core/journals/recall/article/effectiveness-of-automatic-speech-recognition-in-eslefl-pronunciation-a-metaanalysis/A915444CF252B61D14961D2FE733822D

### BoldVoice

**Current pattern**
- adult/professional accent-pronunciation focus.
- onboarding captures native-language background + speech assessment.
- personalized sound targets.
- AI feedback + short expert-coach videos.

**Strongest lesson**
- L1 background is useful as a *diagnostic prior* combined with actual speech assessment.

**Main risk**
- accent reduction can drift away from the more useful goal: intelligible, effective communication.

Sources:
- https://boldvoice.com/frequently-asked-questions
- https://start.boldvoice.com/

---

## D. Oral retrieval system

### Pimsleur

**Core mechanics**
- Graduated Interval Recall.
- Principle of Anticipation: learner must produce before hearing the model.
- high-frequency/core vocabulary.
- mostly oral/audio progression.

**Strongest lesson**
- anticipation is essentially oral retrieval-before-reveal;
- spoken recall should be scheduled, not just repeated immediately.

**Main risk**
- audio-centric system is incomplete for modern reading/writing/media needs.

Source:
- https://www.pimsleur.com/the-pimsleur-method/

---

## E. Input / immersion systems

### LingQ

**Current pattern**
- immersion from day 1.
- read/listen to chosen content.
- click unknown words, track known/learning vocabulary.
- repeat audio, import YouTube/web/books.
- optional SRS, writing corrections, tutors.

**Strongest lesson**
- eventually the learner needs vastly more input than authored lessons can provide.
- vocabulary should be encountered repeatedly in meaningful contexts.
- user-interest content improves volume and persistence.

**Main risk**
- weak fixed progression for true beginners;
- “read/listen a lot” alone does not ensure productive or interaction competence.

Sources:
- https://www.lingq.com/how-to-use-lingq/
- https://www.lingq.com/en/

### Migaku

**Current pattern**
- beginner foundation course first.
- then native-content consumption.
- tracks known/learning words and estimates content comprehension.
- one-click sentence cards from Netflix/YouTube/web.
- SRS is tightly connected to content.

**Strongest lesson**
- foundation → comprehensible media transition is a better bridge than either “course forever” or “native content immediately.”
- content difficulty can be estimated from learner-known language.

**Main risk**
- flashcard/sentence-mining workflows can become the goal rather than comprehension and communication.

Sources:
- https://migaku.com/faq/getting-started
- https://migaku.com/faq/features
- https://migaku.com/

### Refold

**Current pattern**
- phases: foundations → comprehension → listening → speaking → accuracy → fluency.
- priming + interactive immersion + freeflow immersion.
- heavily input-driven, output is delayed until stronger comprehension.

**Strongest lesson**
- different learning phases have different dominant activities;
- accuracy and fluency are not the same phase;
- extensive compelling input is a long-term necessity.

**Main risk for FlashDay's target**
- delaying output too aggressively is a poor fit for Vietnamese learners whose immediate goal is practical communication.

Sources:
- https://refold.la/roadmap/
- https://refold.la/roadmap/phase-0/0c-immerse-in-the-language

### FluentU

**Current pattern**
- authentic YouTube/Netflix-style video.
- curated beginner content.
- interactive subtitles and word explanations.
- contextual quizzes, SRS, AI tutor.

**Strongest lesson**
- authentic audiovisual content can become interactive comprehensible input.

**Main risk**
- subtitles/lookup can create passive comprehension illusion unless paired with retrieval/output.

Source:
- https://www.fluentu.com/

### VOA Learning English

**Current pattern**
- teacher-designed beginner English course.
- long structured sequence (Level 1 = 52 weeks).
- story/video plus speaking, vocabulary, writing, worksheets and assessments.

**Strongest lesson**
- a serious beginner program needs far more exposure/practice volume than a handful of short app lessons.

Source:
- https://learningenglish.voanews.com/p/5644.html

---

## F. Human/community systems

### HelloTalk / Tandem

**Current pattern**
- real native/peer language partners.
- text, voice, calls, corrections, translation.
- HelloTalk also has voice rooms, live streams, tutors.

**Strongest lesson**
- real interaction creates genuine negotiation of meaning and cultural variability.
- peer corrections and multiple accents are valuable after a basic foundation.

**Main risk**
- partner quality, safety, reliability and pedagogical sequencing are uncontrolled.
- not suitable as the core curriculum.

Sources:
- https://www.hellotalk.com/en/features
- https://tandem.net/

### Cambly

**Current pattern**
- live tutors/native speakers.
- speaking/listening-oriented courses.
- pronunciation, discussion, image-description and unscripted conversation.
- lesson recordings/transcripts/automated feedback depending plan.

**Strongest lesson**
- human interaction is the strongest reality check after structured practice.

**Main risk**
- expensive and inconsistent unless curriculum/evidence contracts constrain what is being practiced.

Source:
- https://www.cambly.com/english

### Preply

**Current pattern**
- tutor marketplace.
- personalized lessons.
- AI-generated lesson insights from transcript: vocabulary, grammar, speaking and tailored exercises.

**Strongest lesson**
- conversation transcripts can feed learner-specific error models and subsequent practice.

**Main risk**
- AI analysis of a transcript remains a secondary signal, not automatic proficiency evidence.

Sources:
- https://help.preply.com/en/articles/10385861-lesson-insights
- https://preply.com/en/blog/part-ii-how-preply-uses-ai-to-give-you-personalized-lesson-insights/

---

## G. Memory and phrase exposure

### Memrise

**Current pattern**
- native-speaker video examples.
- spaced repetition.
- work/travel-specific vocabulary.
- AI conversation added on top.

**Strongest lesson**
- repeated exposure to many real voices/accents is useful;
- memory review should be connected to contextual phrases.

**Main risk**
- phrase memory is not transfer.

Source:
- https://www.memrise.com/about

### Anki / FSRS ecosystem

**Strongest lesson**
- scheduling is a specialized memory problem;
- optimize when an exact retrieval task should return.

**Main risk**
- card retention is not language capability.

FlashDay decision:
FSRS remains a subsystem, never the curriculum or proficiency model.

---

# 3. What learning science supports

## Task-based learning

A major TBLT meta-analysis reported a strong positive overall effect, while a later technical re-analysis argued the true effect is more modest but still positive (around g=.61 in the re-analysis). Therefore tasks are a useful organizing principle, not a magic exclusive method.

Sources:
- https://journals.sagepub.com/doi/10.1177/1362168817744389
- https://journals.sagepub.com/doi/abs/10.1177/13621688221131127

## Four Strands

Nation's 2026 restatement argues for a roughly even course-level balance of:
- meaning-focused input;
- meaning-focused output;
- language-focused learning;
- fluency development.

Important: balance is over the course/program, not mechanically inside every short mission.

Source:
- https://www.tesolunion.org/archives-info/409

## Spacing

Kim & Webb's L2 meta-analysis synthesized 48 experiments (N=3,411) and supports spaced over massed practice. Spacing is justified as a memory mechanism, not proficiency proof.

Source:
- https://onlinelibrary.wiley.com/doi/10.1111/lang.12479

## Corrective feedback

Li's meta-analysis of 33 primary studies found a medium overall positive effect maintained over time.

Source:
- https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9922.2010.00561.x

## Extensive reading / input

A 2025 meta-analysis found positive small-to-medium effects across reading comprehension, vocabulary, fluency/decoding, motivation, writing, oral proficiency and general proficiency.

Source:
- https://link.springer.com/article/10.1007/s10648-025-10068-6

## Repeated communicative tasks

A 2025 meta-analysis found task repetition improves L2 oral performance, with stronger gains in syntactic complexity/accuracy and smaller but positive fluency gains.

Source:
- https://www.sciencedirect.com/science/article/pii/S0346251X25002787

## ASR pronunciation training

Meta-analysis: medium overall positive effect (g=.69), stronger with explicit corrective feedback; segmental effects are larger than suprasegmental effects.

Source:
- https://www.cambridge.org/core/journals/recall/article/effectiveness-of-automatic-speech-recognition-in-eslefl-pronunciation-a-metaanalysis/A915444CF252B61D14961D2FE733822D

---

# 4. Vietnamese learner evidence

These findings are **population tendencies**, not automatic diagnoses.

## Pronunciation / listening

Evidence in Vietnamese EFL populations supports diagnostic attention to:
- consonant-cluster simplification/deletion;
- question intonation and transfer from Vietnamese tonal/prosodic patterns;
- pronunciation feedback technologies as useful but limited.

Sources:
- https://ctujs.ctu.edu.vn/index.php/ctujs/article/view/448
- https://link.springer.com/article/10.1186/s40862-018-0044-4

## Grammar / form

Vietnamese learner studies repeatedly identify problems such as:
- tense;
- prepositions;
- articles;
- plural/verb inflection;
- subject-verb agreement;
- copula / 3SG-s;
- question inversion / Wh-position.

Sources:
- https://vjol.info.vn/tnu/en/article/view/104134/
- https://journals.lib.unb.ca/index.php/CJAL/article/view/31466
- https://vjol.info.vn/tckhdhBacLieu/vi/article/view/116957/

## Anxiety

Vietnamese university studies report meaningful language anxiety, with speaking/listening/writing affected and fear of negative evaluation repeatedly appearing.

Sources:
- https://doi.org/10.17507/tpls.1504.23
- https://doi.org/10.46223/HCMCOUJS.soci.en.16.6.4317.2026

Design implication:
- private rehearsal;
- thinking time;
- progressive support removal;
- selective high-value correction;
- no public ranking of speaking quality.

---

# 5. Cross-system conclusions

No current product should be copied as a complete system.

The strongest mechanisms converge into this architecture:

```
CAPABILITY / REAL-LIFE GOAL
        ↓
BASELINE / DIAGNOSTIC
        ↓
COMPREHENSIBLE ENCOUNTER
        ↓
NOTICE SMALL TARGET
        ↓
RETRIEVE BEFORE REVEAL
        ↓
SUPPORTED PRODUCTION
        ↓
INTERACTION
        ↓
SELECTIVE FEEDBACK
        ↓
SELF-REPAIR + RETRY
        ↓
SPACED RETRIEVAL
        ↓
MEANINGFUL INPUT EXPANSION
        ↓
CHANGED-CONTEXT TRANSFER
        ↓
FLUENCY PRACTICE
        ↓
FRESH ASSESSMENT
```

This loop may span multiple sessions.

---

# 6. Adopt / Adapt / Reject / Test

## ADOPT

### From Duolingo / Busuu / Babbel
- authored curriculum;
- communicative objectives;
- explicit prerequisites;
- integrated review;
- constrained personalization.

### From Speak
- Learn → Practice → Apply;
- speak early;
- pattern variation before open conversation.

### From Pimsleur
- anticipation / retrieval before model answer;
- oral spaced recall.

### From LingQ / Migaku / FluentU
- content becomes the long-term source of input;
- contextual vocabulary tracking;
- learner-interest media;
- difficulty matching.

### From Loora
- selective correction during conversation;
- larger feedback review afterward.

### From ELSA
- specialized speech diagnostics;
- explicit sound/stress/intonation feedback.

### From human tutoring/exchange
- genuine unpredictable interaction;
- real negotiation of meaning;
- varied accents and partners.

## ADAPT FOR VIETNAMESE LEARNERS

- Use Vietnamese support strategically for beginners.
- Fade Vietnamese based on demonstrated comprehension, not calendar time.
- Use Vietnamese population risk priors only to choose diagnostics.
- Prioritize intelligibility over native accent.
- Include repair capabilities very early:
  - “Sorry?”
  - “Can you repeat that?”
  - “I don't understand.”
- Treat speaking anxiety as a design constraint.
- Diagnose grammar transfer rather than teaching a grammar chapter to everyone.

## REJECT AS CORE PRODUCT LOGIC

- streak == progress;
- XP == learning;
- lesson completion == capability;
- course position == proficiency;
- flashcard retention == communication;
- transcript match == pronunciation quality;
- native-like accent == success;
- free AI chat == curriculum;
- immersion without enough comprehension;
- grammar explanation as the primary sequence;
- correcting every learner error;
- forcing every skill into every short lesson.

## TEST — DO NOT HARD-CODE YET

These require FlashDay's own Vietnamese learner experiments:
- optimal amount/timing of Vietnamese explanation;
- how early open speaking should begin;
- best feedback timing;
- best number of corrections per turn/session;
- pronunciation-remediation sequence for Vietnamese beginners;
- exact spacing intervals for capability tasks;
- what constitutes fluency evidence;
- threshold for content comprehensibility;
- when human interaction should enter the pathway.

---

# 7. FlashDay Learning System v1

## Layer 1 — Outcome

Primary object:

```
Observable real-world capability
```

External CEFR/GSE mappings are metadata/benchmarking, not the internal ontology.

## Layer 2 — Baseline

Before teaching a capability:
- observe if learner can already do it;
- use short risk probes where justified;
- skip unnecessary remediation.

## Layer 3 — Comprehension

Introduce language through:
- situation;
- audio;
- visual/context;
- text when useful;
- Vietnamese help on demand.

Do not require learner to infer meaning from incomprehensible input.

## Layer 4 — Retrieval

Learner must attempt before answer reveal.

Recognition may introduce language, but productive retrieval must follow.

## Layer 5 — Production

Progression:

```
imitate
→ complete
→ recall
→ personalize
→ short response
→ multi-turn interaction
→ changed-context interaction
```

Do not jump from MCQ straight to free AI conversation.

## Layer 6 — Feedback and repair

Priority:
1. task/meaning failure;
2. current learning target;
3. recurrent personal error;
4. intelligibility problem;
5. low-value accuracy issue.

Prefer self-repair before full answer reveal.

## Layer 7 — Memory

FSRS schedules exact retrieval tasks.

Memory state remains separate from capability/proficiency state.

## Layer 8 — Input expansion

As learner knowledge increases:

```
authored micro-dialogue
→ graded story/audio
→ curated learner-interest content
→ supported authentic media
→ mostly authentic media
```

Input volume eventually becomes much larger than lesson volume.

## Layer 9 — Transfer

Change at least one meaningful dimension:
- wording;
- partner;
- setting;
- medium;
- response form;
- support level;
- delay.

A prompt family already rehearsed cannot count as novel transfer.

## Layer 10 — Fluency

Do **not** define fluency as “faster response.”

Dedicated future contract must combine:
- successful meaning;
- repeated transfer-capable performance;
- hesitation/latency;
- repair burden;
- intelligibility;
- stability across attempts.

Until calibrated, capability state should not auto-promote to FLUENT.

## Layer 11 — Assessment

Fresh tasks, separate from teaching items.

Keep separate:
- course/curriculum position;
- memory state;
- supported ability;
- independent ability;
- retained ability;
- transferred ability;
- sampled proficiency.

## Layer 12 — Engagement

Only after learning evidence exists.

Allowed:
- reminders;
- time commitment;
- weekly goals;
- visible capability gains.

Do not allow a trivial task to preserve a “learning streak.”

---

# 8. Planner v1

The planner should eventually choose between:

```
diagnostic
resume
due retrieval
remediation
new capability
meaningful input
interaction
transfer
fluency
checkpoint
```

Decision inputs:
- prerequisites;
- actual learner errors;
- support dependence;
- modality gaps;
- memory due state;
- transfer gaps;
- available time;
- learner goals/interests;
- anxiety/support preferences.

Initial implementation remains deterministic and inspectable.

---

# 9. Program-level balance

Use Four Strands over a learning block:

```
meaning-focused input
meaning-focused output
language-focused learning
fluency development
```

Do not force 25/25/25/25 into each short mission.

For true beginners:
- temporarily more support/deliberate language work;
- output begins early but small;
- input remains comprehensible.

As foundation grows:
- input volume rises dramatically;
- output becomes less scaffolded;
- fluency and authentic interaction occupy more time.

---

# 10. What this changes in the current vNext engine

## Keep
- capability graph;
- append-only evidence;
- learner isolation;
- modality separation;
- aided/unaided provenance;
- deterministic replay;
- transfer distinction;
- risk priors as diagnostic-only;
- deterministic planner.

## Change before UI
- capability conditions must be enforced when validating evidence;
- FLUENT must not auto-promote from an uncalibrated latency threshold;
- add explicit task/mission contracts;
- add content-load/prerequisite validation;
- add assessment-task vs teaching-task distinction;
- later add memory scheduler as a separate subsystem.

## Do not build yet
- streak/XP;
- broad AI tutor;
- old lesson migration;
- final pronunciation score;
- single global level percentage.

---

# 11. Validation plan for Vietnamese learners

FlashDay cannot claim “best for Vietnamese learners” from literature alone.

### Pilot A — mechanism validation
5–10 Vietnamese beginners.

For each selected capability:
```
baseline
→ teaching
→ immediate unaided
→ 24h+ delayed
→ changed-context transfer
```

Measure:
- task success;
- hint/model dependence;
- latency but not as standalone mastery;
- intelligibility where relevant;
- error recurrence;
- abandonment/anxiety.

### Pilot B — compare alternatives
Examples:
- Vietnamese explanation vs target-language-only;
- retrieval-before-reveal vs recognition-heavy;
- immediate feedback vs delayed feedback;
- 1 high-value correction vs multiple corrections;
- AI rehearsal before human interaction vs human-first.

### Pilot C — multi-session block
Test the planner and Four-Strands balance over several sessions.

### Pilot D — external benchmark
Use fresh independent tasks / standardized instruments where feasible.

Only after these stages can the method be promoted from “design hypothesis” to an evidence-backed FlashDay method.

---

# 12. Final design principle

FlashDay should not try to make the learner **good at FlashDay**.

The system is successful only when:

```
learner could not do X
→ understands relevant English
→ retrieves it
→ uses it
→ repairs errors
→ remembers it later
→ uses it with changed wording/context
→ eventually performs it with lower effort
```

The unit of progress is a durable, transferable capability — not a lesson, streak, XP total, or card count.
