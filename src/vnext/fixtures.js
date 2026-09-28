/*
 * vNext headless fixtures (issue #45 §13–14).
 *
 * Two complete missions as pure domain data — no screens, no UI. The
 * learning loop is expressed as *task phases*: baseline diagnostic →
 * meaningful input → retrieval → supported interaction → feedback →
 * clean independent attempt → delayed retrieval → changed-context
 * transfer → fresh assessment.
 *
 * Fixture A: meet a new person.  Fixture B: order one drink.
 */
import { capabilityById } from './capabilities.js';
import { makeMission, makeTask } from './contracts.js';

const task = (fields) => makeTask({
  evaluation: { authority: 'deterministic', contractId: `eval.${fields.id}.v1` },
  ...fields
});

/* ── Fixture A — Meet a new person ─────────────────────────── */

export const MISSION_MEET_PERSON = makeMission({
  id: 'mission.meet_new_person',
  revision: 1,
  scenario: 'Meet another learner for the first time.',
  learnerGoal: 'Exchange a greeting and names politely.',
  targetCapabilities: [
    'listen.greeting_basic',
    'interact.greet',
    'listen.identity_question_basic',
    'speak.say_own_name',
    'interact.ask_name',
    'interact.respond_to_introduction'
  ],
  supportCapabilities: ['interact.ask_repeat', 'interact.signal_nonunderstanding'],
  language: {
    assumedKnown: [],
    introduced: {
      chunks: ['Hi', 'Hello', "I'm …", 'My name is …', "What's your name?", 'Nice to meet you', 'Nice to meet you too'],
      vocabulary: ['name', 'nice', 'meet'],
      constructions: ['wh_question_name']
    }
  },
  taskIds: [
    'task.meet.diagnostic.opening',
    'task.meet.diagnostic.listen',
    'task.meet.input.scene',
    'task.meet.input.questions',
    'task.meet.retrieval.questions',
    'task.meet.retrieval.phrases',
    'task.meet.interaction.guided',
    'task.meet.remediation.repair',
    'task.meet.interaction.unaided',
    'task.meet.interaction.polite',
    'task.meet.delayed.check',
    'task.meet.transfer.street',
    'task.meet.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_MEET_PERSON = [
  task({
    id: 'task.meet.diagnostic.opening',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.greet',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: 'meet.greet.baseline.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Hi'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet'] },
    language: { requiredChunks: ['Hi'], requiredVocabulary: ['hi'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.diagnostic.listen',
    missionId: 'mission.meet_new_person',
    capabilityId: 'listen.greeting_basic',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: 'meet.listen.baseline.v1',
    stimulus: { type: 'audio_line', languageComponents: ['Hello'] },
    response: { type: 'choice', requiredFunctions: ['recognize_greeting'] },
    language: { requiredChunks: ['Hello'], requiredVocabulary: ['hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.input.scene',
    missionId: 'mission.meet_new_person',
    capabilityId: 'listen.greeting_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: 'meet.scene.v1',
    stimulus: { type: 'dialogue', languageComponents: ['Hi', 'Hello'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.input.questions',
    missionId: 'mission.meet_new_person',
    capabilityId: 'listen.identity_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: 'meet.questions.v1',
    stimulus: { type: 'dialogue', languageComponents: ["What's your name?"] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.retrieval.questions',
    missionId: 'mission.meet_new_person',
    capabilityId: 'listen.identity_question_basic',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: 'meet.questions.practice.v1',
    stimulus: { type: 'audio_line', languageComponents: ["What's your name?"] },
    response: { type: 'choice', requiredFunctions: ['understand_identity_question'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.retrieval.phrases',
    missionId: 'mission.meet_new_person',
    capabilityId: 'speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: 'meet.phrases.practice.v1',
    stimulus: { type: 'cued_prompt', languageComponents: ["I'm …"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.interaction.guided',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'meet.ask_name.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.remediation.repair',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.ask_repeat',
    modality: 'spoken_interaction',
    purpose: 'remediation',
    promptFamily: 'meet.repair.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: [] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_repeat'] },
    language: { requiredChunks: ['Sorry?', 'Can you repeat that?'], requiredVocabulary: ['sorry', 'repeat'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.interaction.unaided',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'meet.ask_name.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.polite',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.respond_to_introduction',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'meet.polite.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['respond_to_introduction'] },
    language: { requiredChunks: ['Nice to meet you too'], requiredVocabulary: ['nice', 'meet'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.delayed.check',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: 'meet.ask_name.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.transfer.street',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: 'meet.ask_name.street.v1',
    stimulus: { type: 'partner_turn', languageComponents: ["I'm Sam — and you are?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.assessment.checkpoint',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: 'assess.meet.exchange.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! Good to see you.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet', 'ask_name'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interact.ask_name', 'interact.respond_to_introduction'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  })
];

/* ── Fixture B — Order one drink ───────────────────────────── */

export const MISSION_ORDER_DRINK = makeMission({
  id: 'mission.order_drink',
  revision: 1,
  scenario: 'Order one drink politely in a cafe.',
  learnerGoal: 'Understand the offer question and order a drink.',
  targetCapabilities: ['listen.drink_order_question_basic', 'interact.order_drink'],
  prerequisiteCapabilities: [],
  supportCapabilities: ['interact.ask_repeat', 'interact.signal_nonunderstanding'],
  language: {
    assumedKnown: [],
    introduced: {
      chunks: ['What would you like?', 'Can I have …?', 'A coffee, please', 'Anything else?'],
      vocabulary: ['like', 'drink', 'coffee', 'tea', 'please'],
      constructions: []
    }
  },
  taskIds: [
    'task.drink.diagnostic.offer',
    'task.drink.input.counter',
    'task.drink.retrieval.order',
    'task.drink.interaction.guided',
    'task.drink.interaction.unaided',
    'task.drink.delayed.check',
    'task.drink.transfer.stall',
    'task.drink.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_ORDER_DRINK = [
  task({
    id: 'task.drink.diagnostic.offer',
    missionId: 'mission.order_drink',
    capabilityId: 'listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: 'drink.offer.baseline.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'choice', requiredFunctions: ['understand_offer_or_order_question'] },
    language: { requiredChunks: ['What would you like?'], requiredVocabulary: ['like'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.input.counter',
    missionId: 'mission.order_drink',
    capabilityId: 'listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: 'drink.counter.v1',
    stimulus: { type: 'dialogue', languageComponents: ['What would you like?', 'A coffee, please'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['What would you like?', 'A coffee, please'], requiredVocabulary: ['like', 'coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.retrieval.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: 'drink.order.practice.v1',
    stimulus: { type: 'cued_prompt', languageComponents: ['Can I have …?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.guided',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'drink.order.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.unaided',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'drink.order.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.delayed.check',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: 'drink.order.practice.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Anything else?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.transfer.stall',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: 'drink.order.stall.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Yes? What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.assessment.checkpoint',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: 'assess.order_drink.v1',
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! For you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interact.order_drink'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  })
];

export const FIXTURES = [
  { mission: MISSION_MEET_PERSON, tasks: TASKS_MEET_PERSON },
  { mission: MISSION_ORDER_DRINK, tasks: TASKS_ORDER_DRINK }
];

export { capabilityById };
