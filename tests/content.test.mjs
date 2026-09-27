import assert from 'node:assert/strict';
import { validateCourse, validateLesson } from '../src/content/schema.js';
import lesson from '../src/content/a1/s1-l1.js';

{
  const errors = validateLesson(lesson);
  assert.deepEqual(errors, [], `exemplar lesson must pass the validator: ${errors.join('; ')}`);
}

{
  const broken = JSON.parse(JSON.stringify(lesson));
  broken.drills[0].answer = 9;
  const errors = validateLesson(broken);
  assert(errors.length > 0, 'out-of-range answer must fail validation');
}

{
  assert.deepEqual(validateCourse([lesson]), [], 'single-lesson course must produce no errors');
}

console.log('FlashDay content: 3 checks passed');
