/*
 * vNext mission/task/assessment contracts (issue #45).
 *
 * These tests pin the anti-cheat invariants of the learning stack:
 *
 *   teaching item ≠ transfer item ≠ assessment item
 *
 * The UI never authors evidence semantics — task purpose, prompt family,
 * transfer status and evaluation provenance all come from the contract,
 * and support revealed inside an attempt can never be reset away.
 */
import assert from 'node:assert/strict';
import { CAPABILITIES, capabilityById } from '../src/vnext/capabilities.js';
import {
  effectiveAllowedSupport,
  validateMission,
  validateMissionContent,
  validateTask,
  makeTask
} from '../src/vnext/contracts.js';
import { bindAttempt, bindObservation } from '../src/vnext/bind.js';
import { makeEvent as makeEventRaw } from '../src/vnext/evidence.js';
import { projectLearnerState, RETENTION_DELAY_MS } from '../src/vnext/projection.js';
import {
  FIXTURES,
  MISSION_MEET_PERSON,
  MISSION_ORDER_DRINK,
  TASKS_MEET_PERSON,
  TASKS_ORDER_DRINK
} from '../src/vnext/fixtures.js';

const T0 = Date.parse('2026-02-02T09:00:00Z');
const HOUR = 3600_000;
const LEARNER = 'learner-contract';
let seq = 0;

const taskById = (id) => [...TASKS_MEET_PERSON, ...TASKS_ORDER_DRINK].find((t) => t.id === id);

/* The registry is the projection's trust boundary — every task a test
 * binds against must be registered or its events cannot verify. */
const REGISTRY = [...TASKS_MEET_PERSON, ...TASKS_ORDER_DRINK];
const register = (t) => { REGISTRY.push(t); return t; };

function attemptOn(taskId, over = {}) {
  const task = taskById(taskId);
  return bindAttempt(task, capabilityById(task.capabilityId), {
    id: `c${++seq}`,
    learnerId: LEARNER,
    occurredAt: T0 + seq * 1000,
    ...over,
    attempt: {
      observed: true,
      outcome: 'success',
      response: 'ok',
      latencyMs: 900,
      attemptId: `att.${taskId}.${seq}`,
      ...(over.attempt || {})
    }
  });
}

const stateOf = (log, id) => projectLearnerState(LEARNER, log, CAPABILITIES, REGISTRY).byCapability.get(id);

// ── 1. Fixtures validate clean under the contracts ───────────
{
  for (const { mission, tasks } of FIXTURES) {
    const problems = validateMission(mission, tasks, CAPABILITIES);
    assert.deepEqual(problems, [], `${mission.id}: ${problems.join(' | ')}`);
    const contentProblems = validateMissionContent(mission, tasks, CAPABILITIES, {
      maxNewChunks: 12,
      maxNewVocabulary: 12,
      maxNewConstructions: 4
    });
    assert.deepEqual(contentProblems, [], `${mission.id} content: ${contentProblems.join(' | ')}`);
    for (const t of tasks) assert.deepEqual(validateTask(t), [], `${t.id}: ${validateTask(t).join(' | ')}`);
  }
  console.log('✓ fixtures: both missions validate clean under contracts + injected content policy');
}

// ── 2. Task support may narrow but never broaden capability ──
{
  const cap = capabilityById('interaction.greet'); // supportAllowed: []
  const narrow = register(makeTask({
    id: 't.narrow', missionId: 'm.x', capabilityId: cap.id, modality: cap.modality,
    purpose: 'interaction', promptFamily: 'p.x',
    supportPolicy: { allowed: ['repeat'], revealModelAfterAttempt: false },
    evaluation: { authority: 'deterministic', contractId: 'eval.narrow.v1' }
  }));
  assert.deepEqual(effectiveAllowedSupport(cap, narrow), [],
    'task allowed:repeat cannot broaden a capability that allows nothing');

  // The attempt still gets recorded — but capped at SUPPORTED.
  const e = bindAttempt(
    { ...narrow },
    cap,
    { id: 'x1', learnerId: LEARNER, occurredAt: T0, attempt: { observed: true, outcome: 'success', response: 'hi', latencyMs: 500, attemptId: 'a1' }, support: { repeat: true, repeatCount: 1 } }
  );
  assert.equal(e.binding.effectiveSupportAllowed.length, 0);
  assert.equal(stateOf([e], cap.id).state, 'SUPPORTED',
    'repeat used under an empty effective policy is not independent evidence');
  console.log('✓ task support cannot broaden capability support');
}

