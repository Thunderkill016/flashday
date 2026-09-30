/*
 * vNext append-only persistence (issue #53) — the truth layer:
 *
 *   append(event) exactly-once logically
 *     → reload → loadVnextEvents → replay → same projection → same claim
 *
 * This suite runs against a fake `fs` surface (same shape the adapter
 * receives from firebase/firestore); the rules themselves are proven
 * in tests/firestore-vnext-emulator.test.mjs.
 */
import assert from 'node:assert/strict';
import { CAPABILITIES } from '../src/vnext/capabilities.js';
import { projectLearnerState } from '../src/vnext/projection.js';
import { evaluateClaim, runPilotLearner } from '../src/vnext/pilot-harness.js';
import { appendVnextEvents, loadVnextEvents, toEventDoc, fromEventDoc, VNEXT_EVENTS_SCHEMA } from '../src/vnext/persist.js';
import { MISSION_MEET_PERSON, TASKS_MEET_PERSON } from '../src/vnext/fixtures.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const UID = 'learner.persist';
const ASK = 'interaction.ask_name';
const TASKS = TASKS_MEET_PERSON;

/* Fake firebase surface — same call shape as { ...sdk, db }. */
const makeFakeFs = () => {
  const docs = new Map();
  const snap = (ref) => ({ exists: () => docs.has(ref.path), data: () => docs.get(ref.path) });
  return {
    _docs: docs,
    db: { fake: true },
    doc: (db, path) => ({ path }),
    collection: (db, path) => ({ path }),
    getDoc: async (ref) => snap(ref),
    getDocs: async (ref) => ({
      docs: [...docs.entries()]
        .filter(([p]) => p.startsWith(ref.path + '/') && p.split('/').length === ref.path.split('/').length + 1)
        .map(([, d]) => ({ data: () => d }))
    }),
    runTransaction: async (db, fn) => fn({
      get: (ref) => Promise.resolve(snap(ref)),
      set: (ref, data) => { docs.set(ref.path, structuredClone(data)); }
    }),
    serverTimestamp: () => ({ __server: 'timestamp' })
  };
};

/* A small deterministic learner: fails ask_name at baseline, takes the
 * full supported → independent → retained → transferred path. */
const SESSIONS = [
  { name: 'd0', startMs: T0, stepMs: 1000 },
  { name: 'd1', startMs: T0 + 25 * HOUR, stepMs: 1000 },
  { name: 'd2', startMs: T0 + 50 * HOUR, stepMs: 1000 }
];

const mkLearner = (id) => {
  let n = 0;
  const aid = (t) => `${id}.${t}.${++n}`;
  return {
    id,
    act: (task) => {
      const script = {
        'task.meet.diagnostic.ask_name': [{ attempt: { observed: true, outcome: 'fail', response: '…', latencyMs: 4000, attemptId: aid('d') } }],
        'task.meet.input.ask_name': [{ observe: 'exposure' }],
        'task.meet.retrieval.ask_name': [{ attempt: { observed: true, outcome: 'success', response: 'r', latencyMs: 2000, attemptId: aid('r') }, support: { hint: true } }],
        'task.meet.interaction.guided': [{ attempt: { observed: true, outcome: 'partial', response: 'p', latencyMs: 3000, attemptId: aid('g') }, support: { modelAnswer: true } }],
        'task.meet.remediation.ask_name': [{ eventType: 'retry', attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 1000, attemptId: aid('rem') } }],
        'task.meet.delayed.check': [{ eventType: 'delayed_retrieval', attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 1400, attemptId: aid('dr') } }],
        'task.meet.transfer.street': [{ attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 1600, attemptId: aid('tr') } }],
        'task.meet.assessment.checkpoint': [{ attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 1800, attemptId: aid('ck') } }]
      };
      if (task.purpose === 'input' || task.purpose === 'notice') return [{ observe: 'exposure' }];
      return script[task.id] ?? [{ attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: aid('x') } }];
    }
  };
};

const runLearner = () => runPilotLearner({
  learner: mkLearner(UID), mission: MISSION_MEET_PERSON, tasks: TASKS,
  capabilities: CAPABILITIES, sessions: SESSIONS
});

/* ── 1. doc shape: all provenance fields land, round-trip exact ── */
{
  const run = runLearner();
  const e = run.events.find((x) => x.eventType === 'delayed_retrieval');
  const doc = toEventDoc(e, UID, { missionRunId: 'run.1', policyVersion: 'vnext.policy.v1', recordedAt: 'TS' });
  assert.equal(doc.id, e.id);
  assert.equal(doc.owner_id, UID);
  assert.equal(doc.learner_id, UID);
  assert.equal(doc.capability_id, e.capabilityId);
  assert.equal(doc.task_revision, e.taskRevision);
  assert.equal(doc.occurred_at, e.occurredAt);
  assert.equal(doc.recorded_at, 'TS');
  assert.equal(doc.schema_version, VNEXT_EVENTS_SCHEMA);
  assert.equal(doc.policy_version, 'vnext.policy.v1');
  assert.equal(doc.mission_run_id, 'run.1');
  const back = fromEventDoc(doc);
  assert.equal(back.id, e.id);
  assert.equal(back.learnerId, e.learnerId);
  assert.equal(back.occurredAt, e.occurredAt);
  assert.equal(back.missionRunId, 'run.1');
  assert.deepEqual(back.binding, e.binding, 'binding provenance survives the round-trip');
  assert.deepEqual(back.evaluation, e.evaluation);
}

