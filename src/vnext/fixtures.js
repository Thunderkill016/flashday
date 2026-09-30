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
 *
 * Prompt families use the canonical id scheme
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.<sigHash8>.vN
 * and every task carries a contextSignature — the family's auditable
 * identity. `canonicalFamilyId` derives the id FROM the signature, so
 * the two can never drift apart by construction; the trailing hash is
 * an injective fingerprint over the whole signature so two families
 * that differ only in a non-id field (interlocutorRole, relationship,
 * responseTopology, lexicalDomain) still get distinct ids.
 * `tests/vnext-curriculum.test.mjs` enforces all of this via
 * curriculum-checks.js.
 *
 * Mission roles (R6): targets owe a baseline probe and the full
 * evidence package; carriers are rehearsed opportunistically — they get
 * input + eliciting practice but NO baseline diagnostic, no
 * fresh-transfer task and no assessment of their own; supports are
 * demand-driven and only declared when a mechanism exists to route to
 * them.
 */
import { capabilityById } from './capabilities.js';
import { canonicalFamilyId, makeMission, makeTask } from './contracts.js';

/* evaluation.contractId names a scoring SPEC (evaluators.js), not a
 * task: choice tasks score the picked option; free-response tasks score
 * their declared requiredFunctions by structured match. Exposure-only
 * tasks declare no evaluator — there is nothing to score. */
const task = (fields) => makeTask({
  evaluation: {
    authority: 'deterministic',
    contractId: fields.purpose === 'input' || fields.purpose === 'notice'
      ? null
      : fields.response?.type === 'choice'
        ? 'eval.choice.correct.v1'
        : 'eval.required_functions.v1'
  },
  ...fields
});

/* The practiced communicative situation both missions start from: a
 * casual, face-to-face first meeting between new peers. Baseline
 * diagnostics deliberately sample the SAME families the teaching
 * rehearses, so the delta between baseline and later evidence is the
 * teaching, not the context. */
const FIRST_MEETING = {
  setting: 'personal',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'new_peer',
  relationship: 'first_meeting'
};

const sig = (fields) => ({ ...FIRST_MEETING, ...fields });

/* Context signatures are the source of truth for a prompt family — one
 * const per family, shared by every task that rehearses it. The id is
 * then derived: pf(capId, SIG.x). */
const F = {
  greetingExchange: sig({
    communicativeFunction: 'recognize_greeting',
    cueTopology: 'greeting_exchange',
    responseTopology: 'none',
    lexicalDomain: 'greetings'
  }),
  identityQExchange: sig({
    communicativeFunction: 'understand_identity_question',
    cueTopology: 'identity_q_exchange',
    responseTopology: 'none',
    lexicalDomain: 'identity'
  }),
  identityQAudio: sig({
    communicativeFunction: 'understand_identity_question',
    cueTopology: 'identity_q_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'identity'
  }),
  ownNameAsked: sig({
    communicativeFunction: 'state_own_name',
    cueTopology: 'asked_own_name',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  }),
  ownNameCued: sig({
    communicativeFunction: 'state_own_name',
    cueTopology: 'cued_recall',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  }),
  ownNameCheck: {
    communicativeFunction: 'state_own_name',
    cueTopology: 'name_check',
    setting: 'educational',
    register: 'neutral',
    channel: 'f2f',
    interlocutorRole: 'teacher',
    relationship: 'authority',
    responseTopology: 'name_statement',
    lexicalDomain: 'identity'
  },
  askNameIntro: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'self_intro',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  askNameModel: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'model_exchange',
    responseTopology: 'none',
    lexicalDomain: 'identity'
  }),
  askNameCued: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'cued_recall',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  askNamePartner: sig({
    communicativeFunction: 'ask_name',
    cueTopology: 'partner_exchange',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  }),
  askNameStreet: {
    communicativeFunction: 'ask_name',
    cueTopology: 'open_social',
    setting: 'street',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'stranger',
    relationship: 'stranger_contact',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  },
  askNameFull: {
    communicativeFunction: 'full_name_exchange',
    cueTopology: 'full_exchange',
    setting: 'community',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'acquaintance',
    relationship: 'repeat_contact',
    responseTopology: 'wh_question',
    lexicalDomain: 'identity'
  },
  politeNice: sig({
    communicativeFunction: 'respond_to_introduction',
    cueTopology: 'nice_to_meet_you',
    responseTopology: 'politeness_return',
    lexicalDomain: 'greetings'
  })
};