// ── 3. The caller cannot forge evidence semantics ────────────
{
  const task = taskById('task.meet.interaction.unaided');
  const cap = capabilityById(task.capabilityId);
  const forge = (fields) =>
    assert.throws(() => bindAttempt(task, cap, { id: 'f', learnerId: LEARNER, occurredAt: T0, ...fields }), /may not author|cannot emit|mismatch/);

  forge({ context: { promptFamily: 'pf.interaction.ask_name.full_exchange.community.casual.f2f.v1' } });
  forge({ purpose: 'assessment' });
  forge({ practicedOrTransfer: 'transfer' });
  forge({ promptFamily: 'pf.interaction.ask_name.full_exchange.community.casual.f2f.v1' });
  forge({ taskId: 'task.meet.assessment.checkpoint' });
  forge({ capabilityId: 'interaction.greet' });
  forge({ modality: 'listening' });
  forge({ binding: { purpose: 'assessment' } });

  // eventType is contract-constrained: an interaction task cannot emit
  // a transfer_attempt or checkpoint.
  assert.throws(
    () => bindAttempt(task, cap, { id: 'f2', learnerId: LEARNER, occurredAt: T0, eventType: 'transfer_attempt', attempt: { attemptId: 'a' } }),
    /cannot emit/
  );
  assert.throws(
    () => bindAttempt(task, cap, { id: 'f3', learnerId: LEARNER, occurredAt: T0, eventType: 'checkpoint', attempt: { attemptId: 'a' } }),
    /cannot emit/
  );

  // And an exposure/purpose mismatch: input tasks cannot produce attempts.
  assert.throws(
    () => bindAttempt(taskById('task.meet.input.scene'), capabilityById('reception.listen.greeting_basic'),
      { id: 'f4', learnerId: LEARNER, occurredAt: T0, attempt: { attemptId: 'a' } }),
    /cannot produce attempts/
  );
  console.log('✓ caller cannot forge purpose, promptFamily, transfer status, or event type');
}

// ── 4. Freshness: teaching ≠ assessment, practiced ≠ transfer ─
{
  // An assessment task that reuses a practiced family must fail mission
  // validation when freshness is required.
  const leakyTask = makeTask({
    id: 'task.meet.assessment.leaky',
    missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction',
    purpose: 'assessment',
    promptFamily: taskById('task.meet.retrieval.ask_name').promptFamily, // SAME family the lesson taught
    freshness: { required: true, familyClass: 'fresh_assessment' },
    supportPolicy: { allowed: [], revealModelAfterAttempt: false },
    evaluation: { authority: 'deterministic', contractId: 'eval.leaky.v1' },
    assessment: { capabilitySample: ['interaction.ask_name'], allowedLanguageRange: 'declared_target_range', answerRevealDuringAttempt: false }
  });
  // The leaky task must be DECLARED for the collision check — an
  // undeclared task is flagged as a ghost, never as a freshness leak.
  const leakyMission = { ...MISSION_MEET_PERSON, taskIds: [...MISSION_MEET_PERSON.taskIds, leakyTask.id] };
  const problems = validateMission(leakyMission, [...TASKS_MEET_PERSON, leakyTask], CAPABILITIES);
  assert.ok(problems.some((x) => /reuses practiced family/.test(x)),
    `expected freshness-collision problem, got: ${problems.join(' | ')}`);

  // And the task-level shape is enforced: 'practiced' familyClass can
  // never carry freshness.required.
  assert.throws(() => makeTask({
    id: 't.bad', missionId: 'm', capabilityId: 'interaction.greet', modality: 'spoken_interaction',
    purpose: 'assessment', promptFamily: 'x', freshness: { required: true, familyClass: 'practiced' },
    assessment: { capabilitySample: ['interaction.greet'], answerRevealDuringAttempt: false }
  }), /familyClass practiced|freshness/);
  console.log('✓ teaching family cannot collide with fresh assessment family');
}

