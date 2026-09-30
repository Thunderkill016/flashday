/*
 * vNext pilot harness (issue #50).
 *
 * Runs a small cohort of scripted learners through the full
 * mission/contract stack — selector → binder → append-only evidence →
 * projection — across deterministic sessions, then evaluates a
 * harness-level EVIDENCE PACKAGE per capability.
 *
 * The harness never mutates learner state and never changes engine
 * semantics. Its claim is recomputed from PRIMITIVE evidence — the
 * engine's milestones are reported as outputs, never consumed as
 * claim inputs (R2 research: a claim derived from the milestone it
 * certifies is circular). A milestone/primitive mismatch is reported
 * as an integrity failure — an engine promotion bug, not a gap.
 *
 * learnedByFlashday(capId) :=
 *   acquisitionSource === 'FLASHDAY'     // first attempt was not an
 *                                        // unaided diagnostic pass —
 *                                        // baseline-passers were able
 *                                        // before we taught anything
 *   AND ≥2 unaided verified successes spanning ≥2 sessions
 *   AND ≥1 delayed_retrieval success ≥ retentionDelayMs after first
 *     unaided success (retained72h is reported separately — a probe,
 *     not a claim condition)
 *   AND ≥1 transfer_attempt success on a prompt family never seen in
 *     a practiced context before that attempt (held-out delta)
 *   AND ≥1 checkpoint success
 *   AND no unresolved contradiction — the LATEST outcome of every
 *     probe type (delayed/transfer/checkpoint) is success; a failed
 *     probe repaired later resolves, one left standing is
 *     `needsRelearning`
 *
 * Sessions are implicit in the event log — two events ≥30 min apart
 * are different sessions. Every timestamp is supplied; wall-clock
 * time is never read.
 */
import { projectLearnerState, RETENTION_DELAY_MS } from './projection.js';
import { runMissionTrace } from './mission-runner.js';
import { answerBearing } from './evidence.js';
import { verifyEventTask } from './contracts.js';

const ATTEMPT_TYPES = new Set([
  'recognition_attempt', 'recall_attempt', 'production_attempt',
  'interaction_turn', 'retry', 'delayed_retrieval', 'transfer_attempt', 'checkpoint'
]);
const INDEPENDENT_AUTHORITIES = new Set(['deterministic', 'human']);
const SESSION_GAP_MS = 30 * 60 * 1000;

const isUnaidedVerifiedSuccess = (e) =>
  ATTEMPT_TYPES.has(e.eventType) &&
  e.attempt?.outcome === 'success' &&
  e.attempt?.observed === true &&
  !answerBearing(e.support) &&
  INDEPENDENT_AUTHORITIES.has(e.evaluation?.authority);

/* Session buckets from the log itself: a >30min gap starts a new
 * session. Deterministic and content-free — no synthetic flags. */
function sessionBuckets(events) {
  const times = [...new Set(events.map((e) => e.occurredAt))].sort((a, b) => a - b);
  const buckets = new Map();
  let bucket = 0;
  for (let i = 0; i < times.length; i++) {
    if (i > 0 && times[i] - times[i - 1] > SESSION_GAP_MS) bucket++;
    buckets.set(times[i], bucket);
  }
  return (t) => buckets.get(t) ?? 0;
}

/* One learner through an ordered list of sessions. Each session is a
 * bounded runMissionTrace call sharing the learner's append-only log. */
export function runPilotLearner({ learner, mission, tasks, capabilities, riskPriors = [], sessions, stepsPerSession = 40 }) {
  const events = [];
  const trace = [];
  const sessionReports = [];
  let seq = 0;
  /* Per-run service counter: `ctx.call` is the Nth time this task has
   * been served to this learner in THIS run. Scripts key behavior on
   * it instead of closures — replaying a run must not inherit state. */
  const callCount = new Map();
  for (const session of sessions) {
    const result = runMissionTrace({
      learnerId: learner.id,
      mission: typeof mission === 'function' ? mission(learner) : mission,
      tasks,
      capabilities,
      events,
      riskPriors,
      nowAt: (step) => session.startMs + step * session.stepMs,
      act: (task, ctx) => {
        const key = `${task.id}@${task.revision ?? 1}`;
        const call = (callCount.get(key) ?? 0) + 1;
        callCount.set(key, call);
        return (learner.act(task, { ...ctx, session: session.name, call }) ?? [])
          .map((raw, i) => ({
            id: raw.id ?? `${learner.id}.ev.${++seq}`,
            occurredAt: raw.occurredAt ?? ctx.now + i * 100,
            ...raw,
            learnerId: learner.id // learner isolation is the harness's job, never the act's
          }));
      },
      maxSteps: stepsPerSession
    });
    trace.push(...result.trace.map((t) => ({ ...t, session: session.name })));
    events.push(...result.events.slice(events.length));
    const last = result.trace[result.trace.length - 1];
    sessionReports.push({
      session: session.name,
      steps: result.trace.filter((t) => t.taskId).length,
      endedWith: last?.status ?? 'idle',
      lastReason: last?.reason ?? null
    });
  }
  return { learnerId: learner.id, events, trace, sessionReports };
}

