/*
 * vNext deterministic evaluator registry (issue #55, research R4 on #49).
 *
 * `evaluation.contractId` names a scoring SPEC, not a task. The registry
 * maps each declared contract id to the deterministic scorer that may
 * produce an outcome under it. Two contracts exist in v0:
 *
 *   eval.required_functions.v1
 *     For free-response tasks. Every declared
 *     task.response.requiredFunctions must be evidenced by a structured
 *     phrase match (mission-checks canonical form — word boundaries,
 *     contraction expansion, Vietnamese diacritic folding). Outcome:
 *     all functions matched → 'success', some → 'partial', none → 'fail'.
 *
 *   eval.choice.correct.v1
 *     For response.type 'choice'. The learner submits an option id;
 *     success iff that option is flagged correct in task.response.options.
 *
 * Unknown contract ids score NOTHING — an evaluator the engine cannot
 * name must never mint an outcome (fail closed).
 */
import { meetsCheck } from '../core/mission-checks.js';

export const EVALUATOR_VERSION = 1;

/* Communicative-function matchers. Each lists surface patterns matched
 * on word boundaries after canonicalisation; '<name>' resolves to the
 * learner's own name captured for the run. Strict by design — 'and you?'
 * alone is NOT asking a name, 'your namesake' is not 'your name'. */
const FUNCTION_MATCHERS = {
  greet: {
    match: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
  },
  ask_name: {
    match: [
      'what is your name',
      'your name please',
      'may i know your name',
      'can i know your name',
      'may i have your name',
      'can i have your name',
      'tell me your name'
    ]
  },
  state_own_name: {
    match: ['i am <name>', 'my name is <name>', 'call me <name>', '<name>', 'im <name>']
  },
  ask_repeat: {
    match: [
      'sorry',
      'can you repeat that',
      'can you repeat',
      'could you repeat that',
      'repeat please',
      'say again',
      'again please',
      'one more time'
    ]
  },
  respond_to_introduction: {
    match: ['nice to meet you too', 'nice to meet you', 'you too', 'likewise']
  },
  signal_nonunderstanding: {
    match: ['i do not understand', 'i do not know', 'sorry i do not know', 'i do not get it']
  },
  order_item: {
    match: [
      'a coffee please',
      'a tea please',
      'coffee please',
      'tea please',
      'one coffee please',
      'one tea please',
      'can i have a coffee',
      'can i have a tea',
      'can i have coffee',
      'can i have tea',
      'could i have a coffee',
      'could i have a tea',
      'i would like a coffee',
      'i would like a tea',
      'i d like a coffee',
      'i d like a tea'
    ]
  },
  // Comprehension functions are probed by choice tasks in v0 — a free
  // text field cannot evidence them, so the matchers fail closed.
  recognize_greeting: { match: [] },
  understand_identity_question: { match: [] },
  understand_offer_or_order_question: { match: [] },
  read_sign_item: { match: [] },
  write_identity_response: { match: [] }
};

const resolveName = (check, learnerName) => {
  if (!learnerName) return check;
  return {
    ...check,
    match: check.match.map((p) => p.split('<name>').join(learnerName))
  };
};

const scoreFunctions = (task, response, { learnerName } = {}) => {
  const required = task.response?.requiredFunctions ?? [];
  const text = typeof response === 'string' ? response : response?.text ?? '';
  const results = required.map((fn) => {
    const check = FUNCTION_MATCHERS[fn];
    const met = check ? meetsCheck(text, resolveName(check, learnerName)) : false;
    return { fn, met, known: Boolean(check) };
  });
  const met = results.filter((r) => r.met).length;
  const outcome = met === results.length && results.length > 0
    ? 'success'
    : met > 0 ? 'partial' : 'fail';
  return {
    outcome,
    functions: results,
    missed: results.filter((r) => !r.met).map((r) => r.fn)
  };
};

const scoreChoice = (task, optionId) => {
  const options = task.response?.options ?? [];
  const chosen = options.find((o) => o.id === optionId);
  const correct = options.filter((o) => o.correct === true);
  return {
    outcome: chosen && correct.some((o) => o.id === chosen.id) ? 'success' : 'fail',
    functions: (task.response?.requiredFunctions ?? []).map((fn) => ({ fn, met: chosen ? correct.some((o) => o.id === chosen.id) : false, known: true })),
    missed: chosen && correct.some((o) => o.id === chosen.id) ? [] : (task.response?.requiredFunctions ?? [])
  };
};

export const EVALUATORS = {
  'eval.required_functions.v1': {
    contractId: 'eval.required_functions.v1',
    describe: 'score = all declared requiredFunctions evidenced by structured match',
    score: (task, response, ctx) => scoreFunctions(task, response, ctx)
  },
  'eval.choice.correct.v1': {
    contractId: 'eval.choice.correct.v1',
    describe: 'success iff chosen option flagged correct in task.response.options',
    score: (task, response) => scoreChoice(task, response?.optionId ?? response)
  }
};

/* Evaluate a learner response under the task's declared contract.
 * Returns null for an unregistered contract — the caller must then
 * record no outcome (never invent one). */
export function evaluateAttempt(task, response, ctx = {}) {
  const evaluator = EVALUATORS[task.evaluation?.contractId];
  if (!evaluator) return null;
  return evaluator.score(task, response, ctx);
}