// ── 5. Transfer requires real context change ─────────────────
{
  // No changed dimensions → invalid task contract.
  assert.throws(() => makeTask({
    id: 't.tr.bad', missionId: 'mission.meet_new_person', capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction', purpose: 'transfer', promptFamily: 'x.v1',
    freshness: { required: true, familyClass: 'fresh_transfer' },
    evaluation: { authority: 'deterministic', contractId: 'eval.trbad.v1' },
    transfer: { changedDimensions: [] }
  }), /changed dimension/);

  // Unknown dimension → invalid.
  assert.throws(() => makeTask({
    id: 't.tr.bad2', missionId: 'mission.meet_new_person', capabilityId: 'interaction.ask_name',
    modality: 'spoken_interaction', purpose: 'transfer', promptFamily: 'x.v1',
    freshness: { required: true, familyClass: 'fresh_transfer' },
    evaluation: { authority: 'deterministic', contractId: 'eval.trbad.v1' },
    transfer: { changedDimensions: ['font_size'] }
  }), /unknown transfer dimension/);

  // A transfer-flagged task bound onto a REHEARSED family still cannot
  // count as transfer — the projection knows the family was practiced.
  const log = [
    attemptOn('task.meet.interaction.unaided'),                                       // independent on practiced family
    attemptOn('task.meet.interaction.unaided', { occurredAt: T0 + 50 * HOUR }),       // retained
    (() => {
      const t = register(makeTask({
        id: 'task.meet.transfer.sneaky', missionId: 'mission.meet_new_person',
        capabilityId: 'interaction.ask_name', modality: 'spoken_interaction', purpose: 'transfer',
        promptFamily: taskById('task.meet.interaction.guided').promptFamily, // rehearsed family!
        freshness: { required: true, familyClass: 'fresh_transfer' },
        evaluation: { authority: 'deterministic', contractId: 'eval.sneaky.v1' },
        transfer: { changedDimensions: ['partner'] }
      }));
      return bindAttempt(t, capabilityById('interaction.ask_name'), {
        id: `c${++seq}`, learnerId: LEARNER, occurredAt: T0 + 52 * HOUR,
        attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 800, attemptId: 'aS' }
      });
    })()
  ];
  const s = stateOf(log, 'interaction.ask_name');
  assert.equal(s.milestones.transferred, false, 'a rehearsed family flagged transfer is still practiced evidence');
  assert.equal(s.state, 'RETAINED');
  console.log('✓ transfer requires a changed dimension AND a genuinely novel family');
}

// ── 6. Answer reveal sticks to the attempt — retries can't launder ──
{
  const task = taskById('task.meet.interaction.unaided');
  const cap = capabilityById(task.capabilityId);
  const sameAttempt = 'attempt.shared.1';
  const log = [
    bindAttempt(task, cap, {
      id: 's1', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'fail', response: 'uh', latencyMs: 3000, attemptId: sameAttempt },
      support: { hint: true, repeat: false, repeatCount: null, translation: false, transcript: false, modelAnswer: false }
    }),
    // Same attempt instance, flags "clean" — the earlier hint still owns it.
    bindAttempt(task, cap, {
      id: 's2', learnerId: LEARNER, occurredAt: T0 + 5_000, eventType: 'retry',
      attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 900, attemptId: sameAttempt }
    })
  ];
  const s = stateOf(log, cap.id);
  assert.equal(s.milestones.independent, false, 'retry inside a hinted attempt is not unaided evidence');
  assert.equal(s.state, 'SUPPORTED');

  // A NEW attempt instance with no prior support history is clean.
  const clean = stateOf([
    ...log,
    bindAttempt(task, cap, {
      id: 's3', learnerId: LEARNER, occurredAt: T0 + 10_000,
      attempt: { observed: true, outcome: 'success', response: "What's your name?", latencyMs: 900, attemptId: 'attempt.new.2' }
    })
  ], cap.id);
  assert.equal(clean.state, 'INDEPENDENT', 'a genuinely fresh attempt boundary can still earn independence');
  console.log('✓ answer reveal provenance survives retry inside the attempt boundary');
}

// ── 7. Evaluation authority limits ───────────────────────────
{
  // Authority lives on the TASK contract — the caller may report
  // evaluator identity/version but can never pick a stronger authority.
  const base = taskById('task.meet.interaction.unaided');
  const cap = capabilityById(base.capabilityId);
  const on = (authority) => {
    const t = register(makeTask({
      id: `t.auth.${authority}`, missionId: 'm.x', capabilityId: cap.id, modality: cap.modality,
      purpose: 'interaction', promptFamily: `p.auth.${authority}`,
      evaluation: { authority, contractId: `eval.auth.${authority}.v1` }
    }));
    return stateOf([
      bindAttempt(t, cap, {
        id: `au${++seq}`, learnerId: LEARNER, occurredAt: T0,
        attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: `au.${seq}` }
      })
    ], cap.id).state;
  };

  assert.equal(on('deterministic'), 'INDEPENDENT');
  assert.equal(on('human'), 'INDEPENDENT');
  for (const bad of ['self_report', 'asr', 'ai_llm']) {
    assert.equal(on(bad), 'SUPPORTED', `${bad} cannot award independent ability`);
  }

  // Caller-supplied authority is a provenance mismatch — binding throws.
  assert.throws(
    () => bindAttempt(base, cap, {
      id: `au${++seq}`, learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: `au.${seq}` },
      evaluation: { authority: 'human' }
    }),
    /authority mismatch/
  );
  console.log('✓ self_report/asr/ai_llm evaluation can never award independence; authority is contract-derived');
}

