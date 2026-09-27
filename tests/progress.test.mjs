import assert from 'node:assert/strict';
import { STEPS, lessonStatus, stageStatus, suggestNext } from '../src/core/progress.js';
import { createSession } from '../src/core/session.js';

const lessons = [
  { id: 'l1', stage: 1, order: 1 },
  { id: 'l2', stage: 1, order: 2 },
  { id: 'l3', stage: 2, order: 1 }
];

const CHECKPOINT_STEPS = ['read', 'listen', 'write', 'speak'];

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

{
  // Checkpoints offer no 'prepare' — status must only cover offered steps,
  // or a finished checkpoint looks permanently unfinished.
  const cp = { id: 'cp1', stage: 1, order: 5, kind: 'checkpoint' };
  const withCp = [...lessons, cp];
  const empty = lessonStatus([], cp);
  assert.equal('prepare' in empty, false, 'checkpoint has no prepare step');
  assert.equal(empty.read, 'todo');

  const readOnly = [{ lessonId: 'cp1', step: 'read', kind: 'read' }];
  const partial = lessonStatus(readOnly, cp);
  assert.equal(partial.read, 'attempted');
  assert.equal(partial.speak, 'todo');
  const finish = suggestNext({ events: readOnly, session: createSession({ storage: memoryStorage() }), lessons: withCp });
  assert.equal(finish.kind, 'finish');
  assert.ok(CHECKPOINT_STEPS.includes(finish.step), 'finish step must be an offered step');
  assert.equal(finish.step, 'listen');

  // All four offered steps attempted → not "finish"; next unstarted lesson wins.
  const done = CHECKPOINT_STEPS.map((step) => ({ lessonId: 'cp1', step, kind: step }));
  const afterCp = suggestNext({ events: done, session: createSession({ storage: memoryStorage() }), lessons: withCp });
  assert.equal(afterCp.kind, 'next');
  assert.equal(afterCp.lessonId, 'l1');
  const stage = stageStatus(done, 1, withCp);
  assert.deepEqual(stage, { total: 3, started: 1, attemptedAll: 1 });

  // An unstarted checkpoint suggests its real first step, not 'prepare'.
  const next = suggestNext({ events: [], session: createSession({ storage: memoryStorage() }), lessons: [cp] });
  assert.equal(next.kind, 'next');
  assert.equal(next.step, 'read');
}

console.log('FlashDay progress: 5 checks passed');
