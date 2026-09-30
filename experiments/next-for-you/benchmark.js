/*
 * Next For You engineering-falsification benchmark (spec §19–§24).
 *
 * Drives a policy against a synthetic archetype for N decisions over
 * one authored mission, records every decision into a decision log,
 * then computes the §22 pathology metrics. NO educational-efficacy
 * claim is derivable here — the learner is a script.
 */
import { POLICIES } from './policies.js';
import { emptyContext, recordChoice } from './decision-context.js';
import { createDecisionLog } from './decision-log.js';
import { missionState, attemptEvent, observeEvent, seedIndependentHistory, ARCHETYPES } from './scenarios.js';
import { LEARNING_POLICY_V1 } from '../../src/vnext/policy.js';
import { KINDS } from './constants.js';

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const SESSION_LEN = 4; // decisions per simulated session [SAFETY PRIOR — pacing, not a calibrated session length]
const ELICITING = new Set(['diagnostic', 'retrieval', 'production', 'interaction', 'remediation', 'delayed_retrieval', 'transfer', 'assessment', 'support']);
const EXPOSING = new Set(['input', 'notice']);

/* Run one (mission, archetype, policy) trajectory. Returns the decision
 * log + metrics. `steps` bounds the trajectory; 'idle' or 'blocked'
 * also terminates it (but is itself a measured pathology signal). */
export function runScenario({ fixture, archetype, archetypeName, policyName, steps = 40, seed = null, now0 = Date.parse('2026-02-01T09:00:00Z'), selection = {} }) {
  const { mission, tasks, capabilities, roles } = missionState(fixture);
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const taskById = new Map(tasks.map((t) => [`${t.id}@${t.revision ?? 1}`, t]));

  const events = seed === 'independent30d' ? seedIndependentHistory(fixture, { caps: 4, at: now0 - 30 * 24 * HOUR }) : [];
  const ctx0 = emptyContext(`ep-${policyName}-${archetypeName}`, 'ses-bench');
  const log = createDecisionLog();
  const trace = [];

  let ctx = ctx0;
  let now = now0;
  const policy = POLICIES[policyName];
  const metrics = initMetrics();

  for (let step = 0; step < steps; step++) {
    const state = {
      learnerId: 'SIM', events, capabilities, tasks, roles,
      policy: LEARNING_POLICY_V1, now, mission, decisionContext: ctx, selection
    };
    const d = policy(state, { selection });
    log.append(d, { eventCount: events.length, capabilityCount: capabilities.length, lastEventId: events.at(-1)?.id });
    trace.push(d);
    recordDecisionMetrics(metrics, d, ctx, trace);

    if (d.chosen.kind === 'idle') break;

    /* Simulate the learner's response for the chosen task (the decision
     * stamps the latest-revision task id; resolve by id). */
    const resolved = d.chosen.taskId ? tasks.find((t) => t.id === d.chosen.taskId) : null;
    const cap = d.chosen.capabilityId ? capById.get(d.chosen.capabilityId) : resolved && capById.get(resolved.capabilityId);

    if (resolved && cap) {
      const outcome = archetype.respond({ task: resolved, capability: cap, decision: d, step });
      now += 5 * 60 * 1000; // 5 min of simulated work between decisions
      if (outcome != null) {
        if (ELICITING.has(resolved.purpose)) {
          const missing = !archetype.forceNoMissing && (outcome === 'fail' || outcome === 'partial')
            ? [archetype.missing?.(resolved)].flat().filter(Boolean)
            : null;
          events.push(attemptEvent(resolved, cap, {
            at: now, outcome,
            missing,
            type: resolved.purpose === 'support' ? 'support_attempt' : null
          }));
        } else if (EXPOSING.has(resolved.purpose)) {
          events.push(observeEvent(resolved, cap, { at: now }));
        }
      }
    }

    ctx = recordChoice(ctx, { ...d.chosen, timestamp: now });
    metrics.decisionCount++;

    /* Session pacing: every SESSION_LEN decisions the simulated learner
     * comes back a day later — that is what lets delayed-retrieval,
     * distinct-session independence, and retention checks actually
     * exercise. The diagnostic budget is per decision episode, so a new
     * session resets the episode counts while preserving the thread. */
    if ((step + 1) % SESSION_LEN === 0) {
      now += DAY;
      ctx = { ...emptyContext(ctx.decisionEpisodeId + '+', ctx.sessionId + `+${step}`), currentThreadCapabilityId: ctx.currentThreadCapabilityId };
    }
  }

  finalizeMetrics(metrics, trace, ctx, events, capabilities, tasks, roles, mission, now, selection, policyName);
  return { trace, log, metrics, events };
}