// ── 8. Content-load validation is real ───────────────────────
{
  const smuggler = makeTask({
    id: 'task.drink.smuggler',
    missionId: 'mission.order_drink',
    capabilityId: 'interaction.request_item',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'drink.smuggler.v1',
    evaluation: { authority: 'deterministic', contractId: 'eval.smuggler.v1' },
    language: { requiredChunks: ['If I had known earlier'], requiredVocabulary: ['quintessential'], requiredConstructions: ['past_subjunctive'] }
  });
  const problems = validateMissionContent(
    MISSION_ORDER_DRINK,
    [...TASKS_ORDER_DRINK, smuggler],
    CAPABILITIES,
    {}
  );
  assert.ok(problems.some((x) => /undeclared chunks.*If I had known/.test(x)), problems.join(' | '));
  assert.ok(problems.some((x) => /undeclared vocabulary.*quintessential/.test(x)));
  assert.ok(problems.some((x) => /undeclared constructions.*past_subjunctive/.test(x)));

  // Injected budgets are enforced — no universal threshold hard-coded.
  const tight = validateMissionContent(MISSION_ORDER_DRINK, TASKS_ORDER_DRINK, CAPABILITIES, { maxNewChunks: 2 });
  assert.ok(tight.some((x) => /exceeds policy maxNewChunks/.test(x)), tight.join(' | '));
  assert.deepEqual(validateMissionContent(MISSION_ORDER_DRINK, TASKS_ORDER_DRINK, CAPABILITIES, {}), [],
    'with no policy injected, declaration alone passes');
  console.log('✓ undeclared language fails validation; injected budgets are enforced');
}

// ── 9. Assessment stays capability-scoped and honest ─────────
{
  // Assessment events bind to 'checkpoint' and fresh_assessment context —
  // assessment is its own context kind, NOT transfer.
  const e = attemptOn('task.meet.assessment.checkpoint');
  assert.equal(e.eventType, 'checkpoint');
  assert.equal(e.context.practicedOrTransfer, 'assessment');
  assert.equal(e.context.promptFamily, taskById('task.meet.assessment.checkpoint').promptFamily);
  assert.equal(e.binding.purpose, 'assessment');
  assert.equal(e.binding.familyClass, 'fresh_assessment');
  assert.equal(e.binding.effectiveSupportAllowed.length, 0, 'assessment allows no support');

  // Answer-bearing support inside an assessment attempt is demoted.
  const t = taskById('task.meet.assessment.checkpoint');
  const cap = capabilityById(t.capabilityId);
  const hinted = bindAttempt(t, cap, {
    id: `as${++seq}`, learnerId: LEARNER, occurredAt: T0 + 100_000,
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'assess.1' },
    support: { modelAnswer: true }
  });
  const s = stateOf([hinted], cap.id);
  assert.equal(s.state, 'SUPPORTED', 'revealed answer invalidates independent assessment');
  console.log('✓ assessment binds fresh family + zero support; revealed answers invalidate it');
}

// ── 10. Fixture A full loop: bound events drive the projection ──
{
  const log = [];
  const at = (ms) => T0 + ms;
  const push = (taskId, over = {}) => log.push(attemptOn(taskId, over));
  const observe = (taskId, over = {}) => {
    const t = taskById(taskId);
    log.push(bindObservation(t, capabilityById(t.capabilityId), {
      id: `o${++seq}`, learnerId: LEARNER, occurredAt: at(seq * 1000), ...over
    }));
  };

  // baseline diagnostic: cold fail → EXPOSED
  push('task.meet.diagnostic.ask_name', {
    occurredAt: at(0),
    attempt: { observed: true, outcome: 'fail', response: '...', latencyMs: 5000, attemptId: 'd1' }
  });
  // input exposures
  observe('task.meet.input.scene', { occurredAt: at(1_000) });
  observe('task.meet.input.ask_name', { occurredAt: at(2_000) });
  // guided interaction with model answer → SUPPORTED
  push('task.meet.interaction.guided', {
    occurredAt: at(3_000),
    support: { modelAnswer: true },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 2000, attemptId: 'g1' }
  });
  // feedback record (non-attempt, cannot advance state)
  observe('task.meet.remediation.ask_name', {
    occurredAt: at(4_000), eventType: 'feedback',
    feedback: { given: true, target: 'word order' },
    attempt: { attemptId: 'g1', outcome: null, observed: true, response: null, latencyMs: null }
  });
  // clean unaided attempt on a NEW attemptId → INDEPENDENT
  push('task.meet.interaction.unaided', { occurredAt: at(5_000), attempt: { attemptId: 'u1' } });
  assert.equal(stateOf(log, 'interaction.ask_name').state, 'INDEPENDENT');

  // delayed retrieval past the window → RETAINED
  push('task.meet.delayed.check', { occurredAt: at(5_000) + RETENTION_DELAY_MS, eventType: 'delayed_retrieval' });
  assert.equal(stateOf(log, 'interaction.ask_name').state, 'RETAINED');

  // changed-context transfer on a fresh family → TRANSFERRED
  push('task.meet.transfer.street', { occurredAt: at(5_000) + RETENTION_DELAY_MS + HOUR });
  assert.equal(stateOf(log, 'interaction.ask_name').state, 'TRANSFERRED');

  // fresh assessment — its own context kind; it can confirm retention
  // but it is NOT transfer evidence.
  push('task.meet.assessment.checkpoint', {
    occurredAt: at(5_000) + RETENTION_DELAY_MS + 2 * HOUR,
    eventType: 'checkpoint',
    attempt: { attemptId: 'ck1' }
  });
  const s = stateOf(log, 'interaction.ask_name');
  assert.equal(s.state, 'TRANSFERRED', 'FLUENT stays unreachable — no rule promotes into it');
  assert.ok(s.transferPromptFamilies.includes(taskById('task.meet.transfer.street').promptFamily));
  assert.ok(!s.transferPromptFamilies.includes(taskById('task.meet.assessment.checkpoint').promptFamily),
    'assessment family must not be counted as a transfer context');

  // every event is contract-bound: forged fields were impossible, and
  // provenance is inspectable.
  for (const e of log) {
    assert.ok(e.binding && e.binding.purpose, `${e.id} carries task binding`);
    assert.ok(e.evaluation.authority, `${e.id} carries evaluation authority`);
  }
  console.log('✓ fixture A: diagnostic → input → supported → feedback → independent → retained → transferred → fresh assessment');
}

