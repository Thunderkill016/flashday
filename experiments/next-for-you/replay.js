/*
 * Replay + counterfactual harness (spec §10).
 *
 * replayAt(state, policy, T): recompute the decision that would have
 * been made at T — the event log, the DecisionContext AND the clock
 * are truncated at T (future `now` leaks eligibility through due/age
 * gates — review BLOCKER-3 round 2).
 *
 * counterfactual(state, policies): run A/B/C side by side on the same
 * frozen state without mutating it, and diff their choices.
 */
import { POLICIES } from './policies.js';
import { emptyContext, contextAt } from './decision-context.js';

const withoutFuture = (events, t) => events.filter((e) => e.occurredAt <= t);

/* Recompute the decision "as of T": events, DecisionContext, and the
 * clock are all pinned at T — actions recorded after T AND any later
 * `now` must not influence a historical replay (BLOCKER 3 r1+r2). */
export function replayAt(state, policyName, t) {
  const policy = POLICIES[policyName];
  const sliced = {
    ...state,
    now: t,
    events: withoutFuture(state.events, t),
    decisionContext: contextAt(state.decisionContext, t)
  };
  return policy(sliced, { selection: state.selection });
}

/* Determinism probe: run the same policy twice on the same frozen
 * state; choices must be identical. */
export function replayDeterminism(state, policyName) {
  const policy = POLICIES[policyName];
  const a = policy(state, { selection: state.selection });
  const b = policy(state, { selection: state.selection });
  const key = (d) => `${d.chosen.kind}|${d.chosen.capabilityId}|${d.chosen.taskId}`;
  return { same: key(a) === key(b), a: key(a), b: key(b) };
}

/* Counterfactual: same state, all policies; returns per-policy choice
 * keys plus whether they agree. State is not mutated. */
export function counterfactual(state, names = ['A', 'B', 'C']) {
  const key = (d) => `${d.chosen.kind}@${d.chosen.capabilityId}:${d.chosen.taskId ?? 'none'}`;
  const out = {};
  for (const p of names) out[p] = key(POLICIES[p](state, { selection: state.selection }));
  const uniq = new Set(Object.values(out));
  return { choices: out, agree: uniq.size === 1 };
}
