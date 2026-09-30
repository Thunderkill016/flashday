/*
 * Candidate generation for Next For You prototypes (spec §2).
 *
 * generateCandidates() produces the pedagogically VALID SET — every
 * defensible (capability, intent) pair the state supports — with the
 * facts, provenance, and preferences each candidate carries. It makes
 * no choice: filtering + ordering are the policies' job.
 *
 * Facts come ONLY from the learner model / projection / support
 * lifecycle / contracts — the same truth the kernel computes. Nothing
 * here invents a signal (no fatigue, no recall probability, no scores).
 */
import { buildLearnerModel } from '../../src/vnext/learner-model.js';
import { projectLearnerState, RETENTION_DELAY_MS } from '../../src/vnext/projection.js';
import { deriveSupportLifecycle } from '../../src/vnext/planner.js';
import { resolvePolicy } from '../../src/vnext/policy.js';
import { verifyEventTask, validateTask } from '../../src/vnext/contracts.js';
import { contractAttributesFunctions } from '../../src/vnext/evaluators.js';
import { priorById } from '../../src/vnext/risk-priors.js';
import { KINDS, PROVENANCE } from './constants.js';

const EXPOSURE_PURPOSES = ['input', 'notice'];
const ELICITING_PURPOSES = ['retrieval', 'production', 'interaction'];
const ELICITING_FOR_INTRO = ['retrieval', 'production', 'interaction', 'diagnostic'];

const INTENT_PURPOSES = {
  diagnostic_probe: ['diagnostic'],
  correction: ['remediation'],
  refresh: ['remediation', 'retrieval'],
  independent_attempt: ELICITING_PURPOSES,
  due_retrieval: ['delayed_retrieval'],
  transfer: ['transfer'],
  assessment: ['assessment'],
  support_demand: ['support'],
  mission_continuation: [...EXPOSURE_PURPOSES, ...ELICITING_PURPOSES],
  new_input: [...EXPOSURE_PURPOSES, 'diagnostic'],
  resume_in_flight: [...EXPOSURE_PURPOSES, ...ELICITING_PURPOSES]
};

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;

/* Facts every capability view supplies to candidacy — pure reads from
 * the learner model + projection; each labeled by provenance. */
/* Absent entries mean "no evidence" — a capability with zero events has
 * no projection row, and a cap outside the scoped registry has no model
 * row. Both collapse to the never-seen fact set rather than crashing
 * (assessment tasks reference caps that may have no events yet). */
const EMPTY_MILESTONES = { supported: false, independent: false, retained: false, transferred: false, fluent: false };
const EMPTY_FACTS = {
  state: 'NOT_SEEN', milestones: EMPTY_MILESTONES, consecutiveFailures: 0,
  lastAttemptOutcome: null, lastIndependentSuccessAt: null,
  unresolvedFunctions: [], recurringFunctions: [], supportDependent: false,
  pendingFunctions: [], evidenceSufficient: false, reasonCodes: [],
  independentSuccessCount: 0, assessmentDemonstrated: false,
  assessmentStatus: null, transferDemonstrated: false,
  retainedDemonstrated: false, sinceLastIndependentMs: null, modality: null
};

function capFacts(capId, model, projection, capability) {
  const v = model.capabilities[capId];
  const p = projection.byCapability.get(capId);
  if (!v || !p) return { ...EMPTY_FACTS, capabilityId: capId, modality: capability?.modality ?? null };
  return {
    capabilityId: capId,
    state: p.state,                                   // KERNEL
    milestones: p.milestones,
    consecutiveFailures: p.consecutiveFailures,       // KERNEL
    lastAttemptOutcome: p.lastAttemptOutcome,
    lastIndependentSuccessAt: p.lastIndependentSuccessAt,
    unresolvedFunctions: v.failures.unresolvedFunctions,   // KERNEL/EVIDENCE
    recurringFunctions: v.failures.recurringFunctions,
    supportDependent: v.support.dependent,            // KERNEL
    pendingFunctions: v.support.pendingFunctions,
    evidenceSufficient: v.uncertainty.evidenceSufficient,  // MODEL fact
    reasonCodes: v.uncertainty.reasons.map((r) => r.code),
    independentSuccessCount: v.evidence.independentSuccessCount,
    assessmentDemonstrated: v.assessment.demonstrated,
    assessmentStatus: v.assessment.latestStatus,
    transferDemonstrated: v.transfer.demonstrated,
    retainedDemonstrated: v.retention.demonstrated,
    sinceLastIndependentMs: v.retention.sinceLastIndependentMs ?? null, // FACT, not inference
    modality: capability?.modality ?? null
  };
}