// ── 11. Fixture B: same contracts, different scenario ────────
{
  const log = [];
  const at = (ms) => T0 + 200_000 + ms;
  const push = (taskId, over = {}) => {
    const t = taskById(taskId);
    log.push(bindAttempt(t, capabilityById(t.capabilityId), {
      id: `b${++seq}`, learnerId: LEARNER, occurredAt: at(0),
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: `b.${seq}` },
      ...over
    }));
  };

  push('task.drink.retrieval.order', { occurredAt: at(0) });
  push('task.drink.interaction.guided', { occurredAt: at(1_000) });
  assert.equal(stateOf(log, 'interaction.request_item').state, 'INDEPENDENT');
  push('task.drink.delayed.check', { occurredAt: at(1_000) + RETENTION_DELAY_MS });
  assert.equal(stateOf(log, 'interaction.request_item').state, 'RETAINED');
  push('task.drink.transfer.stall', { occurredAt: at(1_000) + RETENTION_DELAY_MS + HOUR });
  push('task.drink.assessment.checkpoint', { occurredAt: at(1_000) + RETENTION_DELAY_MS + 2 * HOUR });
  const sB = stateOf(log, 'interaction.request_item');
  assert.equal(sB.state, 'TRANSFERRED');
  assert.deepEqual(sB.transferPromptFamilies, [taskById('task.drink.transfer.stall').promptFamily],
    'only the transfer task earned a transfer family — assessment stayed separate');

  // Foreign learner isolation still holds inside the contract layer.
  const foreign = bindAttempt(taskById('task.drink.transfer.stall'), capabilityById('interaction.request_item'), {
    id: 'foreign1', learnerId: 'someone-else', occurredAt: at(0),
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'f1' }
  });
  const mine = projectLearnerState(LEARNER, [...log, foreign], CAPABILITIES, REGISTRY);
  assert.equal(mine.generatedFrom, log.length, 'foreign events never enter my projection');

  // Replay determinism with bound events.
  const shuffled = [...log].reverse();
  assert.deepEqual(
    projectLearnerState(LEARNER, shuffled, CAPABILITIES, REGISTRY),
    projectLearnerState(LEARNER, log, CAPABILITIES, REGISTRY),
    'bound events replay identically regardless of arrival order'
  );
  console.log('✓ fixture B: drink mission drives the same contract chain; isolation + determinism hold');
}

