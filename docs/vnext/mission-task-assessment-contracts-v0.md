# vNext Mission / Task / Transfer / Assessment Contracts v0

Status: implementation contract
Issue: #45
Depends on: #42, #44

## 1. Separation of responsibilities

```
Capability = what the learner can do
Mission    = real-world scenario combining capabilities
Task       = one elicitation/learning unit
Attempt    = learner response to one task instance
Evidence   = durable observation of what happened
Assessment = fresh sampling of ability
```

These are distinct domain objects.

A UI screen is not a Task.
A Mission is not a Capability.
A completed Mission is not evidence by itself.

---

## 2. MissionContract

```js
{
  id: "mission.meet_new_person",
  revision: 1,

  scenario: "Meet another learner for the first time.",
  learnerGoal: "Exchange a greeting and names politely.",

  targetCapabilities: [
    "listen.greeting_basic",
    "interact.greet",
    "listen.identity_question_basic",
    "speak.say_own_name",
    "interact.ask_name",
    "interact.respond_to_introduction"
  ],

  prerequisiteCapabilities: [],
  supportCapabilities: [
    "interact.ask_repeat",
    "interact.signal_nonunderstanding"
  ],

  language: {
    assumedKnown: [],
    introduced: {
      chunks: [],
      vocabulary: [],
      constructions: []
    }
  },

  taskIds: [],

  transferPlan: {
    required: true,
    dimensions: ["wording", "partner", "setting", "support_level"]
  },

  assessmentPlan: {
    required: true,
    freshnessRequired: true
  }
}
```

### Mission invariants

- Every target/prerequisite/support capability exists.
- Prerequisite graph is valid.
- Every task belongs to the mission.
- Every target capability has at least one valid elicitation/evidence path.
- Teaching and fresh assessment families cannot collide when freshness is required.
- Mission language requirements must be declared.
- A Mission does not prescribe a universal fixed screen order.

---

## 3. TaskContract

```js
{
  id: "task.meet.ask_name.guided_1",
  revision: 1,

  missionId: "mission.meet_new_person",
  capabilityId: "interact.ask_name",
  modality: "spoken_interaction",

  purpose: "interaction",

  promptFamily: "meet.ask_name.practice.v1",

  stimulus: {
    type: "partner_turn",
    languageComponents: []
  },

  response: {
    type: "spoken_turn",
    requiredFunctions: ["ask_name"]
  },

  supportPolicy: {
    allowed: [],
    revealModelAfterAttempt: true
  },

  evaluation: {
    authority: "deterministic",
    contractId: "eval.ask_name.basic.v1"
  },

  freshness: {
    required: false,
    familyClass: "practiced"
  },

  transfer: null,

  language: {
    requiredChunks: [],
    requiredVocabulary: [],
    requiredConstructions: []
  }
}
```

---

## 4. Task purpose

Allowed v0 purposes:

```
diagnostic
input
notice
retrieval
production
interaction
remediation
delayed_retrieval
transfer
assessment
fluency
```

Purpose constrains evidence semantics.

### Purpose examples

**input**
- may create exposure;
- does not by itself prove independent ability.

**diagnostic**
- samples current ability before teaching;
- failure on unseen capability does not automatically create remediation.

**retrieval / production / interaction**
- may create independent evidence when all contracts are satisfied.

**remediation**
- follows observed weakness/error;
- support provenance remains explicit.

**delayed_retrieval**
- may contribute retention evidence only when the delay contract is satisfied.

**transfer**
- requires fresh context/family and changed transfer dimension(s).

**assessment**
- fresh sampling;
- no teaching answer leakage;
- separate assessment provenance.

**fluency**
- reserved until a calibrated multi-signal fluency contract exists.

---

## 5. Evidence binding

The caller must not be trusted to author evidence semantics.

Instead:

```
bindAttempt(task, capability, rawAttempt)
→ validated EvidenceEvent
```

The binder derives from the Task contract:
- capabilityId;
- taskId;
- taskRevision;
- modality;
- promptFamily;
- practicedOrTransfer;
- missionId;
- task purpose metadata.

The UI may supply learner response and observed support actions.
It may not forge:
- task purpose;
- transfer status;
- assessment freshness;
- prompt family.

---

## 6. Effective support policy

Independent evidence must satisfy BOTH capability and task conditions.

```
effectiveAllowedSupport =
  intersection(capability.conditions.supportAllowed,
               task.supportPolicy.allowed)
```

A Task may narrow support.
A Task may never broaden the Capability.

Answer-bearing support remains disqualifying for independent evidence even if misconfigured as allowed.

Support provenance includes:
- hint;
- translation;
- transcript;
- modelAnswer;
- repeat;
- repeatCount;
- any later support types added to schema.

---