const pf = canonicalFamilyId;

/* ── Fixture A — Meet a new person ─────────────────────────── */

export const MISSION_MEET_PERSON = makeMission({
  id: 'mission.meet_new_person',
  revision: 3,
  scenario: 'Meet another learner for the first time.',
  learnerGoal: 'Exchange a greeting and names politely.',
  /* Claim-bearing targets: the mission owes each of them a baseline
   * probe plus practiced, delayed, held-out transfer and
   * fresh-assessment coverage. */
  targetCapabilities: [
    'production.speak.say_own_name',
    'interaction.ask_name'
  ],
  /* Carriers are rehearsed for retention and context — they get
   * input/eliciting evidence opportunistically but no baseline probe,
   * no held-out transfer and no assessment of their own. */
  carrierCapabilities: [
    'reception.listen.greeting_basic',
    'reception.listen.identity_question_basic',
    'interaction.respond_to_introduction'
  ],
  /* interaction.ask_repeat is deliberately NOT declared: supports are
   * demand-driven, and no mechanism yet routes a learner to repair
   * work — declaring it would be a dead surface the planner can never
   * serve. */
  supportCapabilities: [],
  language: {
    assumedKnown: { chunks: [], vocabulary: [], constructions: [] },
    introduced: {
      chunks: [
        'Hi', 'Hello', "I'm …", 'My name is …', "What's your name?",
        'Nice to meet you', 'Nice to meet you too'
      ],
      vocabulary: ['name', 'nice', 'meet', 'hi', 'hello'],
      constructions: ['wh_question_name']
    }
  },
  taskIds: [
    'task.meet.diagnostic.own_name',
    'task.meet.diagnostic.ask_name',
    'task.meet.input.scene',
    'task.meet.input.questions',
    'task.meet.input.ask_name',
    'task.meet.retrieval.questions',
    'task.meet.retrieval.phrases',
    'task.meet.retrieval.ask_name',
    'task.meet.interaction.guided',
    'task.meet.remediation.ask_name',
    'task.meet.interaction.unaided',
    'task.meet.interaction.polite',
    'task.meet.delayed.check',
    'task.meet.delayed.name',
    'task.meet.transfer.street',
    'task.meet.transfer.name',
    'task.meet.assessment.checkpoint'
  ],
  transferPlan: { required: true, dimensions: ['wording', 'partner', 'setting'] },
  assessmentPlan: { required: true, freshnessRequired: true }
});

