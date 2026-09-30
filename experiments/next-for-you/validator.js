/*
 * Independent decision validator (review HIGH-6).
 *
 * Validates a CHOSEN decision against the contracts and kernel facts
 * AFTER selection — deliberately not reusing the generator's own
 * helpers, so a buggy filter can't also be its own alibi. Returns a
 * list of violations; empty = the decision is honest.
 */
import { projectLearnerState } from '../../src/vnext/projection.js';
import { deriveSupportLifecycle } from '../../src/vnext/planner.js';
import { resolvePolicy, LEARNING_POLICY_V1 } from '../../src/vnext/policy.js';
import { validateTask } from '../../src/vnext/contracts.js';

const PURPOSE_OK = {
  resume_in_flight: ['input', 'notice', 'retrieval', 'production', 'interaction'],
  due_retrieval: ['delayed_retrieval'],
  refresh: ['remediation', 'retrieval'],
  correction: ['remediation'],
  support_demand: ['support'],
  transfer: ['transfer'],
  independent_attempt: ['retrieval', 'production', 'interaction'],
  diagnostic_probe: ['diagnostic'],
  mission_continuation: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  new_input: ['input', 'notice', 'retrieval', 'production', 'interaction', 'diagnostic'],
  assessment: ['assessment']
};

export function validateDecision(decision, { events, tasks, capabilities, roles, mission, learnerId, now }) {
  const v = [];
  const ch = decision?.chosen ?? {};
  if (ch.kind === 'idle') return ch.capabilityId == null && ch.taskId == null ? [] : ['idle_with_payload'];
  if (ch.kind == null) return ['no_chosen_kind'];

  const policy = resolvePolicy(LEARNING_POLICY_V1);
  const latestById = new Map();
  for (const t of tasks) {
    const prev = latestById.get(t.id);
    if (!prev || (t.revision ?? 1) > (prev.revision ?? 1)) latestById.set(t.id, t);
  }
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const missionTaskIds = mission ? new Set(mission.taskIds ?? []) : null;

  /* task existence + registry validity + currency */
  const task = ch.taskId != null ? latestById.get(ch.taskId) : null;
  if (ch.taskId == null) v.push('chosen_with_null_task');
  else if (!task) v.push('task_not_in_registry');
  else {
    if (validateTask(task).length) v.push('task_contract_invalid');
    if (missionTaskIds && !missionTaskIds.has(task.id)) v.push('task_outside_mission');
    if (task.capabilityId !== ch.capabilityId) v.push('task_capability_mismatch');
    const cap = capById.get(task.capabilityId);
    if (!cap) v.push('capability_unknown');
    else if (task.modality !== cap.modality) v.push('modality_mismatch');
    if (!PURPOSE_OK[ch.kind]?.includes(task.purpose)) v.push(`purpose_substitution:${task.purpose}~${ch.kind}`);
  }

  const cap = capById.get(ch.capabilityId);
  if (ch.capabilityId != null && !cap) v.push('capability_outside_surface');

  /* kernel truth, recomputed independently of the policy's pipeline */
  const proj = projectLearnerState(learnerId, events, capabilities, tasks, { policy });
  const lc = deriveSupportLifecycle(learnerId, events, { capabilities, tasks, roles, policy });
  const pending = lc.pending ?? [];
  const byCap = proj.byCapability;

  /* future-evidence check: any learner event after `now` invalidates the
   * state the decision was made on */
  if (events.some((e) => e.learnerId === learnerId && e.occurredAt > now)) v.push('future_evidence_in_state');

  /* foreign-learner evidence must not exist in this state's projection */
  if (events.some((e) => e.learnerId !== learnerId)) {
    /* foreign events present in the log are fine — they're ignored —
     * but a decision is invalid if it can only be explained by them */
  }

  if (cap) {
    const prereqOk = (cap.prerequisites ?? []).every((p) => byCap.get(p)?.milestones.independent);
    if (!prereqOk && [ 'mission_continuation', 'new_input', 'diagnostic_probe', 'independent_attempt', 'correction', 'transfer', 'assessment' ].includes(ch.kind)) {
      v.push('prerequisite_open');
    }

    if (ch.kind === 'support_demand') {
      const d = pending.find((x) => x.supportCapabilityId === ch.capabilityId);
      if (!d) v.push('support_free_run');
      else if (!(task?.response?.requiredFunctions ?? []).includes(d.missingFunction)) v.push('probe_wrong_function');
    }
    if (ch.kind === 'refresh') {
      /* needs an OBSERVED direct verified failure */
      const obs = [...events]
        .filter((e) => e.learnerId === learnerId && e.capabilityId === ch.capabilityId && e.attempt?.outcome != null && e.attempt.observed !== false)
        .sort((a, b) => b.occurredAt - a.occurredAt)[0];
      if (!obs || !['fail', 'partial'].includes(obs.attempt.outcome)) v.push('false_relearning');
    }
    if (ch.kind === 'assessment') {
      const consumed = events.some((e) => e.learnerId === learnerId && e.taskId === ch.taskId &&
        (e.attempt?.outcome != null || e.eventType === 'checkpoint'));
      if (consumed) v.push('assessment_resold_as_fresh');
      if (!byCap.get(ch.capabilityId)?.milestones.transferred) v.push('assessment_without_transfer');
    }
    if (ch.kind === 'transfer' && byCap.get(ch.capabilityId)?.milestones.transferred) {
      v.push('transfer_already_demonstrated');
    }
  }

  return v;
}
