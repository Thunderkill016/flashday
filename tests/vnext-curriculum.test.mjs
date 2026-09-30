/*
 * vNext curriculum gate (issue #57, R5): the capability DAG and the
 * mission/task registry must pass the authoring checks before any
 * learner touches the content — DAG validity, claim-target
 * evidenceability, canonical prompt families, and novelty integrity.
 */
import assert from 'node:assert/strict';
import { CAPABILITIES, capabilityById } from '../src/vnext/capabilities.js';
import { makeMission, makeTask } from '../src/vnext/contracts.js';
import {
  checkCurriculum, parseFamilyId, MAX_TARGETS_PER_MISSION
} from '../src/vnext/curriculum-checks.js';
import { FIXTURES, MISSION_MEET_PERSON, TASKS_MEET_PERSON } from '../src/vnext/fixtures.js';

const ALL_TASKS = FIXTURES.flatMap((f) => f.tasks);
const ALL_MISSIONS = FIXTURES.map((f) => f.mission);
const run = (over = {}) => checkCurriculum({
  capabilities: CAPABILITIES, missions: ALL_MISSIONS, tasks: ALL_TASKS, ...over
});

// ── 1. The shipped seed content passes the full gate ──────────
{
  const problems = run();
  assert.deepEqual(problems, [], `seed curriculum must be clean:\n${problems.join('\n')}`);
  console.log('✓ seed curriculum passes DAG validity, evidenceability and novelty integrity');
}

// ── 2. Canonical family ids parse losslessly ──────────────────
{
  const fam = parseFamilyId('pf.interaction.ask_name.open_social.street.casual.f2f.v1');
  assert.deepEqual(fam, {
    capabilityId: 'interaction.ask_name',
    cueTopology: 'open_social', setting: 'street', register: 'casual',
    channel: 'f2f', version: 1
  });
  assert.equal(parseFamilyId('meet.ask_name.street.v1'), null, 'legacy ids are not canonical');
  assert.equal(parseFamilyId('pf.short.v1'), null, 'fewer than five segments cannot be a canonical id');
  assert.equal(parseFamilyId('pf.interaction.ask_name.open_social.street.casual.f2f'), null, 'missing version');
  // A short-but-legal form parses — the cap-id match check downstream is
  // what rejects it, not the parser.
  const wrongCap = parseFamilyId('pf.interaction.ask_name.street.casual.f2f.v1');
  assert.equal(wrongCap.capabilityId, 'interaction', 'ambiguous tails parse; the cap match check rejects them');
  console.log('✓ canonical prompt-family ids parse and reject malformed/legacy forms');
}

// ── 3. DAG failures are caught ────────────────────────────────
{
  const dangling = [...CAPABILITIES, { ...capabilityById('interaction.greet'), id: 'interaction.bogus', prerequisites: ['interaction.nothing'] }];
  assert.ok(run({ capabilities: dangling }).some((p) => /graph:.*unknown prerequisite/.test(p)), 'dangling prereq must fail');

  const cyclic = [
    { ...capabilityById('interaction.greet'), prerequisites: ['interaction.ask_name'] },
    { ...capabilityById('interaction.ask_name'), prerequisites: ['interaction.greet'], id: 'interaction.ask_name' }
  ];
  assert.ok(run({ capabilities: cyclic }).some((p) => /graph:.*cycle/i.test(p)), 'cycle must fail');
  console.log('✓ dangling prerequisites and cycles fail the DAG check');
}

