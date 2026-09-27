// Đang học — one mounted container per step, switched by toggling `hidden`
// (rule 1: never rebuild DOM that holds quiz/textarea state).
import { STEPS } from '../../content/schema.js';

const STEP_LABELS = {
  prepare: 'Hiểu mẫu',
  read: 'Đọc',
  listen: 'Nghe',
  write: 'Viết',
  speak: 'Nói'
};

export function mount(root, { params }) {
  const active = STEPS.includes(params?.step) ? params.step : STEPS[0];
  const section = document.createElement('section');
  section.className = 'view-section runner';
  const title = document.createElement('h1');
  title.textContent = `Bài ${params?.lessonId || ''}`.trim() || 'Đang học';
  section.appendChild(title);

  for (const step of STEPS) {
    const pane = document.createElement('div');
    pane.dataset.step = step;
    pane.className = 'runner-pane';
    pane.hidden = step !== active;
    const label = document.createElement('h2');
    label.textContent = STEP_LABELS[step];
    const note = document.createElement('p');
    note.className = 'view-placeholder';
    note.textContent = 'Nội dung bước này sẽ hiện ở đây.';
    pane.append(label, note);
    section.appendChild(pane);
  }

  root.appendChild(section);
}

export function unmount() {}
