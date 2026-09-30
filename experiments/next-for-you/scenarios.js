/*
 * Benchmark scenarios (spec §19/§20): synthetic learner event histories
 * over the REAL authored mission contracts. Labeled synthetic — they
 * falsify pathologies, they do not model human learning.
 *
 * An archetype is a response policy: given the policy's chosen task,
 * it says what the learner did (success / fail / partial / supported).
 * Seed histories place learners into the 14 required profiles.
 */
import { bindAttempt, bindObservation } from '../../src/vnext/bind.js';
import { capabilityById } from '../../src/vnext/fixtures.js';
import { FIXTURES } from '../../src/vnext/fixtures.js';

export const ALL_MISSIONS = FIXTURES.map((f) => ({ id: f.mission.id, mission: f.mission, tasks: f.tasks }));

function rolesOf(mission) {
  return {
    targets: new Set(mission.targetCapabilities ?? []),
    supports: new Set(mission.supportCapabilities ?? []),
    prereqs: new Set(mission.prerequisiteCapabilities ?? [])
  };
}

export function missionState(fixture) {
  return {
    mission: fixture.mission,
    tasks: fixture.tasks,
    capabilities: [...new Set(fixture.tasks.map((t) => t.capabilityId))].map(capabilityById),
    roles: rolesOf(fixture.mission)
  };
}

/* ---------- event synthesis ---------- */

let seq = 0;
const nid = () => `sim-${++seq}`;

export function attemptEvent(task, cap, { at, outcome = 'success', observed = true, missing = null, support = null, type = null }) {
  return bindAttempt(task, cap, {
    id: nid(), learnerId: 'SIM', occurredAt: at,
    ...(type ? { eventType: type } : {}),
    attempt: { observed, outcome, response: 'sim', latencyMs: 900, attemptId: `a-${seq}` },
    ...(missing ? { evaluation: { missingFunctions: missing } } : {}),
    ...(support ? { support } : {})
  });
}

export function observeEvent(task, cap, { at }) {
  return bindObservation(task, cap, { id: nid(), learnerId: 'SIM', occurredAt: at, eventType: 'exposure' });
}

/* ---------- archetype response policies ---------- */

export const ARCHETYPES = {
  /* Every eliciting attempt succeeds unaided. */
  fast: () => ({ respond: () => 'success' }),

  /* Succeed once, then keeps succeeding only on supported/aided work —
   * thin independent evidence persists. */
  thin: (() => {
    const seen = new Set();
    return () => ({
      respond: ({ task }) => {
        const key = task.capabilityId;
        if (seen.has(key)) return 'fail';
        seen.add(key);
        return 'success';
      }
    });
  })(),

  /* Failed delayed retrieval: independent once, fails the due check. */
  failedRetrieval: (() => {
    const done = new Set();
    return () => ({
      respond: ({ task }) => {
        if (task.purpose === 'delayed_retrieval') return 'fail';
        if (done.has(task.capabilityId)) return 'success';
        done.add(task.capabilityId);
        return 'success';
      }
    });
  })(),

  /* Everything fails with attribution where the task supports it. */
  failer: () => ({
    respond: ({ task }) => 'fail',
    missing: (task) => task.response?.requiredFunctions?.[0] ?? null
  }),

  /* Fails without any attributable function (non-attributing contract
   * or no missingFunctions stamped). */
  nonAttributingFailer: () => ({ respond: () => 'fail', forceNoMissing: true }),

  /* Succeeds only while aided; unaided attempts fail. */
  supportDependent: () => ({
    respond: ({ task }) => task.purpose === 'support' ? 'success' : 'fail'
  }),

  /* Alternating success/fail — recurring substrate gap. */
  recurringGap: (() => {
    let flip = false;
    return () => ({
      respond: () => (flip = !flip) ? 'fail' : 'success',
      missing: (task) => task.response?.requiredFunctions?.[0] ?? null
    });
  })(),

  /* Transfer always fails; everything else succeeds. */
  transferBlocked: () => ({
    respond: ({ task }) => task.purpose === 'transfer' ? 'fail' : 'success'
  }),

  /* Assessment always fails; everything else succeeds. */
  assessmentFailing: () => ({
    respond: ({ task }) => task.purpose === 'assessment' ? 'fail' : 'success'
  }),

  /* Multi-modality: succeed everywhere — exercises cross-modality caps. */
  multiModal: () => ({ respond: () => 'success' }),

  /* Stuck on ONE capability: fails repeatedly on the first failing cap. */
  stuck: (() => {
    const stuckCap = { id: null };
    return () => ({
      respond: ({ task }) => {
        if (stuckCap.id == null) { stuckCap.id = task.capabilityId; return 'fail'; }
        return task.capabilityId === stuckCap.id ? 'fail' : 'success';
      },
      missing: (task) => task.response?.requiredFunctions?.[0] ?? null
    });
  })(),

  /* Mixed: alternate caps succeed/fail deterministically. */
  mixed: (() => {
    let i = 0;
    return () => ({ respond: () => (i++ % 2 === 0 ? 'success' : 'fail') });
  })(),

  /* Rapid new content: succeeds fast, used to measure review starvation. */
  rapidNew: () => ({ respond: () => 'success' }),

  /* Many due items: seeded history puts several caps past lag. */
  manyDue: () => ({ respond: () => 'success' }),

  /* 30-day return: seed old successes, then succeed. Time alone must
   * not mint relearning — measured by falseRelearningCount. */
  returning30d: () => ({ respond: () => 'success' })
};

export const ARCHETYPE_NAMES = Object.keys(ARCHETYPES);

/* ---------- seed histories ---------- */

const HOUR = 3600e3;
const DAY = 24 * HOUR;

/* Seed: put the first K eliciting-task capabilities into INDEPENDENT
 * with last success `ageMs` ago — exercises due-retrieval mass and the
 * no-time-only-forgetting boundary. */
export function seedIndependentHistory(fixture, { caps = 2, ageMs = 30 * DAY, at = Date.parse('2026-01-01T00:00:00Z') } = {}) {
  const state = missionState(fixture);
  const events = [];
  const capIds = new Set();
  for (const t of fixture.tasks) {
    if (capIds.size >= caps) break;
    if (!['retrieval', 'production', 'interaction'].includes(t.purpose)) continue;
    if (capIds.has(t.capabilityId)) continue;
    const cap = capabilityById(t.capabilityId);
    if (!cap) continue;
    const inp = fixture.tasks.find((x) => x.capabilityId === t.capabilityId && ['input', 'notice'].includes(x.purpose));
    if (inp) events.push(observeEvent(inp, cap, { at: at - HOUR }));
    events.push(attemptEvent(t, cap, { at, outcome: 'success' }));
    capIds.add(t.capabilityId);
  }
  return events;
}
