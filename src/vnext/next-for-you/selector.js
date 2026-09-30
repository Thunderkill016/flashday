/*
 * Next For You runtime selector (mission 008C, spec §3/§10/§14/§16/§21).
 *
 * One entry point for "what task comes next" with three explicit modes:
 *
 *   REFERENCE  → the shipped `nextMissionTask`, verbatim. Byte/task-
 *                compatible with today's runner — the executable
 *                control group every B0 change is compared against.
 *   B0         → the hardened 008B Policy-B engine, validated and
 *                adapted to the legacy selection shape. Hard validator
 *                violations FAIL CLOSED — the task is never served.
 *   SHADOW_B0  → learner is served REFERENCE; B0 evaluates THE SAME
 *                immutable pre-decision state; the comparison is
 *                attached as `shadow` (and pushed to shadowSink if
 *                provided). B0 can never affect learner behavior.
 *
 * The B0 adapter never substitutes a semantic purpose to satisfy the
 * old UI shape (§14): a ready decision carries the decision record;
 * a terminal decision stays honestly idle/blocked, and a mission that
 * cannot close out because every authored assessment family is already
 * consumed surfaces `assessment_content_backlog` (§16) instead of
 * re-selling a stale family or silently falling back to production.
 */
import { nextMissionTask } from '../mission-runner.js';
import { policyB, PURPOSE_TO_KIND } from './policies.js';
import { validateDecision } from './validator.js';
import { KINDS, POLICY_VERSIONS } from './constants.js';
import { decisionInputSnapshot, stateDigest } from './decision-log.js';
import { deepFreezeAll, sha256 } from './canonical.js';

export const SELECTION_MODES = Object.freeze({
  REFERENCE: 'reference',
  B0: 'b0',
  SHADOW_B0: 'shadow_b0'
});

export function isSelectionMode(mode) {
  return mode === SELECTION_MODES.REFERENCE || mode === SELECTION_MODES.B0 || mode === SELECTION_MODES.SHADOW_B0;
}

/* Engine-facing state — the exact input object the promoted policies,
 * validator, and digest all see. One construction site so the served
 * decision, its validation, and its digest can never disagree about
 * what state produced it.
 *
 * Scope is derived from the mission exactly the way the shipped runner
 * does it (mission-runner.js surface): declared targets ∪ carriers ∪
 * prereqs ∪ supports. `capabilities` here is the FULL registry — the
 * engine receives the mission-scoped view while REFERENCE keeps the
 * unfiltered list verbatim. */
export function engineState({ learnerId, mission, tasks, capabilities, events, riskPriors = [], policy, selection = {}, decisionContext = null, now }) {
  const surface = new Set([
    ...(mission.targetCapabilities ?? []),
    ...(mission.carrierCapabilities ?? []),
    ...(mission.prerequisiteCapabilities ?? []),
    ...(mission.supportCapabilities ?? [])
  ]);
  return {
    learnerId, mission, tasks,
    capabilities: capabilities.filter((c) => surface.has(c.id)),
    roles: {
      targets: new Set(mission.targetCapabilities ?? []),
      supports: new Set(mission.supportCapabilities ?? []),
      prereqs: new Set(mission.prerequisiteCapabilities ?? [])
    },
    events, riskPriors, policy, selection, decisionContext, now
  };
}

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;

/* §14 — adapt a B0 decision record to the legacy selection shape the
 * mission UI consumes. The task's real purpose is resolved from the
 * registry — never guessed from the intent kind. */
export function b0ToSelection(decision, tasks) {
  const chosen = decision?.chosen;
  if (chosen?.taskId != null) {
    const task = tasks.find((t) => keyOf(t) === `${chosen.taskId}@${chosen.taskRevision ?? 1}`)
      ?? tasks.find((t) => t.id === chosen.taskId);
    return {
      status: 'ready',
      taskId: chosen.taskId,
      taskRevision: chosen.taskRevision ?? task?.revision ?? 1,
      capabilityId: chosen.capabilityId ?? task?.capabilityId ?? null,
      purpose: task?.purpose ?? null,
      reason: decision.explanation?.whyExists ?? `b0 ${chosen.kind}`,
      decision
    };
  }
  const kind = chosen?.kind === 'blocked' || decision?.blocked ? 'blocked' : 'idle';
  const reasons = decision?.explanation?.blockedReasons ?? [];
  const assessmentBacklog = kind === 'blocked' && (decision?.candidates ?? []).some(
    (c) => c.kind === KINDS.ASSESSMENT && typeof c.filterReason === 'string'
      && /assessment_(family_)?consumed/.test(c.filterReason)
  ) && !(decision?.candidates ?? []).some((c) => c.eligible === true && c.kind !== KINDS.ASSESSMENT);
  return {
    status: kind,
    taskId: null,
    taskRevision: null,
    capabilityId: null,
    purpose: null,
    /* §16: one honest reason code the UI can map to safe copy — a
     * content backlog, not a learner failure and not an idle claim. */
    reason: assessmentBacklog
      ? `assessment_content_backlog: ${decision?.explanation?.whyExists ?? 'transferred capability has no fresh assessment family'}${reasons.length ? ` — ${reasons.join('; ')}` : ''}`
      : (reasons.length ? reasons.join('; ') : (decision?.explanation?.whyExists ?? 'no valid candidate')),
    reasonCode: assessmentBacklog ? 'assessment_content_backlog' : null,
    decision
  };
}

