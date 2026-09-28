// Hôm nay — the next thing to do, review due count, current stage.
// Streak shows activity facts only (consecutive days with work) — still no
// XP or proficiency claims.
import { LESSONS, STAGES, lessonById } from '../../content/a1/index.js';
import { STEPS, STEP_LABELS, computeStreak, lessonStatus, stageStatus, stepsForLesson } from '../../core/progress.js';
import { planNext } from '../../core/planner.js';
import { lessonIcon } from '../icons.js';
import { reviewQueue } from '../../core/scheduler.js';

function draftHasContent(draft) {
  if (!draft) return false;
  const answers = draft.answers || {};
  if (Object.values(answers).some((s) => s && Object.keys(s).length)) return true;
  if (Object.keys(draft.write || {}).length > 0 || Object.keys(draft.speak || {}).length > 0) return true;
  // Mission drafts hold their in-flight work under `mission`.
  return draft.mission && typeof draft.mission === 'object' && Object.keys(draft.mission).length > 0;
}

export function mount(root, ctx) {
  const db = ctx.store.getState();
  const events = db.lessonEvents;
  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Hôm nay';
  const streak = computeStreak(db);
  if (streak > 0) {
    const chip = document.createElement('span');
    chip.className = 'streak-chip';
    chip.dataset.role = 'streak';
    chip.textContent = `🔥 ${streak} ngày liên tiếp`;
    h1.appendChild(chip);
  }
  section.appendChild(h1);

  // Card 1: next action — deterministic planner (resume → due → remediate →
  // finish → next). Never AI-chosen.
  const suggestion = planNext({ db, session: ctx.session, lessons: LESSONS });
  const lesson = suggestion.lessonId ? lessonById(suggestion.lessonId) : null;
  const card = document.createElement('div');
  card.className = 'card';
  if (suggestion.kind === 'review') {
    card.appendChild(el('p', `Ôn trước: ${suggestion.dueCount} thẻ đến hạn`, 'view-placeholder'));
    card.appendChild(el('p', 'Trí nhớ đến hạn trước — học mới sau.'));
    const go = document.createElement('a');
    go.className = 'btn-primary';
    go.href = '#/review';
    go.textContent = 'Ôn ngay';
    card.appendChild(go);
  } else if (suggestion.kind === 'done' || !lesson) {
    card.appendChild(el('p', 'Bạn đã thử tất cả các bài — chọn ôn hoặc xem lại lộ trình.'));
  } else {
    let label;
    if (suggestion.kind === 'resume') {
      label = `Tiếp tục: ${lesson.title} — bạn đang ở bước ${stepLabel(suggestion.step)}`;
    } else if (suggestion.kind === 'remediate') {
      label = `Luyện lại: ${lesson.title} — bước ${stepLabel(suggestion.step)} còn điểm yếu`;
    } else if (suggestion.kind === 'finish') {
      const status = lessonStatus(events, lesson);
      const todo = stepsForLesson(lesson).filter((s) => status[s] === 'todo').length;
      label = `Hoàn thành: ${lesson.title} — còn ${todo} bước`;
    } else {
      label = `Bắt đầu: ${lesson.title}`;
    }
    card.appendChild(el('p', `${lessonIcon(lesson)} ${label}`, 'view-placeholder'));
    const draft = ctx.session.getDraft(lesson.id);
    if (suggestion.kind === 'resume' && draftHasContent(draft)) {
      card.appendChild(el('p', 'Bản nháp lưu trên thiết bị', 'draft-note'));
    }
    card.appendChild(el('p', lesson.canDo));
    const go = document.createElement('a');
    go.className = 'btn-primary';
    go.href = `#/lesson/${lesson.id}/${suggestion.step || stepsForLesson(lesson)[0]}`;
    go.textContent = suggestion.kind === 'next' ? 'Bắt đầu' : suggestion.kind === 'remediate' ? 'Luyện lại' : 'Tiếp tục';
    card.appendChild(go);
  }
  section.appendChild(card);

  // Card 2: review state — scheduled-due work (memory already exercised)
  // plus pending new-task introductions, counted separately so a fresh
  // lesson never masquerades as overdue review.
  const queue = reviewQueue(db, LESSONS, Date.now());
  const due = queue.due.length;
  const reviewCard = document.createElement('div');
  reviewCard.className = 'card';
  reviewCard.appendChild(el('h2', 'Ôn đến hạn'));
  reviewCard.appendChild(el('p', due > 0 ? `${due} thẻ đến hạn` : 'Chưa có thẻ đến hạn'));
  if (queue.freshPending > 0) {
    reviewCard.appendChild(el('p', `+ ${queue.freshPending} thẻ mới chờ làm quen`, 'view-placeholder'));
  }
  if (due > 0 || queue.freshPending > 0) {
    const go = document.createElement('a');
    go.className = 'btn-primary';
    go.href = '#/review';
    go.textContent = 'Ôn ngay';
    reviewCard.appendChild(go);
  }
  section.appendChild(reviewCard);

  // Card 3: current stage strip
  const current = LESSONS.find((l) => !lessonStatus(events, l)[STEPS[STEPS.length - 1]] ||
    stepsForLesson(l).some((s) => lessonStatus(events, l)[s] === 'todo'));
  const stageCard = document.createElement('div');
  stageCard.className = 'card';
  const stage = current ? STAGES.find((s) => s.id === current.stage) : STAGES[STAGES.length - 1];
  const stats = stageStatus(events, stage.id, LESSONS);
  stageCard.appendChild(el('h2', `Chặng ${stage.id} · ${stage.title}`));
  stageCard.appendChild(el('p', `${stats.started}/${stats.total} bài đã bắt đầu`));
  const stageBar = document.createElement('div');
  stageBar.className = 'path-bar';
  const stageFill = document.createElement('i');
  stageFill.style.width = `${Math.round((stats.started / Math.max(1, stats.total)) * 100)}%`;
  stageBar.appendChild(stageFill);
  stageCard.appendChild(stageBar);
  const pathLink = document.createElement('a');
  pathLink.href = '#/path';
  pathLink.textContent = 'Xem lộ trình';
  stageCard.appendChild(pathLink);
  section.appendChild(stageCard);

  root.appendChild(section);
}

function stepLabel(step) {
  return STEP_LABELS[step] || step;
}

function el(tag, content, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

export function unmount() {}
