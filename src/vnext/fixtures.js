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
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.vN
 * and every task carries a contextSignature — the family's auditable
 * identity. Tasks that share a family share a signature; a transfer or
 * assessment family must differ from every rehearsed family on a
 * declared signature field. `tests/vnext-curriculum.test.mjs` enforces
 * all of this via curriculum-checks.js.
 */
import { capabilityById } from './capabilities.js';
import { makeMission, makeTask } from './contracts.js';

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

/* Canonical prompt-family id: the signature fields ARE the id —
 *   pf.<capabilityId>.<cueTopology>.<setting>.<register>.<channel>.vN
 * The curriculum checker re-derives them, so an id that does not match
 * its declared signature fails validation. */

/* ── Fixture A — Meet a new person ─────────────────────────── */

export const MISSION_MEET_PERSON = makeMission({
  id: 'mission.meet_new_person',
  revision: 2,
  scenario: 'Meet another learner for the first time.',
  learnerGoal: 'Exchange a greeting and names politely.',
  /* Claim-bearing targets: the mission owes each of them practiced,
   * delayed, held-out transfer, and fresh-assessment coverage. */
  targetCapabilities: [
    'production.speak.say_own_name',
    'interaction.ask_name'
  ],
  /* Carriers are rehearsed for retention and context — they get
   * baseline/input/retrieval evidence but this mission makes no
   * transfer-level claim about them. */
  carrierCapabilities: [
    'reception.listen.greeting_basic',
    'interaction.greet',
    'reception.listen.identity_question_basic',
    'interaction.respond_to_introduction'
  ],
  supportCapabilities: ['interaction.ask_repeat'],
  language: {
    assumedKnown: { chunks: [], vocabulary: [], constructions: [] },
    introduced: {
      chunks: [
        'Hi', 'Hello', "I'm …", 'My name is …', "What's your name?",
        'Nice to meet you', 'Nice to meet you too', 'Sorry?', 'Can you repeat that?'
      ],
      vocabulary: ['name', 'nice', 'meet', 'hi', 'hello', 'sorry', 'repeat'],
      constructions: ['wh_question_name']
    }
  },
  taskIds: [
    'task.meet.diagnostic.opening',
    'task.meet.diagnostic.listen',
    'task.meet.diagnostic.identity_q',
    'task.meet.diagnostic.own_name',
    'task.meet.diagnostic.ask_name',
    'task.meet.diagnostic.repair',
    'task.meet.diagnostic.polite',
    'task.meet.input.scene',
    'task.meet.input.questions',
    'task.meet.input.ask_name',
    'task.meet.retrieval.questions',
    'task.meet.retrieval.phrases',
    'task.meet.retrieval.ask_name',
    'task.meet.interaction.guided',
    'task.meet.remediation.repair',
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
    id: 'task.meet.diagnostic.opening',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.greet',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: 'pf.interaction.greet.opening_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'greet',
      cueTopology: 'opening_exchange',
      responseTopology: 'greeting_return',
      lexicalDomain: 'greetings'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['Hi'] },
    response: { type: 'spoken_turn', requiredFunctions: ['greet'] },
    language: { requiredChunks: ['Hi'], requiredVocabulary: ['hi'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.diagnostic.listen',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.greeting_basic',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: 'pf.reception.listen.greeting_basic.greeting_audio.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'recognize_greeting',
      cueTopology: 'greeting_audio',
      responseTopology: 'mc_meaning',
      lexicalDomain: 'greetings'
    }),
    stimulus: { type: 'audio_line', languageComponents: ['Hello'] },
    response: {
      type: 'choice',
      requiredFunctions: ['recognize_greeting'],
      options: [
        { id: 'greeting', text: 'Họ chào bạn.', correct: true },
        { id: 'ask_name', text: 'Họ hỏi tên bạn.' },
        { id: 'farewell', text: 'Họ tạm biệt bạn.' }
      ]
    },
    language: { requiredChunks: ['Hello'], requiredVocabulary: ['hello'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.diagnostic.identity_q',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.identity_question_basic',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: 'pf.reception.listen.identity_question_basic.identity_q_audio.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'understand_identity_question',
      cueTopology: 'identity_q_audio',
      responseTopology: 'mc_meaning',
      lexicalDomain: 'identity'
    }),
    stimulus: { type: 'audio_line', languageComponents: ["What's your name?"] },
    response: {
      type: 'choice',
      requiredFunctions: ['understand_identity_question'],
      options: [
        { id: 'ask_name', text: 'Họ hỏi tên bạn.', correct: true },
        { id: 'greeting', text: 'Họ chào hỏi bạn.' },
        { id: 'ask_health', text: 'Họ hỏi bạn có khỏe không.' }
      ]
    },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.diagnostic.own_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'production.speak.say_own_name',
    modality: 'spoken_production',
    purpose: 'diagnostic',
    promptFamily: 'pf.production.speak.say_own_name.asked_own_name.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'state_own_name',
      cueTopology: 'asked_own_name',
      responseTopology: 'name_statement',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.ask_name.self_intro.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'self_intro',
      responseTopology: 'wh_question',
      lexicalDomain: 'identity'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['Hi'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.diagnostic.repair',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_repeat',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: 'pf.interaction.ask_repeat.missed_line.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_repeat',
      cueTopology: 'missed_line',
      responseTopology: 'repair_request',
      lexicalDomain: 'repair'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['(mumbled) … Sam'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_repeat'] },
    language: { requiredChunks: ['Sorry?', 'Can you repeat that?'], requiredVocabulary: ['sorry', 'repeat'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.diagnostic.polite',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.respond_to_introduction',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: 'pf.interaction.respond_to_introduction.nice_to_meet_you.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'respond_to_introduction',
      cueTopology: 'nice_to_meet_you',
      responseTopology: 'politeness_return',
      lexicalDomain: 'greetings'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['Nice to meet you'] },
    response: { type: 'spoken_turn', requiredFunctions: ['respond_to_introduction'] },
    language: { requiredChunks: ['Nice to meet you too'], requiredVocabulary: ['nice', 'meet'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.input.scene',
    missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.greeting_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: 'pf.reception.listen.greeting_basic.greeting_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'recognize_greeting',
      cueTopology: 'greeting_exchange',
      responseTopology: 'none',
      lexicalDomain: 'greetings'
    }),
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
    promptFamily: 'pf.reception.listen.identity_question_basic.identity_q_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'understand_identity_question',
      cueTopology: 'identity_q_exchange',
      responseTopology: 'none',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.ask_name.model_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'model_exchange',
      responseTopology: 'none',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.reception.listen.identity_question_basic.identity_q_audio.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'understand_identity_question',
      cueTopology: 'identity_q_audio',
      responseTopology: 'mc_meaning',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.production.speak.say_own_name.cued_recall.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'state_own_name',
      cueTopology: 'cued_recall',
      responseTopology: 'name_statement',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.ask_name.cued_recall.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'cued_recall',
      responseTopology: 'wh_question',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.ask_name.partner_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'partner_exchange',
      responseTopology: 'wh_question',
      lexicalDomain: 'identity'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  }),
  task({
    id: 'task.meet.remediation.repair',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_repeat',
    modality: 'spoken_interaction',
    purpose: 'remediation',
    promptFamily: 'pf.interaction.ask_repeat.missed_line.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_repeat',
      cueTopology: 'missed_line',
      responseTopology: 'repair_request',
      lexicalDomain: 'repair'
    }),
    stimulus: { type: 'partner_turn', languageComponents: [] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_repeat'] },
    language: { requiredChunks: ['Sorry?', 'Can you repeat that?'], requiredVocabulary: ['sorry', 'repeat'], requiredConstructions: [] }
  }),
  task({
    id: 'task.meet.remediation.ask_name',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'remediation',
    promptFamily: 'pf.interaction.ask_name.partner_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'partner_exchange',
      responseTopology: 'wh_question',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.ask_name.partner_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'partner_exchange',
      responseTopology: 'wh_question',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.respond_to_introduction.nice_to_meet_you.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'respond_to_introduction',
      cueTopology: 'nice_to_meet_you',
      responseTopology: 'politeness_return',
      lexicalDomain: 'greetings'
    }),
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
    promptFamily: 'pf.interaction.ask_name.partner_exchange.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'ask_name',
      cueTopology: 'partner_exchange',
      responseTopology: 'wh_question',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.production.speak.say_own_name.asked_own_name.personal.casual.f2f.v1',
    contextSignature: sig({
      communicativeFunction: 'state_own_name',
      cueTopology: 'asked_own_name',
      responseTopology: 'name_statement',
      lexicalDomain: 'identity'
    }),
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
    promptFamily: 'pf.interaction.ask_name.open_social.street.casual.f2f.v1',
    contextSignature: {
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
    promptFamily: 'pf.production.speak.say_own_name.name_check.educational.neutral.f2f.v1',
    contextSignature: {
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
    promptFamily: 'pf.interaction.ask_name.full_exchange.community.casual.f2f.v1',
    contextSignature: {
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
  revision: 2,
  scenario: 'Order one drink politely in a cafe.',
  learnerGoal: 'Understand the offer question and order a drink.',
  targetCapabilities: ['interaction.order_drink'],
  carrierCapabilities: ['reception.listen.drink_order_question_basic'],
  prerequisiteCapabilities: [],
  // No support capabilities declared — no task in this mission can
  // probe or teach them, and an unservable surface only produces
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
    'task.drink.diagnostic.offer',
    'task.drink.diagnostic.order',
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

const CAFE = {
  setting: 'cafe',
  register: 'casual',
  channel: 'f2f',
  interlocutorRole: 'server',
  relationship: 'service'
};

const cafeSig = (fields) => ({ ...CAFE, ...fields });

export const TASKS_ORDER_DRINK = [
  task({
    id: 'task.drink.diagnostic.offer',
    missionId: 'mission.order_drink',
    capabilityId: 'reception.listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'diagnostic',
    promptFamily: 'pf.reception.listen.drink_order_question_basic.offer_audio.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'understand_offer_or_order_question',
      cueTopology: 'offer_audio',
      responseTopology: 'mc_meaning',
      lexicalDomain: 'food_drink'
    }),
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
    id: 'task.drink.diagnostic.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'diagnostic',
    promptFamily: 'pf.interaction.order_drink.offer_question.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'order_item',
      cueTopology: 'offer_question',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.input.counter',
    missionId: 'mission.order_drink',
    capabilityId: 'reception.listen.drink_order_question_basic',
    modality: 'listening',
    purpose: 'input',
    promptFamily: 'pf.reception.listen.drink_order_question_basic.service_exchange.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'understand_offer_or_order_question',
      cueTopology: 'service_exchange',
      responseTopology: 'none',
      lexicalDomain: 'food_drink'
    }),
    stimulus: { type: 'dialogue', languageComponents: ['What would you like?', 'A coffee, please'] },
    response: { type: 'none', requiredFunctions: [] },
    language: { requiredChunks: ['What would you like?', 'A coffee, please'], requiredVocabulary: ['like', 'coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.retrieval.order',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'retrieval',
    promptFamily: 'pf.interaction.order_drink.cued_recall.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'order_item',
      cueTopology: 'cued_recall',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    }),
    stimulus: { type: 'cued_prompt', languageComponents: ['Can I have …?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['Can I have …?', 'A coffee, please'], requiredVocabulary: ['coffee', 'tea', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.guided',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'pf.interaction.order_drink.offer_question.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'order_item',
      cueTopology: 'offer_question',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: true },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.interaction.unaided',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'pf.interaction.order_drink.offer_question.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'order_item',
      cueTopology: 'offer_question',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['What would you like?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.delayed.check',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'delayed_retrieval',
    promptFamily: 'pf.interaction.order_drink.offer_question.cafe.casual.f2f.v1',
    contextSignature: cafeSig({
      communicativeFunction: 'order_item',
      cueTopology: 'offer_question',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    }),
    stimulus: { type: 'partner_turn', languageComponents: ['Anything else?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.transfer.stall',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'transfer',
    promptFamily: 'pf.interaction.order_drink.open_counter.stall.casual.f2f.v1',
    contextSignature: {
      communicativeFunction: 'order_item',
      cueTopology: 'open_counter',
      setting: 'stall',
      register: 'casual',
      channel: 'f2f',
      interlocutorRole: 'vendor',
      relationship: 'service',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    },
    stimulus: { type: 'partner_turn', languageComponents: ['Yes? What can I get you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording', 'partner', 'setting'] },
    language: { requiredChunks: ['A coffee, please'], requiredVocabulary: ['coffee', 'please'], requiredConstructions: [] }
  }),
  task({
    id: 'task.drink.assessment.checkpoint',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.order_drink',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: 'pf.interaction.order_drink.counter_exchange.kiosk.casual.f2f.v1',
    contextSignature: {
      communicativeFunction: 'order_item',
      cueTopology: 'counter_exchange',
      setting: 'kiosk',
      register: 'casual',
      channel: 'f2f',
      interlocutorRole: 'server',
      relationship: 'service',
      responseTopology: 'request',
      lexicalDomain: 'food_drink'
    },
    stimulus: { type: 'partner_turn', languageComponents: ['Hi! For you?'] },
    response: { type: 'spoken_turn', requiredFunctions: ['order_item'] },
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    assessment: {
      capabilitySample: ['interaction.order_drink'],
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