// ── 12. Round-2 review blockers ──────────────────────────────
{
  const guided = taskById('task.meet.interaction.guided');
  const greetCap = capabilityById('interaction.greet');
  const nameCap = capabilityById('interaction.ask_name');

  // a. evaluation.authority is contract-derived — the caller cannot
  //    report a stronger authority than the task declares.
  assert.throws(
    () => bindAttempt(guided, nameCap, {
      id: 'auth1', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'auth.a' },
      evaluation: { authority: 'human' } // task declares deterministic
    }),
    /authority/,
    'caller cannot upgrade deterministic → human'
  );
  // A task authored for ASR cannot be reported as human either.
  const asrTask = register(makeTask({
    id: 't.asr', missionId: 'm.x', capabilityId: 'interaction.greet', modality: 'spoken_interaction',
    purpose: 'interaction', promptFamily: 'p.asr', evaluation: { authority: 'asr', contractId: 'eval.asr.v1' }
  }));
  assert.throws(
    () => bindAttempt(asrTask, greetCap, {
      id: 'auth2', learnerId: LEARNER, occurredAt: T0,
      attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'auth.b' },
      evaluation: { authority: 'human' }
    }),
    /authority/,
    'ASR task cannot be reported as human-evaluated'
  );
  // Matching authority passes through — and still caps at SUPPORTED.
  const asrBound = bindAttempt(asrTask, greetCap, {
    id: 'auth3', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'auth.c' }
  });
  assert.equal(asrBound.evaluation.authority, 'asr');
  assert.equal(stateOf([asrBound], 'interaction.greet').state, 'SUPPORTED',
    'ASR transcript is not independent evidence even when honestly tagged');

  // b. An assessment-context success must not feed the transfer milestone.
  const assessOnly = stateOf([
    attemptOn('task.meet.interaction.unaided'),
    attemptOn('task.meet.interaction.unaided', { occurredAt: T0 + 50 * HOUR }),
    attemptOn('task.meet.assessment.checkpoint', {
      occurredAt: T0 + 51 * HOUR,
      attempt: { attemptId: 'ck.solo' }
    })
  ], 'interaction.ask_name');
  assert.equal(assessOnly.milestones.transferred, false, 'assessment success is not transfer evidence');
  assert.equal(assessOnly.state, 'RETAINED', 'assessment still counts as a real ability check');

  // c. An unbound makeEvent() success cannot reach INDEPENDENT — the
  //    binder is the only path to independent evidence.
  const unbound = makeEventRaw({
    id: 'unbound.1', learnerId: LEARNER, capabilityId: 'interaction.greet',
    taskId: 'fake.task', taskRevision: 1, eventType: 'production_attempt',
    modality: 'spoken_interaction', occurredAt: T0,
    context: { missionId: 'm', practicedOrTransfer: 'practiced', promptFamily: 'p.x', partnerType: null },
    attempt: { observed: true, outcome: 'success', response: 'hi', latencyMs: 100, attemptId: 'ub.1' },
    evaluation: { authority: 'deterministic', contractId: 'x' }
  });
  const sUnbound = stateOf([unbound], 'interaction.greet');
  assert.equal(sUnbound.state, 'SUPPORTED', 'unbound event never proves independence');
  assert.equal(sUnbound.milestones.independent, false);

  // d. A task attached to the mission but missing from taskIds is an
  //    integrity violation — it cannot quietly supply evidence paths.
  const ghost = makeTask({
    id: 'task.meet.ghost', missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.greet', modality: 'spoken_interaction',
    purpose: 'interaction', promptFamily: 'meet.ghost.v1',
    evaluation: { authority: 'deterministic', contractId: 'eval.ghost.v1' }
  });
  const mProblems = validateMission(MISSION_MEET_PERSON, [...TASKS_MEET_PERSON, ghost], CAPABILITIES);
  assert.ok(mProblems.some((x) => /not declared in taskIds/.test(x)), mProblems.join(' | '));
  // And it must not count as the evidence path for a stripped taskIds.
  const thin = { ...MISSION_MEET_PERSON, taskIds: ['task.meet.diagnostic.own_name'] };
  const thinProblems = validateMission(thin, TASKS_MEET_PERSON, CAPABILITIES);
  assert.ok(thinProblems.some((x) => /no eliciting task/.test(x)),
    'tasks outside taskIds do not satisfy the evidence-path invariant');

  // e. Capability language is NOT an implicit whitelist — the mission
  //    must declare its own language. 'Good morning' is in the
  //    capability's language but not the mission's.
  const greedy = makeTask({
    id: 'task.meet.greedy', missionId: 'mission.meet_new_person',
    capabilityId: 'reception.listen.greeting_basic', modality: 'listening',
    purpose: 'retrieval', promptFamily: 'meet.greedy.v1',
    evaluation: { authority: 'deterministic', contractId: 'eval.greedy.v1' },
    language: { requiredChunks: ['Good morning'], requiredVocabulary: [], requiredConstructions: [] }
  });
  const cProblems = validateMissionContent(MISSION_MEET_PERSON, [...TASKS_MEET_PERSON, greedy], CAPABILITIES, {});
  assert.ok(cProblems.some((x) => /undeclared chunks.*Good morning/.test(x)),
    `capability-declared language must not auto-whitelist: ${cProblems.join(' | ')}`);

  // assumedKnown is structured per kind — a flat list is invalid input.
  const flat = { ...MISSION_MEET_PERSON, language: { ...MISSION_MEET_PERSON.language, assumedKnown: ['Hi'] } };
  const flatProblems = validateMissionContent(flat, TASKS_MEET_PERSON, CAPABILITIES, {});
  assert.ok(flatProblems.some((x) => /assumedKnown/.test(x)),
    'flat assumedKnown must be rejected, not smeared across buckets');

  // f. Attempt ids are scoped by task — the same attemptId on two tasks
  //    cannot carry support history across the boundary.
  const hintTask = bindAttempt(taskById('task.drink.interaction.guided'), capabilityById('interaction.request_item'), {
    id: 'st1', learnerId: LEARNER, occurredAt: T0 + 300_000,
    attempt: { observed: true, outcome: 'fail', response: 'x', latencyMs: 2000, attemptId: 'shared.id' },
    support: { hint: true }
  });
  const cleanOther = bindAttempt(taskById('task.drink.interaction.unaided'), capabilityById('interaction.request_item'), {
    id: 'st2', learnerId: LEARNER, occurredAt: T0 + 301_000,
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: 'shared.id' }
  });
  const sSticky = stateOf([hintTask, cleanOther], 'interaction.request_item');
  assert.equal(sSticky.state, 'INDEPENDENT',
    'support on task A attempt "shared.id" does not leak into task B attempt "shared.id"');
  console.log('✓ round-2 blockers: authority derived, assessment≠transfer, binder-only independence, taskIds scope, declared language, task-scoped sticky');
}

