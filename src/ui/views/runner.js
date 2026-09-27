/*
 * Lesson runner — all step panes mount once; switching steps only toggles
 * `hidden` and moves focus (rule 1). Submitted work appends lessonEvents via
 * the store; unsubmitted work stays in the device-local session draft.
 */
import { STEPS } from '../../content/schema.js';
import { lessonById } from '../../content/a1/index.js';
import { restoreDraft } from '../../core/session.js';
import { appendLessonEvent } from '../../core/evidence.js';
import { enrollChunks } from '../../core/scheduler.js';
import { checkTimeGate } from '../../core/time-gate.js';
import { mountQuiz } from '../components/quiz.js';

const STEP_LABELS = {
  prepare: 'Hiểu mẫu',
  read: 'Đọc',
  listen: 'Nghe',
  write: 'Viết',
  speak: 'Nói'
};

const STEP_KIND = { prepare: 'drill', read: 'read', listen: 'listen', write: 'write', speak: 'speak' };

let state = null;

export function mount(root, ctx) {
  const lesson = lessonById(ctx.params?.lessonId);
  if (!lesson) {
    root.innerHTML = `
      <section class="view-section">
        <h1>Không tìm thấy bài</h1>
        <p class="view-placeholder">Bài "${ctx.params?.lessonId || ''}" không có trong lộ trình.</p>
        <p><a class="btn-secondary" href="#/today">Về Hôm nay</a></p>
      </section>`;
    state = { lesson: null };
    return;
  }

  const steps = lesson.kind === 'checkpoint' ? STEPS.slice(1) : [...STEPS];
  const draft = session_getDraft(ctx, lesson.id);
  const restore = restoreDraft(draft, lesson.contentVersion);

  state = {
    ctx, lesson, steps,
    active: null,
    panes: {},
    draft: restore.status === 'applied' ? draft : null,
    draftSaveTimer: null
  };

  const section = document.createElement('section');
  section.className = 'view-section runner';

  const topbar = document.createElement('div');
  topbar.className = 'runner-topbar';
  topbar.innerHTML = `
    <a class="runner-back" href="#/path">← Lộ trình</a>
    <span class="runner-title">${escapeHtml(lesson.title)}</span>
    <span class="runner-progress" data-role="progress"></span>`;
  section.appendChild(topbar);

  const draftStatus = document.createElement('p');
  draftStatus.className = 'draft-status';
  draftStatus.dataset.role = 'draft-status';
  draftStatus.setAttribute('aria-live', 'polite');
  section.appendChild(draftStatus);

  const strip = document.createElement('nav');
  strip.className = 'step-strip';
  strip.setAttribute('aria-label', 'Các bước học');
  for (const step of steps) {
    const link = document.createElement('a');
    link.className = 'step-pill';
    link.dataset.stepLink = step;
    link.href = `#/lesson/${lesson.id}/${step}`;
    link.textContent = STEP_LABELS[step];
    strip.appendChild(link);
  }
  section.appendChild(strip);

  if (restore.status === 'stale') {
    const notice = document.createElement('p');
    notice.className = 'runner-notice';
    notice.dataset.role = 'stale-notice';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'auth-link';
    dismiss.textContent = 'Đóng';
    dismiss.addEventListener('click', () => notice.remove());
    notice.append(
      document.createTextNode('Bản nháp cũ từ phiên bản bài trước — nội dung đã đổi, bản nháp không được áp dụng. '),
      dismiss
    );
    section.appendChild(notice);
    ctx.session.clearDraft(lesson.id);
    ctx.session.save();
  }

  for (const step of steps) {
    const pane = document.createElement('div');
    pane.className = 'runner-pane';
    pane.dataset.step = step;
    pane.hidden = true;
    const heading = document.createElement('h2');
    heading.tabIndex = -1;
    heading.textContent = STEP_LABELS[step];
    pane.appendChild(heading);
    buildStep[step](pane, ctx, lesson);
    section.appendChild(pane);
    state.panes[step] = pane;
  }

  root.appendChild(section);

  let initial = steps.includes(ctx.params?.step) ? ctx.params.step : steps[0];
  // An applied draft steers "open the lesson" to where the learner stopped —
  // an explicit deep-link to a non-first step still wins.
  if (initial === steps[0] && state.draft?.step && steps.includes(state.draft.step)) {
    initial = state.draft.step;
  }
  showStep(initial);
}

