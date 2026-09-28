import assert from 'node:assert/strict';
import { validateCourse, validateLesson } from '../src/content/schema.js';
import lesson from '../src/content/a1/s1-l1.js';

{
  const errors = validateLesson(lesson);
  assert.deepEqual(errors, [], `exemplar mission lesson must pass the validator: ${errors.join('; ')}`);
}

{
  const broken = JSON.parse(JSON.stringify(lesson));
  broken.mission.gist[0].answer = 9;
  const errors = validateLesson(broken);
  assert(errors.length > 0, 'out-of-range gist answer must fail validation');
}

{
  // The retrieval stage's memory contract: every taught chunk gets a cue.
  const broken = JSON.parse(JSON.stringify(lesson));
  broken.mission.retrieval.pop();
  const errors = validateLesson(broken);
  assert(errors.length > 0, 'retrieval must cover every taught chunk');
}

{
  // Honest-enrollment metadata (issue #33 round 2): exit turns declare
  // which chunks the learner produces. Missing/unknown ids fail
  // validation — otherwise tasks mint for work the learner never did.
  const noProduce = JSON.parse(JSON.stringify(lesson));
  delete noProduce.mission.exit.turns[0].produces;
  assert(validateLesson(noProduce).length > 0, 'an exit turn must declare produced chunks');

  const badProduce = JSON.parse(JSON.stringify(lesson));
  badProduce.mission.exit.turns[0].produces = ['c9'];
  assert(validateLesson(badProduce).length > 0, 'produces must reference real chunk ids');

  const noHint = JSON.parse(JSON.stringify(lesson));
  delete noHint.mission.exit.turns[0].checks[1].hint;
  assert(validateLesson(noHint).length > 0, 'every check needs a targeted hint');

  // The name contract is declared in content: "Nói tên mình" matches the
  // learner's own captured name via <name>, not a hidden persona.
  const nameCheck = lesson.mission.exit.turns[0].checks.find((c) => c.key === 'name');
  assert.ok(nameCheck.match.every((p) => p.includes('<name>')),
    'name check must resolve against the learner-entered <name>');
}

{
  assert.deepEqual(validateCourse([lesson]), [], 'single-lesson course must produce no errors');
}

{
  assert.equal(lesson.format, 'mission', 'lesson 1 runs the mission format (issue #33)');
  assert.equal(lesson.contentVersion, 3, 'mission rewrite invalidates earlier drafts');
  assert.equal(lesson.chunks.length, 4, 'one narrow mission = exactly four phrases');
  assert.equal(lesson.mission.lines.length, 4, 'context is one tiny exchange, not a script');
  assert.equal(lesson.mission.exit.partner, 'Sam');
  assert.ok(lesson.mission.exit.turns.every((turn) => turn.checks.length >= 1),
    'every exit turn has at least one communicative check');
  // The narrow can-do: origin/contact/jobs content does not belong to
  // "meet someone new" — it belongs to a different curriculum slice.
  const allText = JSON.stringify(lesson);
  assert(!allText.includes('Where are you from'), 'no origin question in lesson 1');
  assert(!allText.includes('I’m from'), 'no origin answer in lesson 1');
}

console.log('FlashDay content: 5 checks passed');
