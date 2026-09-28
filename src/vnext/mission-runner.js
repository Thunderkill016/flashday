/*
 * vNext mission runner / task selector (issue #47).
 *
 * Turns the planner's capability-level intent into a CONCRETE registered
 * TaskContract inside a mission. The selector never invents a task or a
 * prompt — it can only choose among `mission.taskIds`, and it maps
 * planner kinds to task purposes conservatively:
 *
 *   diagnostic_probe   → diagnostic
 *   resume             → pending input/notice phase, else next elicitation
 *   expose             → input / notice (else first eliciting task once
 *                        input was delivered — explained in `reason`)
 *   retry              → remediation
 *   independent_attempt→ retrieval / production / interaction
 *   delayed_retrieval  → delayed_retrieval
 *   transfer           → transfer
 *   checkpoint         → assessment
 *
 * A planner intent with no compatible mission task is recorded and the
 * capability skipped for this call — the selector never substitutes a
 * different semantic purpose to fill a gap. When nothing serveable
 * remains the result is `blocked` (with the uncovered intents listed)
 * or `idle` when no intent existed at all.
 *
 * The assessment task runs last: only when the mission requires it, it
 * is still unconsumed, and its capability has actually reached
 * TRANSFERRED — a fresh assessment samples achieved ability, it never
 * substitutes for it.
 */
import { projectLearnerState } from './projection.js';
import { planNext } from './planner.js';
import { bindAttempt, bindObservation } from './bind.js';

const ELICITING = ['diagnostic', 'retrieval', 'production', 'interaction', 'remediation', 'delayed_retrieval', 'transfer', 'assessment'];
const EXPOSURE = ['input', 'notice'];

const INTENT_PURPOSES = {
  diagnostic_probe: ['diagnostic'],
  expose: EXPOSURE,
  resume: ELICITING,
  retry: ['remediation'],
  independent_attempt: ['retrieval', 'production', 'interaction'],
  delayed_retrieval: ['delayed_retrieval'],
  transfer: ['transfer'],
  checkpoint: ['assessment']
};

const ready = (task, plan, reason) => ({
  status: 'ready', taskId: task.id, capabilityId: task.capabilityId, purpose: task.purpose, reason
});

