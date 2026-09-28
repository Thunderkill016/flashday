# FlashDay vNext — Vietnamese-First English Learning System

Status: research synthesis / design hypothesis
Parent epic: #39
Architecture: #40
Learning-system task: #41

## 1. What we are building

There is no single current English-learning product whose complete system should be copied.

The strongest systems specialize:

| System family | Strongest contribution | Main risk if used alone |
| --- | --- | --- |
| Duolingo / Busuu | curriculum, sequencing, short practice, review | activity completion can be confused with proficiency |
| Speak | high-frequency speaking, Learn → Practice → Apply, feedback | speaking-heavy system can underweight broad input/reading/writing |
| ELSA | pronunciation diagnostics and targeted speech feedback | pronunciation subsystem is not a complete language curriculum |
| Pimsleur | anticipation + oral spaced recall | limited visual literacy, reading/writing and rich input |
| LingQ / Migaku / Refold | meaningful input, immersion, content-driven vocabulary | beginners can lack guidance; output/assessment can be weak or delayed |
| Rosetta Stone | contextual target-language inference | withholding L1 support can create avoidable ambiguity for beginners |
| Memrise | native-speaker phrase/video exposure | phrase exposure alone does not create a full proficiency model |
| Anki / FSRS | durable memory scheduling | remembering cards is not communication |
| CEFR / GSE-style frameworks | capability and assessment alignment | frameworks do not prescribe the teaching method |

FlashDay vNext combines these by function rather than by branding.

## 2. Evidence hierarchy

When product claims and research conflict, prefer:
1. systematic review / meta-analysis;
2. independent controlled or quasi-experimental research;
3. transparent product efficacy studies;
4. product design documentation;
5. anecdotes/community reports.

Product popularity is evidence of adoption/retention, not proof of language proficiency.

## 3. The learning doctrine

The core loop is:

```
UNDERSTAND
  ↓
NOTICE
  ↓
RETRIEVE
  ↓
PRODUCE
  ↓
INTERACT
  ↓
FEEDBACK
  ↓
SELF-REPAIR / RETRY
  ↓
SPACE
  ↓
TRANSFER
  ↓
FLUENCY
  ↓
FRESH ASSESSMENT
```

No lesson must contain every phase. The phases can span days.

### Why this mix

- Task-based learning gives communication a purpose.
- Meaning-focused input supplies examples and comprehension.
- Meaning-focused output forces formulation and interaction.
- Language-focused work targets gaps the learner cannot efficiently infer.
- Retrieval and spacing make memory durable.
- Feedback and retry convert errors into learning opportunities.
- Repeated tasks build automaticity.
- Transfer tasks separate memorized responses from usable ability.

## 4. Vietnamese-first does not mean Vietnamese-only

Vietnamese is used strategically:
- explain difficult meaning quickly;
- contrast English/Vietnamese when L1 transfer is causing an error;
- reduce beginner uncertainty;
- give precise feedback.

Vietnamese support fades as evidence of English comprehension grows.

The target is not “avoid translation at all costs”; it is “use the least support that keeps learning comprehensible and effortful.”

## 5. Vietnamese learner model

The system starts with population-level **risk priors**, then updates from individual evidence.

### Speech / listening priors

Research with Vietnamese EFL learners repeatedly reports difficulty with:
- consonant clusters and cluster simplification/deletion;
- word-final consonants/clusters;
- /θ/ and /ð/;
- lexical stress;
- English intonation/tonicity.

These are diagnostic probes, not assumptions.

A learner who passes a probe receives no remediation.

### Grammar / form priors

Candidate high-risk areas:
- articles;
- plural and verbal inflections;
- subject–verb agreement;
- copula `be`;
- tense/aspect;
- prepositions and collocations;
- question formation / inversion / auxiliaries.

Again: population risk only. The learner's own error history overrides the prior.

### Affective prior

Vietnamese EFL research reports speaking anxiety and fear of negative evaluation in some populations.

Design response:
- private rehearsal first;
- explicit thinking time;
- progressive difficulty;
- feedback on one or two high-value issues, not every error;
- no public leaderboard for speaking quality;
- celebrate successful communication/self-repair, not accent imitation.

## 6. Capability graph

The primary curriculum object is an observable capability.

Example:

```yaml
id: interact.exchange_name
performance: exchange names with a new person
criteria:
  - communicates own name intelligibly
  - asks for the other person's name
  - responds appropriately
conditions:
  - cooperative partner
  - short familiar exchange
prerequisites:
  - perceive.basic_greeting
language:
  chunks:
    - "Hi, I'm …"
    - "What's your name?"
    - "Nice to meet you."
evidence:
  independent: required
  delayed: required
  transfer: required
```

A mission can combine multiple capability nodes.

A capability is not considered stable because a lesson was completed.

## 7. Session architecture

### A. Comprehensible encounter
Start with a situation the learner can understand.

Use:
- audio;
- visual/context;
- short transcript when appropriate;
- Vietnamese meaning support on demand.

### B. Notice
Focus on a tiny target:
- useful phrase pattern;
- listening contrast;
- grammar/form only if it helps the task;
- pronunciation feature only if relevant.

### C. Retrieval before reveal
Cue the learner and require an attempt before showing the model.

Recognition can introduce; recall must follow.

### D. Output early
For a speaking-oriented capability, the learner speaks in the first session.

But “speak early” does not mean “free chat immediately.”

Progression:
```
imitate
→ complete
→ recall
→ substitute/personalize
→ short turn
→ multi-turn interaction
→ changed-context interaction
```

