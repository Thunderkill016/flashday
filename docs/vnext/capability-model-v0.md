# Capability Model v0

Status: design contract
Parent: #39
Learning system: #41
Implementation task: #42

## 1. Capability schema

```js
{
  id: "interaction.ask_name",
  version: 1,

  performance: "Ask another person's name in a short first-meeting exchange.",

  criteria: {
    meaningDelivered: true,
    intelligibleEnoughForPartner: true,
    requiredFunctions: ["ask_name"]
  },

  conditions: {
    partnerCooperative: true,
    topicFamiliar: true,
    speechRate: "slow_clear",
    supportAllowed: ["repeat_once"]
  },

  modality: "spoken_interaction",

  prerequisites: [
    "reception.listen.identity_question_basic",
    "production.speak.say_own_name"
  ],

  language: {
    chunks: ["What's your name?"],
    constructions: ["wh_question_name"],
    vocabulary: ["name"]
  },

  evidence: {
    independentRequired: true,
    delayedRequired: true,
    transferRequired: true
  },

  vietnameseRiskProbes: [
    "question_auxiliary_or_order"
  ]
}
```

## 2. Capability state

Derived only:

```
NOT_SEEN
  -> EXPOSED
  -> SUPPORTED
  -> INDEPENDENT
  -> RETAINED
  -> TRANSFERRED
  -> FLUENT
```

### State rules

**EXPOSED**
Learner encountered meaningful input.

**SUPPORTED**
Learner completed the capability only with hint/model/scaffold that materially supplied the answer.

**INDEPENDENT**
Learner completed a valid task without answer-bearing support.

**RETAINED**
Independent success occurs again after a meaningful delay.

**TRANSFERRED**
Independent success occurs in a changed context or wording that cannot be solved by replaying the exact practiced prompt.

**FLUENT**
Repeated transfer-capable performance shows lower hesitation/stable intelligibility while preserving meaning.

No state transition is allowed from course completion alone.

## 3. Evidence event

```js
{
  id,
  learnerId,
  capabilityId,
  taskId,
  taskRevision,

  eventType,
  modality,

  context: {
    missionId,
    practicedOrTransfer,
    promptFamily,
    partnerType
  },

  attempt: {
    observed: true,
    outcome,
    response,
    latencyMs: null
  },

  support: {
    hint: false,
    translation: false,
    transcript: false,
    modelAnswer: false,
    repeat: false
  },

  feedback: {
    given: false,
    target: null
  },

  occurredAt
}
```

Append-only. Learner state is a projection.

## 4. Initial capability graph

### Listening

```
reception.listen.greeting_basic
reception.listen.identity_question_basic
reception.listen.drink_order_question_basic
```

### Spoken interaction

```
interaction.greet
interaction.ask_name
interaction.respond_to_introduction
interaction.ask_repeat
interaction.signal_nonunderstanding
interaction.order_drink
```

### Spoken production

```
production.speak.say_own_name
```

### Reading

```
reception.read.simple_sign_or_menu_item
```

### Writing

```
production.write.personal_info_short
```

## 5. Example prerequisite graph

```
reception.listen.greeting_basic
    ↓
interaction.greet

reception.listen.identity_question_basic
    ↓
production.speak.say_own_name
    ↓
interaction.ask_name
    ↓
interaction.respond_to_introduction

reception.listen.drink_order_question_basic
    ↓
interaction.order_drink

interaction.ask_repeat
interaction.signal_nonunderstanding
    ↘
      supports many later missions
```

## 6. Vietnamese learner risk priors

These are diagnostic hints, not learner facts.

```js
{
  id: "vn.word_final_consonants",
  appliesTo: ["spoken_production", "spoken_interaction"],
  mayTriggerProbe: true,
  learnerStateEffect: "none_without_observed_evidence"
}
```

Initial risk-prior ids:

```
vn.word_final_consonants
vn.consonant_clusters
vn.theta_eth
vn.lexical_stress
vn.english_intonation
vn.articles
vn.copula_be
vn.inflectional_endings
vn.question_formation
vn.tense_aspect
vn.prepositions_collocations
vn.speaking_anxiety_support
```

## 7. Non-negotiable distinctions

```
exposure != retrieval
recognition != recall
recall != spontaneous production
spoken transcript != pronunciation evidence
supported success != independent success
immediate success != retention
same-prompt repetition != transfer
memory strength != proficiency
population risk != individual weakness
```

## 8. First implementation target

The headless engine should support this sequence with no UI dependency:

```
baseline task
  ↓
fail / weak evidence
  ↓
meaningful input
  ↓
guided retrieval
  ↓
supported interaction
  ↓
feedback
  ↓
retry
  ↓
independent success
  ↓
scheduled delayed retrieval
  ↓
changed-context transfer
```

The first code PR should implement only enough domain logic to make this sequence deterministic and testable.
