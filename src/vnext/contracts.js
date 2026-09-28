/*
 * vNext Mission/Task/Transfer/Assessment contracts (issue #45,
 * docs/vnext/mission-task-assessment-contracts-v0.md).
 *
 * Distinct domain objects — a screen is not a Task, a Mission is not a
 * Capability, a completed Mission is not evidence:
 *
 *   Capability = what the learner can do
 *   Mission    = real-world scenario combining capabilities
 *   Task       = one elicitation/learning unit
 *   Attempt    = learner response to one task instance
 *   Evidence   = durable observation of what happened
 *   Assessment = fresh sampling of ability
 *
 * These validators exist so the contracts are *executable truth*, not
 * documentation — a task that violates its own purpose class, or a
 * mission whose teaching items leak into assessment, fails validation
 * before a single learner touches it.
 */

export const TASK_PURPOSES = [
  'diagnostic',
  'input',
  'notice',
  'retrieval',
  'production',
  'interaction',
  'remediation',
  'delayed_retrieval',
  'transfer',
  'assessment',
  'fluency' // reserved — rejected by validateTask until a calibrated contract exists
];

// Purposes that elicit a learner response (may carry attempts).
export const ELICITING_PURPOSES = new Set([
  'diagnostic',
  'retrieval',
  'production',
  'interaction',
  'remediation',
  'delayed_retrieval',
  'transfer',
  'assessment'
]);

// Purposes that only expose — they may create exposure events, never
// attempt evidence.
export const EXPOSURE_PURPOSES = new Set(['input', 'notice']);

export const TRANSFER_DIMENSIONS = [
  'wording',
  'partner',
  'setting',
  'medium',
  'response_form',
  'support_level',
  'task_goal',
  'delay'
];

export const FAMILY_CLASSES = ['practiced', 'fresh_transfer', 'fresh_assessment'];

// Support kinds that may appear in conditions/supportPolicy lists.
export const SUPPORT_CONDITION_KINDS = [
  'hint',
  'translation',
  'transcript',
  'modelAnswer',
  'repeat',
  'repeat_once'
];

/* The support a learner may use while still producing *independent*
 * evidence is the intersection of what the capability permits and what
 * the task permits. A task may narrow a capability's conditions; it may
 * NEVER broaden them. */
export function effectiveAllowedSupport(capability, task) {
  const capAllowed = capability?.conditions?.supportAllowed ?? [];
  const taskAllowed = task?.supportPolicy?.allowed ?? capAllowed;
  return capAllowed.filter((k) => taskAllowed.includes(k));
}

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isStrList = (v) => Array.isArray(v) && v.every(isStr);

/* ── TaskContract ─────────────────────────────────────────── */

export function makeTask(fields) {
  const task = {
    revision: 1,
    stimulus: { type: null, languageComponents: [] },
    response: { type: null, requiredFunctions: [] },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    evaluation: { authority: 'deterministic', contractId: null },
    freshness: { required: false, familyClass: 'practiced' },
    transfer: null,
    assessment: null,
    language: { requiredChunks: [], requiredVocabulary: [], requiredConstructions: [] },
    ...fields,
    supportPolicy: { allowed: [], revealModelAfterAttempt: false, ...(fields?.supportPolicy || {}) },
    evaluation: { authority: 'deterministic', contractId: null, ...(fields?.evaluation || {}) },
    freshness: { required: false, familyClass: 'practiced', ...(fields?.freshness || {}) },
    language: { requiredChunks: [], requiredVocabulary: [], requiredConstructions: [], ...(fields?.language || {}) }
  };
  const problems = validateTask(task);
  if (problems.length) throw new Error(`invalid TaskContract ${task.id || '?'}: ${problems.join('; ')}`);
  return task;
}