// ── 4. Evidenceability: targets owe the full claim package ────
{
  // Remove say_own_name's delayed + transfer coverage and strip it from
  // the checkpoint sample — every missing piece must be named.
  const skinnyMission = {
    ...MISSION_MEET_PERSON,
    taskIds: MISSION_MEET_PERSON.taskIds.filter(
      (id) => !['task.meet.delayed.name', 'task.meet.transfer.name'].includes(id)
    )
  };
  const skinnyTasks = TASKS_MEET_PERSON.filter(
    (t) => !['task.meet.delayed.name', 'task.meet.transfer.name'].includes(t.id)
  );
  const problems = run({ missions: [skinnyMission], tasks: skinnyTasks });
  assert.ok(problems.some((p) => /say_own_name.*delayed_retrieval/.test(p)), `missing delayed coverage:\n${problems.join('\n')}`);
  assert.ok(problems.some((p) => /say_own_name.*fresh_transfer/.test(p)), 'missing transfer coverage');
  console.log('✓ a claim target without delayed/transfer coverage fails evidenceability');

  // More targets than the soft maximum cannot hide in a mission.
  const bloated = makeMission({
    ...MISSION_MEET_PERSON, id: 'mission.bloated',
    targetCapabilities: ['interaction.ask_name', 'production.speak.say_own_name', 'interaction.greet', 'interaction.respond_to_introduction']
  });
  assert.ok(
    run({ missions: [bloated], tasks: TASKS_MEET_PERSON })
      .some((p) => new RegExp(`${MAX_TARGETS_PER_MISSION}`).test(p) && /target/i.test(p)),
    'missions claiming >3 targets are authoring errors'
  );

  // A carrier carrying a fresh_transfer task is a disguised target.
  const carrierClaim = {
    ...MISSION_MEET_PERSON,
    carrierCapabilities: [...MISSION_MEET_PERSON.carrierCapabilities, 'interaction.ask_repeat'],
    supportCapabilities: []
  };
  const carrierTask = makeTask({
    id: 'task.meet.transfer.repair_sneak', missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_repeat', modality: 'spoken_interaction', purpose: 'transfer',
    promptFamily: 'pf.interaction.ask_repeat.noisy_room.street.casual.f2f.v1',
    contextSignature: {
      communicativeFunction: 'ask_repeat', cueTopology: 'noisy_room', setting: 'street',
      register: 'casual', channel: 'f2f', interlocutorRole: 'stranger',
      relationship: 'stranger_contact', responseTopology: 'repair_request', lexicalDomain: 'repair'
    },
    stimulus: { type: 'partner_turn', languageComponents: ['…'] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_repeat'] },
    evaluation: { authority: 'deterministic', contractId: 'eval.test.v1' },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['partner', 'setting'] },
    language: { requiredChunks: ['Sorry?'], requiredVocabulary: ['sorry'], requiredConstructions: [] }
  });
  const carrierProblems = run({
    missions: [{ ...carrierClaim, taskIds: [...carrierClaim.taskIds, carrierTask.id] }],
    tasks: [...ALL_TASKS.filter((t) => t.missionId !== 'mission.meet_new_person'), ...TASKS_MEET_PERSON, carrierTask]
  });
  assert.ok(carrierProblems.some((p) => /carrier.*ask_repeat.*fresh_transfer/.test(p)), `carrier transfer must fail:\n${carrierProblems.join('\n')}`);
  console.log('✓ carriers cannot silently carry held-out transfer credit');
}

