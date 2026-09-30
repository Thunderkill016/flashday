/*
 * Independent decision validator (review HIGH-6, HIGH-10).
 *
 * Validates a CHOSEN decision against the contracts and kernel facts
 * AFTER selection — deliberately not reusing the generator's own
 * helpers, so a buggy filter can't also be its own alibi. Returns a
 * list of violations; empty = the decision is honest.
 *
 * The validator is given the ACTUAL learning policy, selection config,
 * and DecisionContext the decision ran under — hard rules are checked
 * against those, never a hardcoded default.
 */
import { projectLearnerState } from '../../src/vnext/projection.js';
import { deriveSupportLifecycle } from '../../src/vnext/planner.js';
import { resolvePolicy } from '../../src/vnext/policy.js';
import { validateTask } from '../../src/vnext/contracts.js';
import { TIER_OF } from './constants.js';

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

const REPAIR_BOUND_DEFAULT = 3;

export function validateDecision(decision, { events, tasks, capabilities, roles, mission, learnerId, now, policy, selection = {}, decisionContext = null }) {
  const v = [];
  const ch = decision?.chosen ?? {};
  const pol = resolvePolicy(policy);

  /* Terminal kinds: idle is honest ONLY when nothing servable exists;
   * blocked requires surviving-but-unservable work to point at. */
  if (ch.kind === 'idle') {
    if (ch.capabilityId != null || ch.taskId != null) v.push('idle_with_payload');
    /* Fabricated idle: the decision's own eligible-candidate view says
     * servable work existed — idle while candidates stand is a lie. */
    if ((decision.candidates ?? []).some((c) => c.eligible === true)) v.push('fabricated_idle');
    return v;
  }
  if (ch.kind === 'blocked') {
    if (!(decision.candidateCount > 0) && !(decision.integrityViolations ?? []).length) v.push('blocked_without_work');
    return v;
  }
  if (ch.kind == null) return ['no_chosen_kind'];

  const latestById = new Map();
  const exactByKey = new Map();
  for (const t of tasks) {
    const k = `${t.id}@${t.revision ?? 1}`;
    if (exactByKey.has(k)) v.push(`duplicate_task_revision:${k}`);
    exactByKey.set(k, t);
    const prev = latestById.get(t.id);
    if (!prev || (t.revision ?? 1) > (prev.revision ?? 1)) latestById.set(t.id, t);
  }
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const missionTaskIds = mission ? new Set(mission.taskIds ?? []) : null;

  /* task existence + registry validity + EXACT revision (BLOCKER-2):
   * the decision stamps taskRevision; the validator resolves that
   * exact contract, never "latest". */
  let task = null;
  if (ch.taskId == null) v.push('chosen_with_null_task');
  else if (ch.taskRevision != null) {
    task = exactByKey.get(`${ch.taskId}@${ch.taskRevision}`) ?? null;
    if (!task) v.push('task_revision_missing');
  } else {
    v.push('task_revision_absent'); // unversioned choices cannot be audited
    task = latestById.get(ch.taskId) ?? null;
    if (!task) v.push('task_not_in_registry');
  }
  if (task) {
    if (validateTask(task).length) v.push('task_contract_invalid');
    if (missionTaskIds && !missionTaskIds.has(task.id)) v.push('task_outside_mission');
    if (task.capabilityId !== ch.capabilityId) v.push('task_capability_mismatch');
    const cap = capById.get(task.capabilityId);
    if (!cap) v.push('capability_unknown');
    else if (task.modality !== cap.modality) v.push('modality_mismatch');
    if (!PURPOSE_OK[ch.kind]?.includes(task.purpose)) v.push(`purpose_substitution:${task.purpose}~${ch.kind}`);
  }
  if (mission) {
    for (const id of missionTaskIds ?? []) {
      if (!latestById.has(id)) { v.push(`missing_declared_task:${id}`); break; }
    }
    if (decision.missionId != null && decision.missionId !== mission.id) v.push('mission_identity_mismatch');
    if (decision.missionRevision != null && mission.revision != null && decision.missionRevision !== mission.revision) v.push('mission_revision_mismatch');
  }

  const cap = capById.get(ch.capabilityId);
  if (ch.capabilityId != null && !cap) v.push('capability_outside_surface');

  /* kernel truth, recomputed independently of the policy's pipeline */
  const proj = projectLearnerState(learnerId, events, capabilities, tasks, { policy: pol });
  const lc = deriveSupportLifecycle(learnerId, events, { capabilities, tasks, roles, policy: pol });
  const pending = lc.pending ?? [];
  const byCap = proj.byCapability;

  /* future-evidence check: any learner event after `now` invalidates the
   * state the decision was made on */
  if (events.some((e) => e.learnerId === learnerId && e.occurredAt > now)) v.push('future_evidence_in_state');

  /* observed direct verified failure — strict (MEDIUM-11): only
   * attempt.observed === true counts. */
  const observedAttempts = (capId) => [...events]
    .filter((e) => e.learnerId === learnerId && e.capabilityId === capId && e.attempt?.outcome != null && e.attempt.observed === true)
    .sort((a, b) => b.occurredAt - a.occurredAt);
  const observedFailCount = (capId) => {
    let n = 0;
    for (const e of observedAttempts(capId)) {
      if (e.attempt.outcome === 'success') break;
      n++;
    }
    return n;
  };
  const episodeRepairs = (capId) => (decisionContext?.actionsChosen ?? [])
    .filter((a) => a.capabilityId === capId && (a.kind === 'correction' || a.kind === 'refresh')).length;

  /* Hard safety rules the policy claims — re-verified here */
  const diagBudget = selection.diagnosticMaxPerEpisode ?? 2;
  if (ch.kind === 'diagnostic_probe' && (decisionContext?.counts?.diagnostic ?? 0) >= diagBudget) {
    v.push('diagnostic_budget_exceeded');
  }
  const ceiling = selection.failureCeiling ?? 3;
  if (ch.kind === 'correction' && observedFailCount(ch.capabilityId) >= ceiling) v.push('failure_ceiling_exceeded');
  if ((ch.kind === 'correction' || ch.kind === 'refresh') && episodeRepairs(ch.capabilityId) >= (selection.repairMaxPerEpisodePerCap ?? REPAIR_BOUND_DEFAULT)) {
    v.push('repair_bound_exceeded');
  }

  if (cap) {
    const prereqOk = (cap.prerequisites ?? []).every((p) => byCap.get(p)?.milestones.independent);
    if (!prereqOk && ['mission_continuation', 'new_input', 'diagnostic_probe', 'independent_attempt', 'correction', 'transfer', 'assessment'].includes(ch.kind)) {
      v.push('prerequisite_open');
    }

    if (ch.kind === 'support_demand') {
      /* BLOCKER-5: the chosen decision must carry the full demand
       * identity, and that exact demand must still be pending — not
       * just any demand sharing the provider. */
      const dp = ch.demandProvenance;
      if (!dp) v.push('demand_provenance_absent');
      else {
        const exact = pending.find((d) =>
          d.supportCapabilityId === ch.capabilityId &&
          d.targetCapabilityId === dp.targetCapabilityId &&
          d.missingFunction === dp.missingFunction &&
          d.sourceEventId === dp.sourceEventId);
        if (!exact) v.push('demand_provenance_mismatch');
        else if (!(task?.response?.requiredFunctions ?? []).includes(exact.missingFunction)) v.push('probe_wrong_function');
      }
    }
    if (ch.kind === 'resume_in_flight') {
      /* RESUME means "encounter exposed, no attempt yet" — with no
       * exposure event on the capability there is nothing to resume. */
      const exposed = events.some((e) => e.learnerId === learnerId && e.capabilityId === ch.capabilityId && e.eventType === 'exposure');
      if (!exposed) v.push('resume_no_evidence');
    }
    if (ch.kind === 'refresh') {
      const obs = observedAttempts(ch.capabilityId)[0];
      if (!obs || !['fail', 'partial'].includes(obs.attempt.outcome)) v.push('false_relearning');
    }
    if (ch.kind === 'assessment') {
      if (!byCap.get(ch.capabilityId)?.milestones.transferred) v.push('assessment_without_transfer');
      /* Policy-dependent: production re-probes consumed items; the
       * strict-fresh variants must never re-sell a consumed task. */
      const policyAllowsReprobe = /a0/.test(decision.selectionPolicyVersion ?? '');
      const consumed = events.some((e) => e.learnerId === learnerId && e.taskId === ch.taskId &&
        (e.taskRevision ?? 1) === (ch.taskRevision ?? 1) &&
        (e.attempt?.outcome != null || e.eventType === 'checkpoint'));
      if (consumed && !policyAllowsReprobe) v.push('assessment_resold_as_fresh');
    }
    if (ch.kind === 'transfer' && byCap.get(ch.capabilityId)?.milestones.transferred) {
      v.push('transfer_already_demonstrated');
    }
  }

  return v;
}

export { TIER_OF };
