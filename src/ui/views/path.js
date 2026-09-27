// Lộ trình — 6 stages as <details>, per-lesson activity status.
import { STAGES, lessonsForStage } from '../../content/a1/index.js';
import { STEPS, lessonStatus } from '../../core/progress.js';

function lessonSteps(lesson) {
  return lesson.kind === 'checkpoint' ? STEPS.slice(1) : STEPS;
}

function statusOf(events, lesson) {
  const status = lessonStatus(events, lesson);
  if (!status.anyAttempt) return 'Chưa bắt đầu';
  return lessonSteps(lesson).every((s) => status[s] === 'attempted')
    ? 'Đã thử các phần'
    : 'Đang luyện';
}

function firstStep(events, lesson) {
  const status = lessonStatus(events, lesson);
  const steps = lessonSteps(lesson);
  return steps.find((s) => status[s] === 'todo') || steps[0];
}

export function mount(root, ctx) {
  const events = ctx.store.getState().lessonEvents;
  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Lộ trình';
  section.appendChild(h1);

  // Current stage = first stage containing an unstarted or in-progress lesson.
  const currentStageId = STAGES.find((stage) =>
    lessonsForStage(stage.id).some(
      (lesson) => statusOf(events, lesson) !== 'Đã thử các phần'
    )
  )?.id;

  for (const stage of STAGES) {
    const lessons = lessonsForStage(stage.id);
    const details = document.createElement('details');
    details.className = 'path-stage';
    if (stage.id === currentStageId) details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = `Chặng ${stage.id} · ${stage.title}`;
    details.appendChild(summary);
    details.appendChild(Object.assign(document.createElement('p'), {
      className: 'view-placeholder',
      textContent: stage.blurb
    }));

    if (!lessons.length) {
      const empty = document.createElement('p');
      empty.className = 'path-empty';
      empty.textContent = 'Sắp có';
      details.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'path-lessons';
      for (const lesson of lessons) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#/lesson/${lesson.id}/${firstStep(events, lesson)}`;
        link.textContent = `${lesson.order}. ${lesson.title}`;
        const status = document.createElement('span');
        status.className = 'path-status';
        status.textContent = statusOf(events, lesson);
        const canDo = document.createElement('p');
        canDo.className = 'path-cando';
        canDo.textContent = lesson.canDo;
        li.append(link, status, canDo);
        list.appendChild(li);
      }
      details.appendChild(list);
    }
    section.appendChild(details);
  }

  root.appendChild(section);
}

export function unmount() {}