/* Harness-level claim — recomputed from PRIMITIVE evidence, not from
 * milestones (R2 research: TRANSFERRED is a materialized conclusion,
 * never the input to its own claim).
 *
 *   learnedByFlashday(capId) :=
 *     acquisitionSource === 'FLASHDAY'        // baseline did NOT pass
 *     AND ≥2 unaided successes, spaced ≥2 sessions
 *     AND ≥1 delayed_retrieval success ≥24h after first unaided
 *     AND ≥1 transfer_attempt success on a family never seen in a
 *         practiced context before that attempt
 *     AND ≥1 checkpoint success
 *     AND no unresolved contradiction: the LATEST outcome of every
 *         probe type (delayed / transfer / checkpoint) is success —
 *         a fail followed by remediation + re-pass is resolved, a fail
 *         left standing is `needsRelearning`
 *
 * Baseline attribution: if the capability's first attempt is an
 * unaided diagnostic PASS, acquisitionSource = 'PREEXISTING' — the
 * learner arrived able; FlashDay may confirm but must never claim it. */
export function evaluateClaim(learnerId, events, capabilities, tasks, capId, { retentionDelayMs = RETENTION_DELAY_MS } = {}) {
  const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks);
  const slot = byCapability.get(capId);
  /* Claims count only verified evidence — the same registry gate the
   * engine applies. An unverifiable event is neither proof nor
   * contradiction; it simply does not exist for the claim. */
  const byKey = new Map(tasks.map((t) => [`${t.id}@${t.revision ?? 1}`, t]));
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const mine = events.filter((e) => {
    if (e.learnerId !== learnerId || e.capabilityId !== capId) return false;
    const t = byKey.get(`${e.taskId}@${e.taskRevision}`);
    const c = t ? capById.get(t.capabilityId) : null;
    return !!t && !!c && verifyEventTask(e, t, c);
  }).sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1));
  const bucketOf = sessionBuckets(mine);

  const attempts = mine.filter((e) => ATTEMPT_TYPES.has(e.eventType) && e.attempt?.outcome != null);
  const unaided = mine.filter(isUnaidedVerifiedSuccess);
  const unaidedSessions = new Set(unaided.map((e) => bucketOf(e.occurredAt)));
  const firstUnaidedAt = unaided.length ? unaided[0].occurredAt : null;

  /* Baseline attribution — the first eliciting attempt decides. */
  const baselineMastered = attempts.length > 0 && isUnaidedVerifiedSuccess(attempts[0]);
  const acquisitionSource = baselineMastered ? 'PREEXISTING' : 'FLASHDAY';

  const delayedPasses = mine.filter((e) => e.eventType === 'delayed_retrieval' && e.attempt?.outcome === 'success');
  const retained24h = delayedPasses.some((e) => firstUnaidedAt != null && e.occurredAt >= firstUnaidedAt + retentionDelayMs);
  const retained72h = delayedPasses.some((e) => firstUnaidedAt != null && e.occurredAt >= firstUnaidedAt + 3 * retentionDelayMs);

  /* Held-out transfer: the winning attempt's family must not have been
   * rehearsed in a practiced/assessment context before it. */
  const transferSuccess = mine.some((e) => {
    if (e.eventType !== 'transfer_attempt' || e.attempt?.outcome !== 'success' || e.context?.practicedOrTransfer !== 'transfer') return false;
    return !mine.some((p) => p.occurredAt < e.occurredAt && p.context?.practicedOrTransfer !== 'transfer' && p.context?.promptFamily === e.context.promptFamily);
  });
  const checkpointPass = mine.some((e) => e.eventType === 'checkpoint' && e.attempt?.outcome === 'success');

  /* Unresolved contradiction = latest outcome of a probe type is not
   * success. A failed probe repaired later resolves; one left standing
   * is needsRelearning. */
  const probeTypes = ['delayed_retrieval', 'transfer_attempt', 'checkpoint'];
  const openProbes = probeTypes.filter((t) => {
    const latest = [...mine].reverse().find((e) => e.eventType === t && e.attempt?.outcome != null);
    return latest && latest.attempt.outcome !== 'success';
  });
  const remediationEpisodes = mine.filter((e) => e.binding?.purpose === 'remediation' && e.attempt?.outcome != null).length;

  const gaps = [];
  if (baselineMastered) gaps.push('acquisitionSource PREEXISTING — baseline already demonstrated the capability');
  if (unaided.length < 2) gaps.push(`${unaided.length} unaided success(es), need ≥2`);
  if (unaidedSessions.size < 2) gaps.push(`unaided successes span ${unaidedSessions.size} session(s), need ≥2`);
  if (!retained24h) gaps.push('no delayed_retrieval success ≥24h after first unaided success');
  if (!transferSuccess) gaps.push('no transfer_attempt success on held-out context');
  if (!checkpointPass) gaps.push('no checkpoint success');
  if (openProbes.length) gaps.push(`unresolved contradictory evidence: latest ${openProbes.join(', ')} outcome not success`);

  /* Integrity cross-check — milestone vs the primitives it claims to
   * summarize. A mismatch is an engine promotion bug, not a gap. */
  const primitiveTransfer = mine.some((e) => isUnaidedVerifiedSuccess(e) && e.context?.practicedOrTransfer === 'transfer');
  const integrity = {
    transferredMatchesPrimitives: slot?.milestones.transferred === primitiveTransfer
      ? true : `milestone=${slot?.milestones.transferred} vs primitive=${primitiveTransfer}`,
    independentMatchesPrimitives: (slot?.milestones.independent ?? false) === (unaided.length > 0)
      ? true : `milestone=${slot?.milestones.independent} vs primitive=${unaided.length > 0}`
  };

  const checkpointAttempts = mine.filter((e) => e.eventType === 'checkpoint' && e.attempt?.outcome != null);
  const latestCheckpoint = checkpointAttempts[checkpointAttempts.length - 1];

  return {
    capId,
    acquisitionSource,
    baselineMastered,
    learnedByFlashday: gaps.length === 0,
    needsRelearning: openProbes.length > 0,
    retained24h,
    retained72h,
    transferred: slot?.milestones.transferred ?? false,
    assessmentStatus: !latestCheckpoint ? 'pending' : latestCheckpoint.attempt.outcome === 'success' ? 'pass' : 'fail',
    gaps,
    unaidedSuccesses: unaided.length,
    remediationEpisodes,
    integrity
  };
}

