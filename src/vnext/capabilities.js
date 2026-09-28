/*
 * vNext capability graph v0 (issue #42, docs/vnext/capability-model-v0.md).
 *
 * A capability is an observable ability under stated conditions — not a
 * lesson position. Prerequisites gate introduction; evidence requirements
 * gate claims. Vietnamese risk probes reference risk-priors.js and may
 * only trigger diagnostics, never mark weakness.
 */

export const MODALITIES = [
  'listening',
  'spoken_interaction',
  'spoken_production',
  'reading',
  'writing'
];

const cap = (c) => ({
  version: 1,
  conditions: { partnerCooperative: true, topicFamiliar: true, speechRate: 'slow_clear', supportAllowed: [] },
  prerequisites: [],
  language: { chunks: [], constructions: [], vocabulary: [] },
  evidence: { independentRequired: true, delayedRequired: true, transferRequired: true },
  vietnameseRiskProbes: [],
  ...c
});

/* The graph follows spec §5: perception capabilities ground production,
 * production grounds interaction, repair acts as a cross-mission support.
 */
export const CAPABILITIES = [
  cap({
    id: 'listen.greeting_basic',
    performance: 'Understand a basic greeting said to them.',
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['recognize_greeting'] },
    language: { chunks: ['Hi', 'Hello', 'Good morning'], vocabulary: ['hi', 'hello', 'morning'] },
    vietnameseRiskProbes: ['vn.english_intonation']
  }),
  cap({
    id: 'listen.identity_question_basic',
    performance: "Understand a simple identity question ('What's your name?', 'Where are you from?').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_identity_question'] },
    language: { chunks: ["What's your name?", 'Where are you from?'], constructions: ['wh_question_name'], vocabulary: ['name', 'from'] },
    vietnameseRiskProbes: ['vn.theta_eth', 'vn.english_intonation']
  }),
  cap({
    id: 'listen.drink_order_question_basic',
    performance: "Understand a basic drink-order question ('What would you like?').",
    modality: 'listening',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['understand_offer_or_order_question'] },
    language: { chunks: ['What would you like?', 'Anything else?'], vocabulary: ['like', 'drink'] },
    vietnameseRiskProbes: ['vn.english_intonation']
  }),
  cap({
    id: 'speak.say_own_name',
    performance: 'Say their own name intelligibly when asked.',
    modality: 'spoken_production',
    prerequisites: ['listen.identity_question_basic'],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['state_own_name'] },
    language: { chunks: ["I'm …", 'My name is …'], vocabulary: ['name'] },
    vietnameseRiskProbes: ['vn.word_final_consonants', 'vn.lexical_stress']
  }),
  cap({
    id: 'interact.greet',
    performance: 'Return a greeting in a short first-meeting exchange.',
    modality: 'spoken_interaction',
    prerequisites: ['listen.greeting_basic'],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['greet'] },
    language: { chunks: ['Hi', 'Hello'], vocabulary: ['hi', 'hello'] },
    vietnameseRiskProbes: ['vn.lexical_stress', 'vn.speaking_anxiety_support']
  }),
  cap({
    id: 'interact.ask_name',
    performance: "Ask another person's name in a short first-meeting exchange.",
    modality: 'spoken_interaction',
    prerequisites: ['listen.identity_question_basic', 'speak.say_own_name'],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['ask_name'] },
    language: { chunks: ["What's your name?"], constructions: ['wh_question_name'], vocabulary: ['name'] },
    vietnameseRiskProbes: ['vn.question_formation', 'vn.lexical_stress']
  }),
  cap({
    id: 'interact.respond_to_introduction',
    performance: "Respond politely to an introduction ('Nice to meet you').",
    modality: 'spoken_interaction',
    prerequisites: ['interact.ask_name'],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['respond_to_introduction'] },
    language: { chunks: ['Nice to meet you', 'Nice to meet you too'], vocabulary: ['nice', 'meet'] },
    vietnameseRiskProbes: ['vn.word_final_consonants', 'vn.theta_eth']
  }),
  cap({
    id: 'interact.ask_repeat',
    performance: 'Ask a partner to repeat when they did not catch something.',
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['ask_repeat'] },
    language: { chunks: ['Sorry?', 'Can you repeat that?', 'Again, please'], vocabulary: ['sorry', 'repeat', 'again'] },
    vietnameseRiskProbes: ['vn.speaking_anxiety_support', 'vn.inflectional_endings']
  }),
  cap({
    id: 'interact.signal_nonunderstanding',
    performance: "Signal that they did not understand ('I don't understand').",
    modality: 'spoken_interaction',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['signal_nonunderstanding'] },
    language: { chunks: ["I don't understand", "Sorry, I don't know"], constructions: ['negative_aux'], vocabulary: ['understand'] },
    vietnameseRiskProbes: ['vn.speaking_anxiety_support', 'vn.consonant_clusters']
  }),
  cap({
    id: 'interact.order_drink',
    performance: 'Order one drink politely in a cafe exchange.',
    modality: 'spoken_interaction',
    prerequisites: ['listen.drink_order_question_basic'],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: true, requiredFunctions: ['order_item'] },
    language: { chunks: ['Can I have …?', 'A coffee, please'], vocabulary: ['coffee', 'tea', 'please'] },
    vietnameseRiskProbes: ['vn.inflectional_endings', 'vn.lexical_stress']
  }),
  cap({
    id: 'read.simple_sign_or_menu_item',
    performance: 'Read a very simple sign or menu item (EXIT, OPEN, coffee, tea).',
    modality: 'reading',
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['read_sign_item'] },
    language: { vocabulary: ['open', 'closed', 'coffee', 'tea', 'exit'] }
  }),
  cap({
    id: 'write.personal_info_short',
    performance: 'Write one short personal-information response (name, country).',
    modality: 'writing',
    prerequisites: ['speak.say_own_name'],
    criteria: { meaningDelivered: true, intelligibleEnoughForPartner: false, requiredFunctions: ['write_identity_response'] },
    language: { chunks: ["I'm …", "I'm from …"], vocabulary: ['name', 'from'] },
    vietnameseRiskProbes: ['vn.copula_be', 'vn.articles']
  })
];