## 7. Attempt boundary / answer leakage

An attempt instance has a stable id.

Support revealed during an attempt belongs permanently to that attempt.

```
attempt-123
  learner tries
  ↓
hint revealed
  ↓
retry inside same attempt boundary
```

must not later become an “unaided” attempt by resetting UI flags.

To produce clean independent evidence, create a new attempt/task instance only when the task contract allows it and record prior support history separately.

---

## 8. Transfer contract

```js
{
  purpose: "transfer",

  freshness: {
    required: true,
    familyClass: "fresh_transfer"
  },

  transfer: {
    changedDimensions: [
      "wording",
      "partner"
    ]
  }
}
```

Allowed transfer dimensions:

```
wording
partner
setting
medium
response_form
support_level
task_goal
delay
```

### Transfer invariants

- At least one meaningful dimension changes.
- Exact rehearsed promptFamily cannot count as transfer.
- A superficial text variant inside a practiced family remains practiced.
- Transfer success does not imply fluency.
- Transfer success does not erase whether retention was separately observed.

---

## 9. AssessmentContract

Assessment is a Task with additional restrictions.

```js
{
  purpose: "assessment",

  freshness: {
    required: true,
    familyClass: "fresh_assessment"
  },

  supportPolicy: {
    allowed: []
  },

  evaluation: {
    authority: "deterministic",
    contractId: "eval.meet_names.v1"
  },

  assessment: {
    capabilitySample: ["interact.ask_name"],
    allowedLanguageRange: "declared_target_range",
    answerRevealDuringAttempt: false
  }
}
```

### Assessment invariants

- Fresh family when required.
- No hidden new language outside declared range.
- Answer-bearing support invalidates independent assessment.
- Course/Mission completion never generates assessment evidence.
- Assessment evidence remains capability/modality-specific.

---

## 10. Evaluation authority

Allowed v0 authorities:

```
deterministic
human
asr
ai_llm
self_report
```

Evidence event records:
- authority;
- evaluator/version when applicable;
- raw signal/reference where useful.

### Conservative rules

**self_report**
- cannot prove independent ability.

**ASR**
- transcript recognition may support “what was detected”;
- cannot by itself prove pronunciation/intelligibility.

**AI/LLM**
- can provide feedback/secondary judgment;
- cannot independently award proficiency without a calibrated contract.

**human**
- valid only for the dimensions/rubric actually observed.

**deterministic**
- valid only for exactly what its evaluator contract measures.

---

## 11. Freshness model

Each Task belongs to a prompt family.

Family classes:

```
practiced
fresh_transfer
fresh_assessment
```

For v0, family identity is authored.

Later semantic similarity checks may improve anti-leakage, but v0 must at least reject exact family reuse where freshness is required.

---

## 12. Content load

No universal “N new words per mission” rule is hard-coded.

Validation accepts a policy:

```js
validateMissionContent(mission, tasks, capabilities, {
  maxNewChunks,
  maxNewVocabulary,
  maxNewConstructions
})
```

The engine validates:
- all task language is declared;
- prerequisites/assumed-known language is available;
- introduced language stays within the injected policy.

The policy is empirical/configurable.

---

## 13. Fixture A — Meet a new person

Required phases as domain tasks, not screens:

```
baseline diagnostic
→ meaningful input
→ retrieval
→ supported interaction
→ feedback
→ clean independent attempt
→ delayed retrieval
→ changed-context transfer
→ fresh assessment
```

Target capabilities:
- listen.greeting_basic
- interact.greet
- listen.identity_question_basic
- speak.say_own_name
- interact.ask_name
- interact.respond_to_introduction

Repair capabilities may be available as support.

---

## 14. Fixture B — Order a drink

Target at least:
- listen.drink_order_question_basic
- interact.order_drink

Must demonstrate:
- different scenario;
- different prompt families;
- content-load validator;
- transfer to changed wording/partner/setting;
- fresh assessment family.

---

## 15. Required tests

At minimum:

```
task support cannot broaden capability support
event caller cannot forge task purpose
event caller cannot forge promptFamily
event caller cannot forge transfer context
teaching family != fresh assessment family
practiced family cannot become transfer
transfer requires changed dimension
answer reveal provenance survives retry
self_report cannot become independent assessment
ASR transcript != pronunciation evidence
undeclared language fails content validation
policy-injected language budget is enforced
foreign learner event isolation remains
replay remains deterministic
FLUENT remains unreachable in v0
```

---

## 16. Definition of done

With no UI, the engine can trace:

```
Mission
  ↓
Task contract
  ↓
Attempt
  ↓
validated support/context/evaluator provenance
  ↓
EvidenceEvent
  ↓
Capability projection
```

and can prove that teaching, transfer and assessment evidence cannot be silently conflated.
