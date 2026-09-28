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

const stateOf = (log, id) => projectLearnerState(LEARNER, log, CAPABILITIES).byCapability.get(id);

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
  const cap = capabilityById('interact.greet'); // supportAllowed: []
  const narrow = makeTask({
    id: 't.narrow', missionId: 'm.x', capabilityId: cap.id, modality: cap.modality,
    purpose: 'interaction', promptFamily: 'p.x',
    supportPolicy: { allowed: ['repeat'], revealModelAfterAttempt: false }
  });
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

  forge({ context: { promptFamily: 'assess.meet.exchange.v1' } });
  forge({ purpose: 'assessment' });
  forge({ practicedOrTransfer: 'transfer' });
  forge({ promptFamily: 'assess.meet.exchange.v1' });
  forge({ taskId: 'task.meet.assessment.checkpoint' });
  forge({ capabilityId: 'interact.greet' });
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
    () => bindAttempt(taskById('task.meet.input.scene'), capabilityById('listen.greeting_basic'),
      { id: 'f4', learnerId: LEARNER, occurredAt: T0, attempt: { attemptId: 'a' } }),
    /cannot produce attempts/
  );
  console.log('✓ caller cannot forge purpose, promptFamily, transfer status, or event type');
}

// ── 4. Freshness: teaching ≠ assessment, practiced ≠ transfer ─
{
  // An assessment task that reuses a practiced family must fail mission
  // validation when freshness is required.
  const leaky = [
    ...TASKS_MEET_PERSON,
    makeTask({
      id: 'task.meet.assessment.leaky',
      missionId: 'mission.meet_new_person',
      capabilityId: 'interact.ask_name',
      modality: 'spoken_interaction',
      purpose: 'assessment',
      promptFamily: 'meet.ask_name.practice.v1', // SAME family the lesson taught
      freshness: { required: true, familyClass: 'fresh_assessment' },
      supportPolicy: { allowed: [], revealModelAfterAttempt: false },
      assessment: { capabilitySample: ['interact.ask_name'], allowedLanguageRange: 'declared_target_range', answerRevealDuringAttempt: false }
    })
  ];
  const problems = validateMission(MISSION_MEET_PERSON, leaky, CAPABILITIES);
  assert.ok(problems.some((x) => /reuses practiced family/.test(x)),
    `expected freshness-collision problem, got: ${problems.join(' | ')}`);

  // And the task-level shape is enforced: 'practiced' familyClass can
  // never carry freshness.required.
  assert.throws(() => makeTask({
    id: 't.bad', missionId: 'm', capabilityId: 'interact.greet', modality: 'spoken_interaction',
    purpose: 'assessment', promptFamily: 'x', freshness: { required: true, familyClass: 'practiced' },
    assessment: { capabilitySample: ['interact.greet'], answerRevealDuringAttempt: false }
  }), /familyClass practiced|freshness/);
  console.log('✓ teaching family cannot collide with fresh assessment family');
}

// ── 5. Transfer requires real context change ─────────────────
{
  // No changed dimensions → invalid task contract.
  assert.throws(() => makeTask({
    id: 't.tr.bad', missionId: 'mission.meet_new_person', capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction', purpose: 'transfer', promptFamily: 'x.v1',
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: [] }
  }), /changed dimension/);

  // Unknown dimension → invalid.
  assert.throws(() => makeTask({
    id: 't.tr.bad2', missionId: 'mission.meet_new_person', capabilityId: 'interact.ask_name',
    modality: 'spoken_interaction', purpose: 'transfer', promptFamily: 'x.v1',
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['font_size'] }
  }), /unknown transfer dimension/);

  // A transfer-flagged task bound onto a REHEARSED family still cannot
  // count as transfer — the projection knows the family was practiced.
  const log = [
    attemptOn('task.meet.interaction.unaided'),                                       // independent on practiced family
    attemptOn('task.meet.interaction.unaided', { occurredAt: T0 + 50 * HOUR }),       // retained
    (() => {
      const t = makeTask({
        id: 'task.meet.transfer.sneaky', missionId: 'mission.meet_new_person',
        capabilityId: 'interact.ask_name', modality: 'spoken_interaction', purpose: 'transfer',
        promptFamily: 'meet.ask_name.practice.v1', // rehearsed family!
        freshness: { required: true, familyClass: 'fresh_transfer' },
        transfer: { changedDimensions: ['partner'] }
      });
      return bindAttempt(t, capabilityById('interact.ask_name'), {
        id: `c${++seq}`, learnerId: LEARNER, occurredAt: T0 + 52 * HOUR,
        attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 800, attemptId: 'aS' }
      });
    })()
  ];
  const s = stateOf(log, 'interact.ask_name');
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
  const task = taskById('task.meet.interaction.unaided');
  const cap = capabilityById(task.capabilityId);
  const on = (authority) =>
    stateOf([
      bindAttempt(task, cap, {
        id: `au${++seq}`, learnerId: LEARNER, occurredAt: T0,
        attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 900, attemptId: `au.${seq}` },
        evaluation: { authority }
      })
    ], cap.id).state;

  assert.equal(on('deterministic'), 'INDEPENDENT');
  assert.equal(on('human'), 'INDEPENDENT');
  for (const bad of ['self_report', 'asr', 'ai_llm']) {
    assert.equal(on(bad), 'SUPPORTED', `${bad} cannot award independent ability`);
  }
  console.log('✓ self_report/asr/ai_llm evaluation can never award independence');
}