export function nextMissionTask({ learnerId, mission, tasks, capabilities, events, riskPriors = [], now }) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const missionTasks = (mission.taskIds ?? []).map((id) => byId.get(id)).filter(Boolean);

  const mine = events.filter((e) => e.learnerId === learnerId);
  const eventsByTask = new Set(mine.map((e) => e.taskId));
  const attemptsByTask = new Set(mine.filter((e) => e.attempt?.outcome != null).map((e) => e.taskId));

  /* Phase 0 — declared baseline diagnostics run once, in mission order.
   * The mission's baseline must be sampled before the planner's generic
   * ordering: a diagnostic establishes what is actually known, and
   * until every declared probe has produced an outcome the planner
   * cannot see an honest picture. */
  for (const t of missionTasks) {
    if (t.purpose === 'diagnostic' && !attemptsByTask.has(t.id)) {
      return ready(t, null, 'baseline diagnostic declared by the mission — not yet sampled');
    }
  }

  /* Planner intents are capability-scoped; the mission's declared
   * capability surface limits what the selector may route to — a
   * capability outside the mission never gets a task from inside it. */
  const surface = new Set([
    ...(mission.targetCapabilities ?? []),
    ...(mission.prerequisiteCapabilities ?? []),
    ...(mission.supportCapabilities ?? [])
  ]);
  const scopedCaps = capabilities.filter((c) => surface.has(c.id));

  /* Exposure-phase tasks are one-shot: re-running consumed input is
   * meaningless, so they only qualify while unrun. Eliciting tasks may
   * legitimately repeat (remediation loops, another delayed check) —
   * prefer unrun, fall back to the first declared. */
  const pick = (capId, purposes, { unattemptedOnly = false } = {}) => {
    const candidates = missionTasks.filter((t) => t.capabilityId === capId && purposes.includes(t.purpose));
    const fresh = candidates.filter((t) => !attemptsByTask.has(t.id) && !eventsByTask.has(t.id));
    return fresh[0] ?? (unattemptedOnly ? null : candidates[0] ?? null);
  };

  const skipped = [];
  const excluded = new Set();
  for (;;) {
    const plan = planNext(learnerId, events, {
      capabilities: scopedCaps.filter((c) => !excluded.has(c.id)),
      tasks,
      riskPriors,
      now
    });
    if (plan.kind === 'idle') break;
    let task = null;
    if (plan.kind === 'expose') {
      task = pick(plan.capabilityId, EXPOSURE, { unattemptedOnly: true })
        /* Input already delivered — proceed to the first unrun
         * elicitation rather than re-exposing forever. */
        ?? pick(plan.capabilityId, ELICITING, { unattemptedOnly: true });
    } else if (plan.kind === 'resume') {
      task = pick(plan.capabilityId, EXPOSURE, { unattemptedOnly: true })
        ?? pick(plan.capabilityId, ELICITING, { unattemptedOnly: true });
    } else {
      task = pick(plan.capabilityId, INTENT_PURPOSES[plan.kind] ?? []);
    }
    if (task) {
      return ready(task, plan, `${plan.kind} on ${plan.capabilityId}: ${plan.reason}`);
    }
    skipped.push(`${plan.capabilityId}: planner wants '${plan.kind}' but the mission has no compatible task (${(INTENT_PURPOSES[plan.kind] ?? EXPOSURE).join('/')})`);
    excluded.add(plan.capabilityId);
  }

  /* Assessment is the mission's closing step — it runs once, after the
   * capability it samples has actually proven transfer. It is never a
   * substitute for transfer work. */
  const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks);
  for (const t of missionTasks) {
    if (t.purpose === 'assessment' && mission.assessmentPlan?.required && !attemptsByTask.has(t.id)) {
      if (byCapability.get(t.capabilityId)?.milestones.transferred) {
        return ready(t, null, 'assessment plan requires a fresh sample after transfer');
      }
      skipped.push(`${t.capabilityId}: assessment '${t.id}' waits for TRANSFERRED`);
    }
  }

  if (skipped.length) {
    return { status: 'blocked', taskId: null, capabilityId: null, purpose: null, reason: skipped.join('; ') };
  }
  return { status: 'idle', taskId: null, capabilityId: null, purpose: null, reason: 'no planner intents and no pending assessment — mission plan exhausted' };
}

/* Headless trace helper (issue #47 §8): drives a scripted learner
 * through the mission — selector → binder → append → snapshot — and
 * returns an audit log of why each step was taken and what state the
 * capability was in before/after. Diagnostic output only, never UI.
 *
 *   act(task, { step, beforeState }) → array of raw event specs:
 *     { observe: 'exposure'|'support_use'|'feedback', ...raw }
 *     { attempt fields..., support, evaluation }  → bindAttempt
 *   nowAt(step) → deterministic timestamp for the selection call.
 */
export function runMissionTrace({ learnerId, mission, tasks, capabilities, events = [], riskPriors = [], nowAt, act, maxSteps = 60 }) {
  const log = [...events];
  const trace = [];
  for (let step = 1; step <= maxSteps; step++) {
    const now = nowAt ? nowAt(step) : undefined;
    const sel = nextMissionTask({ learnerId, mission, tasks, capabilities, events: log, riskPriors, now });
    const task = sel.taskId ? tasks.find((t) => t.id === sel.taskId) : null;
    const cap = task ? capabilities.find((c) => c.id === task.capabilityId) : null;
    const beforeState = cap
      ? projectLearnerState(learnerId, log, capabilities, tasks).byCapability.get(cap.id).state
      : null;
    if (sel.status !== 'ready' || !task || !cap) {
      trace.push({ step, taskId: sel.taskId, purpose: sel.purpose, reason: sel.reason, status: sel.status, beforeState, afterState: beforeState });
      break;
    }
    const acts = act(task, { step, beforeState, now }) ?? [];
    for (const raw of acts) {
      const { observe, ...rest } = raw;
      log.push(observe
        ? bindObservation(task, cap, { eventType: observe, ...rest })
        : bindAttempt(task, cap, rest));
    }
    const afterState = projectLearnerState(learnerId, log, capabilities, tasks).byCapability.get(cap.id).state;
    trace.push({ step, taskId: task.id, purpose: task.purpose, reason: sel.reason, status: 'ready', beforeState, afterState, eventCount: log.length });
  }
  return { trace, events: log };
}