// ── 5. Novelty integrity ──────────────────────────────────────
{
  // Same family id, two signatures → family drift.
  const drifted = makeTask({
    id: 'task.meet.drift', missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name', modality: 'spoken_interaction', purpose: 'retrieval',
    promptFamily: 'pf.interaction.ask_name.cued_recall.personal.casual.f2f.v1',
    contextSignature: {
      communicativeFunction: 'ask_name', cueTopology: 'cued_recall', setting: 'street',
      register: 'casual', channel: 'f2f', interlocutorRole: 'new_peer',
      relationship: 'first_meeting', responseTopology: 'wh_question', lexicalDomain: 'identity'
    },
    stimulus: { type: 'cued_prompt', languageComponents: ["What's your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    evaluation: { authority: 'deterministic', contractId: 'eval.test.v1' },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  });
  assert.ok(
    run({ tasks: [...ALL_TASKS, drifted] }).some((p) => /cued_recall.*different signatures/.test(p)),
    'same family id with a different signature must fail'
  );

  // A "new" family id with an unchanged signature → fake novelty.
  const fakeNovel = makeTask({
    id: 'task.meet.fake_novel', missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name', modality: 'spoken_interaction', purpose: 'retrieval',
    promptFamily: 'pf.interaction.ask_name.cued_recall.personal.casual.f2f.v2',
    contextSignature: {
      communicativeFunction: 'ask_name', cueTopology: 'cued_recall', setting: 'personal',
      register: 'casual', channel: 'f2f', interlocutorRole: 'new_peer',
      relationship: 'first_meeting', responseTopology: 'wh_question', lexicalDomain: 'identity'
    },
    stimulus: { type: 'cued_prompt', languageComponents: ["What is your name?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    evaluation: { authority: 'deterministic', contractId: 'eval.test.v1' },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  });
  assert.ok(
    run({ tasks: [...ALL_TASKS, fakeNovel] }).some((p) => /fake novelty/.test(p)),
    'a version bump with an identical signature is fake novelty'
  );

  // A transfer task whose declared "delta" does not exist in the
  // signature → the novelty claim is unverifiable.
  const noDelta = makeTask({
    id: 'task.meet.transfer.liar', missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name', modality: 'spoken_interaction', purpose: 'transfer',
    promptFamily: 'pf.interaction.ask_name.self_intro.personal.casual.voice_note.v1',
    contextSignature: {
      communicativeFunction: 'ask_name', cueTopology: 'self_intro', setting: 'personal',
      register: 'casual', channel: 'voice_note', interlocutorRole: 'new_peer',
      relationship: 'first_meeting', responseTopology: 'wh_question', lexicalDomain: 'identity'
    },
    stimulus: { type: 'partner_turn', languageComponents: ["I'm Sam — and you are?"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    evaluation: { authority: 'deterministic', contractId: 'eval.test.v1' },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['wording'] }, // cueTopology is 'self_intro' — SAME as baseline
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  });
  assert.ok(
    run({ tasks: [...ALL_TASKS, noDelta] }).some((p) => /liar.*declared delta does not exist/.test(p)),
    'a declared changed dimension that equals the practiced signature must fail'
  );

  // A transfer with only non-context dims is not a context transfer.
  const delayOnly = makeTask({
    id: 'task.meet.transfer.later', missionId: 'mission.meet_new_person',
    capabilityId: 'interaction.ask_name', modality: 'spoken_interaction', purpose: 'transfer',
    promptFamily: 'pf.interaction.ask_name.self_intro.personal.casual.f2f.v9',
    contextSignature: {
      communicativeFunction: 'ask_name', cueTopology: 'self_intro', setting: 'personal',
      register: 'casual', channel: 'f2f', interlocutorRole: 'new_peer',
      relationship: 'first_meeting', responseTopology: 'wh_question', lexicalDomain: 'identity'
    },
    stimulus: { type: 'partner_turn', languageComponents: ["I'm Sam"] },
    response: { type: 'spoken_turn', requiredFunctions: ['ask_name'] },
    evaluation: { authority: 'deterministic', contractId: 'eval.test.v1' },
    freshness: { required: true, familyClass: 'fresh_transfer' },
    transfer: { changedDimensions: ['delay'] },
    language: { requiredChunks: ["What's your name?"], requiredVocabulary: ['name'], requiredConstructions: ['wh_question_name'] }
  });
  const laterProblems = run({ tasks: [...ALL_TASKS, delayOnly] });
  assert.ok(laterProblems.some((p) => /later.*no signature-mappable/.test(p)), `delay-only transfer must fail:\n${laterProblems.join('\n')}`);
  console.log('✓ family drift, fake novelty and unverifiable transfer deltas all fail');
}

console.log('vnext-curriculum: all checks passed');
