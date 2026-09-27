// Kết quả buổi học — per-step activity table from the lesson's own events.
import { computeStreak, stepsForLesson } from '../../core/progress.js';
import { dueTasks } from '../../core/scheduler.js';
import { lessonById, nextLesson } from '../../content/a1/index.js';
import { playFeedback } from '../sound.js';

const STEP_LABELS = {
  prepare: 'Hiểu mẫu',
  read: 'Đọc',
  listen: 'Nghe',
  write: 'Viết',
  speak: 'Nói'
};

const SUPPORT_LABELS = {
  translationViewed: 'có xem nghĩa',
  transcriptViewed: 'có xem lời',
  modelRevealed: 'có xem mẫu'
};

export function mount(root, ctx) {
  const lesson = lessonById(ctx.params?.lessonId);
  const db = ctx.store.getState();
  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Kết quả buổi học';
  section.appendChild(h1);

  if (!lesson) {
    section.appendChild(el('p', 'Không tìm thấy bài.'));
    root.appendChild(section);
    return;
  }
  section.appendChild(el('h2', lesson.title));

  const events = db.lessonEvents.filter((event) => event.lessonId === lesson.id);
  const steps = stepsForLesson(lesson);

  // Celebration (Duolingo lesson-complete screen): every step done → a real
  // reward moment, not just a data table. Numbers are activity facts.
  const allDone = steps.every((step) => events.some((e) => e.step === step));
  if (allDone) {
    const banner = document.createElement('div');
    banner.className = 'celebration-banner';
    banner.dataset.role = 'celebration';
    const quizSteps = steps.filter((s) => s !== 'write' && s !== 'speak');
    const correctTotal = quizSteps.reduce((sum, step) => {
      const best = Math.max(
        0,
        ...events.filter((e) => e.step === step).map((e) => Number(e.payload?.correct) || 0)
      );
      return sum + best;
    }, 0);
    const streak = computeStreak(db);
    banner.appendChild(el('p', '🎉 Xong bài!', 'celebration-title'));
    banner.appendChild(
      el(
        'p',
        `${steps.length}/${steps.length} bước · ${correctTotal} câu đúng` +
          (streak > 0 ? ` · 🔥 ${streak} ngày liên tiếp` : ''),
        'celebration-detail'
      )
    );
    section.appendChild(banner);
    // Arrival jingle — plays only if the browser allows audio by now (the
    // last step's submit click is the gesture that unlocks it).
    playFeedback('complete');
  }

  const table = document.createElement('ul');
  table.className = 'summary-steps';
  const todoSteps = [];
  for (const step of steps) {
    const stepEvents = events.filter((event) => event.step === step);
    const li = document.createElement('li');
    if (!stepEvents.length) {
      todoSteps.push(step);
      const link = document.createElement('a');
      link.href = `#/lesson/${lesson.id}/${step}`;
      link.textContent = `${STEP_LABELS[step]} — Chưa làm`;
      li.appendChild(link);
    } else {
      li.appendChild(el('span', `${STEP_LABELS[step]} — `, 'summary-label'));
      if (step === 'write' || step === 'speak') {
        li.appendChild(el('span', `Đã lưu ${stepEvents.length} lần thử · tự đối chiếu`));
      } else {
        const best = Math.max(...stepEvents.map((e) => Number(e.payload?.correct) || 0));
        const latest = stepEvents[stepEvents.length - 1];
        const latestTxt = `lần thử ${latest.payload?.correct}/${latest.payload?.total} đúng`;
        li.appendChild(el('span',
          stepEvents.length > 1 ? `${latestTxt}, tốt nhất ${best}/${latest.payload?.total}` : `${latestTxt}`));
      }
      const support = supportText(stepEvents[stepEvents.length - 1]);
      if (support) li.appendChild(el('span', ` · ${support}`, 'view-placeholder'));
    }
    table.appendChild(li);
  }
  section.appendChild(table);

  // Enrolled retrieval tasks for this lesson (one card per ability × chunk)
  const enrolled = Object.keys(db.fsrs || {}).filter((key) => key.startsWith(`${lesson.id}:`)).length;
  const enrolledLine = document.createElement('p');
  enrolledLine.className = 'view-placeholder';
  enrolledLine.textContent = enrolled
    ? `Thẻ ôn đã tạo: ${enrolled} (mỗi cụm luyện nhiều kỹ năng)`
    : `Thẻ ôn đã tạo: chưa có — nộp phần ${STEP_LABELS[steps[0]]} để thêm`;
  section.appendChild(enrolledLine);

  // Next action
  const due = dueTasks(db, Date.now()).length;
  const nav = document.createElement('div');
  nav.className = 'runner-nav';
  const action = document.createElement('a');
  action.className = 'btn-primary';
  if (todoSteps.length) {
    action.href = `#/lesson/${lesson.id}/${todoSteps[0]}`;
    action.textContent = `Làm phần ${STEP_LABELS[todoSteps[0]]}`;
  } else if (due > 0) {
    action.href = '#/review';
    action.textContent = `Ôn ${due} thẻ đến hạn`;
  } else {
    const next = nextLesson(lesson.id);
    action.href = next ? `#/lesson/${next.id}/${stepsForLesson(next)[0]}` : '#/path';
    action.textContent = next ? `Bài tiếp theo: ${next.title}` : 'Về lộ trình';
  }
  const home = document.createElement('a');
  home.className = 'btn-secondary';
  home.href = '#/today';
  home.textContent = 'Về Hôm nay';
  nav.append(action, home);
  section.appendChild(nav);

  section.appendChild(el('p', 'Số liệu là hoạt động đã làm, không phải đánh giá trình độ.', 'view-placeholder caveat'));
  root.appendChild(section);
}

function supportText(event) {
  const flags = event?.support || {};
  const parts = Object.entries(SUPPORT_LABELS)
    .filter(([key]) => flags[key])
    .map(([, label]) => label);
  return parts.join(' · ');
}

function el(tag, content, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

export function unmount() {}