export const TASKS_MEET_PERSON = [
  task({
    id: 'task.meet.diagnostic.own_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'diagnostic',
    promptFamily: pf('production.speak.say_own_name', F.ownNameAsked),
    contextSignature: F.ownNameAsked,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …"], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.diagnostic.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.ask_name', F.askNameIntro),
    contextSignature: F.askNameIntro,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.input.scene',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.greeting_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.greeting_basic', F.greetingExchange),
    contextSignature: F.greetingExchange,
    stimulus: { type: 'dialogue', languageComponents: ['Hi', 'Hello'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['Hi', 'Hello'], requiredVocabulary: ['hi', 'hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.input.questions',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.identity_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.identity_question_basic', F.identityQExchange),
    contextSignature: F.identityQExchange,
    stimulus: { type: 'dialogue', languageComponents: ["What's your name?"] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.input.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'input',
    promptFamily: pf('interaction.ask_name', F.askNameModel),
    contextSignature: F.askNameModel,
    stimulus: { type: 'dialogue', languageComponents: ["What's your name?", 'My name is …'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ["What's your name?", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.retrieval.questions',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.identity_question_basic',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.identity_question_basic', F.identityQAudio),
    contextSignature: F.identityQAudio,
    stimulus: { type: 'audio_line', languageComponents: ["What's your name?"] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_identity_question'],
      options: [
        { id: 'ask_name', text: 'Họ đang hỏi tên của bạn.', correct: true },
        { id: 'greeting', text: 'Họ đang chào hỏi bạn.' },
        { id: 'ask_age', text: 'Họ đang hỏi tuổi của bạn.' }
      ]
    },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.retrieval.phrases',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'retrieval',
    promptFamily: pf('production.speak.say_own_name', F.ownNameCued),
    contextSignature: F.ownNameCued,
    stimulus: { type: 'cued_prompt', languageComponents: ["I'm …"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …", 'My name is …'], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.retrieval.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.ask_name', F.askNameCued),
    contextSignature: F.askNameCued,
    stimulus: { type: 'cued_prompt', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.guided',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.remediation.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'remediation',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: [] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.unaided',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.interaction.polite',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.respond_to_introduction',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.respond_to_introduction', F.politeNice),
    contextSignature: F.politeNice,
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['respond_to_introduction'] },
    language: { requiredChunks: ['Nice to meet you too'], requiredVocabulary: ['nice', 'meet'], requiredConstructions: [] }
  }),
  /* Delayed re-checks re-probe the REHEARSED family after the retention
   * lag — a delayed task on a novel family would measure transfer, not
   * retention, so its family deliberately equals the last independent
   * exchange's family. */
  task({
    id: 'task.meet.delayed.check',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.ask_name', F.askNamePartner),
    contextSignature: F.askNamePartner,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.delayed.name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'delayed_retrieval',
    promptFamily: pf('production.speak.say_own_name', F.ownNameAsked),
    contextSignature: F.ownNameAsked,
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    language: { requiredChunks: ["I'm …"], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  /* Held-out transfer: the same communicative function in a context
   * whose declared deltas (wording→cueTopology, partner→interlocutorRole,
   * setting→setting) all differ from every rehearsed family. */
  task({
    id: 'task.meet.transfer.street',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.ask_name', F.askNameStreet),
    contextSignature: F.askNameStreet,
    stimulus: { type: 'partner_turn', languageComponents: ["I'm Sam — and you are?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.transfer.name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'transfer',
    promptFamily: pf('production.speak.say_own_name', F.ownNameCheck),
    contextSignature: F.ownNameCheck,
    stimulus: { type: 'partner_turn', languageComponents: ['Tell me your name.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['state_own_name'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['My name is …', "I'm …"], requiredVocabulary: ['name'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.assessment.checkpoint',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.ask_name', F.askNameFull),
    contextSignature: F.askNameFull,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! Good to see you.'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet', 'state_own_name', 'ask_name'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.ask_name', 'production.speak.say_own_name', 'interaction.respond_to_introduction'],
      allowedLanguageRange: 'declared_target_range',
      answerRevealDuringAttempt: false
    },
    language: { requiredChunks: ["What's your name?", "I'm …"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  })
];

/* ── Fixture B — Order one drink ───────────────────────────── */

export const MISSION_ORDER_DRINK = makeMission({
  id: 'mission.order_drink',
  revision: 3,
  scenario: 'Order one drink politely in a cafe.',
  learnerGoal: 'Understand the offer question and order a drink.',
  targetCapabilities: ['interaction.request_item'],
  carrierCapabilities: ['reception.listen.drink_order_question_basic'],
  prerequisiteCapabilities: [],
  // No support capabilities declared — supports are demand-driven and
  // no mechanism yet routes to them; a dead surface only produces
  // planner intents the mission must block on.
  supportCapabilities: [],
  language: {
    assumedKnown: { chunks: [], vocabulary: [], constructions: [] },
    introduced: {
      chunks: ['What would you like?', 'Can I have …?', 'A coffee, please', 'Anything else?'],
      vocabulary: ['like', 'drink', 'coffee', 'tea', 'please'],
      constructions: []
    }
  },
  taskIds: [
    'task.drink.diagnostic.order',
    'task.drink.input.counter',
    'task.drink.retrieval.offer',
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

const CAFE = {
  setting: 'cafe',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'server',
  relationship: 'service'
};

const cafeSig = (fields) => ({ ...CAFE, ...fields });

const DF = {
  offerAudio: cafeSig({
    communicativeFunction: 'understand_offer_or_order_question',
    cueTopology: 'offer_audio',
    responseTopology: 'mc_meaning',
    lexicalDomain: 'food_drink'
  }),
  serviceExchange: cafeSig({
    communicativeFunction: 'understand_offer_or_order_question',
    cueTopology: 'service_exchange',
    responseTopology: 'none',
    lexicalDomain: 'food_drink'
  }),
  offerQuestion: cafeSig({
    communicativeFunction: 'request_item',
    cueTopology: 'offer_question',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  cuedRecall: cafeSig({
    communicativeFunction: 'request_item',
    cueTopology: 'cued_recall',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }),
  openCounter: {
    communicativeFunction: 'request_item',
    cueTopology: 'open_counter',
    setting: 'stall',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'vendor',
    relationship: 'service',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  },
  counterKiosk: {
    communicativeFunction: 'request_item',
    cueTopology: 'counter_exchange',
    setting: 'kiosk',
    register: 'casual',
    channel: 'f2f',
    interlocutorRole: 'server',
    relationship: 'service',
    responseTopology: 'request',
    lexicalDomain: 'food_drink'
  }
};

export const TASKS_ORDER_DRINK = [
  task({
    id: 'task.drink.diagnostic.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.input.counter',
    missionId: 'mission.order_drink',
    capabilityId: 'reception.listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: pf('reception.listen.drink_order_question_basic', DF.serviceExchange),
    contextSignature: DF.serviceExchange,
    stimulus: { type: 'dialogue', languageComponents: ['What would you like?', 'A coffee, please'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['What would you like?', 'A coffee, please'], requiredVocabulary: ['like', 'coffee', 'please'], requiredConstructions: [] }
  }),
  /* The carrier's comprehension check is post-input practice, not a
   * baseline probe: carriers rehearse opportunistically, so this is a
   * retrieval task over the offer question — the only eliciting unit
   * the carrier needs to unlock the target's diagnostic. */
  task({
    id: 'task.drink.retrieval.offer',
    missionId: 'mission.order_drink',
    capabilityId: 'reception.listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'retrieval',
    promptFamily: pf('reception.listen.drink_order_question_basic', DF.offerAudio),
    contextSignature: DF.offerAudio,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_offer_or_order_question'],
      options: [
        { id: 'offer', text: 'Họ hỏi bạn muốn gọi gì.', correct: true },
        { id: 'greeting', text: 'Họ chào hỏi bạn.' },
        { id: 'bill', text: 'Họ đưa bạn hóa đơn.' }
      ]
    },
    language: { requiredChunks: ['What would you like?'], requiredVocabulary: ['like'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.retrieval.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: pf('interaction.request_item', DF.cuedRecall),
    contextSignature: DF.cuedRecall,
    stimulus: { type: 'cued_prompt', languageComponents: ['Can I have …?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.guided',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.unaided',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.delayed.check',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: pf('interaction.request_item', DF.offerQuestion),
    contextSignature: DF.offerQuestion,
    stimulus: { type: 'partner_turn', languageComponents: ['Anything else?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.transfer.stall',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: pf('interaction.request_item', DF.openCounter),
    contextSignature: DF.openCounter,
    stimulus: { type: 'partner_turn', languageComponents: ['Yes? What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.assessment.checkpoint',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: pf('interaction.request_item', DF.counterKiosk),
    contextSignature: DF.counterKiosk,
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! For you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['request_item'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.request_item'],
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