export function runPilot({ learners, mission, tasks, capabilities, riskPriors = [], sessions, targetCapabilities, stepsPerSession = 40 }) {
  const reports = learners.map((learner) => {
    const run = runPilotLearner({ learner, mission, tasks, capabilities, riskPriors, sessions, stepsPerSession });
    const caps = targetCapabilities ?? mission.targetCapabilities ?? [];
    const claims = {};
    for (const capId of caps) claims[capId] = evaluateClaim(run.learnerId, run.events, capabilities, tasks, capId);
    return { ...run, claims };
  });

  const caps = targetCapabilities ?? mission.targetCapabilities ?? [];
  /* Eligible denominator excludes baseline-mastered claims — a
   * preexisting ability was never FlashDay's to claim. */
  const eligible = reports.flatMap((r) => caps.map((c) => r.claims[c]).filter((cl) => cl && !cl.baselineMastered));
  const learned = eligible.filter((cl) => cl.learnedByFlashday).length;
  const integrityFailures = reports.flatMap((r) =>
    caps.flatMap((c) => Object.values(r.claims[c]?.integrity ?? {}).filter((v) => v !== true).map((v) => `${r.learnerId}/${c}: ${v}`)));

  return {
    learners: reports,
    summary: {
      learners: reports.length,
      capabilitiesChecked: caps,
      claimRate: eligible.length ? learned / eligible.length : 0,
      claimsSatisfied: learned,
      claimsEligible: eligible.length,
      baselineMastered: reports.reduce((n, r) => n + caps.filter((c) => r.claims[c]?.baselineMastered).length, 0),
      needsRelearning: reports.reduce((n, r) => n + caps.filter((c) => r.claims[c]?.needsRelearning).length, 0),
      integrityFailures,
      totalSteps: reports.reduce((n, r) => n + r.trace.filter((t) => t.taskId).length, 0)
    }
  };
}
