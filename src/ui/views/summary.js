// Kết quả buổi học — per-step status from the lesson's own events.
import { STEPS, lessonStatus } from '../../core/progress.js';
import { lessonById, nextLesson } from '../../content/a1/index.js';

const STEP_LABELS = {
  prepare: 'Hiểu mẫu',
  read: 'Đọc',
  listen: 'Nghe',
  write: 'Viết',
  speak: 'Nói'
};

export function mount(root, ctx) {
  const lesson = lessonById(ctx.params?.lessonId);
  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Kết quả buổi học';
  section.appendChild(h1);

  if (!lesson) {
    const p = document.createElement('p');
    p.textContent = 'Không tìm thấy bài.';
    section.appendChild(p);
  } else {
    const title = document.createElement('h2');
    title.textContent = lesson.title;
    section.appendChild(title);

    const events = ctx.store.getState().lessonEvents.filter(
      (event) => event.lessonId === lesson.id
    );
    const status = lessonStatus(events, lesson);
    const steps = lesson.kind === 'checkpoint' ? STEPS.slice(1) : STEPS;
    const list = document.createElement('ul');
    list.className = 'summary-steps';
    for (const step of steps) {
      const li = document.createElement('li');
      const latest = [...events].reverse().find((event) => event.step === step);
      let detail = 'Chưa làm';
      if (latest) {
        detail = latest.payload?.total != null
          ? `Đúng ${latest.payload.correct}/${latest.payload.total}`
          : 'Đã lưu lần thử';
      } else if (status[step] === 'attempted') {
        detail = 'Đã thử';
      }
      li.textContent = `${STEP_LABELS[step]} — ${detail}`;
      list.appendChild(li);
    }
    section.appendChild(list);

    const nav = document.createElement('div');
    nav.className = 'runner-nav';
    const next = nextLesson(lesson.id);
    if (next) {
      const nextLink = document.createElement('a');
      nextLink.className = 'btn-primary';
      nextLink.href = `#/lesson/${next.id}/prepare`;
      nextLink.textContent = 'Bài tiếp theo';
      nav.appendChild(nextLink);
    }
    const home = document.createElement('a');
    home.className = 'btn-secondary';
    home.href = '#/today';
    home.textContent = 'Về Hôm nay';
    nav.appendChild(home);
    section.appendChild(nav);
  }

  root.appendChild(section);
}

export function unmount() {}
