/*
 * vNext mission session controller (issue #55, research R4 on #49).
 *
 * Headless state machine between the learner-facing surface and the
 * contract stack. Every learner-visible step runs the REAL path:
 *
 *   nextMissionTask → bindAttempt / bindObservation → append → projection
 *
 * The controller owns NOTHING semantic — it cannot mint evidence, cannot
 * mark a task done, cannot set a milestone. It only decides what the
 * screen may offer and which observed actions become bound events.
 *
 * Invariants enforced here (all pinned by tests):
 *
 *   - Feedback is never shown before commit: an outcome only exists
 *     after bindAttempt + append, and the screen only learns it in the
 *     'feedback' phase.
 *   - Support shown pre-commit contaminates the attempt: a support_use
 *     event is appended AND the attempt carries an immutable
 *     support snapshot. Closing the hint never decontaminates.
 *   - Retry is a new attempt: the deterministic attemptId
 *     `${taskId}@${rev}:a${n}` derives from committed attempts in the
 *     log — a reload recomputes the same id, so a retried commit of the
 *     same response dedupes instead of double-writing.
 *   - Input/exposure can never masquerade as an attempt: exposure-only
 *     purposes bind observations only.
 *   - missionRunId never changes because of a reload: the open run is
 *     resumed from the run store; runs only end via
 *     complete/abandon/supersede — never implicitly.
 *   - Assessment commits freeze the outcome before any feedback render
 *     (the evaluation is stamped into the event before the screen sees it).
 *   - Support is only offered on practice purposes. Probes
 *     (diagnostic / delayed_retrieval / transfer / assessment) never
 *     offer pre-commit support — their evidence must stay unaided.
 */
import { nextMissionTask } from './mission-runner.js';
import { projectLearnerState } from './projection.js';
import { bindAttempt, bindObservation } from './bind.js';
import { emittedEventType, verifyEventTask } from './contracts.js';
import { evaluateAttempt, EVALUATOR_VERSION } from './evaluators.js';
import { answerBearing, conditionsViolated } from './evidence.js';
import {
  createMemoryEventStore, createMemoryRunStore, createMemoryDecisionStore, eventFingerprint
} from './store-memory.js';
import {
  SELECTION_MODES, selectNextTask, decisionAuditRecord
} from './next-for-you/selector.js';
import { emptyContext, normalizeContext, consumeDecision } from './next-for-you/decision-context.js';
import { createDecisionLog } from './next-for-you/decision-log.js';
import { POLICY_VERSIONS } from './next-for-you/constants.js';
import { sha256 } from './next-for-you/canonical.js';

/* Purposes that may offer pre-commit support in v0. A used control
 * always leaves a support_use event plus a stamped snapshot — the offer
 * is a learner affordance, not an evidence cheat. */
const SUPPORTABLE_PURPOSES = new Set(['retrieval', 'production', 'interaction', 'remediation']);
const EXPOSURE_PURPOSES = new Set(['input', 'notice']);

/* The commit event type is a contract (contracts.js emittedEventType) —
 * the same rule validateTask uses to reject task shapes that would emit
 * an event their purpose may never produce. Kept as a one-line alias so
 * call sites stay readable. */
const EVENT_TYPE_FOR = (purpose, responseType) => emittedEventType(purpose, responseType);

/* Deterministic event ids — a re-delivered append dedupes on identical
 * content instead of double-writing, and ids stay stable across reloads.
 * `_xx` encodes any non-alphanumeric char so task keys can never
 * collide. */
const enc = (s) => String(s).replace(/[^a-zA-Z0-9]/g, (c) => `_${c.codePointAt(0).toString(16)}`);
const evtId = (...parts) => `e~${parts.map(enc).join('~')}`;

