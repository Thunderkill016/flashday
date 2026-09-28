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
import { CAPABILITY_STATES, RETENTION_DELAY_MS, projectLearnerState } from './projection.js';
import { priorById } from './risk-priors.js';

export function planNext(events, { capabilities, riskPriors = [], now, retentionDelayMs = RETENTION_DELAY_MS }) {
  const { byCapability } = projectLearnerState(events, capabilities, { retentionDelayMs });
  const priorMap = new Map(riskPriors.map((p) => [p.id, p]));

  /* 1. Resume in-flight work: the encounter started but no attempt
   *    outcome exists yet. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.state === 'EXPOSED' && s.lastAttemptOutcome == null) {
      return { kind: 'resume', capabilityId: c.id, reason: 'encounter started, no attempt recorded yet' };
    }
  }

  /* 2. Due retrieval: an independent ability whose last unaided success
   *    is older than the retention window goes back in for a delayed
   *    check. Earliest due first. */
  let due = null;
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (!s.milestones.independent || s.lastIndependentSuccessAt == null) continue;
    const dueAt = s.lastIndependentSuccessAt + retentionDelayMs;
    if (now >= dueAt && (!due || dueAt < due.dueAt)) {
      due = { kind: 'delayed_retrieval', capabilityId: c.id, dueAt, reason: 'independent success is due for a delayed check' };
    }
  }
  if (due) return due;

  /* 3. Remediation: the latest attempt failed on a capability that was
   *    previously taught (supported or independent success exists). A
   *    baseline probe failure does NOT land here — untaught work routes
   *    to introduction below. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if ((s.milestones.supported || s.milestones.independent) &&
        (s.lastAttemptOutcome === 'fail' || s.lastAttemptOutcome === 'partial')) {
      return { kind: 'retry', capabilityId: c.id, reason: `latest attempt was ${s.lastAttemptOutcome} — feedback and self-repair first` };
    }
  }

  /* 4. Scheduled transfer: retained but never proven in a changed
   *    context — send it somewhere new. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.milestones.retained && !s.milestones.transferred) {
      return { kind: 'transfer', capabilityId: c.id, reason: 'retained ability has not survived a changed context yet' };
    }
  }

  /* 5. Continue current mission: supported work needs an unaided run. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.milestones.supported && !s.milestones.independent) {
      return { kind: 'independent_attempt', capabilityId: c.id, reason: 'succeeded with support — now try without it' };
    }
  }

  /* 6a. Continue the current mission: a started-but-never-taught
   *     capability whose prerequisites are NOW met gets its first real
   *     input — a mission in progress outranks opening a new one. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.state === 'NOT_SEEN') continue;
    if (s.milestones.supported || s.milestones.independent) continue;
    const ready = (c.prerequisites || []).every((p) => byCapability.get(p)?.milestones.independent);
    if (ready) {
      return { kind: 'expose', capabilityId: c.id, reason: 'mission in progress — prerequisites met, comprehensible input' };
    }
  }

  /* 6b. Introduce the first eligible never-seen capability. Vietnamese
   *     risk probes attached to it schedule diagnostics first;
   *     population priors change what we ASK, never what we claim. */
  for (const c of capabilities) {
    const s = byCapability.get(c.id);
    if (s.state !== 'NOT_SEEN') continue;
    const ready = (c.prerequisites || []).every((p) => byCapability.get(p)?.milestones.independent);
    if (!ready) continue;
    const probes = (c.vietnameseRiskProbes || [])
      .map((id) => priorMap.get(id) || priorById(id))
      .filter((p) => p && p.mayTriggerProbe && p.appliesTo.includes(c.modality))
      .map((p) => p.id);
    if (probes.length) {
      return { kind: 'diagnostic_probe', capabilityId: c.id, probes, reason: 'eligible for introduction — probe known risk areas first' };
    }
    return { kind: 'expose', capabilityId: c.id, reason: 'prerequisites met — comprehensible input first' };
  }

  return { kind: 'idle', reason: 'nothing due, nothing eligible — fluency work or new content needed' };
}