export function generateCandidates({ learnerId, events, capabilities, tasks, roles, policy, now, mission, decisionContext, selection = {} }) {
  const pol = resolvePolicy(policy);
  const lag = pol.retention.minLagMs ?? RETENTION_DELAY_MS;
  const ceiling = selection.failureCeiling ?? 3;
  const diagnosticBudget = selection.diagnosticMaxPerEpisode ?? 2;

  const model = buildLearnerModel({ learnerId, events, capabilities, tasks, policy: pol, now, roles });
  const projection = projectLearnerState(learnerId, events, capabilities, tasks, { retentionDelayMs: lag, policy: pol });
  const lifecycle = deriveSupportLifecycle(learnerId, events, { capabilities, tasks, roles, policy: pol });
  const pendingDemands = lifecycle.pending;

  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const taskByRev = new Map(tasks.map((t) => [keyOf(t), t]));
  const latestById = new Map();
  for (const t of tasks) {
    const prev = latestById.get(t.id);
    if (!prev || (t.revision ?? 1) > (prev.revision ?? 1)) latestById.set(t.id, t);
  }

  /* Mission surface: candidates may only serve tasks the mission
   * declares. Without a mission the full registry is the surface. */
  const missionTaskIds = mission ? new Set(mission.taskIds ?? []) : null;
  const missionTasks = mission
    ? [...missionTaskIds].map((id) => latestById.get(id)).filter(Boolean)
    : tasks;

  const roleOf = roles
    ? (id) => (roles.targets?.has(id) ? 'target' : roles.supports?.has(id) ? 'support' : 'carrier')
    : () => null;
  const isSupportCap = (id) => roleOf(id) === 'support';

  /* Verified-attempt consumption per task (same bar the runner uses) so
   * candidates attach only to tasks that can still yield evidence. */
  const verifiedAttemptKey = new Set();
  const verifiedEventKey = new Set();
  const lastAttemptByCap = new Map();
  const lastObservedAttemptByCap = new Map();
  const observedFailStreak = new Map();
  const seen = new Set();
  for (const e of [...events].sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1))) {
    if (e.learnerId !== learnerId || seen.has(e.id)) continue;
    seen.add(e.id);
    const t = taskByRev.get(`${e.taskId}@${e.taskRevision}`);
    const cap = t ? capById.get(t.capabilityId) : null;
    if (!t || !cap || !verifyEventTask(e, t, cap)) continue;
    verifiedEventKey.add(keyOf(t));
    if (e.attempt?.outcome != null) {
      verifiedAttemptKey.add(keyOf(t));
      lastAttemptByCap.set(t.capabilityId, { outcome: e.attempt.outcome, task: t, event: e });
      /* Refresh/correction semantics require OBSERVED direct failure —
       * self-reported (observed:false) outcomes are context, never
       * verified performance evidence (review HIGH-5). */
      if (e.attempt.observed !== false) {
        lastObservedAttemptByCap.set(t.capabilityId, { outcome: e.attempt.outcome, task: t, event: e });
        observedFailStreak.set(t.capabilityId, e.attempt.outcome === 'success' ? 0 : (observedFailStreak.get(t.capabilityId) ?? 0) + 1);
      }
    }
  }
  const REPEATABLE = new Set(['retrieval', 'production', 'interaction', 'remediation', 'delayed_retrieval', 'transfer', 'support']);
  const servable = (capId, purposes, { requiresFunction = null, exceptTaskId = null } = {}) => {
    const matches = missionTasks.filter((t) =>
      t.capabilityId === capId &&
      purposes.includes(t.purpose) &&
      t.id !== exceptTaskId &&
      (requiresFunction == null || (t.response?.requiredFunctions ?? []).includes(requiresFunction)));
    const fresh = matches.find((t) => !verifiedEventKey.has(keyOf(t)));
    if (fresh) return fresh;
    if (purposes.every((p) => !REPEATABLE.has(p))) return null;
    return matches.find((t) => REPEATABLE.has(t.purpose)) ?? null;
  };

  /* Pending-phase selection (runner's pickPendingPhase): introduction
   * serves the next UNCONSUMED exposure task, else the next unconsumed
   * eliciting one — a retrieval/production task can be a learner's
   * first contact when the mission authored no input for the cap. */
  const pendingPhase = (capId) => {
    const exp = missionTasks.find((t) => t.capabilityId === capId && EXPOSURE_PURPOSES.includes(t.purpose) && !verifiedEventKey.has(keyOf(t)));
    if (exp) return exp;
    return missionTasks.find((t) => t.capabilityId === capId && ELICITING_FOR_INTRO.includes(t.purpose) && !verifiedEventKey.has(keyOf(t))) ?? null;
  };

  /* Failure ceiling [SAFETY_PRIOR]: once a capability racks up `ceiling`
   * consecutive failures, serving the SAME task again is a hard
   * violation. An alternative task on the capability is offered when
   * one exists (spec §17 escape hatch). */
  const pickTask = (capId, purposes, f) => {
    const primary = servable(capId, purposes);
    const lastTask = lastAttemptByCap.get(capId)?.task;
    if (primary && f.consecutiveFailures >= ceiling && lastTask && primary.id === lastTask.id) {
      const alt = servable(capId, purposes, { exceptTaskId: lastTask.id });
      return { task: alt ?? primary, identicalRetry: alt == null, alternateTask: alt != null };
    }
    return { task: primary, identicalRetry: false, alternateTask: false };
  };

  const ctx = decisionContext;
  const diagUsed = ctx?.counts?.diagnostic ?? 0;
  const candidates = [];
  const skipped = [];
  const reasonSet = (capId) => new Set(model.capabilities[capId]?.uncertainty.reasons.map((r) => r.code) ?? []);

  const push = (cand) => candidates.push(cand);
  const skip = (capId, kind, reason) => skipped.push({ capabilityId: capId, kind, reason });

  for (const c of capabilities) {
    const id = c.id;
    if (isSupportCap(id)) continue; // supports are demand-routed ONLY
    const f = capFacts(id, model, projection, c);
    const p = projection.byCapability.get(id);
    const reasons = reasonSet(id);

    /* --- RESUME: encounter opened, no attempt yet [KERNEL] --- */
    if (f.state === 'EXPOSED' && f.lastAttemptOutcome == null) {
      push({
        kind: KINDS.RESUME, capabilityId: id,
        facts: f,
        servableTask: servable(id, INTENT_PURPOSES.resume_in_flight),
        preferences: [],
        penalties: [],
        provenance: [PROVENANCE.KERNEL],
        why: 'encounter started, no attempt recorded'
      });
      continue; // an open encounter dominates this capability's intents
    }

    /* --- DUE_RETRIEVAL [EVIDENCE: spacing] --- */
    if (f.milestones.independent && f.lastIndependentSuccessAt != null &&
        f.lastAttemptOutcome !== 'fail' && f.lastAttemptOutcome !== 'partial') {
      const dueAt = f.lastIndependentSuccessAt + lag;
      if (now != null && now >= dueAt) {
        push({
          kind: KINDS.DUE_RETRIEVAL, capabilityId: id,
          facts: f,
          servableTask: servable(id, INTENT_PURPOSES.due_retrieval),
          preferences: [{ name: 'due', detail: `due since ${new Date(dueAt).toISOString()}`, provenance: PROVENANCE.EVIDENCE }],
          penalties: [],
          provenance: [PROVENANCE.EVIDENCE],
          why: 'independent ability is past the retention lag — delayed check',
          dueAt
        });
      }
    }

    /* --- REFRESH [KERNEL boundary: only on direct OBSERVED verified
     * failure — self-reported outcomes never mint refresh] --- */
    const lastObserved = lastObservedAttemptByCap.get(id);
    if (f.milestones.independent && (lastObserved?.outcome === 'fail' || lastObserved?.outcome === 'partial')) {
      push({
        kind: KINDS.REFRESH, capabilityId: id,
        facts: f,
        taskPick: pickTask(id, INTENT_PURPOSES.refresh, f),
        preferences: [{ name: 'verified_failure_on_demonstrated', provenance: PROVENANCE.KERNEL }],
        penalties: [],
        provenance: [PROVENANCE.KERNEL],
        why: 'verified failure on a previously-demonstrated capability — refresh semantics, not a hard test'
      });
    }

    /* --- CORRECTION (bounded; attributed failures only) --- */
    const taught = f.milestones.supported || f.milestones.independent;
    const last = lastObservedAttemptByCap.get(id);
    const attributed = f.unresolvedFunctions.length > 0 ||
      (last && contractAttributesFunctions(last.task.evaluation?.contractId) && (last.event.evaluation?.missingFunctions ?? []).length > 0);
    const observedFails = observedFailStreak.get(id) ?? 0;
    if (taught && observedFails >= pol.remediation.minConsecutiveFailures) {
      if (attributed) {
        if (observedFails >= ceiling) {
          skip(id, KINDS.CORRECTION, `failure ceiling ${ceiling} reached — same-task retry suppressed (SAFETY_PRIOR)`);
        } else {
          push({
            kind: KINDS.CORRECTION, capabilityId: id,
            facts: f,
            servableTask: servable(id, INTENT_PURPOSES.correction),
            preferences: [{ name: 'open_attributed_gap', detail: f.unresolvedFunctions.join(','), provenance: PROVENANCE.EVIDENCE }],
            penalties: observedFails > 1 ? [{ name: 'same_action_recently_failed', detail: `${observedFails} observed consecutive`, provenance: PROVENANCE.SAFETY }] : [],
            provenance: [PROVENANCE.EVIDENCE, PROVENANCE.SAFETY],
            why: `${observedFails} observed consecutive failures with attributed gap — repair via self-repair`
          });
        }
      } else {
        /* Non-attributing failure (spec §5): admit a diagnostic
         * candidate when a servable probe exists and budget allows —
         * but never fabricate a substrate diagnosis. */
        const probe = servable(id, INTENT_PURPOSES.diagnostic_probe);
        if (probe && diagUsed < diagnosticBudget) {
          push({
            kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: id,
            facts: f,
            servableTask: probe,
            preferences: [{ name: 'unattributed_failure', provenance: PROVENANCE.EXPERIMENTAL }],
            penalties: [{ name: 'information_only', provenance: PROVENANCE.SAFETY }],
            provenance: [PROVENANCE.EXPERIMENTAL],
            why: 'consecutive failures without function attribution — clarify before re-drilling'
          });
        }
      }
    }

    /* --- TRANSFER [KERNEL freshness] --- */
    if (f.milestones.retained && !f.transferDemonstrated) {
      push({
        kind: KINDS.TRANSFER, capabilityId: id,
        facts: f,
        taskPick: pickTask(id, INTENT_PURPOSES.transfer, f),
        preferences: [{ name: 'transfer_pending', provenance: PROVENANCE.EVIDENCE }],
        penalties: [],
        provenance: [PROVENANCE.KERNEL, PROVENANCE.EVIDENCE],
        why: 'retained ability not yet proven in a fresh context family'
      });
    }

    /* --- INDEPENDENT_ATTEMPT (fade the scaffold) --- */
    if (f.milestones.supported && !f.milestones.independent) {
      push({
        kind: KINDS.INDEPENDENT_ATTEMPT, capabilityId: id,
        facts: f,
        taskPick: pickTask(id, INTENT_PURPOSES.independent_attempt, f),
        preferences: f.supportDependent
          ? [{ name: 'support_dependency_fade', provenance: PROVENANCE.EVIDENCE }]
          : [],
        penalties: [],
        provenance: [PROVENANCE.KERNEL, PROVENANCE.EVIDENCE],
        why: f.supportDependent ? 'succeeded only with support — unaided run to fade dependency' : 'succeeded with support — try unaided'
      });
    }

    /* --- DIAGNOSTIC_PROBE for thin evidence (budgeted) --- */
    if (f.state !== 'NOT_SEEN' && !f.evidenceSufficient && !f.milestones.independent && f.consecutiveFailures === 0) {
      const probe = servable(id, INTENT_PURPOSES.diagnostic_probe);
      if (probe) {
        const thinReasons = [...reasons].filter((r) => r.startsWith('thin_') || r.startsWith('no_independent') || r === 'only_supported_attempts');
        push({
          kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: id,
          facts: f,
          servableTask: probe,
          preferences: thinReasons.map((r) => ({ name: r, provenance: PROVENANCE.EXPERIMENTAL })),
          penalties: diagUsed >= diagnosticBudget ? [{ name: 'diagnostic_budget_exhausted', provenance: PROVENANCE.SAFETY }] : [],
          provenance: [PROVENANCE.EXPERIMENTAL],
          why: `insufficient evidence (${[...reasons].join(', ') || 'thin'}) — probe to clarify`
        });
      }
    }

    /* --- MISSION_CONTINUATION / NEW_INPUT --- */
    const ready = (c.prerequisites || []).every((pr) => projection.byCapability.get(pr)?.milestones.independent);
    if (f.state !== 'NOT_SEEN' && !f.milestones.supported && !f.milestones.independent && ready) {
      push({
        kind: KINDS.MISSION_CONTINUATION, capabilityId: id,
        facts: f,
        servableTask: pendingPhase(id),
        preferences: ctx?.currentThreadCapabilityId === id ? [{ name: 'thread_continuation', provenance: PROVENANCE.SAFETY }] : [],
        penalties: [],
        provenance: [PROVENANCE.KERNEL],
        why: 'mission in progress — prerequisites met, continue the thread'
      });
    }
    if (f.state === 'NOT_SEEN' && ready) {
      const role = roleOf(id);
      const probes = (c.vietnameseRiskProbes || [])
        .map((pid) => priorById(pid))
        .filter((p) => p && p.mayTriggerProbe && p.appliesTo.includes(c.modality))
        .map((p) => p.id);
      const kind = role === 'target' ? KINDS.DIAGNOSTIC_PROBE : (role === 'carrier' ? KINDS.NEW_INPUT : probes.length ? KINDS.DIAGNOSTIC_PROBE : KINDS.NEW_INPUT);
      /* Baseline probes need a diagnostic task specifically — pendingPhase's
       * exposure-first order is for introductions, not probes. */
      const task = kind === KINDS.DIAGNOSTIC_PROBE ? servable(id, ['diagnostic']) : pendingPhase(id);
      if (kind === KINDS.NEW_INPUT) {
        push({
          kind, capabilityId: id,
          facts: f,
          servableTask: task,
          preferences: [{ name: 'breadth', provenance: PROVENANCE.EXPERIMENTAL }],
          penalties: [],
          provenance: [PROVENANCE.EVIDENCE, PROVENANCE.EXPERIMENTAL],
          why: 'prerequisites met — introduce new capability with input'
        });
      } else {
        /* A new TARGET owes a baseline probe [KERNEL role semantics] —
         * but the probe still respects the diagnostic budget. */
        push({
          kind: KINDS.DIAGNOSTIC_PROBE, capabilityId: id,
          facts: f,
          servableTask: task,
          preferences: [{ name: 'baseline_probe', provenance: PROVENANCE.KERNEL }],
          penalties: diagUsed >= diagnosticBudget ? [{ name: 'diagnostic_budget_exhausted', provenance: PROVENANCE.SAFETY }] : [],
          provenance: [PROVENANCE.KERNEL],
          why: 'new target capability — baseline probe first (R6 role semantics)',
          probes
        });
      }
    }
  }

  /* --- SUPPORT_DEMAND: one candidate per pending demand (function-scoped) --- */
  for (const d of pendingDemands) {
    const task = servable(d.supportCapabilityId, INTENT_PURPOSES.support_demand, { requiresFunction: d.missingFunction });
    push({
      kind: KINDS.SUPPORT_DEMAND, capabilityId: d.supportCapabilityId,
      facts: capFacts(d.supportCapabilityId, model, projection, capById.get(d.supportCapabilityId)),
      demand: d,
      servableTask: task,
      preferences: [{ name: 'pending_demand', detail: `${d.targetCapabilityId}:${d.missingFunction}`, provenance: PROVENANCE.KERNEL }],
      penalties: [],
      provenance: [PROVENANCE.KERNEL],
      why: `${d.targetCapabilityId} missed '${d.missingFunction}' — probe substrate ${d.supportCapabilityId}`
    });
  }

  /* --- ASSESSMENT: mission-gated, post-transfer, fresh sample --- */
  if (mission?.assessmentPlan?.required) {
    for (const t of missionTasks.filter((t) => t.purpose === 'assessment')) {
      const f = capFacts(t.capabilityId, model, projection, capById.get(t.capabilityId));
      if (!f.milestones.transferred) continue;
      const latestStatus = f.assessmentStatus;
      if (latestStatus === 'success') continue;
      /* HIGH-4: a consumed assessment task is never a fresh sample.
       * Production treats assessment as non-repeatable; after a failed
       * checkpoint with no unused assessment left the honest state is
       * backlog/blocked, not re-selling the same task. */
      if (verifiedEventKey.has(keyOf(t))) {
        skip(t.capabilityId, KINDS.ASSESSMENT, 'assessment task consumed — no fresh checkpoint remains (backlog state)');
        continue;
      }
      push({
        kind: KINDS.ASSESSMENT, capabilityId: t.capabilityId,
        facts: f,
        servableTask: t,
        preferences: [{ name: 'mission_assessment_plan', provenance: PROVENANCE.KERNEL }],
        penalties: [],
        provenance: [PROVENANCE.KERNEL],
        why: latestStatus ? `assessment re-probe after ${latestStatus}` : 'assessment plan requires a fresh sample post-transfer'
      });
    }
  }

  /* Normalize taskPick → servableTask + retry flags (BLOCKER 1: every
   * consumer reads servableTask — a candidate that hid its task under
   * taskPick was silently unservable). */
  for (const c of candidates) {
    if (c.taskPick) {
      c.servableTask = c.taskPick.task;
      if (c.taskPick.identicalRetry) c.identicalRetry = true;
      if (c.taskPick.alternateTask) c.alternateTask = true;
      delete c.taskPick;
    }
  }

  return { candidates, skipped, model, projection, pendingDemands };
}

export { INTENT_PURPOSES };