/* ── 2. append → load → replay parity: same projection, same claim ── */
{
  const run = runLearner();
  const fs = makeFakeFs();
  await appendVnextEvents(fs, UID, run.events, { missionRunId: 'run.1', policyVersion: 'vnext.policy.v1' });
  const loaded = await loadVnextEvents(fs, UID);
  assert.equal(loaded.length, run.events.length, 'every event survives the reload');

  const before = projectLearnerState(UID, run.events, CAPABILITIES, TASKS).byCapability.get(ASK);
  const after = projectLearnerState(UID, loaded, CAPABILITIES, TASKS).byCapability.get(ASK);
  assert.deepEqual(
    { state: after.state, milestones: after.milestones, consecutiveFailures: after.consecutiveFailures },
    { state: before.state, milestones: before.milestones, consecutiveFailures: before.consecutiveFailures },
    'reloaded log replays into a different projection'
  );

  const claimBefore = evaluateClaim(UID, run.events, CAPABILITIES, TASKS, ASK);
  const claimAfter = evaluateClaim(UID, loaded, CAPABILITIES, TASKS, ASK);
  assert.deepEqual(claimAfter, claimBefore, 'claim must be identical after persist→reload→replay');
  assert.equal(claimAfter.learnedByFlashday, true);
}

/* ── 3. exactly-once: retried append dedupes, never double-counts ── */
{
  const run = runLearner();
  const fs = makeFakeFs();
  const first = await appendVnextEvents(fs, UID, run.events, { missionRunId: 'run.1' });
  assert.equal(first.appended, run.events.length);
  // Lost-ack retry: identical content, same ids — logical no-op.
  const retry = await appendVnextEvents(fs, UID, run.events, { missionRunId: 'run.1' });
  assert.equal(retry.appended, 0);
  assert.equal(retry.deduped, run.events.length);
  const loaded = await loadVnextEvents(fs, UID);
  assert.equal(loaded.length, run.events.length, 'duplicate delivery must not double the log');
}

/* ── 4. same id, different content → hard conflict, never overwrite ── */
{
  const run = runLearner();
  const fs = makeFakeFs();
  const idx = run.events.findIndex((e) => e.attempt?.outcome != null);
  assert.ok(idx >= 0, 'no attempt event to mutate');
  await appendVnextEvents(fs, UID, run.events.slice(0, idx + 1));
  const forged = {
    ...run.events[idx],
    attempt: { ...run.events[idx].attempt, outcome: run.events[idx].attempt.outcome === 'success' ? 'fail' : 'success' }
  };
  await assert.rejects(
    () => appendVnextEvents(fs, UID, [forged]),
    /vnext event conflict/,
    'mutating an existing event id must throw, not overwrite'
  );
}

/* ── 5. out-of-order append → canonical replay order ── */
{
  const run = runLearner();
  const fs = makeFakeFs();
  const shuffled = [...run.events].sort((a, b) => (a.id < b.id ? 1 : -1)); // arbitrary ≠ occurredAt
  await appendVnextEvents(fs, UID, shuffled);
  const loaded = await loadVnextEvents(fs, UID);
  const times = loaded.map((e) => e.occurredAt);
  assert.deepEqual(times, [...times].sort((x, y) => x - y), 'load returns canonical order');
  const after = projectLearnerState(UID, loaded, CAPABILITIES, TASKS).byCapability.get(ASK);
  assert.equal(after.state, 'TRANSFERRED');
}

/* ── 6. learner isolation: one uid's log never mixes with another's ── */
{
  const fs = makeFakeFs();
  const a = runLearner();
  await appendVnextEvents(fs, UID, a.events.slice(0, 3));
  const b = { ...mkLearner('learner.other'), id: 'learner.other' };
  const runB = runPilotLearner({ learner: b, mission: MISSION_MEET_PERSON, tasks: TASKS, capabilities: CAPABILITIES, sessions: SESSIONS });
  // 'learner.other' docs are stored under UID's namespace in the fake
  // (rules enforce learner_id==uid on the real backend) — but a load
  // for a different learnerId must still be logically separate: the
  // projection filters by learnerId regardless.
  await appendVnextEvents(fs, 'other-owner', runB.events.slice(0, 3));
  const loadedA = await loadVnextEvents(fs, UID);
  const loadedB = await loadVnextEvents(fs, 'other-owner');
  assert.equal(loadedA.every((e) => e.learnerId === UID), true);
  assert.equal(loadedB.every((e) => e.learnerId === 'learner.other'), true);
}

console.log('vnext-persist: exactly-once append, immutable conflict, replay parity, canonical order — PASS');