### E. Corrective feedback
Feedback priority:
1. did the message succeed?
2. current capability target;
3. recurrent learner-specific error;
4. intelligibility issue;
5. lower-priority accuracy.

Do not correct everything.

### F. Self-repair
Prefer a prompt/hint that lets the learner fix the error.

Reveal the full answer only after a genuine attempt or when needed.

### G. Retry
The next production attempt is a new evidence event with support provenance.

## 8. Memory architecture

FSRS schedules exact retrieval tasks.

Examples:
- audio → meaning recognition;
- Vietnamese/context cue → English phrase recall;
- situation → spoken response;
- written cue → short written production.

Do not clone one memory state across modalities.

```
memory strength != capability status
```

A learner can remember a phrase card and still fail live interaction.

## 9. Input engine

As vocabulary/comprehension grows, input volume becomes much larger than authored lesson content.

Progression:
```
micro-dialogue
→ graded story/dialogue
→ short controlled video/audio
→ learner-interest graded content
→ supported real content
→ mostly real content
```

Borrow from LingQ/Migaku:
- click-to-meaning;
- sentence context;
- known/learning/new tracking;
- audio + text;
- save useful examples;
- comprehension estimate.

But do not turn every unknown word into a card.

## 10. Speaking engine

Borrow from Speak:
```
LEARN → PRACTICE → APPLY
```

But add explicit evidence states:
- copied;
- supported;
- unaided;
- delayed;
- transferred.

Conversation AI receives:
- capability goal;
- allowed language range;
- learner known language;
- current error targets;
- support policy.

It may improvise the conversation.
It may not redefine the curriculum or award proficiency by intuition.

## 11. Pronunciation engine

Goal: **intelligibility and successful communication**, not sounding native.

Pipeline:
```
perception
→ articulatory/contrast explanation when useful
→ controlled production
→ feedback
→ retry
→ phrase-level production
→ spontaneous use
```

Prioritize features that affect intelligibility.

ASR transcript alone is not pronunciation evidence.

Generic ASR is known to struggle more with heavily accented beginner speech; speech scoring must be calibrated with Vietnamese speakers before high-stakes use.

## 12. Writing

Writing is not “type the model sentence.”

Progression:
```
copy/notice
→ controlled completion
→ recall
→ short functional message
→ changed-context message
→ feedback/revision
```

Use writing for:
- functional communication;
- accuracy cleanup;
- noticing grammar/collocation;
- transfer into later speaking.

## 13. Fluency engine

Once meaning and basic accuracy are available, repeat familiar tasks with variation.

Measure:
- hesitation;
- response latency;
- successful turns;
- repairs;
- intelligibility;
- stability across repetitions.

Do not reward simply speaking faster.

Task-repetition research supports repeated communicative performance, especially for accuracy/complexity; variation prevents pure memorization.

## 14. Four-Strands program balance

Across a block of learning, aim for a roughly balanced diet of:
- meaning-focused input;
- meaning-focused output;
- language-focused learning;
- fluency development.

This is not a stopwatch rule for every lesson.

The balance changes with learner state:
- true beginner: more scaffolding and deliberate learning;
- later learner: much more independent input/output and fluency work.

## 15. Planner

The learner should not manually assemble a method.

Planner chooses among:

```
due memory
remediation
new capability
meaningful input
interaction
transfer
fluency
checkpoint
```

Inputs:
- prerequisites;
- recent errors;
- support dependency;
- memory due state;
- modality gaps;
- transfer gaps;
- available time;
- learner goals/interests.

Initial planner is deterministic and explainable.

## 16. Daily product experience

Default 20–30 minute session:

```
3–5m  due retrieval
8–12m main capability/mission
3–5m  speaking or writing interaction
5–10m meaningful input
0–3m  due transfer/checkpoint
```

Short mode should still contain one meaningful retrieval/output action.

A “day” is useful only if language evidence is created. Opening the app is not progress.

## 17. Progress model

Do not show one “English = 62%” number.

Capability state:

```
NOT SEEN
EXPOSED
SUPPORTED
INDEPENDENT
RETAINED
TRANSFERRED
FLUENT
```

Skill profile can aggregate evidence, but must preserve the underlying capability records.

External CEFR/GSE mappings are reference metadata, not automatically awarded certifications.

## 18. Engagement

Habit tools are allowed only after learning metrics work.

Possible:
- reminders;
- weekly commitment;
- recovery after missed day;
- visible capability gains.

Avoid:
- XP farming;
- leaderboard pressure around speaking;
- streak mechanics that can be saved by trivial work.

Primary reinforcement:
“Yesterday you needed a hint; today you handled the same function independently.”

## 19. Evaluation plan

We cannot truthfully call this “the most effective system for Vietnamese learners” before testing it.

### Prototype validation
Vietnamese beginners:
- baseline unseen task;
- teaching session;
- immediate independent attempt;
- delayed test;
- changed-context transfer.

Measure:
- task success;
- support dependency;
- delayed retention;
- transfer;
- intelligibility;
- error recurrence;
- learner abandonment/anxiety.

### Next
Compare alternative loops:
- recognition-heavy vs retrieval-heavy;
- feedback timing;
- Vietnamese explanation vs target-language-only;
- early speaking scaffolds;
- pronunciation remediation strategies.

Prefer learning outcomes over engagement outcomes.

## 20. What FlashDay is trying to beat

Not “time spent in app.”

The target failure mode is:

```
studied English for years
+ recognizes exercises
+ maintains a streak
BUT
cannot understand/respond in an ordinary real situation
```

vNext succeeds only when the learner can do something outside the exact practice prompt that they could not do before.
