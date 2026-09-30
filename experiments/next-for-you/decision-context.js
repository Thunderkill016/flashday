/*
 * DecisionContext (spec §5): a pure, serializable record of the current
 * decision episode. No hidden planner state — the same evidence +
 * curriculum + context + policy must reproduce the same decision.
 *
 * Deliberately excluded: elapsedActiveMs / any fatigue proxy — session
 * fatigue cannot be measured reliably in v0, so nothing fakes it.
 */

const CONTEXT_VERSION = 'vnext.decision-context.v1';

export function emptyContext(decisionEpisodeId = 'ep0', sessionId = 'ses0') {
  return {
    version: CONTEXT_VERSION,
    decisionEpisodeId,
    sessionId,
    actionsChosen: [],        // {kind, capabilityId, taskId, atDecision}
    counts: {
      diagnostic: 0,
      assessment: 0,
      retrieval: 0,
      correction: 0,
      support: 0,
      transfer: 0,
      newInput: 0,
      continuation: 0
    },
    recentCapabilities: [],   // most-recent-last
    recentTaskIds: [],
    lastActedCapabilityId: null,
    currentThreadCapabilityId: null  // pedagogical thread only — see THREAD_OWNERS
  };
}

/* Context snapshot "as of T": rebuild a context whose actions are
 * truncated at occurredAt ≤ t so future actions cannot leak into a
 * historical replay (review BLOCKER 3). */
export function contextAt(ctx, t) {
  if (!ctx) return ctx;
  let rebuilt = { ...emptyContext(ctx.decisionEpisodeId, ctx.sessionId) };
  for (const a of ctx.actionsChosen.filter((a) => a.atDecision != null && a.atDecision <= t)) {
    rebuilt = recordChoice(rebuilt, { kind: a.kind, capabilityId: a.capabilityId, taskId: a.taskId, timestamp: a.atDecision });
  }
  return rebuilt;
}

const COUNT_OF_KIND = {
  diagnostic_probe: 'diagnostic',
  assessment: 'assessment',
  due_retrieval: 'retrieval',
  delayed_retrieval: 'retrieval',
  correction: 'correction',
  retry: 'correction',
  support_demand: 'support',
  transfer: 'transfer',
  new_input: 'newInput',
  expose: 'newInput',
  mission_continuation: 'continuation',
  independent_attempt: 'continuation'
};

/* Kinds that own the pedagogical "learning thread". Interruptions —
 * support substrate probes, due review, transfer checks, assessment —
 * update lastActedCapabilityId but must NOT steal the thread
 * (review MEDIUM-9): hysteresis belongs to what the learner is
 * currently learning, not whatever was served last. */
const THREAD_OWNERS = new Set([
  'mission_continuation', 'new_input', 'independent_attempt',
  'correction', 'refresh', 'diagnostic_probe', 'resume_in_flight'
]);

/* Record a chosen action — returns a NEW context (immutable update so a
 * recorded context is never retro-mutated by later decisions). */
export function recordChoice(ctx, { kind, capabilityId, taskId, timestamp }) {
  const counts = { ...ctx.counts };
  const bucket = COUNT_OF_KIND[kind];
  if (bucket) counts[bucket] += 1;
  return {
    ...ctx,
    actionsChosen: [...ctx.actionsChosen, { kind, capabilityId, taskId, atDecision: timestamp }],
    counts,
    recentCapabilities: capabilityId
      ? [...ctx.recentCapabilities.filter((c) => c !== capabilityId), capabilityId].slice(-8)
      : ctx.recentCapabilities,
    recentTaskIds: taskId
      ? [...ctx.recentTaskIds.filter((t) => t !== taskId), taskId].slice(-16)
      : ctx.recentTaskIds,
    lastActedCapabilityId: capabilityId ?? ctx.lastActedCapabilityId,
    currentThreadCapabilityId: THREAD_OWNERS.has(kind) && capabilityId
      ? capabilityId
      : ctx.currentThreadCapabilityId
  };
}
