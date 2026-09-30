/*
 * vNext deterministic planner (issue #42, architecture.md).
 *
 * Picks the learner's next action from evidence — inspectable, no model.
 * Priority order (spec):
 *   1. resume safe in-flight work;
 *   2. due retrieval;
 *   3. remediation — only for capabilities that were ever taught;
 *   4. scheduled transfer;
 *   5. continue current mission (supported → unaided attempt);
 *   6. diagnostic probes + introduce next eligible capability.
 *
 * A baseline failure is a diagnostic, not remediation: retrying an
 * untaught capability is pointless, so a capability that has never had a
 * supported/independent success is routed to teaching, not retry.
 *
 * Every action carries a reason so the plan is explainable.
 */
import { RETENTION_DELAY_MS, projectLearnerState } from './projection.js';
import { priorById } from './risk-priors.js';
import { resolvePolicy } from './policy.js';

export function planNext(learnerId, events, { capabilities, tasks = [], riskPriors = [], now, retentionDelayMs, policy, skipIntentFor, roles }) {
  const pol = resolvePolicy(policy);
  const lag = retentionDelayMs ?? pol.retention.minLagMs;
  const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks, { retentionDelayMs: lag, policy: pol });
  const priorMap = new Map(riskPriors.map((p) => [p.id, p]));

  /* Mission roles decide how a never-seen capability is introduced
   * (R6): targets owe a baseline probe; carriers — and declared
   * prerequisites — rehearse context opportunistically with no
   * baseline at all; supports are demand-driven only, so the planner
   * leaves them alone until evidence exists (rules 1–6a can still
   * reach them once an attempt produced some). Callers without a
   * mission (null) keep the original probe-or-expose behavior. */
  const roleOf = roles
    ? (id) => (roles.targets?.has(id) ? 'target' : roles.supports?.has(id) ? 'support' : 'carrier')
    : () => null;

  /* `skipIntentFor` holds 'capabilityId|intentKind' keys: it silences
   * ONE kind of intent for a capability (the selector has no servable
   * task for that intent) WITHOUT removing the capability itself —
   * excluded caps still count as prerequisites, and their OTHER
   * intents still route: a delayed check with no task must not also
   * kill that same capability's pending transfer intent. */
  const skipped = (id, kind) => skipIntentFor?.has(`${id}|${kind}`) === true;

  /* 1. Resume in-flight work: the encounter started but no attempt
   *    outcome exists yet. */
  for (const c of capabilities) {
    if (skipped(c.id, 'resume')) continue;
    const s = byCapability.get(c.id);
    if (s.state === 'EXPOSED' && s.lastAttemptOutcome == null) {
      return { kind: 'resume', capabilityId: c.id, reason: 'encounter started, no attempt recorded yet' };
    }
  }

  /* 2. Due retrieval: an independent ability whose last unaided success
   *    is older than the retention window goes back in for a delayed
   *    check. Earliest due first. A FAILED due check is remediation
   *    (rule 3), not a reschedule — otherwise the planner re-queues
   *    delayed_retrieval forever after each failure. */
  let due = null;
  for (const c of capabilities) {
    if (skipped(c.id, 'delayed_retrieval')) continue;
    const s = byCapability.get(c.id);
    if (!s.milestones.independent || s.lastIndependentSuccessAt == null) continue;
    if (s.lastAttemptOutcome === 'fail' || s.lastAttemptOutcome === 'partial') continue;
    const dueAt = s.lastIndependentSuccessAt + lag;
    if (now >= dueAt && (!due || dueAt < due.dueAt)) {
      due = { kind: 'delayed_retrieval', capabilityId: c.id, dueAt, reason: 'independent success is due for a delayed check' };
    }
  }
  if (due) return due;

  /* 3. Remediation: enough consecutive failures on a capability that
   *    was previously taught (supported or independent success exists).
   *    The threshold is policy — a baseline probe failure still does
   *    NOT land here; untaught work routes to introduction below. */
  for (const c of capabilities) {
    if (skipped(c.id, 'retry')) continue;
    const s = byCapability.get(c.id);
    if ((s.milestones.supported || s.milestones.independent) &&
        s.consecutiveFailures >= pol.remediation.minConsecutiveFailures) {
      return { kind: 'retry', capabilityId: c.id, reason: `${s.consecutiveFailures} consecutive ${s.lastAttemptOutcome} outcome(s) — feedback and self-repair first` };
    }
  }

  /* 4. Scheduled transfer: retained but never proven in a changed
   *    context — send it somewhere new. */
  for (const c of capabilities) {
    if (skipped(c.id, 'transfer')) continue;
    const s = byCapability.get(c.id);
    if (s.milestones.retained && !s.milestones.transferred) {
      return { kind: 'transfer', capabilityId: c.id, reason: 'retained ability has not survived a changed context yet' };
    }
  }

  /* 5. Continue current mission: supported work needs an unaided run. */
  for (const c of capabilities) {
    if (skipped(c.id, 'independent_attempt')) continue;
    const s = byCapability.get(c.id);
    if (s.milestones.supported && !s.milestones.independent) {
      return { kind: 'independent_attempt', capabilityId: c.id, reason: 'succeeded with support — now try without it' };
    }
  }

  /* 6a. Continue the current mission: a started-but-never-taught
   *     capability whose prerequisites are NOW met gets its first real
   *     input — a mission in progress outranks opening a new one. */
  for (const c of capabilities) {
    if (skipped(c.id, 'expose')) continue;
    const s = byCapability.get(c.id);
    if (s.state === 'NOT_SEEN') continue;
    if (s.milestones.supported || s.milestones.independent) continue;
    const ready = (c.prerequisites || []).every((p) => byCapability.get(p)?.milestones.independent);
    if (ready) {
      return { kind: 'expose', capabilityId: c.id, reason: 'mission in progress — prerequisites met, comprehensible input' };
    }
  }

  /* 6b. Introduce the first eligible never-seen capability, by role:
   *     a target always asks for a baseline probe first (falling back
   *     to input only if the mission declared none — an authoring gap
   *     the curriculum gate also flags); a carrier goes straight to
   *     input; a support is skipped — demand-driven intents only. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.state !== 'NOT_SEEN') continue;
    const ready = (c.prerequisites || []).every((p) => byCapability.get(p)?.milestones.independent);
    if (!ready) continue;
    const role = roleOf(c.id);
    if (role === 'support') continue;
    const probes = (c.vietnameseRiskProbes || [])
      .map((id) => priorMap.get(id) || priorById(id))
      .filter((p) => p && p.mayTriggerProbe && p.appliesTo.includes(c.modality))
      .map((p) => p.id);
    const kind = role === 'target' && !skipped(c.id, 'diagnostic_probe')
      ? 'diagnostic_probe'
      : role === 'carrier'
        ? 'expose'
        : probes.length ? 'diagnostic_probe' : 'expose';
    if (skipped(c.id, kind)) continue;
    if (kind === 'diagnostic_probe') {
      return { kind, capabilityId: c.id, probes, reason: 'eligible for introduction — probe known risk areas first' };
    }
    return { kind, capabilityId: c.id, reason: 'prerequisites met — comprehensible input first' };
  }

  return { kind: 'idle', reason: 'nothing due, nothing eligible — fluency work or new content needed' };
}
