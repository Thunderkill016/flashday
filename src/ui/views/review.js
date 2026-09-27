// Ôn — FSRS review over retrieval tasks (A1-ARCH-001). Each card is one
// ability of a chunk, not the chunk itself: the front changes with the
// task kind (see / hear → understand vs recall the form vs produce it).
// Grades feed rateTask and land in the append-only reviewLog. "Nhớ" is a
// schedule state for THAT task, never a chunk-level mastery claim.
import { LESSONS } from '../../content/a1/index.js';
import { dueTasks, nextDueAt, rateTask, taskForKey } from '../../core/scheduler.js';
import { LEGACY_TASK_KIND, TASK_KIND_LABELS } from '../../core/domain.js';
import { playButton, matchSpeech } from '../speech.js';

const GRADES = [
  { grade: 1, label: 'Quên', key: '1' },
  { grade: 2, label: 'Khó', key: '2' },
  { grade: 3, label: 'Nhớ', key: '3' },
  { grade: 4, label: 'Dễ', key: '4' }
];

let state = null;
let keyHandler = null;

export function mount(root, ctx) {
  state = { ctx, queue: dueTasks(ctx.store.getState(), Date.now()), index: 0, total: 0, grades: [] };
  state.total = state.queue.length;

  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Ôn tập';
  section.appendChild(h1);
  section.appendChild(el('p', 'Lịch ôn theo FSRS, theo từng kỹ năng — trạng thái nhớ, không phải đánh giá thành thạo.', 'view-placeholder'));
  const host = document.createElement('div');
  host.dataset.role = 'review-host';
  section.appendChild(host);
  root.appendChild(section);

  keyHandler = (event) => {
    if (event.target.closest('textarea, input')) return;
    if (event.key === 'Enter') host.querySelector('[data-role="reveal"]:not([hidden])')?.click();
    const grade = GRADES.find((g) => g.key === event.key);
    if (grade) host.querySelector(`[data-grade="${grade.grade}"]:not([disabled])`)?.click();
  };
  window.addEventListener('keydown', keyHandler);

  if (state.queue.length) {
    renderCard(host);
  } else {
    renderEmpty(host);
  }
}

export function unmount() {
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  keyHandler = null;
  state = null;
}

// The card front changes with the ability under test — a listening card
// never shows the text, a recognition card never pretends to be production.
function renderFront(card, chunk, taskKind) {
  if (taskKind === 'listening_recognition') {
    card.appendChild(el('p', 'Nghe — hiểu được gì?', 'review-meaning'));
    const row = document.createElement('p');
    row.className = 'review-target';
    row.appendChild(playButton(chunk.target));
    card.appendChild(row);
    return;
  }
  if (taskKind === 'form_recognition') {
    card.appendChild(el('p', 'Nghĩa của cụm này?', 'review-meaning'));
    const row = document.createElement('p');
    row.className = 'review-front-en';
    row.append(chunk.target, ' ', playButton(chunk.target));
    card.appendChild(row);
    return;
  }
  // meaning_recall & cued_production: Vietnamese cue → produce English.
  card.appendChild(el('p', chunk.meaning, 'review-meaning'));
  if (taskKind === 'cued_production' && chunk.exampleVi) {
    card.appendChild(el('p', `Bối cảnh: ${chunk.exampleVi}`, 'view-placeholder'));
  } else if (chunk.exampleVi) {
    card.appendChild(el('p', chunk.exampleVi, 'view-placeholder'));
  }
}

function placeholderFor(taskKind) {
  if (taskKind === 'form_recognition' || taskKind === 'listening_recognition') {
    return 'Gõ nghĩa/lời nghe được (không bắt buộc)';
  }
  return 'Gõ hoặc nói rồi gõ lại';
}

// What the reveal shows depends on what was asked: recall/production reveal
// the English target; recognition reveals the meaning it asked about.
function renderBack(chunk, taskKind) {
  const back = document.createElement('div');
  back.className = 'review-back';
  back.hidden = true;
  if (taskKind === 'form_recognition') {
    back.appendChild(el('p', chunk.meaning, 'review-target'));
    if (chunk.exampleVi) back.appendChild(el('p', chunk.exampleVi, 'view-placeholder'));
    const en = el('p', '', 'view-placeholder');
    en.append(chunk.target, ' ', playButton(chunk.target));
    back.appendChild(en);
    return back;
  }
  const targetRow = document.createElement('p');
  targetRow.className = 'review-target';
  targetRow.append(chunk.target, ' ', playButton(chunk.target));
  back.appendChild(targetRow);
  if (taskKind === 'listening_recognition' && chunk.meaning) {
    back.appendChild(el('p', chunk.meaning, 'view-placeholder'));
  }
  if (chunk.example) back.appendChild(el('p', chunk.example, 'view-placeholder'));
  return back;
}

