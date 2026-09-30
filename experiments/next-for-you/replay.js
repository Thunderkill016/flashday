/*
 * Counterfactual + no-future-leakage replay (spec §10/§28/§29).
 *
 * replayAt(state, t): recompute a decision over events filtered to
 * occurredAt ≤ t — identical state ⇒ identical choice, and events
 * after t can never influence the result.
 *
 * counterfactual(state, {A,B,C}): run all policies over the same
 * frozen state without mutating it, and diff their choices.
 */
import { POLICIES } from './policies.js';
import { emptyContext } from './decision-context.js';

const withoutFuture = (events, t) => events.filter((e) => e.occurredAt <= t);

export function replayAt(state, policyName, t) {
  const policy = POLICIES[policyName];
  const sliced = { ...state, events: withoutFuture(state.events, t) };
  return policy(sliced, { selection: state.selection });
}

/* Determinism probe: same inputs → same decisionId-free choice fields. */
export function replayDeterminism(state, policyName) {
  const a = policyOutput(POLICIES[policyName]({ ...state, decisionContext: state.decisionContext ?? emptyContext('a') }, { selection: state.selection }));
  const b = policyOutput(POLICIES[policyName]({ ...state, decisionContext: state.decisionContext ?? emptyContext('a') }, { selection: state.selection }));
  return { same: a === b, a, b };
}

export function counterfactual(state) {
  const out = {};
  for (const name of Object.keys(POLICIES)) {
    const frozen = { ...state, decisionContext: state.decisionContext ?? emptyContext('cf') };
    out[name] = POLICIES[name](frozen, { selection: state.selection });
  }
  return {
    choices: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.chosen.kind}@${v.chosen.capabilityId ?? 'none'}`])),
    differences: diffChoices(out),
    raw: out
  };
}

function policyOutput(d) {
  return `${d.chosen.kind}|${d.chosen.capabilityId}|${d.chosen.taskId}`;
}

function diffChoices(out) {
  const names = Object.keys(out);
  const diffs = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = policyOutput(out[names[i]]);
      const b = policyOutput(out[names[j]]);
      if (a !== b) diffs.push(`${names[i]}→${a} vs ${names[j]}→${b}`);
    }
  }
  return diffs;
}