/* Wrap a served REFERENCE selection in the decision-record shape so the
 * consume/audit path is uniform across modes (SHADOW_B0 only — in pure
 * REFERENCE mode no decision record exists at all). The record's kind
 * mirrors policyRef's purpose mapping; the production payload stays
 * verbatim. */
export function referenceDecision(selection, { missionId = null, missionRevision = null, decisionContext = null } = {}) {
  const ready = selection.status === 'ready';
  const kind = ready ? (PURPOSE_TO_KIND[selection.purpose] ?? KINDS.MISSION_CONTINUATION) : selection.status;
  /* Episode+ordinal keeps the id unique across repeated selections of
   * the same task — a legitimately re-served reference task is a NEW
   * decision, never a dedupe hit. */
  const ordinal = decisionContext?.actionsChosen?.length ?? 0;
  const episode = decisionContext?.decisionEpisodeId ?? 'ep';
  return {
    decisionId: `ref:${episode}#${ordinal}:${selection.status}:${selection.taskId ?? 'none'}@${selection.taskRevision ?? 0}`,
    selectionPolicyVersion: 'production.nextMissionTask',
    learnerModelVersion: null,
    missionId,
    missionRevision,
    chosen: ready
      ? { kind, capabilityId: selection.capabilityId, taskId: selection.taskId, taskRevision: selection.taskRevision, tier: 'PRODUCTION' }
      : { kind: selection.status, capabilityId: null, taskId: null, taskRevision: null, tier: 'TERMINAL' },
    production: { status: selection.status, reason: selection.reason, skippedIntents: selection.skippedIntents ?? [] },
    explanation: { whyExists: selection.reason, tier: 'PRODUCTION', preferences: [], penalties: [], beat: [], tieBreak: null, suppressed: [] },
    candidates: [], candidateCount: 0,
    integrityViolations: [],
    blocked: selection.status === 'blocked'
  };
}

/* §10 — compact shadow comparison over the same pre-decision state.
 * Descriptive, never a better/worse verdict: a difference is evidence
 * of POLICY DIFFERENCE, nothing more. */
export function shadowCompare(reference, b0Decision) {
  const ref = {
    status: reference.status,
    task: reference.taskId == null ? null : `${reference.taskId}@${reference.taskRevision ?? 1}`,
    purpose: reference.purpose ?? null
  };
  const b0chosen = b0Decision?.chosen;
  const b0 = {
    kind: b0chosen?.kind ?? null,
    task: b0chosen?.taskId == null ? null : `${b0chosen.taskId}@${b0chosen.taskRevision ?? 1}`,
    decisionId: b0Decision?.decisionId ?? null
  };
  const sameTask = ref.task != null && ref.task === b0.task;
  let divergenceReason = null;
  if (!sameTask) {
    if (ref.task == null && b0.task == null) divergenceReason = `both terminal: reference=${ref.status}, b0=${b0.kind}`;
    else if (ref.task == null) divergenceReason = `reference ${ref.status} but B0 chose ${b0.kind}@${b0.task}`;
    else if (b0.task == null) divergenceReason = `reference served ${ref.task} (${ref.purpose}) but B0 is ${b0.kind}`;
    else divergenceReason = `reference served ${ref.task} (${ref.purpose}), B0 chose ${b0.kind}@${b0.task}`;
  }
  return { reference: ref, b0, sameTask, divergenceReason };
}

/* §21 — run the independent validator against the exact pre-decision
 * input. Any hard violation fails closed: the decision is never
 * served. Returns the violation list (empty = clean). */
export function validateB0(decision, input) {
  return validateDecision(decision, {
    events: input.events, tasks: input.tasks, capabilities: input.capabilities,
    roles: input.roles, mission: input.mission, learnerId: input.learnerId,
    now: input.now, policy: input.policy, selection: input.selection,
    decisionContext: input.decisionContext
  });
}