function renderCard(host) {
  host.textContent = '';
  const { ctx } = state;

  if (state.index >= state.queue.length) {
    // Session recap (Anki/Babbel pattern): per-grade counts from the grades
    // just given — activity facts, same honesty rule as everything else.
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const g of state.grades) counts[g]++;
    const parts = GRADES.filter(({ grade }) => counts[grade]).map(
      ({ grade, label }) => `${label} ${counts[grade]}`
    );
    const recap = el('p', `Xong buổi ôn — ${state.total} thẻ${parts.length ? `: ${parts.join(' · ')}` : ''}.`);
    recap.dataset.role = 'review-recap';
    host.appendChild(recap);
    const done = document.createElement('a');
    done.className = 'btn-primary';
    done.href = '#/today';
    done.textContent = 'Về Hôm nay';
    host.appendChild(done);
    return;
  }

  const entry = state.queue[state.index];
  const resolved = taskForKey(entry.key, LESSONS);

  const counter = el('p', `${state.index + 1}/${state.total}`, 'review-counter');
  const card = document.createElement('div');
  card.className = 'card review-card';

  if (!resolved) {
    card.appendChild(el('p', 'Thẻ này thuộc bài đã đổi — bỏ qua.'));
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'btn-secondary';
    skip.textContent = 'Bỏ qua';
    skip.addEventListener('click', () => { state.index++; renderCard(host); });
    card.appendChild(skip);
    host.append(counter, card);
    return;
  }

  const { chunk, taskKind } = resolved;
  const badge = el('span', TASK_KIND_LABELS[taskKind] || taskKind, 'task-badge');
  badge.dataset.taskKind = taskKind;
  card.appendChild(badge);
  renderFront(card, chunk, taskKind);

  const answer = document.createElement('textarea');
  answer.className = 'write-area';
  answer.rows = 2;
  answer.placeholder = placeholderFor(taskKind);

  const revealBtn = document.createElement('button');
  revealBtn.type = 'button';
  revealBtn.className = 'btn-primary';
  revealBtn.dataset.role = 'reveal';
  revealBtn.textContent = 'Xem đáp án';

  const back = renderBack(chunk, taskKind);

  const gradeRow = document.createElement('div');
  gradeRow.className = 'grade-row';
  for (const { grade, label, key } of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-secondary grade-btn';
    btn.dataset.grade = String(grade);
    btn.textContent = `${label} (${key})`;
    btn.addEventListener('click', () => {
      ctx.store.transact((db) => {
        rateTask(db, entry.key, grade, Date.now());
        if (!Array.isArray(db.reviewLog)) db.reviewLog = [];
        const logEntry = {
          id: crypto.randomUUID?.() || `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
          kind: 'rate',
          taskKey: entry.key,
          grade,
          response: answer.value,
          at: Date.now()
        };
        // `chunkKey` stays only on meaning_recall — the honest nearest match
        // to the legacy card — so a not-yet-updated client replays exactly
        // its old semantics and never gets cross-skill credit (ADR).
        if (taskKind === LEGACY_TASK_KIND) logEntry.chunkKey = `${resolved.lesson.id}:${resolved.chunk.id}`;
        db.reviewLog.push(logEntry);
      });
      state.grades.push(grade);
      state.index++;
      renderCard(host);
    });
    gradeRow.appendChild(btn);
  }
  back.appendChild(gradeRow);

  revealBtn.addEventListener('click', () => {
    back.hidden = false;
    revealBtn.hidden = true;
    // Production recall assist: a typed attempt gets scored against the
    // target and one grade lights up — the learner still self-marks, but
    // with evidence instead of vibes (testing-effect research).
    if (answer.value.trim()) {
      // What "correct" means depends on the ability under test: a
      // recognition card asked for the meaning; everything else asked for
      // the English form.
      const expected = taskKind === 'form_recognition' ? chunk.meaning : chunk.target;
      const matches = matchSpeech(expected, answer.value);
      const suggested = matches.score >= 0.9 ? 3 : matches.score >= 0.5 ? 2 : 1;
      const suggestion = el(
        'p',
        `Bạn gõ khớp ${Math.round(matches.score * 100)}% — gợi ý chấm: ${GRADES[suggested - 1].label}`,
        'review-suggestion'
      );
      back.insertBefore(suggestion, gradeRow);
      gradeRow
        .querySelector(`[data-grade="${suggested}"]`)
        ?.classList.add('suggested');
    }
  });

  card.append(answer, revealBtn, back);
  host.append(counter, card);
}

function renderEmpty(host) {
  const next = nextDueAt(state.ctx.store.getState());
  host.appendChild(el('p', 'Chưa có thẻ đến hạn'));
  if (next) {
    host.appendChild(el('p', `Sớm nhất: ${new Date(next).toLocaleString('vi-VN')}`, 'view-placeholder'));
  } else {
    const link = document.createElement('a');
    link.href = '#/today';
    link.textContent = 'Về Hôm nay';
    host.appendChild(link);
  }
}

function el(tag, content, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}
