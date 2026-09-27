import assert from 'node:assert/strict';
import { STEPS, lessonStatus, stageStatus, suggestNext } from '../src/core/progress.js';
import { createSession } from '../src/core/session.js';

const lessons = [
  { id: 'l1', stage: 1, order: 1 },
  { id: 'l2', stage: 1, order: 2 },
  { id: 'l3', stage: 2, order: 1 }
];

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

assert.deepEqual([...STEPS], ['prepare', 'read', 'listen', 'write', 'speak']);

{
  const status = lessonStatus([], lessons[0]);
  assert.equal(status.anyAttempt, false);
  assert.equal(status.prepare, 'todo');
  const events = [
    { lessonId: 'l1', step: 'prepare', kind: 'drill' },
    { lessonId: 'l1', step: 'write', kind: 'write' },
    { lessonId: 'l2', step: 'prepare', kind: 'drill' }
  ];
  const s1 = lessonStatus(events, lessons[0]);
  assert.equal(s1.anyAttempt, true);
  assert.equal(s1.prepare, 'attempted');
  assert.equal(s1.write, 'attempted');
  assert.equal(s1.speak, 'todo');
}

{
  const events = [{ lessonId: 'l1', step: 'prepare', kind: 'drill' }];
  const stage = stageStatus(events, 1, lessons);
  assert.deepEqual(stage, { total: 2, started: 1, attemptedAll: 0 });
}

{
  // Priority: resume (session draft) > finish (partial lesson) > next > done.
  const events = [{ lessonId: 'l1', step: 'prepare', kind: 'drill' }];
  const session = createSession({ storage: memoryStorage() });
  // No draft → finish the partially-attempted lesson.
  assert.equal(suggestNext({ events, session, lessons }).kind, 'finish');
  assert.equal(suggestNext({ events, session, lessons }).step, 'read');

  session.setLast({ lessonId: 'l2', step: 'listen' });
  session.setDraft('l2', { contentVersion: 1, step: 'listen', answers: { listen: { q1: 1 } } });
  const resume = suggestNext({ events, session, lessons });
  assert.equal(resume.kind, 'resume', 'draft with unsubmitted content beats finish');
  assert.equal(resume.lessonId, 'l2');
  assert.equal(resume.step, 'listen');

  // Empty draft → no resume; ordering falls to finish/next.
  const empty = createSession({ storage: memoryStorage() });
  empty.setLast({ lessonId: 'l2', step: 'listen' });
  empty.setDraft('l2', { contentVersion: 1, step: 'listen' });
  assert.equal(suggestNext({ events, session: empty, lessons }).kind, 'finish');

  // All of l1's steps attempted → next unstarted lesson.
  const full = STEPS.map((step) => ({ lessonId: 'l1', step, kind: step === 'prepare' ? 'drill' : step }));
  assert.equal(suggestNext({ events: full, session: createSession({ storage: memoryStorage() }), lessons }).kind, 'next');
  assert.equal(suggestNext({ events: full, session: createSession({ storage: memoryStorage() }), lessons }).lessonId, 'l2');

  // Everything attempted → done.
  const all = [];
  for (const l of lessons) for (const step of STEPS) all.push({ lessonId: l.id, step, kind: step });
  assert.equal(suggestNext({ events: all, session: createSession({ storage: memoryStorage() }), lessons }).kind, 'done');
}

console.log('FlashDay progress: 4 checks passed');