/* §3/§14 — the one runtime entry point.
 *
 * Returns the legacy selection shape:
 *   ready   → { status:'ready', taskId, taskRevision, capabilityId,
 *               purpose, reason, decision? }
 *   blocked → { status:'blocked', ..., reason, reasonCode?, decision? }
 *   idle    → { status:'idle', ..., reason, decision? }
 *
 * `decision` is attached on B0/SHADOW_B0 paths so the session can lock
 * the live task to the exact decision that produced it (§7) and audit
 * it on consume (§11). REFERENCE never carries one. */
export function selectNextTask(input) {
  /* An unrecognized mode must never silently run the experimental
   * policy — fail closed to the reference runner. */
  const mode = isSelectionMode(input.mode) ? input.mode : SELECTION_MODES.REFERENCE;
  const referenceArgs = {
    learnerId: input.learnerId, mission: input.mission, tasks: input.tasks,
    capabilities: input.capabilities, events: input.events,
    riskPriors: input.riskPriors ?? [], now: input.now, policy: input.policy
  };

  if (mode === SELECTION_MODES.REFERENCE) {
    return nextMissionTask(referenceArgs);
  }

  const state = engineState(input);

  if (mode === SELECTION_MODES.SHADOW_B0) {
    const reference = nextMissionTask(referenceArgs);
    const b0 = policyB(state);
    const shadow = shadowCompare(reference, b0);
    /* Shadow violations are recorded on the comparison — B0 has no
     * authority here, so a violation never blocks the served task, but
     * it MUST stay visible in the audit stream. */
    const violations = input.validate === false ? [] : validateB0(b0, state);
    if (violations.length) shadow.b0Violations = violations;
    input.shadowSink?.(shadow);
    /* The served decision carries the comparison so the consume-time
     * audit record captures it (§11: shadow reference choice). */
    return {
      ...reference, shadow, engineInput: state,
      inputDigest: stateDigest(state),
      decision: { ...referenceDecision(reference, state), shadow }
    };
  }

  /* mode === B0 */
  const decision = policyB(state);
  const inputDigest = stateDigest(state);
  if (input.validate !== false) {
    const violations = validateB0(decision, state);
    if (violations.length) {
      return {
        status: 'blocked', taskId: null, taskRevision: null,
        capabilityId: null, purpose: null,
        reason: `validator_violation: ${violations.join('; ')}`,
        reasonCode: 'validator_violation',
        decision, engineInput: state, inputDigest
      };
    }
  }
  return { ...b0ToSelection(decision, input.tasks), engineInput: state, inputDigest };
}

/* §11 — compact append-only audit provenance for a consumed decision.
 * Deliberately small: identities, versions, digests, reason codes — the
 * learner's response text lives in evidence events, never here. */
export function decisionAuditRecord(decision, { learnerId, missionId, missionRevision, missionRunId = null, sessionId, timestamp, shadow = null, input = null, digest = null }) {
  /* The digest identifies the input AS OF DECISION TIME — the same
   * state bound into decisionId. Callers pass it explicitly; the
   * fallback recompute over `input` is only correct when the stored
   * decide-time state is still current. */
  const inputDigest = digest ?? (input ? stateDigest(input) : null);
  /* HIGH-5: episode/session provenance comes from the EXACT decide-time
   * context carried in the input snapshot — a shadow-wrapped reference
   * decision has no decisionContextSummary, so the summary field alone
   * cannot be trusted as the only source. */
  const decideCtx = input?.decisionContext ?? null;
  return deepFreezeAll({
    decisionId: decision.decisionId,
    learnerId,
    missionId: missionId ?? decision.missionId ?? null,
    missionRevision: missionRevision ?? decision.missionRevision ?? null,
    missionRunId,
    taskId: decision.chosen?.taskId ?? null,
    taskRevision: decision.chosen?.taskRevision ?? null,
    capabilityId: decision.chosen?.capabilityId ?? null,
    selectionPolicyVersion: decision.selectionPolicyVersion ?? null,
    learningPolicyVersion: input?.policy?.version ?? decision.learningPolicyVersion ?? null,
    decisionInputDigest: inputDigest,
    decisionEpisodeId: decision.decisionContextSummary?.episode ?? decideCtx?.decisionEpisodeId ?? null,
    sessionId: sessionId ?? decideCtx?.sessionId ?? null,
    chosenKind: decision.chosen?.kind ?? null,
    timestamp,
    reasonCodes: [
      ...(decision.explanation?.preferences ?? []),
      ...(decision.explanation?.penalties ?? [])
    ].slice(0, 16),
    shadow: shadow ?? null,
    contextVersion: 'vnext.decision-context.v2'
  });
}

export { POLICY_VERSIONS };