export function validateTask(task) {
  const p = [];
  for (const k of ['id', 'missionId', 'capabilityId', 'modality', 'promptFamily']) {
    if (!isStr(task?.[k])) p.push(`missing ${k}`);
  }
  if (!Number.isInteger(task?.revision) || task.revision < 1) p.push('revision must be a positive integer');
  if (!TASK_PURPOSES.includes(task?.purpose)) p.push(`unknown purpose ${task?.purpose}`);

  const fc = task?.freshness?.familyClass;
  if (fc != null && !FAMILY_CLASSES.includes(fc)) p.push(`unknown freshness familyClass ${fc}`);
  if (task?.freshness?.required && fc === 'practiced') {
    p.push('freshness.required conflicts with familyClass practiced');
  }

  for (const k of task?.supportPolicy?.allowed ?? []) {
    if (!SUPPORT_CONDITION_KINDS.includes(k)) p.push(`unknown support condition '${k}'`);
  }

  if (task?.purpose === 'fluency') {
    p.push('purpose fluency is reserved — no calibrated fluency contract exists in v0');
  }

  if (task?.purpose === 'transfer') {
    const dims = task?.transfer?.changedDimensions ?? [];
    if (!Array.isArray(dims) || dims.length === 0) {
      p.push('transfer task must declare at least one changed dimension');
    } else {
      for (const d of dims) {
        if (!TRANSFER_DIMENSIONS.includes(d)) p.push(`unknown transfer dimension '${d}'`);
      }
    }
    if (task?.freshness?.familyClass !== 'fresh_transfer' || !task?.freshness?.required) {
      p.push('transfer task requires freshness { required: true, familyClass: fresh_transfer }');
    }
  }

  if (task?.purpose === 'assessment') {
    if (task?.freshness?.familyClass !== 'fresh_assessment' || !task?.freshness?.required) {
      p.push('assessment requires freshness { required: true, familyClass: fresh_assessment }');
    }
    if ((task?.supportPolicy?.allowed ?? []).length > 0) {
      p.push('assessment tasks may not allow support');
    }
    if (task?.assessment?.answerRevealDuringAttempt !== false) {
      p.push('assessment.answerRevealDuringAttempt must be false');
    }
    const sample = task?.assessment?.capabilitySample;
    if (!isStrList(sample) || sample.length === 0) {
      p.push('assessment.capabilitySample must be a non-empty capability list');
    } else if (isStr(task?.capabilityId) && !sample.includes(task.capabilityId)) {
      p.push('assessment.capabilitySample must include the task capabilityId');
    }
  }
  return p;
}

/* ── MissionContract ──────────────────────────────────────── */

export function makeMission(fields) {
  return {
    revision: 1,
    targetCapabilities: [],
    prerequisiteCapabilities: [],
    supportCapabilities: [],
    language: { assumedKnown: [], introduced: { chunks: [], vocabulary: [], constructions: [] } },
    taskIds: [],
    transferPlan: { required: false, dimensions: [] },
    assessmentPlan: { required: false, freshnessRequired: true },
    ...fields,
    language: {
      assumedKnown: fields?.language?.assumedKnown ?? [],
      introduced: {
        chunks: fields?.language?.introduced?.chunks ?? [],
        vocabulary: fields?.language?.introduced?.vocabulary ?? [],
        constructions: fields?.language?.introduced?.constructions ?? []
      }
    }
  };
}

