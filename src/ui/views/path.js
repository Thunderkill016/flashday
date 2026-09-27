// Lộ trình — stages with per-lesson activity status.
import { STAGES, lessonsForStage } from '../../content/a1/index.js';
import { STEPS, lessonStatus } from '../../core/progress.js';

function statusLabel(status) {
  if (!status.anyAttempt) return 'Chưa bắt đầu';
  return status[STEPS[STEPS.length - 1]] === 'attempted' ||
    STEPS.every((s) => status[s] === 'attempted')
    ? 'Đã thử các phần'
    : 'Đang luyện';
}

export function mount(root, ctx) {
  const events = ctx.store.getState().lessonEvents;
  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Lộ trình';
  section.appendChild(h1);

  for (const stage of STAGES) {
    const lessons = lessonsForStage(stage.id);
    if (!lessons.length) continue;
    const h2 = document.createElement('h2');
    h2.textContent = `Chặng ${stage.id} · ${stage.title}`;
    section.appendChild(h2);
    const blurb = document.createElement('p');
    blurb.className = 'view-placeholder';
    blurb.textContent = stage.blurb;
    section.appendChild(blurb);
    const list = document.createElement('ul');
    list.className = 'path-lessons';
    for (const lesson of lessons) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#/lesson/${lesson.id}/${lesson.kind === 'checkpoint' ? 'read' : 'prepare'}`;
      link.textContent = `${lesson.order}. ${lesson.title}`;
      const status = document.createElement('span');
      status.className = 'path-status';
      status.textContent = statusLabel(lessonStatus(events, lesson));
      li.append(link, status);
      list.appendChild(li);
    }
    section.appendChild(list);
  }

  root.appendChild(section);
}

export function unmount() {}