// ── 8. Content-load validation is real ───────────────────────
{
  const smuggler = makeTask({
    id: 'task.drink.smuggler',
    missionId: 'mission.order_drink',
    capabilityId: 'interact.order_drink',
    modality: 'spoken_interaction',
    purpose: 'interaction',
    promptFamily: 'drink.smuggler.v1',
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
  // Assessment events bind to 'checkpoint' and fresh_assessment context.
  const e = attemptOn('task.meet.assessment.checkpoint');
  assert.equal(e.eventType, 'checkpoint');
  assert.equal(e.context.practicedOrTransfer, 'transfer');
  assert.equal(e.context.promptFamily, 'assess.meet.exchange.v1');
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
  push('task.meet.diagnostic.opening', {
    occurredAt: at(0),
    attempt: { observed: true, outcome: 'fail', response: '...', latencyMs: 5000, attemptId: 'd1' }
  });
  // input exposures
  observe('task.meet.input.scene', { occurredAt: at(1_000) });
  observe('task.meet.input.questions', { occurredAt: at(2_000) });
  // guided interaction with model answer → SUPPORTED
  push('task.meet.interaction.guided', {
    occurredAt: at(3_000),
    support: { modelAnswer: true },
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 2000, attemptId: 'g1' }
  });
  // feedback record (non-attempt, cannot advance state)
  observe('task.meet.remediation.repair', {
    occurredAt: at(4_000), eventType: 'feedback',
    feedback: { given: true, target: 'word order' },
    attempt: { attemptId: 'g1', outcome: null, observed: true, response: null, latencyMs: null }
  });
  // clean unaided attempt on a NEW attemptId → INDEPENDENT
  push('task.meet.interaction.unaided', { occurredAt: at(5_000), attempt: { attemptId: 'u1' } });
  assert.equal(stateOf(log, 'interact.ask_name').state, 'INDEPENDENT');

  // delayed retrieval past the window → RETAINED
  push('task.meet.delayed.check', { occurredAt: at(5_000) + RETENTION_DELAY_MS, eventType: 'delayed_retrieval' });
  assert.equal(stateOf(log, 'interact.ask_name').state, 'RETAINED');

  // changed-context transfer on a fresh family → TRANSFERRED
  push('task.meet.transfer.street', { occurredAt: at(5_000) + RETENTION_DELAY_MS + HOUR });
  assert.equal(stateOf(log, 'interact.ask_name').state, 'TRANSFERRED');

  // fresh assessment — also transfer context; ceiling stays TRANSFERRED
  push('task.meet.assessment.checkpoint', {
    occurredAt: at(5_000) + RETENTION_DELAY_MS + 2 * HOUR,
    eventType: 'checkpoint',
    attempt: { attemptId: 'ck1' }
  });
  const s = stateOf(log, 'interact.ask_name');
  assert.equal(s.state, 'TRANSFERRED', 'FLUENT stays unreachable — no rule promotes into it');
  assert.ok(s.transferPromptFamilies.includes('meet.ask_name.street.v1'));
  assert.ok(s.transferPromptFamilies.includes('assess.meet.exchange.v1'));

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
  assert.equal(stateOf(log, 'interact.order_drink').state, 'INDEPENDENT');
  push('task.drink.delayed.check', { occurredAt: at(1_000) + RETENTION_DELAY_MS });
  assert.equal(stateOf(log, 'interact.order_drink').state, 'RETAINED');
  push('task.drink.transfer.stall', { occurredAt: at(1_000) + RETENTION_DELAY_MS + HOUR });
  push('task.drink.assessment.checkpoint', { occurredAt: at(1_000) + RETENTION_DELAY_MS + 2 * HOUR });
  assert.equal(stateOf(log, 'interact.order_drink').state, 'TRANSFERRED');

  // Foreign learner isolation still holds inside the contract layer.
  const foreign = bindAttempt(taskById('task.drink.transfer.stall'), capabilityById('interact.order_drink'), {
    id: 'foreign1', learnerId: 'someone-else', occurredAt: at(0),
    attempt: { observed: true, outcome: 'success', response: 'ok', latencyMs: 100, attemptId: 'f1' }
  });
  const mine = projectLearnerState(LEARNER, [...log, foreign], CAPABILITIES);
  assert.equal(mine.generatedFrom, log.length, 'foreign events never enter my projection');

  // Replay determinism with bound events.
  const shuffled = [...log].reverse();
  assert.deepEqual(
    projectLearnerState(LEARNER, shuffled, CAPABILITIES),
    projectLearnerState(LEARNER, log, CAPABILITIES),
    'bound events replay identically regardless of arrival order'
  );
  console.log('✓ fixture B: drink mission drives the same contract chain; isolation + determinism hold');
}