// ── 13. Trust boundary: forged binding + evaluator contract ──
{
  // a. A raw makeEvent() that self-stamps a valid-looking binding must
  //    not earn INDEPENDENT — the projection re-verifies every semantic
  //    field against the registered task, not the stamp.
  const real = taskById('task.meet.interaction.unaided'); // purpose: interaction
  const forged = makeEventRaw({
    id: 'forge.1', learnerId: LEARNER, capabilityId: 'interaction.ask_name',
    taskId: real.id, taskRevision: real.revision,
    eventType: 'transfer_attempt', // interaction tasks cannot emit this
    modality: 'spoken_interaction', occurredAt: T0,
    context: { missionId: 'mission.meet_new_person', practicedOrTransfer: 'transfer', promptFamily: 'p.forged', partnerType: 'stranger' },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'fg.1' },
    evaluation: { authority: 'deterministic', contractId: real.evaluation.contractId },
    binding: { purpose: 'transfer', familyClass: 'fresh_transfer', freshnessRequired: true, effectiveSupportAllowed: [] }
  });
  const sForge = stateOf([forged], 'interaction.ask_name');
  assert.equal(sForge.milestones.independent, false, 'a forged binding does not verify against the registry task');
  assert.equal(sForge.milestones.transferred, false, 'forged transfer context earns no transfer credit');
  assert.equal(sForge.state, 'SUPPORTED', 'forgery is recorded honestly but never credited');

  // A subtler forgery: the right eventType and purpose, but the caller
  // upgraded the evaluator past what the task declares.
  const forgedEval = makeEventRaw({
    id: 'forge.2', learnerId: LEARNER, capabilityId: 'interaction.ask_name',
    taskId: real.id, taskRevision: real.revision, eventType: 'interaction_turn',
    modality: 'spoken_interaction', occurredAt: T0,
    context: { missionId: real.missionId, practicedOrTransfer: 'practiced', promptFamily: real.promptFamily, partnerType: null },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'fg.2' },
    evaluation: { authority: 'human', contractId: real.evaluation.contractId }, // task declares deterministic
    binding: { purpose: 'interaction', familyClass: 'practiced', freshnessRequired: false, effectiveSupportAllowed: [] }
  });
  assert.equal(stateOf([forgedEval], 'interaction.ask_name').milestones.independent, false,
    'authority inflated past the task contract fails verification');

  // b. Eliciting purposes require a real evaluator contract id — a
  //    task without one cannot be constructed via makeTask…
  assert.throws(() => makeTask({
    id: 't.nocid', missionId: 'm.x', capabilityId: 'interaction.greet', modality: 'spoken_interaction',
    purpose: 'retrieval', promptFamily: 'p.x' // evaluation.contractId stays null
  }), /contractId/);

  // …and a hand-rolled registry task without one still cannot mint
  // independent evidence, even when every event field matches it.
  const rawTask = {
    id: 't.raw', revision: 1, missionId: 'm.x', capabilityId: 'interaction.greet',
    modality: 'spoken_interaction', purpose: 'retrieval', promptFamily: 'p.x',
    freshness: { required: false, familyClass: 'practiced' },
    supportPolicy: { allowed: [] }, evaluation: { authority: 'deterministic', contractId: null }
  };
  const rawBound = makeEventRaw({
    id: 'raw.1', learnerId: LEARNER, capabilityId: 'interaction.greet', taskId: 't.raw', taskRevision: 1,
    eventType: 'recall_attempt', modality: 'spoken_interaction', occurredAt: T0,
    context: { missionId: 'm.x', practicedOrTransfer: 'practiced', promptFamily: 'p.x', partnerType: null },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'r.1' },
    evaluation: { authority: 'deterministic', contractId: null },
    binding: { purpose: 'retrieval', familyClass: 'practiced', freshnessRequired: false, effectiveSupportAllowed: [] }
  });
  const sRaw = projectLearnerState(LEARNER, [rawBound], CAPABILITIES, [rawTask]).byCapability.get('interaction.greet');
  assert.equal(sRaw.milestones.independent, false,
    'an eliciting task without evaluator contractId cannot mint independent evidence, however shaped');
  console.log('✓ trust boundary: forged bindings fail registry verification; eliciting tasks require a real evaluator contract');
}