const defaultIdGen = () =>
  `run.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;

const keyOf = (t) => `${t.id}@${t.revision ?? 1}`;

const freshSupport = () =>
  ({ hint: false, translation: false, transcript: false, modelAnswer: false, repeat: false, repeatCount: null });

export function createMissionSession({
  learnerId,
  mission,
  tasks,
  capabilities,
  riskPriors = [],
  policy,
  now = () => Date.now(),
  eventStore = createMemoryEventStore(),
  runStore = createMemoryRunStore(),
  idGen = defaultIdGen,
  /* 008C §3/§19: 'reference' (default — the shipped runner, unchanged),
   * 'b0' (hardened Next For You engine), 'shadow_b0' (serve reference,
   * evaluate B0 on the same pre-decision state, log the comparison). */
  selectionMode = SELECTION_MODES.REFERENCE,
  /* Selection-config tunables for B0 (starvationGuard, budgets…). */
  selectionConfig = {},
  /* Optional sinks: shadowSink(comparison) per SHADOW_B0 selection;
   * decisionStore.append(record) for consumed-decision audit (§11). */
  shadowSink = null,
  decisionStore = null,
  /* §21: B0 decisions run through the independent validator; a hard
   * violation fails closed instead of serving the task. */
  validateDecisions = true
}) {
  const events = [];
  let run = null;
  let started = false;
  const mode = Object.values(SELECTION_MODES).includes(selectionMode) ? selectionMode : SELECTION_MODES.REFERENCE;
  // Session-local UI state — never evidence. liveTask is the task the
  // learner is looking at; committed remembers the just-committed task
  // so the feedback phase renders IT even though the selector has
  // already consumed it. A reload drops this state harmlessly: anything
  // uncommitted simply did not happen.
  let liveTask = null;          // { key, task, cap, decision, decisionInput }
  let committed = null;         // { task, cap, evalResult }
  let phase = 'prompt';         // 'prompt' | 'feedback'
  let selectionCalls = 0;       // BLOCKER-1 regression seam: real selector evaluations
  let supportSnapshot = freshSupport();
  let supportCounts = new Map();
  let playCount = 0;
  let promptShownAt = null;

  /* Decision bookkeeping (008C §5): persisted on the run record, never
   * evidence. decisionContext is session-local working state synced
   * from run.selection; the log + shadow trail are append-only. */
  let decisionContext = null;
  const decisionLog = createDecisionLog();
  const shadowLog = [];

  /* Audit-store boundary (final-review invariant): a B0/SHADOW session
   * must never consume a decision with no audit trail at all — the
   * record at least lands in a session-scoped memory store. REFERENCE
   * is allowed audit-free (its decisions are production bookkeeping,
   * not engine commitments). Callers wanting durable/external audit
   * pass an explicit decisionStore. */
  const auditStore = decisionStore
    ?? (mode === SELECTION_MODES.REFERENCE ? null : createMemoryDecisionStore());

  const taskByKey = new Map(tasks.map((t) => [keyOf(t), t]));
  const capById = new Map(capabilities.map((c) => [c.id, c]));

  /* Episode identity: ONE persisted decision episode per mission run —
   * episode budgets are tied to an explicit run/session boundary, never
   * to wall-clock (BLOCKER-3: a render crossing UTC midnight must not
   * silently reset diagnostic/repair counters). The episode id is
   * minted at run creation and stored on run.selection, so reloads,
   * clock jumps and repeated renders all observe the same episode. */
  const episodeIdFor = () => `ep:${run?.id ?? 'run'}`;
  const sessionIdFor = () => `ses:${run?.id ?? 'run'}`;

  const attemptCountFor = (taskKey) =>
    events.filter(
      (e) => e.learnerId === learnerId
        && `${e.taskId}@${e.taskRevision}` === taskKey
        && e.attempt?.outcome != null
    ).length;

  const attemptIdFor = (task) => `${keyOf(task)}:a${attemptCountFor(keyOf(task)) + 1}`;

  const appendAll = async (bound) => {
    const stamped = bound.map((e) => ({ ...e, missionRunId: run?.id ?? null }));
    await eventStore.append(stamped);
    for (const e of stamped) {
      const i = events.findIndex((x) => x.id === e.id);
      if (i >= 0) events[i] = e;
      else events.push(e);
    }
    return stamped;
  };

  const select = () => {
    selectionCalls += 1;
    if (mode === SELECTION_MODES.REFERENCE) {
      const sel = nextMissionTask({
        learnerId, mission, tasks, capabilities,
        events, riskPriors, now: now(), policy
      });
      if (sel.status !== 'ready') return { sel, task: null, cap: null };
      const task = taskByKey.get(`${sel.taskId}@${sel.taskRevision}`);
      const cap = task ? capById.get(task.capabilityId) : null;
      return { sel, task, cap };
    }
    /* B0 / SHADOW_B0: one immutable pre-decision state feeds the engine,
     * its validation, and the audit digest (selector.engineState). The
     * episode is pinned to the persisted run — a render that never
     * consumes changes nothing (§6), and the wall clock alone can never
     * roll it. `decisionNow` is resolved exactly once per selection so
     * context, policy state and audit timestamps share one instant. */
    const decisionNow = now();
    if (!decisionContext) {
      decisionContext = emptyContext(
        run?.selection?.decisionEpisodeId ?? episodeIdFor(),
        sessionIdFor()
      );
    }
    const input = {
      learnerId, mission, tasks, capabilities,
      events, riskPriors, policy,
      selection: run?.selection?.config ?? selectionConfig,
      decisionContext, now: decisionNow
    };
    const sel = selectNextTask({
      mode, ...input, shadowSink,
      validate: validateDecisions
    });
    if (sel.shadow) {
      /* A render re-selects without consuming — an identical back-to-back
       * comparison carries no new information; keep the log signal-only
       * (bounded, deduped consecutive duplicates). */
      const last = shadowLog.at(-1);
      const same = last
        && last.sameTask === sel.shadow.sameTask
        && last.reference?.task === sel.shadow.reference?.task
        && last.b0?.task === sel.shadow.b0?.task
        && last.b0?.kind === sel.shadow.b0?.kind;
      if (!same) {
        shadowLog.push(sel.shadow);
        if (shadowLog.length > 64) shadowLog.shift();
      }
    }
    /* decisionInput is the ENGINE state (mission-scoped caps + derived
     * roles + the pre-consume context) — the exact object the decision,
     * its validation, and its digest all saw. Never the raw input:
     * the audit digest must equal the state bound into decisionId. */
    const decisionInput = sel.engineInput ?? null;
    if (sel.status !== 'ready') return { sel, task: null, cap: null, input: decisionInput, digest: sel.inputDigest ?? null };
    const task = taskByKey.get(`${sel.taskId}@${sel.taskRevision}`);
    const cap = task ? capById.get(task.capabilityId) : null;
    return { sel, task, cap, input: decisionInput, digest: sel.inputDigest ?? null };
  };

  /* §8 + BLOCKER-2: the displayed decision is consumed exactly once —
   * when the learner ACTS — and the consumption is a crash-consistent
   * two-phase commit:
   *
   *   1. journal  — run.selection.pendingConsumption (decision id,
   *      decide-time digest, deterministic expected event ids, the
   *      audit payload, the derived next context) persists BEFORE any
   *      evidence lands;
   *   2. evidence — appendAll() idempotent evidence append;
   *   3. audit    — decisionStore.append() idempotent audit append;
   *   4. commit   — advance DecisionContext, clear the marker, saveRun.
   *
   * A crash between steps replays through init()'s reconcile: full
   * evidence → finish audit + apply journaled context; no evidence →
   * roll the marker back and leave the decision unconsumed; partial →
   * fail closed. Nothing here fabricates learner evidence. */
  const consumeLiveDecision = async (bound) => {
    const d = liveTask?.decision;
    const input = liveTask?.decisionInput;
    if (!d || !decisionContext) {
      if (bound?.length) await appendAll(bound);
      return;
    }
    const consumedAt = now();
    const { context: next, consumed } = consumeDecision(decisionContext, d, consumedAt);
    if (!consumed) {
      if (bound?.length) await appendAll(bound);
      return;
    }
    /* Fail-closed audit boundary (008B decision-log semantics): append
     * recomputes the digest from the recorded decide-time input and
     * throws on missing provenance — an unverifiable record never lands. */
    decisionLog.append(d, input);
    const record = decisionAuditRecord(d, {
      learnerId,
      missionId: mission.id,
      missionRevision: mission.revision ?? null,
      missionRunId: run?.id ?? null,
      sessionId: input?.decisionContext?.sessionId ?? sessionIdFor(),
      timestamp: consumedAt,
      shadow: d.shadow ?? null,
      digest: liveTask?.decisionDigest ?? null,
      input
    });
    if (run?.selection) {
      /* The journal pins the CONTENT it expects, not just ids (HIGH-3):
       * an id-only marker would bless any bytes that happen to share
       * the id. The expectation is a sha256 digest over the stamped
       * event's canonical fingerprint (missionRunId included) — the
       * journal holds an opaque hash, never the learner's response
       * text (008D data minimization: response lives only in the
       * append-only evidence log). */
      const stamped = (bound ?? []).map((e) => ({ ...e, missionRunId: run?.id ?? null }));
      run.selection.pendingConsumption = {
        decisionId: d.decisionId,
        decisionDigest: liveTask?.decisionDigest ?? null,
        expectedEvents: stamped.map((e) => ({ id: e.id, digest: `sha256:${sha256(eventFingerprint(e))}` })),
        auditRecord: record,
        nextContext: next,
        consumedAt
      };
      await runStore.saveRun(run);
    }
    if (bound?.length) await appendAll(bound);
    await auditStore?.append?.(record);
    decisionContext = next;
    if (run?.selection) {
      run.selection.decisionContext = decisionContext;
      run.selection.pendingConsumption = null;
    }
    await runStore.saveRun(run);
  };

  const resetAttemptState = () => {
    supportSnapshot = freshSupport();
    supportCounts = new Map();
    playCount = 0;
    promptShownAt = null;
  };

  /* The task the learner is acting on: during feedback it is the
   * committed task; otherwise the live selection. Acts must never
   * silently bind against a different task than the screen showed. */
  const actingTask = () => {
    if (phase === 'feedback' && committed) return committed;
    if (liveTask) return liveTask;
    const { sel, task, cap, input, digest } = select();
    if (sel.status !== 'ready' || !task || !cap) return null;
    liveTask = { key: keyOf(task), task, cap, decision: sel.decision ?? null, decisionInput: input ?? null, decisionDigest: digest ?? null };
    return liveTask;
  };

  /* Verified unaided successes feed the honest progress lines — the
   * same checks the projection applies, counted for learner copy. */
  const unaidedSuccesses = (capId, cap) =>
    events.filter((e) => {
      if (e.learnerId !== learnerId || e.capabilityId !== capId) return false;
      const t = taskByKey.get(`${e.taskId}@${e.taskRevision}`);
      if (!t || !verifyEventTask(e, t, cap)) return false;
      if (e.attempt?.outcome !== 'success') return false;
      if (answerBearing(e.support)) return false;
      return !conditionsViolated(e.support, e.binding?.effectiveSupportAllowed ?? []);
    });

  const diagnosticOutcomes = (capId, cap) =>
    events.filter((e) => {
      if (e.learnerId !== learnerId || e.capabilityId !== capId) return false;
      const t = taskByKey.get(`${e.taskId}@${e.taskRevision}`);
      return t?.purpose === 'diagnostic' && verifyEventTask(e, t, cap) && e.attempt?.outcome != null;
    });

  const supportOffered = (task) => {
    // Exposure screens are free-view — revealing a hidden transcript is
    // honest provenance there and can never contaminate a non-existent
    // attempt. No translation is offered in v0 (no vi layer exists yet).
    if (EXPOSURE_PURPOSES.has(task.purpose)) {
      return ['audio_line'].includes(task.stimulus?.type) ? ['transcript'] : [];
    }
    if (!SUPPORTABLE_PURPOSES.has(task.purpose)) return [];
    const offered = ['hint', 'modelAnswer'];
    if (['audio_line', 'dialogue'].includes(task.stimulus?.type)) offered.push('transcript');
    return offered;
  };

  const audioOf = (task) => {
    const lines = task.stimulus?.languageComponents ?? [];
    return ['audio_line', 'dialogue', 'partner_turn'].includes(task.stimulus?.type) && lines.length
      ? lines.join(' ')
      : null;
  };

  const promptSpec = (task) => ({
    stimulusType: task.stimulus?.type ?? null,
    lines: task.stimulus?.languageComponents ?? [],
    audioText: audioOf(task),
    cue: task.stimulus?.type === 'cued_prompt' ? (task.stimulus?.languageComponents?.[0] ?? null) : null,
    // A bare audio line keeps its text hidden until transcript support
    // is used — seeing the words would launder listening into reading.
    // Dialogues/partner turns are meant to be read along.
    textVisible: task.stimulus?.type !== 'audio_line'
  });

  const taskScreen = (task, evalResult) => ({
    type: 'task',
    phase,
    taskId: task.id,
    taskRevision: task.revision ?? 1,
    capabilityId: task.capabilityId,
    purpose: task.purpose,
    modality: task.modality,
    // On the feedback screen this is the attempt that was just
    // committed; on the prompt screen it is the next deterministic id.
    attemptId: phase === 'feedback' && committed ? committed.attemptId : attemptIdFor(task),
    prompt: promptSpec(task),
    responseType: task.response?.type === 'choice' ? 'choice' : 'text',
    options: task.response?.type === 'choice' ? (task.response.options ?? []) : null,
    requiredFunctions: task.response?.requiredFunctions ?? [],
    supportOffered: phase === 'prompt' ? supportOffered(task) : [],
    supportUsed: { ...supportSnapshot },
    evaluation: phase === 'feedback' ? evalResult ?? null : null,
    revealModelAfterAttempt: task.supportPolicy?.revealModelAfterAttempt === true
  });

  const progressLines = () => {
    const { byCapability } = projectLearnerState(learnerId, events, capabilities, tasks, { policy });
    /* Progress lines list claim-bearing surfaces only — support caps
     * are demand-routed remediation substrate, not learner goals, and
     * their probes mint no milestones to describe honestly. */
    const supportSet = new Set(mission.supportCapabilities ?? []);
    const ids = [
      ...(mission.targetCapabilities ?? []),
      ...(mission.carrierCapabilities ?? []),
      ...(mission.prerequisiteCapabilities ?? [])
    ].filter((id) => !supportSet.has(id));
    return ids.map((capId) => {
      const cap = capById.get(capId);
      const entry = byCapability.get(capId);
      const clean = cap ? unaidedSuccesses(capId, cap).length : 0;
      const baseline = cap ? diagnosticOutcomes(capId, cap) : [];
      const baselinePassed = baseline.length === 1 && baseline[0].attempt.outcome === 'success';
      return {
        capabilityId: capId,
        state: entry?.state ?? 'NOT_SEEN',
        milestones: entry?.milestones ?? {},
        consecutiveFailures: entry?.consecutiveFailures ?? 0,
        baselinePassed,
        unaidedCount: clean
      };
    });
  };

  const session = {
    /* Load the log and resume (or mint) the open run. A reload lands on
     * the same run — missionRunId is provenance, not a session id. */
    async init() {
      const stored = await eventStore.list();
      for (const e of stored) {
        if (!events.some((x) => x.id === e.id)) events.push(e);
      }
      events.sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      run = await runStore.getOpenRun(learnerId, mission.id);
      if (!run) {
        run = {
          id: idGen(),
          learnerId,
          missionId: mission.id,
          status: 'open',
          learnerName: null,
          startedAt: now(),
          endedAt: null
        };
        /* Selection bookkeeping mints WITH the run (BLOCKER-1): an open
         * run carrying no selection block predates this code and ran
         * the shipped reference planner by definition — the absence of
         * `selection` is itself the legacy signal. */
        run.selection = {
          version: 'vnext.run-selection.v1',
          mode,
          selectionPolicyVersion: mode === SELECTION_MODES.REFERENCE ? 'production.nextMissionTask' : POLICY_VERSIONS.B,
          decisionEpisodeId: episodeIdFor(),
          config: { ...selectionConfig },
          decisionContext: null,
          pendingConsumption: null
        };
        await runStore.saveRun(run);
      }
      /* HIGH-6 — selection mode + policy version pin to the run at
       * creation. Reopening an open run under another ?mode= must never
       * silently switch policy inside one trajectory (a B0 run reopened
       * as reference contaminates the pilot/control record). A mode
       * change requires an explicit new run. */
      const pinnedMode = run.selection?.mode ?? null;
      const expectedPolicyVersion = mode === SELECTION_MODES.REFERENCE
        ? 'production.nextMissionTask'
        : POLICY_VERSIONS.B;
      if (pinnedMode == null) {
        /* Legacy open run — created before selection bookkeeping
         * existed, so its trajectory is historical REFERENCE by
         * definition. Reference may continue it (and pins the record);
         * anything else must mint an explicit new run. */
        if (mode !== SELECTION_MODES.REFERENCE) {
          throw new Error(
            `selection_mode_legacy: open run '${run.id}' predates selection bookkeeping and ran under 'reference' — requested '${mode}' refuses to reinterpret an open trajectory; abandon/supersede mints a new run`
          );
        }
      } else if (pinnedMode !== mode) {
        throw new Error(
          `selection_mode_pinned: run '${run.id}' was created under '${pinnedMode}' but requested '${mode}' — refusing to switch policy inside an open run; restart mints a new run`
        );
      }
      const pinnedVersion = run.selection?.selectionPolicyVersion ?? null;
      if (pinnedVersion != null && pinnedVersion !== expectedPolicyVersion) {
        throw new Error(
          `selection_policy_version_pinned: run '${run.id}' is pinned to selection policy '${pinnedVersion}' but '${mode}' implies '${expectedPolicyVersion}' — refusing to change policy semantics inside an open run`
        );
      }

      /* BLOCKER-2 — recoverable consumption journal. A pending marker
       * means the process died between pending-write and the final
       * context save. Reconcile against the durable evidence log before
       * any new selection — id PRESENCE is not the trust boundary, the
       * landed event must match the journaled fingerprint (HIGH-3):
       *   all expected evidence present AND content-identical → finish
       *     audit + apply the journaled next context (idempotent —
       *     audit append dedupes);
       *   no evidence landed → the consumption never happened; clear
       *     the marker and leave the decision unconsumed;
       *   partial evidence, empty journal, or same-id/different-content
       *     → ambiguous boundary, fail closed. */
      const pending = run.selection?.pendingConsumption;
      let reconciledCtx = null;
      if (pending) {
        const byId = new Map(events.filter((e) => e.learnerId === learnerId).map((e) => [e.id, e]));
        const expected = pending.expectedEvents ?? [];
        const reconcileConflict = (why) => {
          throw new Error(`consumption_reconcile_conflict: ${why} — refusing to guess the consumption outcome`);
        };
        if (expected.length === 0) {
          reconcileConflict(`journal '${pending.decisionId}' carries no expected evidence`);
        }
        const missing = [];
        const mismatched = [];
        for (const x of expected) {
          const landed = byId.get(x.id);
          if (!landed) missing.push(x.id);
          else if (x.digest == null || `sha256:${sha256(eventFingerprint(landed))}` !== x.digest) mismatched.push(x.id);
        }
        if (mismatched.length > 0) {
          reconcileConflict(
            `journal '${pending.decisionId}' found ${mismatched.length} expected event(s) with altered content (${mismatched.join(', ')})`
          );
        }
        if (missing.length === 0) {
          await auditStore?.append?.(pending.auditRecord);
          reconciledCtx = normalizeContext(pending.nextContext);
        } else if (missing.length === expected.length) {
          reconciledCtx = null;
        } else {
          reconcileConflict(
            `journal '${pending.decisionId}' landed ${expected.length - missing.length}/${expected.length} expected events — ambiguous partial boundary`
          );
        }
      }

      /* §5/§32: the run carries versioned selection bookkeeping. A run
       * minted before this schema (or under another store) gets an
       * empty versioned context — starvation/diagnostic counters prior
       * to migration are honestly unknown; nothing reconstructs fake
       * past decisions. Episode id pins to the run, never the clock
       * (BLOCKER-3). */
      const storedCtx = reconciledCtx ?? normalizeContext(run.selection?.decisionContext);
      const episodeId = run.selection?.decisionEpisodeId ?? episodeIdFor();
      decisionContext = storedCtx ?? emptyContext(episodeId, sessionIdFor());
      const selBlock = {
        version: 'vnext.run-selection.v1',
        mode,
        selectionPolicyVersion: mode === SELECTION_MODES.REFERENCE ? 'production.nextMissionTask' : POLICY_VERSIONS.B,
        decisionEpisodeId: episodeId,
        config: run.selection?.config ?? { ...selectionConfig },
        decisionContext,
        pendingConsumption: null
      };
      if (JSON.stringify(run.selection) !== JSON.stringify(selBlock)) {
        run.selection = selBlock;
        await runStore.saveRun(run);
      }
      started = run.learnerName != null || !session.needsName();
      // Resumed mid-task → whatever was on screen uncommitted never
      // became evidence; drop back to a fresh selection.
      liveTask = null;
      committed = null;
      phase = 'prompt';
      resetAttemptState();
      return session.screen();
    },

    needsName() {
      return tasks.some(
        (t) => mission.taskIds?.includes(t.id)
          && (t.response?.requiredFunctions ?? []).includes('state_own_name')
      );
    },

    runInfo() {
      return run ? { ...run, selection: run.selection ? structuredClone(run.selection) : undefined } : null;
    },

    log() {
      return [...events];
    },

    /* 008C introspection (bookkeeping, never evidence): consumed-decision
     * audit entries, the bounded shadow trail, and a snapshot of the
     * active DecisionContext for tests/dev tooling. */
    decisions() {
      return [...decisionLog.entries];
    },

    /* The persisted audit trail as the audit store sees it (async —
     * store contract). B0/SHADOW always have one (memory fallback);
     * REFERENCE legitimately reports none. */
    async auditTrail() {
      return auditStore ? auditStore.list(learnerId) : [];
    },

    shadowTrail() {
      return [...shadowLog];
    },

    selectionContext() {
      return decisionContext ? structuredClone(decisionContext) : null;
    },

    /* §7 introspection: how many real selector evaluations ran. One
     * live task on screen must amortize to zero new evaluations —
     * render is not scheduling. */
    selectionStats() {
      return { selectCalls: selectionCalls };
    },

    projection() {
      return projectLearnerState(learnerId, events, capabilities, tasks, { policy });
    },

    screen() {
      if (!started) {
        return {
          type: 'intro',
          missionId: mission.id,
          scenario: mission.scenario,
          learnerGoal: mission.learnerGoal,
          needsName: session.needsName(),
          resumed: events.length > 0
        };
      }
      if (phase === 'feedback' && committed) {
        return taskScreen(committed.task, committed.evalResult);
      }
      /* §7 live-decision lock (BLOCKER-1): while a live task is on
       * screen, render IT — the selector never re-runs underneath an
       * open interaction no matter which events landed since the
       * decision (support_use, play). Rendering is not scheduling:
       * 100 renders of one live task cost zero selection evaluations.
       * Only view()/commit() consumption clears the lock and re-arms
       * the selector. */
      if (liveTask && phase === 'prompt') {
        const locked = liveTask.task;
        if (EXPOSURE_PURPOSES.has(locked.purpose)) {
          return {
            type: 'input',
            taskId: locked.id,
            taskRevision: locked.revision ?? 1,
            capabilityId: locked.capabilityId,
            purpose: locked.purpose,
            prompt: promptSpec(locked),
            supportOffered: supportOffered(locked)
          };
        }
        return taskScreen(locked);
      }
      const { sel, task, cap, input, digest } = select();
      if (sel.status === 'ready' && task && cap) {
        const key = keyOf(task);
        if (liveTask?.key !== key) {
          // New task on screen → fresh attempt state. Same task → keep
          // the support already used on this attempt. The decision the
          // selector produced rides on the live task (§7 lock): support,
          // play, view and commit all act against that exact decision.
          liveTask = { key, task, cap, decision: sel.decision ?? null, decisionInput: input ?? null, decisionDigest: digest ?? null };
          phase = 'prompt';
          committed = null;
          resetAttemptState();
        }
        if (EXPOSURE_PURPOSES.has(task.purpose)) {
          return {
            type: 'input',
            taskId: task.id,
            taskRevision: task.revision ?? 1,
            capabilityId: task.capabilityId,
            purpose: task.purpose,
            prompt: promptSpec(task),
            supportOffered: supportOffered(task)
          };
        }
        return taskScreen(task);
      }
      if (sel.status === 'idle' && run?.status === 'open') {
        run.status = 'completed';
        run.endedAt = now();
        void runStore.saveRun(run);
      }
      return {
        type: 'summary',
        status: sel.status,
        reason: sel.reason,
        progress: progressLines()
      };
    },

    /* Intro confirm — stores the persona name the mission's
     * state_own_name checks resolve against. */
    async start({ learnerName } = {}) {
      if (learnerName != null && run) {
        run.learnerName = String(learnerName).trim() || null;
        await runStore.saveRun(run);
      }
      started = true;
      return session.screen();
    },

    /* Input/notice screens mint an exposure on explicit confirm —
     * viewing is honest data, but nothing about it is an attempt.
     * §7 lock: acts on the live task the learner actually saw — never
     * re-selects underneath an open interaction. */
    async view() {
      const active = actingTask();
      if (!active || phase !== 'prompt') return session.screen();
      const { task, cap } = active;
      if (!EXPOSURE_PURPOSES.has(task.purpose)) return session.screen();
      const bound = bindObservation(task, cap, {
        id: evtId(run?.id, task.id, `r${task.revision ?? 1}`, 'exp'),
        learnerId,
        occurredAt: now(),
        eventType: 'exposure',
        attempt: { attemptId: null }
      });
      /* The exposure commit IS the consumption act (§6/§8): journal →
       * evidence → audit → context persist before the next selection is
       * exposed (BLOCKER-2 ordering). */
      await consumeLiveDecision([bound]);
      liveTask = null;
      return session.screen();
    },

    /* Learner-visible support before commit: append the support_use
     * event AND stamp the pending attempt's snapshot. The two records
     * must always move together — a hint you could close and hide is
     * still a hint. */
    async support(kind) {
      const active = actingTask();
      if (!active || phase !== 'prompt') return session.screen();
      const { task, cap } = active;
      if (!supportOffered(task).includes(kind)) return session.screen();
      const attemptId = attemptIdFor(task);
      const n = (supportCounts.get(kind) ?? 0) + 1;
      supportCounts.set(kind, n);
      const bound = bindObservation(task, cap, {
        id: evtId(run?.id, attemptId, 'sup', kind, n),
        learnerId,
        occurredAt: now(),
        eventType: 'support_use',
        attempt: { attemptId },
        support: { ...freshSupport(), [kind]: true }
      });
      await appendAll([bound]);
      supportSnapshot[kind] = true;
      return session.screen();
    },

    /* Audio replay: the first play is the stimulus itself; every
     * further press is a repeat — support, recorded as such. */
    async play() {
      const active = actingTask();
      if (!active || phase !== 'prompt') return session.screen();
      const { task, cap } = active;
      playCount += 1;
      if (playCount > 1) {
        const attemptId = attemptIdFor(task);
        const bound = bindObservation(task, cap, {
          id: evtId(run?.id, attemptId, 'sup', 'repeat', playCount - 1),
          learnerId,
          occurredAt: now(),
          eventType: 'support_use',
          attempt: { attemptId },
          support: { ...freshSupport(), repeat: true, repeatCount: playCount - 1 }
        });
        await appendAll([bound]);
        supportSnapshot.repeat = true;
        supportSnapshot.repeatCount = playCount - 1;
      }
      return session.screen();
    },

    /* Commit the response: evaluate under the task's declared contract,
     * bind the attempt, append it plus the feedback record, THEN reveal
     * the outcome. Nothing about the evaluation is visible before the
     * evidence exists. A second commit on the same screen is a no-op —
     * phase has already moved. */
    async commit({ text = null, optionId = null } = {}) {
      const active = actingTask();
      if (!active || phase !== 'prompt') return session.screen();
      const { task, cap } = active;
      if (EXPOSURE_PURPOSES.has(task.purpose)) return session.screen();
      const isChoice = task.response?.type === 'choice';
      const response = isChoice ? optionId : (text ?? '').trim();
      if (response == null || response === '') return session.screen();

      const attemptId = attemptIdFor(task);
      const evalResult = evaluateAttempt(task, isChoice ? { optionId } : { text: response }, {
        learnerName: run?.learnerName ?? undefined
      });
      if (!evalResult) {
        throw new Error(`no evaluator registered for contract '${task.evaluation?.contractId}' — refusing to mint an outcome`);
      }

      const attempt = {
        attemptId,
        outcome: evalResult.outcome,
        response: isChoice ? optionId : response,
        responseChannel: isChoice ? 'choice' : 'text',
        latencyMs: promptShownAt != null ? Math.max(0, now() - promptShownAt) : null
      };
      const missed = evalResult.missed ?? [];
      const attemptEvent = bindAttempt(task, cap, {
        id: evtId(run?.id, attemptId),
        learnerId,
        occurredAt: now(),
        eventType: EVENT_TYPE_FOR(task.purpose, isChoice ? 'choice' : 'text'),
        attempt,
        support: { ...supportSnapshot },
        evaluation: {
          evaluator: 'ui-session',
          version: EVALUATOR_VERSION,
          /* Demand-routing signal (#61): only what the evaluator could
           * attribute — empty for unattributable misses; the binder
           * rejects anything outside the task's requiredFunctions. */
          missingFunctions: evalResult.missingFunctions ?? []
        }
      });
      const feedbackEvent = bindObservation(task, cap, {
        id: evtId(run?.id, attemptId, 'fb'),
        learnerId,
        occurredAt: now(),
        eventType: 'feedback',
        attempt: { attemptId },
        feedback: { given: true, target: missed }
      });
      /* The committed attempt IS the consumption act (§6/§8): journal →
       * evidence → audit → context in one crash-consistent unit before
       * the feedback screen renders — a render can never be the thing
       * that counted (BLOCKER-2 ordering). */
      await consumeLiveDecision([attemptEvent, feedbackEvent]);
      committed = { task, cap, evalResult, attemptId };
      phase = 'feedback';
      return session.screen();
    },

    /* Learner leaves feedback → re-select. Whatever the planner serves
     * next is a fresh task screen with a clean support snapshot. */
    async next() {
      liveTask = null;
      committed = null;
      phase = 'prompt';
      resetAttemptState();
      return session.screen();
    },

    markPromptShown() {
      if (promptShownAt == null) promptShownAt = now();
    },

    /* Explicitly end the current run — the learner chose to leave the
     * mission episode. Evidence keeps its run provenance; a later visit
     * mints a NEW run instead of silently continuing this one. */
    async abandon() {
      if (run && run.status === 'open') {
        run.status = 'abandoned';
        run.endedAt = now();
        await runStore.saveRun(run);
      }
      return session.screen();
    }
  };
  return session;
}