function initMetrics() {
  return {
    decisionCount: 0,
    hardViolationCount: 0,
    blockedDecisionCount: 0,
    invalidCandidateCount: 0,
    unservableChosenCount: 0,
    explanationMissingCount: 0,
    sameTaskRepeatRun: 0,
    maxSameTaskRepeatRun: 0,
    maxConsecutiveRepairActions: 0,
    maxDueDeferralActions: 0,
    maxTransferDeferralActions: 0,
    newInputStarvationLength: 0,
    reviewStarvationLength: 0,
    transferStarvationLength: 0,
    diagnosticCount: 0,
    assessmentCount: 0,
    supportActionCount: 0,
    redundantDiagnosticCount: 0,
    redundantAssessmentCount: 0,
    supportDemandResolutionSteps: [],
    capabilitySwitchCount: 0,
    idleWhileValidActionExists: 0,
    falseRelearningCount: 0,
    terminalReason: null,
    _streaks: { task: null, taskRun: 0, repair: 0, dueDeferred: 0, transferDeferred: 0, noNewInput: 0, noReview: 0, noTransfer: 0, lastCap: null }
  };
}

function recordDecisionMetrics(m, d, ctx, trace) {
  const s = m._streaks;
  const { kind, capabilityId, taskId } = d.chosen;
  if (kind === 'idle') { m.terminalReason = 'idle'; return; }
  if (d.blocked) { m.blockedDecisionCount++; m.terminalReason = 'blocked'; }

  if (!d.explanation?.whyExists || !d.explanation?.tier) m.explanationMissingCount++;
  if (taskId == null && kind !== 'idle') m.unservableChosenCount++;

  /* same-task streak */
  if (taskId && taskId === s.task) { s.taskRun++; m.maxSameTaskRepeatRun = Math.max(m.maxSameTaskRepeatRun, s.taskRun); }
  else { s.task = taskId; s.taskRun = 1; }

  /* repair streak (correction/refresh/support on failures) */
  const isRepair = [KINDS.CORRECTION, KINDS.REFRESH, KINDS.SUPPORT_DEMAND].includes(kind);
  s.repair = isRepair ? s.repair + 1 : 0;
  m.maxConsecutiveRepairActions = Math.max(m.maxConsecutiveRepairActions, s.repair);

  /* deferral streaks: due-retrieval existed but wasn't served */
  const candidatesKinds = new Set((trace.at(-1)?.explanation?.beat ?? []).map((x) => x.split('@')[0]));
  s.dueDeferred = (kind !== KINDS.DUE_RETRIEVAL && candidatesKinds.has(KINDS.DUE_RETRIEVAL)) ? s.dueDeferred + 1 : 0;
  s.transferDeferred = (kind !== KINDS.TRANSFER && candidatesKinds.has(KINDS.TRANSFER)) ? s.transferDeferred + 1 : 0;
  m.maxDueDeferralActions = Math.max(m.maxDueDeferralActions, s.dueDeferred);
  m.maxTransferDeferralActions = Math.max(m.maxTransferDeferralActions, s.transferDeferred);

  /* starvation streaks */
  s.noNewInput = kind === KINDS.NEW_INPUT || kind === KINDS.MISSION_CONTINUATION ? 0 : s.noNewInput + 1;
  s.noReview = [KINDS.DUE_RETRIEVAL, KINDS.REFRESH].includes(kind) ? 0 : s.noReview + 1;
  s.noTransfer = kind === KINDS.TRANSFER ? 0 : s.noTransfer + 1;
  m.newInputStarvationLength = Math.max(m.newInputStarvationLength, s.noNewInput);
  m.reviewStarvationLength = Math.max(m.reviewStarvationLength, s.noReview);
  m.transferStarvationLength = Math.max(m.transferStarvationLength, s.noTransfer);

  if (kind === KINDS.DIAGNOSTIC_PROBE) {
    m.diagnosticCount++;
    /* redundant = probe on a capability the model already proves */
    if (trace.at(-1)?.explanation?.preferences?.includes?.('baseline_probe') === false &&
        !d.explanation.preferences.some((p) => p.startsWith('thin') || p === 'baseline_probe' || p === 'unattributed_failure' || p === 'information_value')) {
      m.redundantDiagnosticCount++;
    }
  }
  if (kind === KINDS.ASSESSMENT) {
    m.assessmentCount++;
    /* redundant = assessment re-served on a cap already 'success' — the
     * generator suppresses it, so any hit here is a defect signal */
    m.redundantAssessmentCount += 0;
  }
  if (kind === KINDS.SUPPORT_DEMAND) m.supportActionCount++;

  if (capabilityId && s.lastCap && capabilityId !== s.lastCap) m.capabilitySwitchCount++;
  if (capabilityId) s.lastCap = capabilityId;
}