// ── 14. Registry integrity: revision keying + valid contracts ──
{
  const cap = capabilityById('interaction.greet');

  // a. Revisions coexist: a v2 registration under the same task id must
  //    NOT overwrite v1 — historical evidence keeps verifying under the
  //    contract that actually produced it.
  const v1 = register(makeTask({
    id: 't.rev', missionId: 'm.x', capabilityId: cap.id, modality: cap.modality,
    purpose: 'production', promptFamily: 'p.rev',
    evaluation: { authority: 'deterministic', contractId: 'eval.rev.v1' }
  }));
  const eV1 = bindAttempt(v1, cap, {
    id: 'rv1', learnerId: LEARNER, occurredAt: T0,
    attempt: { observed: true, outcome: 'success', response: 'hi', latencyMs: 900, attemptId: 'rv.1' }
  });
  const v2 = register({ ...v1, revision: 2, evaluation: { authority: 'deterministic', contractId: 'eval.rev.v2' } });
  const eV2 = bindAttempt(v2, cap, {
    id: 'rv2', learnerId: LEARNER, occurredAt: T0 + 50 * HOUR,
    attempt: { observed: true, outcome: 'success', response: 'hi', latencyMs: 900, attemptId: 'rv.2' }
  });
  const sRev = stateOf([eV1, eV2], cap.id);
  assert.equal(sRev.milestones.independent, true, 'v1 evidence still verifies after v2 registers');
  assert.equal(sRev.milestones.retained, true, 'v2 event lands on its own contract — replay stays stable');

  // b. Duplicate id@revision is an integrity violation — rejected, not
  //    last-write-wins.
  assert.throws(
    () => projectLearnerState(LEARNER, [], CAPABILITIES, [v1, v1]),
    /duplicate task registration/,
    'two registrations of the same id@revision are rejected'
  );

  // c. A hand-rolled task that fails validateTask can never mint
  //    evidence — e.g. purpose 'transfer' with no changedDimensions.
  const badTransfer = {
    id: 't.badtr', revision: 1, missionId: 'm.x', capabilityId: cap.id,
    modality: cap.modality, purpose: 'transfer', promptFamily: 'p.badtr',
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: [] }, // invalid: zero real changes
    supportPolicy: { allowed: [] },
    evaluation: { authority: 'deterministic', contractId: 'eval.badtr.v1' }
  };
  const forgedTransfer = makeEventRaw({
    id: 'bt.1', learnerId: LEARNER, capabilityId: cap.id, taskId: 't.badtr', taskRevision: 1,
    eventType: 'transfer_attempt', modality: cap.modality, occurredAt: T0,
    context: { missionId: 'm.x', practicedOrTransfer: 'transfer', promptFamily: 'p.badtr', partnerType: 'stranger' },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'bt.1' },
    evaluation: { authority: 'deterministic', contractId: 'eval.badtr.v1' },
    binding: { purpose: 'transfer', familyClass: 'fresh_transfer', freshnessRequired: true, effectiveSupportAllowed: [] }
  });
  const sBad = projectLearnerState(LEARNER, [forgedTransfer], CAPABILITIES, [badTransfer]).byCapability.get(cap.id);
  assert.equal(sBad.milestones.independent, false, 'an invalid registry task cannot mint INDEPENDENT');
  assert.equal(sBad.milestones.transferred, false, 'an invalid registry task cannot mint TRANSFERRED');
  assert.equal(sBad.state, 'SUPPORTED');
  console.log('✓ registry: revisions coexist, duplicate id@revision rejected, invalid tasks mint nothing');
}
