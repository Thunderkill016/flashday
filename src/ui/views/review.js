// Ôn — FSRS review over enrolled chunks. Front = VI meaning + exampleVi;
// learner recalls English (typed/said, self-graded). Grades feed rateChunk
// and land in the append-only reviewLog. "Nhớ" is a schedule state, never
// a mastery claim.
import { LESSONS } from '../../content/a1/index.js';
import { chunkForKey, dueChunks, nextDueAt, rateChunk } from '../../core/scheduler.js';
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
  state = { ctx, queue: dueChunks(ctx.store.getState(), Date.now()), index: 0, total: 0 };
  state.total = state.queue.length;

  const section = document.createElement('section');
  section.className = 'view-section';
  const h1 = document.createElement('h1');
  h1.textContent = 'Ôn tập';
  section.appendChild(h1);
  section.appendChild(el('p', 'Lịch ôn theo FSRS — trạng thái nhớ, không phải đánh giá thành thạo.', 'view-placeholder'));
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

function renderCard(host) {
  host.textContent = '';
  const { ctx } = state;

  if (state.index >= state.queue.length) {
    host.appendChild(el('p', `Xong buổi ôn — ${state.total} cụm.`));
    const done = document.createElement('a');
    done.className = 'btn-primary';
    done.href = '#/today';
    done.textContent = 'Về Hôm nay';
    host.appendChild(done);
    return;
  }

  const entry = state.queue[state.index];
  const resolved = chunkForKey(entry.key, LESSONS);

  const counter = el('p', `${state.index + 1}/${state.total}`, 'review-counter');
  const card = document.createElement('div');
  card.className = 'card review-card';

  if (!resolved) {
    card.appendChild(el('p', 'Cụm này thuộc bài đã đổi — bỏ qua.'));
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'btn-secondary';
    skip.textContent = 'Bỏ qua';
    skip.addEventListener('click', () => { state.index++; renderCard(host); });
    card.appendChild(skip);
    host.append(counter, card);
    return;
  }

  const { chunk } = resolved;
  card.appendChild(el('p', chunk.meaning, 'review-meaning'));
  if (chunk.exampleVi) card.appendChild(el('p', chunk.exampleVi, 'view-placeholder'));

  const answer = document.createElement('textarea');
  answer.className = 'write-area';
  answer.rows = 2;
  answer.placeholder = 'Gõ hoặc nói rồi gõ lại';

  const revealBtn = document.createElement('button');
  revealBtn.type = 'button';
  revealBtn.className = 'btn-primary';
  revealBtn.dataset.role = 'reveal';
  revealBtn.textContent = 'Xem đáp án';

  const back = document.createElement('div');
  back.className = 'review-back';
  back.hidden = true;
  const targetRow = document.createElement('p');
  targetRow.className = 'review-target';
  targetRow.append(chunk.target, ' ', playButton(chunk.target));
  back.appendChild(targetRow);
  if (chunk.example) back.appendChild(el('p', chunk.example, 'view-placeholder'));

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
        rateChunk(db, entry.key, grade, Date.now());
        if (!Array.isArray(db.reviewLog)) db.reviewLog = [];
        db.reviewLog.push({
          id: crypto.randomUUID?.() || `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
          kind: 'rate',
          chunkKey: entry.key,
          grade,
          response: answer.value,
          at: Date.now()
        });
      });
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
      const match = matchSpeech(chunk.target, answer.value);
      const suggested = match.score >= 0.9 ? 3 : match.score >= 0.5 ? 2 : 1;
      const suggestion = el(
        'p',
        `Bạn gõ khớp ${Math.round(match.score * 100)}% — gợi ý chấm: ${GRADES[suggested - 1].label}`,
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
  host.appendChild(el('p', 'Chưa có cụm đến hạn'));
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
