# FlashDay vNext Architecture

Status: **Phase 0 — specification**
Parent epic: #39
Architecture task: #40

## Reset

vNext is a greenfield learning system. The existing application is legacy/reference only.

The design starts from observable English capability, not lessons or UI widgets.

```
Capability
  -> Evidence contract
  -> Assessment
  -> Learning progression
  -> Retrieval / feedback / retry
  -> Memory / transfer
  -> Learner state
  -> Planner
  -> Session
  -> UI
```

## Core separations

These concepts must never collapse into one score:

```
Activity != Learning
Learning != Retention
Retention != Transfer
Transfer != Proficiency
```

Likewise:

```
Mission != Capability
MemoryState != ProficiencyState
TranscriptMatch != PronunciationEvidence
CoursePosition != ObservedAbility
```

## Proposed domain

### Capability
An atomic observable ability the learner can demonstrate under defined conditions.

### Mission
A real-world scenario that composes one or more capabilities.

### LanguageComponent
A chunk, lexical item, construction, pronunciation target, or discourse function required by a capability.

### RetrievalTask
A stable memory task for one exact ability/component/modality.

### AssessmentTask
A fresh task intended to observe independent, delayed, transfer, or proficiency evidence.

### EvidenceEvent
Append-only durable observation of what happened.

### LearnerState
Pure projection from durable evidence.

### MemoryState
Scheduling state for retrieval tasks only.

### TransferState
Evidence that an ability survives changed context/wording/support.

### SessionPlan
A deterministic pedagogical plan for the current learner state.

## Default learning progression

```
comprehensible input
-> notice
-> guided retrieval
-> supported output
-> interaction
-> feedback
-> retry
-> delayed retrieval
-> transfer
-> fluency
-> assessment
```

This is a repertoire, not a mandatory fixed screen template.

## Planner

Initial vNext planner is deterministic and inspectable.

Priority:
1. resume safe in-flight work;
2. due retrieval;
3. remediation;
4. scheduled transfer/checkpoint;
5. continue current mission;
6. introduce next prerequisite-satisfied capability.

AI may later generate variants or hints inside these constraints. It does not own curriculum order.

## Content philosophy

Curriculum is authored data with explicit prerequisites and evidence requirements.

Every content unit must declare:
- what is new;
- what is assumed known;
- what evidence can be produced;
- what support is available;
- where delayed retrieval happens;
- where transfer happens.

## Implementation order

1. Write schemas/invariants.
2. Write fixtures.
3. Write validators.
4. Write evidence projection.
5. Write planner.
6. Integrate FSRS.
7. Build headless tests.
8. Only then build the first learner-facing slice.

No UI redesign, auth migration, AI tutor work, or gamification before the headless contracts are stable.
