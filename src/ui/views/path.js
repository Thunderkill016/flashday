// Lộ trình — 6 stages as <details>, per-lesson icon + step progress.
// Visual progress is the product surface Duolingo's path is built around:
// the learner must see where they are in 30 lessons at a glance.
import { STAGES, lessonsForStage } from '../../content/a1/index.js';
import { lessonStatus, stepsForLesson as lessonSteps } from '../../core/progress.js';
import { lessonIcon } from '../icons.js';

function doneSteps(events, lesson) {
  const status = lessonStatus(events, lesson);
  return lessonSteps(lesson).filter((s) => status[s] === 'attempted').length;
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
    const summaryText = document.createElement('span');
    summaryText.textContent = `Chặng ${stage.id} · ${stage.title}`;
    summary.appendChild(summaryText);
    details.appendChild(summary);

    // Stage progress: lessons fully attempted / total — visible even while
    // collapsed so the journey reads at a glance.
    if (lessons.length) {
      const done = lessons.filter(
        (l) => statusOf(events, l) === 'Đã thử các phần'
      ).length;
      const stageProgress = document.createElement('div');
      stageProgress.className = 'path-stage-progress';
      const bar = document.createElement('div');
      bar.className = 'path-bar';
      const fill = document.createElement('i');
      fill.style.width = `${Math.round((done / lessons.length) * 100)}%`;
      bar.appendChild(fill);
      stageProgress.append(bar, Object.assign(document.createElement('span'), {
        textContent: `${done}/${lessons.length} bài`
      }));
      details.appendChild(stageProgress);
    }

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
        const steps = lessonSteps(lesson);
        const done = doneSteps(events, lesson);
        const li = document.createElement('li');

        const row = document.createElement('div');
        row.className = 'path-lesson-row';
        const icon = document.createElement('span');
        icon.className = 'path-lesson-icon';
        icon.textContent = lessonIcon(lesson);
        const link = document.createElement('a');
        link.href = `#/lesson/${lesson.id}/${firstStep(events, lesson)}`;
        link.textContent = `${lesson.order}. ${lesson.title}`;
        const status = document.createElement('span');
        status.className = 'path-status';
        status.textContent =
          statusOf(events, lesson) === 'Chưa bắt đầu'
            ? 'Chưa bắt đầu'
            : `${done}/${steps.length} bước`;
        row.append(icon, link, status);

        const bar = document.createElement('div');
        bar.className = 'path-bar';
        const fill = document.createElement('i');
        fill.style.width = `${Math.round((done / steps.length) * 100)}%`;
        bar.appendChild(fill);

        const canDo = document.createElement('p');
        canDo.className = 'path-cando';
        canDo.textContent = lesson.canDo;
        li.append(row, bar, canDo);
        list.appendChild(li);
      }
      details.appendChild(list);
    }
    section.appendChild(details);
  }

  root.appendChild(section);
}

export function unmount() {}