// The router calls this on hashchange while the runner stays mounted.
// Returns true when the new params describe this same lesson.
export function update(ctx) {
  if (!state?.lesson || String(ctx.params?.lessonId) !== String(state.lesson.id)) return false;
  const step = state.steps.includes(ctx.params?.step) ? ctx.params.step : state.steps[0];
  showStep(step);
  return true;
}

export function unmount() {
  if (state?.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  state = null;
}

function session_getDraft(ctx, lessonId) {
  return ctx.session.getDraft(lessonId);
}

function showStep(step) {
  state.active = step;
  for (const [name, pane] of Object.entries(state.panes)) pane.hidden = name !== step;
  const index = state.steps.indexOf(step) + 1;
  const section = state.panes[step].closest('.runner');
  section.querySelector('[data-role="progress"]').textContent = `bước ${index}/${state.steps.length}`;
  for (const link of section.querySelectorAll('.step-pill')) {
    const active = link.dataset.stepLink === step;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  }
  state.panes[step].querySelector('h2').focus();
  state.ctx.session.setLast({ lessonId: state.lesson.id, step });
  scheduleDraftSave();
}

function nextStep(step) {
  const i = state.steps.indexOf(step);
  return i >= 0 ? state.steps[i + 1] || null : null;
}

function stepNav(pane, step) {
  const nav = document.createElement('div');
  nav.className = 'runner-nav';
  const i = state.steps.indexOf(step);
  const back = document.createElement('a');
  back.className = 'btn-secondary';
  back.textContent = 'Quay lại';
  back.href = i > 0 ? `#/lesson/${state.lesson.id}/${state.steps[i - 1]}` : '#/today';
  const next = nextStep(step);
  const fwd = document.createElement('a');
  fwd.className = 'btn-primary';
  fwd.textContent = next ? `Học tiếp: ${STEP_LABELS[next]}` : 'Xem kết quả';
  fwd.href = next ? `#/lesson/${state.lesson.id}/${next}` : `#/summary/${state.lesson.id}`;
  nav.append(back, fwd);
  pane.appendChild(nav);
}

function scheduleDraftSave() {
  const { ctx, lesson } = state;
  const status = state.panes[state.active].closest('.runner').querySelector('[data-role="draft-status"]');
  if (state.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = setTimeout(() => {
    const result = ctx.session.save();
    status.textContent = result.ok
      ? 'Đã lưu nháp trên thiết bị'
      : 'Không lưu được bản nháp trên thiết bị';
    status.dataset.tone = result.ok ? 'ok' : 'error';
  }, 400);
}

function patchDraft(patch) {
  const { ctx, lesson } = state;
  state.draft = ctx.session.setDraft(lesson.id, { contentVersion: lesson.contentVersion, step: state.active, ...patch });
  scheduleDraftSave();
}

function recordEvent(step, payload, support) {
  const { ctx, lesson } = state;
  ctx.store.transact((db) => {
    appendLessonEvent(db, {
      lessonId: lesson.id,
      contentVersion: lesson.contentVersion,
      step,
      kind: STEP_KIND[step],
      payload,
      support
    });
    // Chunks join the review pool when the drills are submitted (§3 rule:
    // no "add to review" button).
    if (step === 'prepare') enrollChunks(db, lesson);
  });
  // Clear that step's draft answers; write/speak text stays until summary.
  if (step === 'prepare' || step === 'read' || step === 'listen') {
    patchDraft({ answers: { ...state.draft?.answers, [step]: {} } });
  }
}

function draftAnswers(step) {
  return state.draft?.answers?.[step] || {};
}

function draftSupport() {
  return state.draft?.support || {};
}

function continueLink(pane, step) {
  const next = nextStep(step);
  pane.querySelector('.runner-continue')?.remove();
  const link = document.createElement('a');
  link.className = 'btn-primary runner-continue';
  link.textContent = next ? `Học tiếp: ${STEP_LABELS[next]}` : 'Xem kết quả';
  link.href = next ? `#/lesson/${state.lesson.id}/${next}` : `#/summary/${state.lesson.id}`;
  pane.appendChild(link);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

function text(tag, content, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = content;
  return el;
}

/* ── Step builders ─────────────────────────────────────── */

const buildStep = {
  prepare(pane, ctx, lesson) {
    const pattern = document.createElement('div');
    pattern.className = 'pattern-card';
    pattern.append(
      text('h3', lesson.pattern.name),
      text('p', lesson.pattern.rule)
    );
    const examples = document.createElement('ul');
    examples.className = 'pattern-examples';
    for (const [en, vi] of lesson.pattern.examples) {
      const li = document.createElement('li');
      li.append(text('span', en, 'en'), document.createTextNode(' '), text('span', vi, 'vi'));
      examples.appendChild(li);
    }
    pattern.appendChild(examples);
    pane.appendChild(pattern);

    const chunks = document.createElement('ul');
    chunks.className = 'chunk-list';
    for (const chunk of lesson.chunks) {
      const li = document.createElement('li');
      li.append(text('strong', chunk.target), document.createTextNode(` · ${chunk.meaning}`));
      const detail = document.createElement('details');
      detail.className = 'chunk-example';
      const summary = document.createElement('summary');
      summary.textContent = 'Ví dụ';
      detail.append(summary, text('p', `${chunk.example} — ${chunk.exampleVi}`));
      li.appendChild(detail);
      chunks.appendChild(li);
    }
    pane.appendChild(chunks);

    const quizHost = document.createElement('div');
    pane.appendChild(quizHost);
    mountQuiz(quizHost, lesson.drills, {
      initialAnswers: draftAnswers('prepare'),
      onAnswerChange: (answers) => patchDraft({ answers: { ...state.draft?.answers, prepare: answers } }),
      onSubmit: (result) => {
        recordEvent('prepare', result, draftSupport());
        continueLink(pane, 'prepare');
      }
    });
    stepNav(pane, 'prepare');
  },

  read(pane, ctx, lesson) {
    pane.appendChild(text('h3', lesson.dialogue.title));
    const list = document.createElement('ol');
    list.className = 'dialogue-lines';
    for (const [en, vi] of lesson.dialogue.lines) {
      const li = document.createElement('li');
      li.append(text('span', en, 'en'), text('span', vi, 'vi translation'));
      list.appendChild(li);
    }
    pane.appendChild(list);
    setTranslationsVisible(list, Boolean(draftSupport().translationViewed));

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn-secondary';
    toggle.dataset.role = 'translation-toggle';
    toggle.textContent = 'Hiện nghĩa';
    toggle.addEventListener('click', () => {
      setTranslationsVisible(list, true);
      toggle.disabled = true;
      patchDraft({ support: { ...draftSupport(), translationViewed: true } });
    });
    toggle.disabled = Boolean(draftSupport().translationViewed);
    pane.appendChild(toggle);

    const quizHost = document.createElement('div');
    pane.appendChild(quizHost);
    mountQuiz(quizHost, lesson.dialogue.questions, {
      initialAnswers: draftAnswers('read'),
      onAnswerChange: (answers) => patchDraft({ answers: { ...state.draft?.answers, read: answers } }),
      onSubmit: (result) => {
        recordEvent('read', result, { translationViewed: Boolean(draftSupport().translationViewed) });
        continueLink(pane, 'read');
      }
    });
    stepNav(pane, 'read');
  },

  listen(pane, ctx, lesson) {
    const support = draftSupport();
    const transcript = document.createElement('div');
    transcript.className = 'transcript';
    transcript.hidden = !support.transcriptViewed;
    transcript.append(text('p', lesson.listening.text, 'en'), text('p', lesson.listening.vi, 'vi'));
    pane.appendChild(transcript);

    const controls = document.createElement('div');
    controls.className = 'listen-controls';
    const plays = { count: 0 };

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn-primary';
    playBtn.textContent = 'Nghe (giọng máy)';

    const transcriptBtn = document.createElement('button');
    transcriptBtn.type = 'button';
    transcriptBtn.className = 'btn-secondary';
    transcriptBtn.dataset.role = 'transcript-toggle';
    transcriptBtn.textContent = 'Xem lời (có hỗ trợ)';
    transcriptBtn.disabled = Boolean(support.transcriptViewed);
    transcriptBtn.addEventListener('click', () => {
      transcript.hidden = false;
      transcriptBtn.disabled = true;
      patchDraft({ support: { ...draftSupport(), transcriptViewed: true } });
    });

    controls.append(playBtn, transcriptBtn);
    pane.appendChild(controls);

    if (!('speechSynthesis' in window)) {
      playBtn.disabled = true;
      transcript.hidden = false;
      pane.appendChild(text('p', 'Thiết bị không có giọng đọc tiếng Anh — bạn có thể đọc lời thoại thay thế.', 'runner-notice'));
      patchDraft({ support: { ...draftSupport(), transcriptViewed: true } });
    } else {
      playBtn.addEventListener('click', () => {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find((v) => /^en[-_](US|GB)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
        const utter = new SpeechSynthesisUtterance(lesson.listening.text);
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang || 'en-US';
        utter.onend = () => { plays.count += 1; };
        utter.onerror = () => {
          playBtn.disabled = true;
          transcript.hidden = false;
          pane.appendChild(text('p', 'Thiết bị không có giọng đọc tiếng Anh — bạn có thể đọc lời thoại thay thế.', 'runner-notice'));
          patchDraft({ support: { ...draftSupport(), transcriptViewed: true } });
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      });
    }

    const quizHost = document.createElement('div');
    pane.appendChild(quizHost);
    mountQuiz(quizHost, lesson.listening.questions, {
      initialAnswers: draftAnswers('listen'),
      onAnswerChange: (answers) => patchDraft({ answers: { ...state.draft?.answers, listen: answers } }),
      onSubmit: (result) => {
        recordEvent('listen', {
          ...result,
          completedPlays: plays.count,
          transcriptViewed: Boolean(draftSupport().transcriptViewed)
        }, { transcriptViewed: Boolean(draftSupport().transcriptViewed) });
        continueLink(pane, 'listen');
      }
    });
    stepNav(pane, 'listen');
  },

  write(pane, ctx, lesson) {
    const draftWrite = state.draft?.write?.[lesson.id] || {};
    pane.append(text('p', lesson.write.setup), text('p', lesson.write.prompt, 'task-prompt'));

    const textarea = document.createElement('textarea');
    textarea.className = 'write-area';
    textarea.rows = 4;
    textarea.value = draftWrite.responseText || '';
    textarea.placeholder = 'Viết câu trả lời của bạn…';

    const modelBtn = document.createElement('button');
    modelBtn.type = 'button';
    modelBtn.className = 'btn-secondary';
    modelBtn.dataset.role = 'model-toggle';
    modelBtn.textContent = 'Xem mẫu';
    modelBtn.disabled = wordCount(textarea.value) < 3;

    let debounce = null;
    textarea.addEventListener('input', () => {
      modelBtn.disabled = wordCount(textarea.value) < 3;
      saveBtn.disabled = false; // a changed answer is a new attempt
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        patchDraft({ write: { [lesson.id]: { ...(state.draft?.write?.[lesson.id] || {}), responseText: textarea.value } } });
      }, 400);
    });
    pane.append(textarea, modelBtn);

    let declaredInput = null;
    if (lesson.write.gate && lesson.write.gate.type === 'time') {
      declaredInput = document.createElement('input');
      declaredInput.className = 'gate-input';
      declaredInput.placeholder = 'vd: 7:00 hoặc "seven"';
      declaredInput.value = draftWrite.declaredFinalTime || '';
      declaredInput.addEventListener('input', () => {
        patchDraft({ write: { [lesson.id]: { ...(state.draft?.write?.[lesson.id] || {}), declaredFinalTime: declaredInput.value } } });
      });
      pane.append(text('label', 'Giờ cuối cùng bạn chốt', 'gate-label'), declaredInput);
    }

    const modelArea = document.createElement('div');
    modelArea.className = 'model-area';
    modelArea.hidden = true;
    pane.appendChild(modelArea);

    const gateNote = text('p', '', 'runner-notice');
    gateNote.hidden = true;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-primary';
    saveBtn.dataset.role = 'write-save';
    saveBtn.textContent = 'Lưu lần thử';
    saveBtn.hidden = true;
    pane.append(saveBtn, gateNote);

    modelBtn.addEventListener('click', () => {
      patchDraft({ support: { ...draftSupport(), modelRevealed: true } });
      const modelList = document.createElement('ul');
      for (const line of lesson.write.model) modelList.appendChild(text('li', line));
      modelArea.append(text('h3', 'Bài mẫu'), modelList);
      const checklist = document.createElement('div');
      checklist.className = 'checklist';
      lesson.write.checklist.forEach((item, i) => {
        const label = document.createElement('label');
        label.className = 'checklist-item';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.dataset.check = String(i);
        box.addEventListener('change', () => { saveBtn.disabled = false; });
        label.append(box, document.createTextNode(item));
        checklist.appendChild(label);
      });
      modelArea.appendChild(checklist);
      modelArea.hidden = false;
      modelBtn.disabled = true;
      saveBtn.hidden = false;
    });
    // Draft said the model was already revealed → show it again without gating.
    if (draftSupport().modelRevealed) modelBtn.click();

    saveBtn.addEventListener('click', () => {
      if (wordCount(textarea.value) < 3) {
        gateNote.textContent = 'Viết câu trả lời trước khi lưu.';
        gateNote.hidden = false;
        return;
      }
      if (lesson.write.gate) {
        const check = checkTimeGate({
          gate: lesson.write.gate,
          declaredTime: declaredInput?.value,
          responseText: textarea.value
        });
        if (!check.ok) {
          gateNote.textContent = check.reason === 'unparsed'
            ? 'Nhập giờ bạn chốt (vd: 7:00 hoặc "seven").'
            : check.reason === 'mismatch'
              ? 'Giờ chưa khớp tình huống — kiểm tra lại.'
              : 'Câu trả lời cần nhắc đúng giờ đã chốt.';
          gateNote.hidden = false;
          return;
        }
        gateNote.hidden = true;
      }
      saveBtn.disabled = true; // stays disabled until text/checklist changes
      const checklist = [...modelArea.querySelectorAll('[data-check]')].map((box) => box.checked);
      recordEvent('write', {
        responseText: textarea.value,
        declaredFinalTime: declaredInput?.value || undefined,
        checklist,
        selfReviewed: true
      }, { modelRevealed: true });
      continueLink(pane, 'write');
    });
    stepNav(pane, 'write');
  },

  speak(pane, ctx, lesson) {
    const draftSpeak = state.draft?.speak?.[lesson.id] || {};
    pane.append(
      text('p', lesson.speak.setup),
      text('p', `Vai A: ${lesson.speak.roleA}`),
      text('p', `Vai B: ${lesson.speak.roleB}`),
      text('p', lesson.speak.prompt, 'task-prompt')
    );

    const spoke = document.createElement('label');
    spoke.className = 'checklist-item';
    const spokeBox = document.createElement('input');
    spokeBox.type = 'checkbox';
    spokeBox.dataset.role = 'spoke';
    spokeBox.checked = Boolean(draftSpeak.spoke);
    spoke.append(spokeBox, document.createTextNode('Tôi đã nói thành tiếng'));

    const listener = document.createElement('div');
    listener.className = 'listener-choice';
    let listenerValue = draftSpeak.listener || 'self';
    [['self', 'Tự luyện một mình'], ['partner', 'Có người nghe']].forEach(([value, labelText]) => {
      const label = document.createElement('label');
      label.className = 'checklist-item';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `listener-${lesson.id}`;
      radio.value = value;
      radio.checked = listenerValue === value;
      radio.addEventListener('change', () => { listenerValue = value; });
      label.append(radio, document.createTextNode(labelText));
      listener.appendChild(label);
    });

    const textarea = document.createElement('textarea');
    textarea.className = 'speak-area';
    textarea.rows = 3;
    textarea.placeholder = 'Bạn đã nói gì? (ghi lại ngắn)';
    textarea.value = draftSpeak.responseText || '';
    let debounce = null;
    textarea.addEventListener('input', () => {
      saveBtn.disabled = false;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        patchDraft({ speak: { [lesson.id]: { ...(state.draft?.speak?.[lesson.id] || {}), responseText: textarea.value } } });
      }, 400);
    });
    spokeBox.addEventListener('change', () => {
      modelBtn.disabled = !spokeBox.checked;
      patchDraft({ speak: { [lesson.id]: { ...(state.draft?.speak?.[lesson.id] || {}), spoke: spokeBox.checked } } });
    });

    const modelBtn = document.createElement('button');
    modelBtn.type = 'button';
    modelBtn.className = 'btn-secondary';
    modelBtn.dataset.role = 'model-toggle';
    modelBtn.textContent = 'Xem mẫu';
    modelBtn.disabled = !spokeBox.checked;

    const modelArea = document.createElement('div');
    modelArea.className = 'model-area';
    modelArea.hidden = true;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-primary';
    saveBtn.dataset.role = 'speak-save';
    saveBtn.textContent = 'Lưu lần thử';
    saveBtn.hidden = true;

    const speakNote = text('p', '', 'runner-notice');
    speakNote.hidden = true;

    pane.append(spoke, listener, textarea, modelBtn, modelArea, saveBtn, speakNote);

    modelBtn.addEventListener('click', () => {
      patchDraft({ support: { ...draftSupport(), modelRevealed: true } });
      const modelList = document.createElement('ul');
      for (const line of lesson.speak.model) modelList.appendChild(text('li', line));
      modelArea.append(text('h3', 'Bài mẫu'), modelList);
      const checklist = document.createElement('div');
      checklist.className = 'checklist';
      lesson.speak.checklist.forEach((item, i) => {
        const label = document.createElement('label');
        label.className = 'checklist-item';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.dataset.check = String(i);
        box.addEventListener('change', () => { saveBtn.disabled = false; });
        label.append(box, document.createTextNode(item));
        checklist.appendChild(label);
      });
      modelArea.appendChild(checklist);
      modelArea.hidden = false;
      modelBtn.disabled = true;
      saveBtn.hidden = false;
    });

    saveBtn.addEventListener('click', () => {
      if (!textarea.value.trim() || !spokeBox.checked) {
        speakNote.textContent = 'Ghi lại câu bạn đã nói và đánh dấu "Tôi đã nói thành tiếng" trước khi lưu.';
        speakNote.hidden = false;
        return;
      }
      speakNote.hidden = true;
      saveBtn.disabled = true;
      const checklist = [...modelArea.querySelectorAll('[data-check]')].map((box) => box.checked);
      recordEvent('speak', {
        responseText: textarea.value,
        spoke: spokeBox.checked,
        listener: listenerValue,
        checklist
      }, { modelRevealed: true });
      continueLink(pane, 'speak');
    });
    stepNav(pane, 'speak');
  }
};

function setTranslationsVisible(list, visible) {
  for (const vi of list.querySelectorAll('.translation')) vi.hidden = !visible;
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}
