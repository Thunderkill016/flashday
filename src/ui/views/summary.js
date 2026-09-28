// Kết quả buổi học — per-step activity table from the lesson's own events.
import { computeStreak, stepsForLesson, STEP_LABELS } from '../../core/progress.js';
import { dueTasks } from '../../core/scheduler.js';
import { LESSONS, lessonById, nextLesson } from '../../content/a1/index.js';
import { playFeedback } from '../sound.js';

const SUPPORT_LABELS = {
  translationViewed: 'có xem nghĩa',
  transcriptViewed: 'có xem lời',
  modelRevealed: 'có xem mẫu',
  hintViewed: 'có dùng gợi ý'
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
  const isMission = lesson.format === 'mission';
  const exitEvents = isMission ? events.filter((e) => e.step === 'exit') : [];
  const lastExit = exitEvents.at(-1);

  // Celebration (Duolingo lesson-complete screen): every step done → a real
  // reward moment, not just a data table. Numbers are activity facts —
  // for missions the headline is the exit attempt's provenance, never a
  // sum of heterogeneous 'correct' counters (issue #33 round 2). A failed
  // mission exit is NOT done — only a passed attempt counts (round 4).
  const stepDone = (step) =>
    events.some(
      (e) => e.step === step && (!isMission || step !== 'exit' || e.payload?.passed === true)
    );
  const allDone = steps.every(stepDone);
  if (allDone) {
    const banner = document.createElement('div');
    banner.className = 'celebration-banner';
    banner.dataset.role = 'celebration';
    const streak = computeStreak(db);
    banner.appendChild(el('p', '🎉 Xong bài!', 'celebration-title'));
    let detail;
    if (isMission) {
      const aidTxt = lastExit?.support?.modelRevealed
        ? 'có xem mẫu'
        : lastExit?.support?.hintViewed
          ? 'có dùng gợi ý'
          : 'không cần hỗ trợ';
      const tries = exitEvents.length;
      detail =
        `${steps.length}/${steps.length} phần · tự làm ${tries} lần thử — ${aidTxt}` +
        (streak > 0 ? ` · 🔥 ${streak} ngày liên tiếp` : '');
    } else {
      const quizSteps = steps.filter((s) => s !== 'write' && s !== 'speak');
      const correctTotal = quizSteps.reduce((sum, step) => {
        const best = Math.max(
          0,
          ...events.filter((e) => e.step === step).map((e) => Number(e.payload?.correct) || 0)
        );
        return sum + best;
      }, 0);
      detail =
        `${steps.length}/${steps.length} bước · ${correctTotal} câu đúng` +
        (streak > 0 ? ` · 🔥 ${streak} ngày liên tiếp` : '');
    }
    banner.appendChild(el('p', detail, 'celebration-detail'));
    section.appendChild(banner);
    // Arrival jingle — plays only if the browser allows audio by now (the
    // last step's submit click is the gesture that unlocks it).
    playFeedback('complete');
  }

  // Mission can-do evidence: what the learner actually did at the exit
  // task — each communicative goal, met or missed, with the attempt's
  // support level. This is the learner-facing proof, not an FSRS count.
  if (isMission && lastExit?.payload?.responses?.length) {
    const card = document.createElement('div');
    card.className = 'summary-mission';
    card.dataset.role = 'mission-result';
    card.appendChild(el('h2', `Nhiệm vụ — ${lesson.mission?.exit?.partner || 'người mới'}`));
    const turns = lesson.mission?.exit?.turns || [];
    const aidTxt = lastExit.support?.modelRevealed
      ? 'sau khi xem mẫu'
      : lastExit.support?.hintViewed
        ? 'sau gợi ý'
        : 'tự làm, không cần hỗ trợ';
    card.appendChild(
      el('p', `Lần thử ${lastExit.payload.attempt ?? exitEvents.length} — ${aidTxt}.`, 'view-placeholder')
    );
    for (const r of lastExit.payload.responses) {
      const turn = turns[r.turn];
      if (!turn) continue;
      const block = document.createElement('div');
      block.className = 'summary-turn';
      block.appendChild(el('p', `${turn.them}`, 'summary-them'));
      block.appendChild(el('p', `Bạn: ${r.response}`, 'summary-response'));
      const list = document.createElement('ul');
      list.className = 'exit-checks';
      for (const check of Array.isArray(turn.checks) ? turn.checks : []) {
        const met = (r.met || []).includes(check.key);
        const item = el('li', `${met ? '✓' : '✗'} ${check.label}${met ? '' : ' — cần luyện thêm'}`);
        item.className = met ? 'check-met' : 'check-missed';
        list.appendChild(item);
      }
      block.appendChild(list);
      card.appendChild(block);
    }
    section.appendChild(card);
  }

  const table = document.createElement('ul');
  table.className = 'summary-steps';
  const todoSteps = [];
  for (const step of steps) {
    const stepEvents = events.filter((event) => event.step === step);
    const li = document.createElement('li');
    // Mission exit with only failed attempts is unfinished work — the
    // step lists as "cần làm lại" and the next action routes back to it.
    const failedOnly =
      isMission && step === 'exit' && stepEvents.length > 0 &&
      !stepEvents.some((e) => e.payload?.passed === true);
    if (!stepEvents.length || failedOnly) {
      todoSteps.push(step);
      const link = document.createElement('a');
      link.href = `#/lesson/${lesson.id}/${step}`;
      link.textContent = failedOnly
        ? `${STEP_LABELS[step]} — Cần làm lại (đã thử ${stepEvents.length} lần)`
        : `${STEP_LABELS[step]} — Chưa làm`;
      li.appendChild(link);
    } else {
      li.appendChild(el('span', `${STEP_LABELS[step]} — `, 'summary-label'));
      const scored = stepEvents.filter(
        (e) => Number.isFinite(Number(e.payload?.correct)) && Number.isFinite(Number(e.payload?.total))
      );
      if (step === 'write' || step === 'speak') {
        li.appendChild(el('span', `Đã lưu ${stepEvents.length} lần thử · tự đối chiếu`));
      } else if (scored.length) {
        const best = Math.max(...scored.map((e) => Number(e.payload.correct)));
        const latest = scored[scored.length - 1];
        const latestTxt = `lần thử ${latest.payload.correct}/${latest.payload.total} đúng`;
        li.appendChild(el('span',
          scored.length > 1 ? `${latestTxt}, tốt nhất ${best}/${latest.payload.total}` : latestTxt));
      } else {
        li.appendChild(el('span', `Đã xong ${stepEvents.length > 1 ? `${stepEvents.length} lần` : ''}`));
      }
      const support = supportText(stepEvents[stepEvents.length - 1]);
      if (support) li.appendChild(el('span', ` · ${support}`, 'view-placeholder'));
    }
    table.appendChild(li);
  }
  section.appendChild(table);

  // Enrolled retrieval tasks for this lesson (one card per ability × chunk).
  // Kept muted — it's scheduling info, not a mastery metric.
  const enrolled = Object.keys(db.fsrs || {}).filter((key) => key.startsWith(`${lesson.id}:`)).length;
  const enrolledLine = document.createElement('p');
  enrolledLine.className = 'view-placeholder';
  enrolledLine.textContent = enrolled
    ? `Thẻ ôn từ phần đã luyện: ${enrolled}`
    : `Thẻ ôn đã tạo: chưa có — nộp phần ${STEP_LABELS[steps[0]]} để thêm`;
  section.appendChild(enrolledLine);

  // Next action
  const due = dueTasks(db, Date.now(), LESSONS).length;
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
