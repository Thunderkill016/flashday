// Hôm nay — the next thing to do, from real progress (Phase 3 will flesh out).
import { LESSONS, lessonById } from '../../content/a1/index.js';
import { suggestNext } from '../../core/progress.js';

const NEXT_LABEL = {
  resume: 'Tiếp tục bài đang học',
  finish: 'Hoàn thành bài đang học',
  next: 'Bài tiếp theo',
  done: 'Đã thử hết các bài'
};

export function mount(root, ctx) {
  const events = ctx.store.getState().lessonEvents;
  const suggestion = suggestNext({ events, session: ctx.session, lessons: LESSONS });
  const lesson = suggestion.lessonId ? lessonById(suggestion.lessonId) : null;

  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Hôm nay';
  section.appendChild(h1);

  const card = document.createElement('div');
  card.className = 'card';
  if (suggestion.kind === 'done' || !lesson) {
    const p = document.createElement('p');
    p.textContent = 'Bạn đã thử hết các bài trong lộ trình hiện có.';
    card.appendChild(p);
  } else {
    const kicker = document.createElement('p');
    kicker.className = 'view-placeholder';
    kicker.textContent = NEXT_LABEL[suggestion.kind];
    const title = document.createElement('h2');
    title.textContent = lesson.title;
    const cando = document.createElement('p');
    cando.textContent = lesson.canDo;
    const go = document.createElement('a');
    go.className = 'btn-primary';
    go.href = `#/lesson/${lesson.id}/${suggestion.step || 'prepare'}`;
    go.textContent = suggestion.kind === 'next' ? 'Bắt đầu' : 'Tiếp tục';
    card.append(kicker, title, cando, go);
  }
  section.appendChild(card);

  const pathLink = document.createElement('a');
  pathLink.href = '#/path';
  pathLink.textContent = 'Xem lộ trình';
  section.appendChild(pathLink);

  root.appendChild(section);
}

export function unmount() {}
