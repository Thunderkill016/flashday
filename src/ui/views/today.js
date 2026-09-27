// Hôm nay — the next thing to do, review due count, current stage.
// Activity-only labels: no streaks, XP, or level claims.
import { LESSONS, STAGES, lessonById } from '../../content/a1/index.js';
import { STEPS, lessonStatus, stageStatus, suggestNext } from '../../core/progress.js';
import { dueChunks } from '../../core/scheduler.js';

function draftHasContent(draft) {
  if (!draft) return false;
  const answers = draft.answers || {};
  if (Object.values(answers).some((s) => s && Object.keys(s).length)) return true;
  return Object.keys(draft.write || {}).length > 0 || Object.keys(draft.speak || {}).length > 0;
}

export function mount(root, ctx) {
  const db = ctx.store.getState();
  const events = db.lessonEvents;
  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Hôm nay';
  section.appendChild(h1);

  // Card 1: next action
  const suggestion = suggestNext({ events, session: ctx.session, lessons: LESSONS });
  const lesson = suggestion.lessonId ? lessonById(suggestion.lessonId) : null;
  const card = document.createElement('div');
  card.className = 'card';
  if (suggestion.kind === 'done' || !lesson) {
    card.appendChild(el('p', 'Bạn đã thử tất cả các bài — chọn ôn hoặc xem lại lộ trình.'));
  } else {
    let label;
    if (suggestion.kind === 'resume') {
      label = `Tiếp tục: ${lesson.title} — bạn đang ở bước ${stepLabel(suggestion.step)}`;
    } else if (suggestion.kind === 'finish') {
      const status = lessonStatus(events, lesson);
      const todo = STEPS.filter((s) => status[s] === 'todo').length;
      label = `Hoàn thành: ${lesson.title} — còn ${todo} bước`;
    } else {
      label = `Bắt đầu: ${lesson.title}`;
    }
    card.appendChild(el('p', label, 'view-placeholder'));
    const draft = ctx.session.getDraft(lesson.id);
    if (suggestion.kind === 'resume' && draftHasContent(draft)) {
      card.appendChild(el('p', 'Bản nháp lưu trên thiết bị', 'draft-note'));
    }
    card.appendChild(el('p', lesson.canDo));
    const go = document.createElement('a');
    go.className = 'btn-primary';
    go.href = `#/lesson/${lesson.id}/${suggestion.step || 'prepare'}`;
    go.textContent = suggestion.kind === 'next' ? 'Bắt đầu' : 'Tiếp tục';
    card.appendChild(go);
  }
  section.appendChild(card);

  // Card 2: due review — real scheduler numbers only
  const due = dueChunks(db, Date.now()).length;
  const reviewCard = document.createElement('div');
  reviewCard.className = 'card';
  reviewCard.appendChild(el('h2', 'Ôn đến hạn'));
  reviewCard.appendChild(el('p', due > 0 ? `${due} cụm đến hạn` : 'Chưa có thẻ đến hạn'));
  if (due > 0) {
    const go = document.createElement('a');
    go.className = 'btn-primary';
    go.href = '#/review';
    go.textContent = 'Ôn ngay';
    reviewCard.appendChild(go);
  }
  section.appendChild(reviewCard);

  // Card 3: current stage strip
  const current = LESSONS.find((l) => !lessonStatus(events, l)[STEPS[STEPS.length - 1]] ||
    STEPS.some((s) => lessonStatus(events, l)[s] === 'todo'));
  const stageCard = document.createElement('div');
  stageCard.className = 'card';
  const stage = current ? STAGES.find((s) => s.id === current.stage) : STAGES[STAGES.length - 1];
  const stats = stageStatus(events, stage.id, LESSONS);
  stageCard.appendChild(el('h2', `Chặng ${stage.id} · ${stage.title}`));
  stageCard.appendChild(el('p', `${stats.started}/${stats.total} bài đã bắt đầu`));
  const pathLink = document.createElement('a');
  pathLink.href = '#/path';
  pathLink.textContent = 'Xem lộ trình';
  stageCard.appendChild(pathLink);
  section.appendChild(stageCard);

  root.appendChild(section);
}

function stepLabel(step) {
  return { prepare: 'Hiểu mẫu', read: 'Đọc', listen: 'Nghe', write: 'Viết', speak: 'Nói' }[step] || step;
}

function el(tag, content, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

export function unmount() {}