const INDEX = new Map(CAPABILITIES.map((c) => [c.id, c]));

export function capabilityById(id) {
  const c = INDEX.get(id);
  if (!c) throw new Error(`Unknown capability: ${id}`);
  return c;
}

/* Structural validation: unique ids, known modalities, existing
 * prerequisites, acyclic graph. Called by tests and content tooling —
 * the graph is authored data and must stay honest. */
export function validateGraph(capabilities) {
  const problems = [];
  const ids = new Set();
  for (const c of capabilities) {
    if (!c.id || typeof c.id !== 'string') problems.push('capability missing id');
    if (ids.has(c.id)) problems.push(`duplicate capability id: ${c.id}`);
    ids.add(c.id);
    if (!MODALITIES.includes(c.modality)) problems.push(`${c.id}: unknown modality ${c.modality}`);
    for (const p of c.prerequisites || []) {
      if (!capabilities.some((x) => x.id === p)) problems.push(`${c.id}: unknown prerequisite ${p}`);
    }
  }
  const local = new Map(capabilities.map((c) => [c.id, c]));
  const color = new Map();
  const visit = (id, path) => {
    if (color.get(id) === 'done') return;
    if (color.get(id) === 'open') {
      problems.push(`prerequisite cycle: ${[...path, id].join(' → ')}`);
      return;
    }
    color.set(id, 'open');
    for (const p of local.get(id)?.prerequisites || []) visit(p, [...path, id]);
    color.set(id, 'done');
  };
  for (const c of capabilities) visit(c.id, []);
  return problems;
}
