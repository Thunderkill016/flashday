import assert from 'node:assert/strict';

import { CAPABILITIES } from '../src/vnext/capabilities.js';
import { TASKS_MEET_PERSON } from '../src/vnext/fixtures.js';
import { bridgeOpenLingoAttempt, mapOpenLingoSupport } from '../src/vnext/integrations/openlingo-attempt.js';
import { projectLearnerState } from '../src/vnext/projection.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`ok   ${name}`);
};

const taskById = (id) => {
  const task = TASKS_MEET_PERSON.find((t) => t.id === id);
  assert.ok(task, `missing fixture task ${id}`);
  return task;
};

const capById = (id) => {
  const cap = CAPABILITIES.find((c) => c.id === id);
  assert.ok(cap, `missing capability ${id}`);
  return cap;
};

test('choice result is rescored by FlashDay and contract identity is derived', () => {
  const task = taskById('task.meet.retrieval.questions');
  const cap = capById(task.capabilityId);

  const event = bridgeOpenLingoAttempt(task, cap, {
    id: 'ol-choice-1',
    learnerId: 'learner-1',
    occurredAt: 1_000,
    response: { optionId: 'ask_name' },
    source: 'direct_ui'
  });

  assert.equal(event.attempt.outcome, 'success');
  assert.equal(event.attempt.observed, true);
  assert.equal(event.taskId, task.id);
  assert.equal(event.taskRevision, task.revision);
  assert.equal(event.capabilityId, task.capabilityId);
  assert.equal(event.context.missionId, task.missionId);
  assert.equal(event.context.promptFamily, task.promptFamily);
  assert.equal(event.binding.purpose, task.purpose);
  assert.equal(event.evaluation.contractId, task.evaluation.contractId);
});

test('OpenLingo correct boolean cannot mint evidence', () => {
  const task = taskById('task.meet.retrieval.questions');
  const cap = capById(task.capabilityId);

  assert.throws(
    () => bridgeOpenLingoAttempt(task, cap, {
      id: 'ol-forged-correct',
      learnerId: 'learner-1',
      occurredAt: 2_000,
      response: { optionId: 'greeting' },
      correct: true
    }),
    /correct.*semantic authority/
  );
});

test('OpenLingo cannot forge task purpose or transfer context', () => {
  const task = taskById('task.meet.retrieval.questions');
  const cap = capById(task.capabilityId);

  for (const forged of [
    { purpose: 'assessment' },
    { capabilityId: 'interaction.ask_name' },
    { promptFamily: 'pf.forged' },
    { practicedOrTransfer: 'transfer' },
    { outcome: 'success' }
  ]) {
    assert.throws(
      () => bridgeOpenLingoAttempt(task, cap, {
        id: `ol-forged-${Object.keys(forged)[0]}`,
        learnerId: 'learner-1',
        occurredAt: 3_000,
        response: { optionId: 'ask_name' },
        ...forged
      }),
      /semantic authority/
    );
  }
});

test('wrong choice stays fail even if the UI would have called it correct', () => {
  const task = taskById('task.meet.retrieval.questions');
  const cap = capById(task.capabilityId);

  const event = bridgeOpenLingoAttempt(task, cap, {
    id: 'ol-choice-wrong',
    learnerId: 'learner-1',
    occurredAt: 4_000,
    response: { optionId: 'greeting' },
    source: 'direct_ui'
  });

  assert.equal(event.attempt.outcome, 'fail');
  assert.deepEqual(event.evaluation.missingFunctions, ['understand_identity_question']);
});

test('support provenance maps explicitly and survives binding', () => {
  const task = taskById('task.meet.retrieval.questions');
  const cap = capById(task.capabilityId);

  const support = mapOpenLingoSupport({
    hintUsed: true,
    translationViewed: true,
    transcriptViewed: false,
    modelAnswerViewed: false,
    repeatCount: 2
  });

  assert.deepEqual(support, {
    hint: true,
    translation: true,
    transcript: false,
    modelAnswer: false,
    repeat: true,
    repeatCount: 2
  });

  const event = bridgeOpenLingoAttempt(task, cap, {
    id: 'ol-supported',
    learnerId: 'learner-1',
    occurredAt: 5_000,
    response: { optionId: 'ask_name' },
    support: {
      hintUsed: true,
      translationViewed: true,
      repeatCount: 2
    }
  });
  assert.equal(event.support.hint, true);
  assert.equal(event.support.translation, true);
  assert.equal(event.support.repeatCount, 2);
});

test('STT transcript on a speaking task is never independent evidence', () => {
  const task = taskById('task.meet.retrieval.phrases');
  const cap = capById(task.capabilityId);

  const event = bridgeOpenLingoAttempt(task, cap, {
    id: 'ol-stt-1',
    learnerId: 'learner-1',
    occurredAt: 6_000,
    response: "I'm Linh",
    source: 'stt_transcript',
    evaluatorContext: { learnerName: 'Linh' }
  });

  assert.equal(event.attempt.outcome, 'success');
  assert.equal(event.attempt.observed, false);

  const projection = projectLearnerState(
    'learner-1',
    [event],
    CAPABILITIES,
    TASKS_MEET_PERSON
  );
  const state = projection.byCapability.get(task.capabilityId);
  assert.ok(state);
  assert.equal(state.milestones.independent, false);
  assert.equal(state.milestones.transferred, false);
});

test('spoken task defaults fail-closed even when caller forgets STT source', () => {
  const task = taskById('task.meet.retrieval.phrases');
  const cap = capById(task.capabilityId);

  const event = bridgeOpenLingoAttempt(task, cap, {
    id: 'ol-spoken-default',
    learnerId: 'learner-1',
    occurredAt: 7_000,
    response: "I'm Linh",
    evaluatorContext: { learnerName: 'Linh' }
  });

  assert.equal(event.attempt.outcome, 'success');
  assert.equal(event.attempt.observed, false);
});

console.log(`\n${passed} passed, 0 failed`);