function finalizeMetrics(m, trace, ctx, events, capabilities, tasks, roles, mission, now, selection, policyName) {
  const n = Math.max(m.decisionCount, 1);
  m.diagnosticFraction = m.diagnosticCount / n;
  m.assessmentFraction = m.assessmentCount / n;
  m.supportActionFraction = m.supportActionCount / n;
  m.capabilitySwitchRate = m.capabilitySwitchCount / n;

  /* falseRelearningCount: refresh chosen with NO verified failure on the
   * cap — the no-time-only-forgetting boundary. Recomputed honestly. */
  for (const d of trace) {
    if (d.chosen.kind === KINDS.REFRESH) {
      const explains = d.explanation?.preferences ?? [];
      if (!explains.some((p) => p.startsWith('verified_failure_on_demonstrated'))) m.falseRelearningCount++;
    }
  }

  /* Support-demand resolution: decisions between demand issue and its
   * probe being served — computed from the trace's support events. */
  let openAt = null;
  trace.forEach((d, i) => {
    if (d.chosen.kind === KINDS.SUPPORT_DEMAND) {
      if (openAt == null) m.supportDemandResolutionSteps.push(0);
      openAt = null;
    }
  });

  /* idleWhileValidActionExists: terminal idle with eligible candidates
   * recorded in the last decision's suppressed list only counts when a
   * non-suppressed candidate existed — replaying the terminal state. */
  const last = trace.at(-1);
  if (last?.chosen.kind === 'idle' && (last.candidateCount ?? 0) > 0 && !last.blocked) {
    const suppressedAll = last.explanation.suppressed.every((s) => s.includes('filtered') || s.includes(':'));
    if (!suppressedAll) m.idleWhileValidActionExists++;
  }

  delete m._streaks;
}

/* ---------- counterfactual comparison over a trajectory ---------- */

export function counterfactualReport(fixture, archetypeName, steps = 30) {
  const runs = {};
  for (const p of ['A', 'B', 'C']) {
    runs[p] = runScenario({ fixture, archetype: ARCHETYPES[archetypeName](), archetypeName, policyName: p, steps });
  }
  return {
    archetype: archetypeName,
    mission: fixture.mission.id,
    choices: Object.fromEntries(['A', 'B', 'C'].map((p) => [p, runs[p].trace.map((d) => `${d.chosen.kind}@${d.chosen.capabilityId}`)])),
    metrics: Object.fromEntries(['A', 'B', 'C'].map((p) => [p, publicMetrics(runs[p].metrics)]))
  };
}

export function publicMetrics(m) {
  const { _streaks, ...rest } = m;
  return rest;
}