export function validateMission(mission, tasks, capabilities) {
  const p = [];
  if (!isStr(mission?.id)) p.push('mission missing id');
  if (!Number.isInteger(mission?.revision) || mission.revision < 1) p.push('mission revision must be a positive integer');
  if (!isStr(mission?.scenario) || !isStr(mission?.learnerGoal)) p.push('mission needs scenario + learnerGoal');

  const capIds = new Set(capabilities.map((c) => c.id));
  const declared = new Set([
    ...(mission?.targetCapabilities ?? []),
    ...(mission?.prerequisiteCapabilities ?? []),
    ...(mission?.supportCapabilities ?? [])
  ]);
  for (const list of ['targetCapabilities', 'prerequisiteCapabilities', 'supportCapabilities']) {
    for (const id of mission?.[list] ?? []) {
      if (!capIds.has(id)) p.push(`${list}: unknown capability '${id}'`);
    }
  }

  // Prerequisite closure: every transitive prerequisite of a target must
  // be declared somewhere in the mission's capability surface.
  const byId = new Map(capabilities.map((c) => [c.id, c]));
  const closure = (id, seen = new Set()) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const pre of byId.get(id)?.prerequisites ?? []) {
      if (!declared.has(pre)) p.push(`target '${id}' has undeclared prerequisite '${pre}'`);
      closure(pre, seen);
    }
  };
  for (const id of mission?.targetCapabilities ?? []) closure(id);

  // Tasks: every declared id resolves, every given task belongs to this
  // mission, and its declared capability is in the mission surface.
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  if (new Set(mission?.taskIds ?? []).size !== (mission?.taskIds ?? []).length) {
    p.push('duplicate taskIds');
  }
  for (const tid of mission?.taskIds ?? []) {
    const t = taskById.get(tid);
    if (!t) { p.push(`taskIds references missing task '${tid}'`); continue; }
    if (t.missionId !== mission.id) p.push(`task '${tid}' belongs to mission '${t.missionId}'`);
    if (t.capabilityId && !declared.has(t.capabilityId)) {
      p.push(`task '${tid}' targets undeclared capability '${t.capabilityId}'`);
    }
  }

  // Every target capability needs at least one eliciting/evidence path —
  // exposure alone never proves ability.
  for (const capId of mission?.targetCapabilities ?? []) {
    const hasPath = tasks.some(
      (t) => t.missionId === mission.id && t.capabilityId === capId && ELICITING_PURPOSES.has(t.purpose)
    );
    if (!hasPath) p.push(`target '${capId}' has no eliciting task — exposure is not evidence`);
  }

  // Freshness collision: when the mission requires fresh assessment, no
  // freshness-required task may reuse a family already used for practice.
  if (mission?.assessmentPlan?.freshnessRequired) {
    const practiced = new Set(
      tasks.filter((t) => t.missionId === mission.id && t.freshness?.familyClass === 'practiced')
        .map((t) => t.promptFamily)
    );
    for (const t of tasks.filter((t) => t.missionId === mission.id && t.freshness?.required)) {
      if (practiced.has(t.promptFamily)) {
        p.push(`task '${t.id}' reuses practiced family '${t.promptFamily}' — teaching cannot leak into ${t.freshness.familyClass}`);
      }
    }
  }
  return p;
}

/* ── Content-load validation ──────────────────────────────── */

/* Task language must be declared somewhere reachable: the mission's
 * introduced/assumed-known lists, or the language of the capabilities
 * the mission declares. Undeclared language in a task = a lesson
 * smuggling content past the syllabus. Budgets are injected, never
 * hard-coded — calibration comes from real learners, not a number we
 * made up. */
export function validateMissionContent(mission, tasks, capabilities, policy = {}) {
  const p = [];
  const byId = new Map(capabilities.map((c) => [c.id, c]));
  const declaredCaps = [
    ...(mission.targetCapabilities ?? []),
    ...(mission.prerequisiteCapabilities ?? []),
    ...(mission.supportCapabilities ?? [])
  ].map((id) => byId.get(id)).filter(Boolean);

  const known = {
    chunks: new Set(mission.language?.introduced?.chunks ?? []),
    vocabulary: new Set(mission.language?.introduced?.vocabulary ?? []),
    constructions: new Set(mission.language?.introduced?.constructions ?? [])
  };
  for (const item of mission.language?.assumedKnown ?? []) {
    for (const bucket of Object.values(known)) bucket.add(item);
  }
  for (const cap of declaredCaps) {
    for (const x of cap.language?.chunks ?? []) known.chunks.add(x);
    for (const x of cap.language?.vocabulary ?? []) known.vocabulary.add(x);
    for (const x of cap.language?.constructions ?? []) known.constructions.add(x);
  }

  const needs = [
    ['requiredChunks', 'chunks'],
    ['requiredVocabulary', 'vocabulary'],
    ['requiredConstructions', 'constructions']
  ];
  for (const t of tasks) {
    if (t.missionId !== mission.id) continue;
    for (const [field, bucket] of needs) {
      for (const item of t.language?.[field] ?? []) {
        if (!known[bucket].has(item)) {
          p.push(`task '${t.id}' requires undeclared ${bucket} '${item}'`);
        }
      }
    }
  }

  const budgets = [
    ['maxNewChunks', 'chunks'],
    ['maxNewVocabulary', 'vocabulary'],
    ['maxNewConstructions', 'constructions']
  ];
  for (const [key, bucket] of budgets) {
    const limit = policy[key];
    if (limit != null) {
      const n = (mission.language?.introduced?.[bucket] ?? []).length;
      if (n > limit) p.push(`introduced ${bucket} (${n}) exceeds policy ${key}=${limit}`);
    }
  }
  return p;
}
