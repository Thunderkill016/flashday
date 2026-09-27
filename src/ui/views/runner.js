/*
 * Lesson runner — all step panes mount once; switching steps only toggles
 * `hidden` and moves focus (rule 1). Submitted work appends lessonEvents via
 * the store; unsubmitted work stays in the device-local session draft.
 */
import { lessonById } from '../../content/a1/index.js';
import { restoreDraft } from '../../core/session.js';
import { appendLessonEvent } from '../../core/evidence.js';
import { enrollChunks } from '../../core/scheduler.js';
import { stepsForLesson } from '../../core/progress.js';
import { checkTimeGate } from '../../core/time-gate.js';
import { mountQuiz } from '../components/quiz.js';
import { mountMatchPairs } from '../components/matchpairs.js';
import { mountWordBank } from '../components/wordbank.js';
import { pickEnglishVoice, LEARNER_SPEECH_RATE, playButton, speakCheck, speechRecognizer, matchSpeech } from '../speech.js';
import { lessonIcon } from '../icons.js';
import { getTutor } from '../../ai/tutor.js';

// Re-exported: existing tests import the voice picker from this module.
export { pickEnglishVoice };

const STEP_LABELS = {
  prepare: 'Hiểu mẫu',
  read: 'Đọc',
  listen: 'Nghe',
  write: 'Viết',
  speak: 'Nói'
};

const STEP_ICONS = {
  prepare: '👀',
  read: '📖',
  listen: '👂',
  write: '✍️',
  speak: '🗣️'
};

const STEP_KIND = {
  prepare: 'drill',
  read: 'read',
  listen: 'listen',
  write: 'write',
  speak: 'speak'
};
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

  const steps = [...stepsForLesson(lesson)];
  const draft = session_getDraft(ctx, lesson.id);
  const restore = restoreDraft(draft, lesson.contentVersion);

  state = {
    ctx,
    lesson,
    steps,
    active: null,
    panes: {},
    draft: restore.status === 'applied' ? draft : null,
    draftSaveTimer: null,
    timers: new Set(),
    tutor: getTutor(ctx)
  };

  const section = document.createElement('section');
  section.className = 'view-section runner';

  const topbar = document.createElement('div');
  topbar.className = 'runner-topbar';
  topbar.innerHTML = `
    <a class="runner-back" href="#/path">← Lộ trình</a>
    <span class="runner-title">${lessonIcon(lesson)} ${escapeHtml(lesson.title)}</span>
    <span class="runner-progress" data-role="progress"></span>`;
  section.appendChild(topbar);

  // Continuous lesson-progress bar (Duolingo pattern): fills as steps get
  // submitted, so "còn bao nhiêu việc" is visible at a glance.
  const progressBar = document.createElement('div');
  progressBar.className = 'lesson-progress';
  progressBar.dataset.role = 'lesson-progress';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.appendChild(document.createElement('i'));
  section.appendChild(progressBar);

  const draftStatus = document.createElement('p');
  draftStatus.className = 'draft-status';
  draftStatus.dataset.role = 'draft-status';
  draftStatus.setAttribute('aria-live', 'polite');
  section.appendChild(draftStatus);

  // On-device model download progress (one-time, multi-GB on supported
  // devices) — a real status line, never a silent stall.
  const aiStatus = document.createElement('p');
  aiStatus.className = 'ai-status';
  aiStatus.dataset.role = 'ai-status';
  aiStatus.setAttribute('aria-live', 'polite');
  section.appendChild(aiStatus);
  state.tutor?.setStatusSink?.((msg) => {
    aiStatus.textContent = msg;
  });

  const strip = document.createElement('nav');
  strip.className = 'step-strip';
  strip.setAttribute('aria-label', 'Các bước học');
  for (const step of steps) {
    const link = document.createElement('a');
    link.className = 'step-pill';
    link.dataset.stepLink = step;
    link.href = `#/lesson/${lesson.id}/${step}`;
    link.textContent = `${STEP_ICONS[step] || ''} ${STEP_LABELS[step]}`;
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
  updateLessonProgress();
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
  if (!state) return;
  if (state.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  // Cancel every pending debounce (textarea drafts, save status) — closures
  // that touch `state` must never fire after it is torn down.
  for (const timer of state.timers || []) clearTimeout(timer);
  // Flush whatever was already drafted so mid-debounce typing is not lost.
  state.ctx?.session.save();
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
  // `runner-continue` class lets continueLink() relocate this same anchor to
  // the pane bottom after a submit — without it the step shows two identical
  // "Học tiếp" buttons (nav row + appended link).
  fwd.className = 'btn-primary runner-continue';
  fwd.textContent = next ? `Học tiếp: ${STEP_LABELS[next]}` : 'Xem kết quả';
  fwd.href = next ? `#/lesson/${state.lesson.id}/${next}` : `#/summary/${state.lesson.id}`;
  nav.append(back, fwd);
  pane.appendChild(nav);
}

// All debounced work registers here so unmount() can cancel it — a callback
// that reads `state` after teardown (or mid-remount) is the crash family this
// prevents.
function defer(fn, ms) {
  const timer = setTimeout(() => {
    state?.timers?.delete(timer);
    fn();
  }, ms);
  state?.timers?.add(timer);
  return timer;
}

function scheduleDraftSave() {
  const { ctx } = state;
  const status = state.panes[state.active]
    ?.closest('.runner')
    ?.querySelector('[data-role="draft-status"]');
  if (state.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = defer(() => {
    const result = ctx.session.save();
    if (status) {
      status.textContent = result.ok ? 'Đã lưu nháp trên thiết bị' : 'Không lưu được bản nháp trên thiết bị';
      status.dataset.tone = result.ok ? 'ok' : 'error';
    }
  }, 400);
}

function patchDraft(patch) {
  if (!state?.lesson) return;
  const { ctx, lesson } = state;
  state.draft = ctx.session.setDraft(lesson.id, {
    contentVersion: lesson.contentVersion,
    step: state.active,
    ...patch
  });
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
    // no "add to review" button). Checkpoints have no prepare step, so
    // their chunks enroll on the first submitted step instead (idempotent).
    if (step === 'prepare' || lesson.kind === 'checkpoint') enrollChunks(db, lesson);
  });
  // Clear that step's draft answers; write/speak text stays until summary.
  if (step === 'prepare' || step === 'read' || step === 'listen') {
    patchDraft({ answers: { ...state.draft?.answers, [step]: {} } });
  }
  updateLessonProgress();
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

// Mastery learning (Duolingo practice-on-errors): after a submit with wrongs,
// offer an AI-generated mini-quiz on exactly the missed points — the learner
// re-tests the gap instead of redoing what they already know.
function remediationOffer(pane, step, lesson, questions, result, sourceText) {
  const wrong = questions
    .map((q, i) => ({
      question: q.q,
      chosen: q.options[result.answers[i]],
      correct: q.options[q.answer],
      isWrong: Number(result.answers[i]) !== Number(q.answer)
    }))
    .filter((w) => w.isWrong);
  if (!wrong.length || !state.tutor?.available) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-secondary remediation-btn';
  btn.dataset.role = 'remediation';
  btn.textContent = 'Luyện thêm điểm vừa sai (AI)';
  const host = document.createElement('div');
  host.className = 'remediation';
  // Land right after the quiz host, before the nav row.
  const nav = pane.querySelector('.runner-nav');
  pane.insertBefore(btn, nav);
  pane.insertBefore(host, nav);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'AI đang ra đề…';
    try {
      const { questions: extra } = await state.tutor.generateDrills({
        lessonTitle: lesson.title,
        sourceText,
        wrong
      });
      const clean = sanitizeDrills(extra);
      if (!clean.length || !host.isConnected) throw new Error('empty drills');
      host.appendChild(text('h3', `Luyện lại ${wrong.length} điểm vừa sai`, 'remediation-title'));
      const quizHost = document.createElement('div');
      host.appendChild(quizHost);
      mountQuiz(quizHost, clean, {
        onSubmit: (r) => recordEvent(step, { ...r, remediation: true }, {})
      });
      btn.hidden = true;
    } catch {
      btn.disabled = false;
      btn.textContent = 'Luyện thêm điểm vừa sai (AI)';
    }
  });
}

// AI output is data, not schema — validate every generated item before it
// can break mountQuiz or teach a malformed question.
function sanitizeDrills(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (q) =>
        q &&
        typeof q.q === 'string' &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.every((o) => typeof o === 'string') &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < q.options.length
    )
    .slice(0, 4)
    .map((q) => ({ q: q.q, options: q.options, answer: q.answer, hint: String(q.hint || '') }));
}

// Explain-my-answer wiring (Duolingo Max pattern): wrong quiz answers get an
// AI button only when the tutor can respond — otherwise the static hint is
// the whole story and no dead control renders.
function explainOption(stepLabel, source) {
  return state.tutor?.available
    ? (question, chosenIndex) =>
        state.tutor.explainWrong({
          stepLabel,
          question: question.q,
          options: question.options,
          chosenIndex,
          correctIndex: question.answer,
          hint: question.hint,
          source
        })
    : undefined;
}

// Word-bank items from drills: correct option must be a full sentence
// (≥3 words); words unique to wrong options become distractors.
function wordBankItems(drills, limit = 2) {
  const items = [];
  for (const drill of drills || []) {
    const answer = drill?.options?.[drill.answer];
    if (typeof answer !== 'string') continue;
    const words = answer.replace(/[.,!?…]/g, '').split(/\s+/).filter(Boolean);
    if (words.length < 3) continue;
    const answerSet = new Set(words.map((w) => w.toLowerCase()));
    const extra = [];
    for (const opt of drill.options) {
      if (opt === answer) continue;
      for (const w of String(opt).replace(/[.,!?…]/g, '').split(/\s+/).filter(Boolean)) {
        if (!answerSet.has(w.toLowerCase()) && !extra.includes(w)) extra.push(w);
      }
    }
    items.push({ prompt: drill.q, answer, words, extra: extra.slice(0, 3) });
    if (items.length >= limit) break;
  }
  return items;
}

// Speaker initial in a colored circle — cheap "character" presence for
// dialogue lines without shipping artwork (name hashed to a stable hue).
function speakerAvatar(en) {
  const name = String(en).match(/^([A-Z][a-zA-ZÀ-ỹ]+)\s*:/)?.[1];
  if (!name) return null;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = name[0];
  avatar.style.setProperty('--avatar-h', String((name.charCodeAt(0) * 47) % 360));
  avatar.title = name;
  return avatar;
}

// Fill the lesson-progress bar: submitted steps / total steps. Called at
// mount and after every recorded event.
function updateLessonProgress() {
  const sectionEl = state.panes[state.active]?.closest('.runner')
    || state.panes[state.steps[0]]?.closest('.runner');
  const bar = sectionEl?.querySelector('[data-role="lesson-progress"] i');
  if (!bar) return;
  const events = state.ctx.store.getState().lessonEvents || [];
  const done = state.steps.filter((s) =>
    events.some((e) => e.lessonId === state.lesson.id && e.step === s)
  ).length;
  const pct = Math.round((done / state.steps.length) * 100);
  bar.style.width = `${pct}%`;
  bar.parentElement.setAttribute('aria-valuenow', String(pct));
}

function text(tag, content, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = content;
  return el;
}

// Closest model line by shared content words — correction feedback names
// something concrete, so the learner compares against a real model line.
function closestModel(textValue, models) {
  const wordSet = (s) => new Set(String(s).toLowerCase().match(/[a-z']+/g) || []);
  const mine = wordSet(textValue);
  let best = models[0] || '';
  let bestScore = -1;
  for (const model of models) {
    const theirs = wordSet(model);
    const score = [...mine].filter((w) => theirs.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = model;
    }
  }
  return best;
}

// Words in the learner's attempt that appear in the model get <mark> — a
// visible "what you got right" instead of a pass/fail verdict.
function markedAttempt(textValue, model) {
  const modelWords = new Set(String(model).toLowerCase().match(/[a-z']+/g) || []);
  const frag = document.createElement('p');
  frag.className = 'en';
  for (const part of String(textValue).split(/([a-zA-Z']+)/)) {
    if (part && modelWords.has(part.toLowerCase())) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      frag.appendChild(mark);
    } else {
      frag.appendChild(document.createTextNode(part));
    }
  }
  return frag;
}

/* ── Step builders ─────────────────────────────────────── */

const buildStep = {
  prepare(pane, ctx, lesson) {
    const pattern = document.createElement('div');
    pattern.className = 'pattern-card';
    pattern.append(text('h3', lesson.pattern.name), text('p', lesson.pattern.rule));
    const examples = document.createElement('ul');
    examples.className = 'pattern-examples';
    for (const [en, vi] of lesson.pattern.examples) {
      const li = document.createElement('li');
      li.append(text('span', en, 'en'), document.createTextNode(' '), text('span', vi, 'vi'));
      examples.appendChild(li);
    }
    pattern.appendChild(examples);
    pane.appendChild(pattern);

    // Chunk pager — one chunk per screen (Duolingo one-challenge-per-screen).
    // Every card stays mounted; the pager only toggles `hidden`, so TTS/ASR
    // buttons and test selectors keep working on the hidden cards too.
    const pager = document.createElement('div');
    pager.className = 'chunk-pager';
    const cards = lesson.chunks.map((chunk, index) => {
      const card = document.createElement('div');
      card.className = 'chunk-card';
      card.hidden = index !== 0;
      card.append(
        text('strong', chunk.target, 'chunk-target'),
        text('span', ` ${chunk.meaning}`, 'chunk-meaning')
      );
      const controls = document.createElement('div');
      controls.className = 'chunk-controls';
      const sayCheck = speakCheck(chunk.target);
      controls.append(playButton(chunk.target), sayCheck.button);
      card.appendChild(controls);
      card.appendChild(sayCheck.output);
      const detail = document.createElement('details');
      detail.className = 'chunk-example';
      const summary = document.createElement('summary');
      summary.textContent = 'Ví dụ';
      detail.append(summary, text('p', `${chunk.example} — ${chunk.exampleVi}`));
      card.appendChild(detail);
      pager.appendChild(card);
      return card;
    });
    // `chunk-list` class kept for selector compatibility — all cards live
    // inside it even though only one is visible.
    const listHost = document.createElement('div');
    listHost.className = 'chunk-list';
    listHost.appendChild(pager);
    pane.appendChild(listHost);

    if (cards.length > 1) {
      let cursor = 0;
      const nav = document.createElement('div');
      nav.className = 'chunk-pager-nav';
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'btn-secondary';
      prev.dataset.role = 'chunk-prev';
      prev.textContent = '← Trước';
      const counter = text('span', '', 'chunk-counter');
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn-secondary';
      next.dataset.role = 'chunk-next';
      next.textContent = 'Cụm tiếp →';
      const show = (i) => {
        cursor = Math.max(0, Math.min(cards.length - 1, i));
        cards.forEach((c, j) => (c.hidden = j !== cursor));
        counter.textContent = `Cụm ${cursor + 1}/${cards.length}`;
        prev.disabled = cursor === 0;
        next.disabled = cursor === cards.length - 1;
      };
      prev.addEventListener('click', () => show(cursor - 1));
      next.addEventListener('click', () => show(cursor + 1));
      show(0);
      nav.append(prev, counter, next);
      pane.appendChild(nav);
    }

    // Warm-up 1 — match pairs EN↔VI on the first 4 chunks (recognition).
    if (lesson.chunks.length >= 2) {
      pane.appendChild(text('h3', 'Ghép nhanh — cụm nào là gì?', 'practice-sub'));
      const pairsHost = document.createElement('div');
      pane.appendChild(pairsHost);
      mountMatchPairs(
        pairsHost,
        lesson.chunks.slice(0, 4).map((c) => [c.target, c.meaning])
      );
    }

    // Warm-up 2 — word bank: rebuild a target sentence from shuffled chips
    // (constrained production). Auto-derived from drills whose correct
    // option is a full sentence; wrong options donate distractor words.
    const bankItems = wordBankItems(lesson.drills, 2);
    if (bankItems.length) {
      pane.appendChild(text('h3', 'Sắp lại câu', 'practice-sub'));
      const bankHost = document.createElement('div');
      pane.appendChild(bankHost);
      mountWordBank(bankHost, bankItems);
    }

    pane.appendChild(text('h3', 'Kiểm tra', 'practice-sub'));
    const quizHost = document.createElement('div');
    pane.appendChild(quizHost);
    mountQuiz(quizHost, lesson.drills, {
      initialAnswers: draftAnswers('prepare'),
      onExplain: explainOption(
        'Hiểu mẫu',
        `${lesson.pattern.rule} ${lesson.chunks.map((c) => c.target).join(' | ')}`
      ),
      onAnswerChange: (answers) => patchDraft({ answers: { ...state.draft?.answers, prepare: answers } }),
      onSubmit: (result) => {
        recordEvent('prepare', result, draftSupport());
        remediationOffer(
          pane,
          'prepare',
          lesson,
          lesson.drills,
          result,
          `${lesson.pattern.rule} ${lesson.chunks.map((c) => c.target).join(' | ')}`
        );
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
      const avatar = speakerAvatar(en);
      if (avatar) li.appendChild(avatar);
      li.append(playButton(en), text('span', en, 'en'), text('span', vi, 'vi translation'));
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

    // VARY CONTEXT: a fresh AI-written dialogue on the same target language —
    // a second exposure that isn't a re-read. Hidden when the tutor is out.
    if (state.tutor?.available) {
      const variantBtn = document.createElement('button');
      variantBtn.type = 'button';
      variantBtn.className = 'btn-secondary';
      variantBtn.dataset.role = 'variant';
      variantBtn.textContent = 'Hội thoại mới cùng mẫu (AI)';
      const variantHost = document.createElement('div');
      variantHost.className = 'variant';
      pane.append(variantBtn, variantHost);
      variantBtn.addEventListener('click', async () => {
        variantBtn.disabled = true;
        variantBtn.textContent = 'AI đang viết hội thoại mới…';
        try {
          const variant = await state.tutor.generateVariant({
            canDo: lesson.canDo,
            patternName: lesson.pattern.name,
            chunkTargets: lesson.chunks.map((c) => c.target),
            currentTitle: lesson.dialogue.title,
            countLines: lesson.dialogue.lines.length
          });
          const lines = Array.isArray(variant?.lines) ? variant.lines : [];
          const questions = sanitizeDrills(variant?.questions);
          if (!lines.length || !variantHost.isConnected) throw new Error('bad variant');
          variantHost.appendChild(text('h3', variant.title || 'Hội thoại mới'));
          const list = document.createElement('ol');
          list.className = 'dialogue-lines';
          for (const [en, vi] of lines) {
            const li = document.createElement('li');
            const avatar = speakerAvatar(en);
            if (avatar) li.appendChild(avatar);
            li.append(playButton(String(en)), text('span', String(en), 'en'), text('span', String(vi || ''), 'vi translation'));
            list.appendChild(li);
          }
          variantHost.appendChild(list);
          if (questions.length) {
            const vQuiz = document.createElement('div');
            variantHost.appendChild(vQuiz);
            mountQuiz(vQuiz, questions, {
              onSubmit: (r) => recordEvent('read', { ...r, variant: true }, {})
            });
          }
          variantBtn.hidden = true;
        } catch {
          variantBtn.disabled = false;
          variantBtn.textContent = 'Hội thoại mới cùng mẫu (AI)';
        }
      });
    }

    mountQuiz(quizHost, lesson.dialogue.questions, {
      initialAnswers: draftAnswers('read'),
      onExplain: explainOption('Đọc', lesson.dialogue.lines.map(([en]) => en).join(' ')),
      onAnswerChange: (answers) => patchDraft({ answers: { ...state.draft?.answers, read: answers } }),
      onSubmit: (result) => {
        recordEvent('read', result, {
          translationViewed: Boolean(draftSupport().translationViewed)
        });
        remediationOffer(
          pane,
          'read',
          lesson,
          lesson.dialogue.questions,
          result,
          lesson.dialogue.lines.map(([en]) => en).join(' ')
        );
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
    playBtn.textContent = 'Nghe mẫu';

    const rateLabel = document.createElement('label');
    const rateToggle = document.createElement('input');
    rateToggle.type = 'checkbox';
    rateToggle.checked = true;
    rateLabel.append(rateToggle, ' Nghe chậm (0,85×)');

    const voiceStatus = text('p', '', 'runner-notice');
    voiceStatus.setAttribute('aria-live', 'polite');
    const synthesis = window.speechSynthesis;
    const showFallback = () => {
      playBtn.disabled = true;
      rateToggle.disabled = true;
      transcript.hidden = false;
      voiceStatus.textContent = 'Thiết bị không có giọng đọc tiếng Anh — bạn có thể đọc lời thoại thay thế.';
      patchDraft({ support: { ...draftSupport(), transcriptViewed: true } });
    };
    const refreshVoice = () => {
      const voice = pickEnglishVoice(synthesis.getVoices());
      voiceStatus.textContent = voice ? `Giọng đọc: ${voice.name} (${voice.lang})` : 'Đang tìm giọng đọc tiếng Anh…';
      return voice;
    };

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

    controls.append(playBtn, rateLabel, transcriptBtn);
    pane.append(controls, voiceStatus);

    if (!('speechSynthesis' in window)) {
      showFallback();
    } else {
      refreshVoice();
      synthesis.addEventListener?.('voiceschanged', refreshVoice);
      playBtn.addEventListener('click', () => {
        const voice = refreshVoice();
        if (!voice) {
          showFallback();
          return;
        }
        const utter = new SpeechSynthesisUtterance(lesson.listening.text);
        utter.voice = voice;
        utter.lang = voice.lang;
        utter.rate = rateToggle.checked ? LEARNER_SPEECH_RATE : 1;
        utter.onend = () => {
          plays.count += 1;
        };
        utter.onerror = showFallback;
        synthesis.cancel();
        synthesis.speak(utter);
      });
    }

    const quizHost = document.createElement('div');
    pane.appendChild(quizHost);

    // Dictation (Duolingo/Anki-typed): hear a sentence → type it back.
    // Deterministic word-diff; the transcript stays hidden so it is a test,
    // not a copy exercise.
    const dictation = document.createElement('div');
    dictation.className = 'dictation';
    dictation.appendChild(text('h3', 'Chép chính tả — nghe rồi gõ lại'));
    const sentences = String(lesson.listening.text)
      .match(/[^.!?]+[.!?]*/g)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const row = document.createElement('div');
      row.className = 'dictation-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'dictation-input';
      input.placeholder = 'Gõ lại câu vừa nghe…';
      input.setAttribute('aria-label', 'Chép chính tả');
      const checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.className = 'btn-secondary';
      checkBtn.textContent = 'Kiểm';
      const out = text('p', '', 'dictation-out');
      out.hidden = true;
      checkBtn.addEventListener('click', () => {
        const match = matchSpeech(sentence, input.value);
        out.hidden = false;
        out.textContent = '';
        out.append(
          document.createTextNode(
            match.score >= 0.95
              ? 'Đúng hết. '
              : `Khớp ${Math.round(match.score * 100)}% — ${match.missedWords.length ? `thiếu/khác: ${match.missedWords.join(', ')}` : ''}`
          )
        );
        if (match.score >= 0.95) {
          checkBtn.disabled = true;
          input.disabled = true;
        }
      });
      row.append(playButton(sentence), input, checkBtn, out);
      dictation.appendChild(row);
    }
    pane.appendChild(dictation);

    mountQuiz(quizHost, lesson.listening.questions, {
      initialAnswers: draftAnswers('listen'),
      onExplain: explainOption('Nghe', lesson.listening.text),
      onAnswerChange: (answers) => patchDraft({ answers: { ...state.draft?.answers, listen: answers } }),
      onSubmit: (result) => {
        recordEvent(
          'listen',
          {
            ...result,
            completedPlays: plays.count,
            transcriptViewed: Boolean(draftSupport().transcriptViewed)
          },
          { transcriptViewed: Boolean(draftSupport().transcriptViewed) }
        );
        remediationOffer(
          pane,
          'listen',
          lesson,
          lesson.listening.questions,
          result,
          lesson.listening.text
        );
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
      debounce = defer(() => {
        patchDraft({
          write: {
            [lesson.id]: {
              ...(state.draft?.write?.[lesson.id] || {}),
              responseText: textarea.value
            }
          }
        });
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
        patchDraft({
          write: {
            [lesson.id]: {
              ...(state.draft?.write?.[lesson.id] || {}),
              declaredFinalTime: declaredInput.value
            }
          }
        });
      });
      pane.append(text('label', 'Giờ cuối cùng bạn chốt', 'gate-label'), declaredInput);
    }

    const modelArea = document.createElement('div');
    modelArea.className = 'model-area';
    modelArea.hidden = true;
    pane.appendChild(modelArea);

    const gateNote = text('p', '', 'runner-notice');
    gateNote.hidden = true;

    // Correction loop: after a saved attempt the learner sees their text
    // against the closest model line, then can retry — attempts are recorded.
    let attempts = 0;
    const compare = document.createElement('div');
    compare.className = 'attempt-compare';
    compare.hidden = true;
    // AI review sits below the instant word-match: same feedback loop, but
    // with real error-level correction instead of overlap heuristics.
    const aiReview = document.createElement('div');
    aiReview.className = 'ai-review';
    aiReview.dataset.role = 'ai-review';
    aiReview.hidden = true;
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn-secondary';
    retryBtn.dataset.role = 'write-retry';
    retryBtn.textContent = 'Viết lại';
    retryBtn.hidden = true;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-primary';
    saveBtn.dataset.role = 'write-save';
    saveBtn.textContent = 'Lưu lần thử';
    saveBtn.hidden = true;
    pane.append(saveBtn, gateNote, compare, aiReview, retryBtn);

    modelBtn.addEventListener('click', () => {
      patchDraft({ support: { ...draftSupport(), modelRevealed: true } });
      const modelList = document.createElement('ul');
      for (const line of lesson.write.model) {
        const li = text('li', line);
        li.appendChild(playButton(line));
        modelList.appendChild(li);
      }
      modelArea.append(text('h3', 'Bài mẫu'), modelList);
      const checklist = document.createElement('div');
      checklist.className = 'checklist';
      lesson.write.checklist.forEach((item, i) => {
        const label = document.createElement('label');
        label.className = 'checklist-item';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.dataset.check = String(i);
        box.addEventListener('change', () => {
          saveBtn.disabled = false;
        });
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
          gateNote.textContent =
            check.reason === 'unparsed'
              ? 'Nhập giờ bạn chốt (vd: 7:00 hoặc "seven").'
              : check.reason === 'mismatch'
                ? 'Giờ chưa khớp tình huống — kiểm tra lại.'
                : 'Câu trả lời cần nhắc đúng giờ đã chốt.';
          gateNote.hidden = false;
          return;
        }
        gateNote.hidden = true;
      }
      saveBtn.disabled = true; // stays disabled until retry or text/checklist changes
      const checklist = [...modelArea.querySelectorAll('[data-check]')].map((box) => box.checked);
      attempts += 1;
      recordEvent(
        'write',
        {
          responseText: textarea.value,
          declaredFinalTime: declaredInput?.value || undefined,
          checklist,
          selfReviewed: true,
          attempt: attempts
        },
        { modelRevealed: true }
      );
      const model = closestModel(textarea.value, lesson.write.model);
      compare.textContent = '';
      compare.append(
        text('p', 'Bài của bạn — từ khớp mẫu được đánh dấu', 'compare-label'),
        markedAttempt(textarea.value, model),
        text('p', 'Mẫu gần nhất', 'compare-label'),
        text('p', model, 'en')
      );
      compare.hidden = false;
      textarea.disabled = true;
      retryBtn.hidden = false;
      if (state.tutor?.available) {
        aiReview.hidden = false;
        aiReview.textContent = 'AI đang chấm bài…';
        state.tutor
          .reviewWriting({
            setup: lesson.write.setup,
            prompt: lesson.write.prompt,
            modelLines: lesson.write.model,
            learnerText: textarea.value
          })
          .then((review) => {
            if (!aiReview.isConnected) return;
            aiReview.textContent = '';
            aiReview.appendChild(text('h4', 'Nhận xét của AI', 'ai-review-title'));
            if (review.praise) aiReview.appendChild(text('p', `✓ ${review.praise}`, 'ai-review-praise'));
            for (const err of (review.errors || []).slice(0, 3)) {
              aiReview.appendChild(text('p', `“${err.said}” → “${err.fix}” — ${err.why}`, 'ai-review-error'));
            }
            if (review.better) aiReview.appendChild(text('p', `Tự nhiên hơn: ${review.better}`, 'ai-review-better'));
          })
          .catch(() => {
            aiReview.hidden = true; // word-match compare stays the fallback
          });
      }
      continueLink(pane, 'write');
    });
    retryBtn.addEventListener('click', () => {
      compare.hidden = true;
      retryBtn.hidden = true;
      textarea.disabled = false;
      saveBtn.disabled = false;
      textarea.focus();
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

    // ── AI roleplay (Speak/Duolingo Max pattern): the model plays role B,
    // the learner produces real unscripted language — typed or spoken via
    // the browser's recognizer — then AI grades the lesson checklist. This
    // replaces "self-report that you spoke" whenever the tutor is available.
    if (state.tutor?.available) buildRoleplay(pane, lesson);

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
    [
      ['self', 'Tự luyện một mình'],
      ['partner', 'Có người nghe']
    ].forEach(([value, labelText]) => {
      const label = document.createElement('label');
      label.className = 'checklist-item';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `listener-${lesson.id}`;
      radio.value = value;
      radio.checked = listenerValue === value;
      radio.addEventListener('change', () => {
        listenerValue = value;
      });
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
      debounce = defer(() => {
        patchDraft({
          speak: {
            [lesson.id]: {
              ...(state.draft?.speak?.[lesson.id] || {}),
              responseText: textarea.value
            }
          }
        });
      }, 400);
    });
    spokeBox.addEventListener('change', () => {
      modelBtn.disabled = !spokeBox.checked;
      patchDraft({
        speak: {
          [lesson.id]: {
            ...(state.draft?.speak?.[lesson.id] || {}),
            spoke: spokeBox.checked
          }
        }
      });
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

    pane.append(
      text('p', 'Tự luyện (không cần AI)', 'self-study-label'),
      spoke,
      listener,
      textarea,
      modelBtn,
      modelArea,
      saveBtn,
      speakNote
    );

    modelBtn.addEventListener('click', () => {
      patchDraft({ support: { ...draftSupport(), modelRevealed: true } });
      const modelList = document.createElement('ul');
      for (const line of lesson.speak.model) {
        const li = text('li', line);
        li.appendChild(playButton(line));
        if (state.tutor?.available) {
          const check = pronunciationCheck(line);
          li.append(check.button, check.output);
        }
        modelList.appendChild(li);
      }
      modelArea.append(text('h3', 'Bài mẫu'), modelList);
      const checklist = document.createElement('div');
      checklist.className = 'checklist';
      lesson.speak.checklist.forEach((item, i) => {
        const label = document.createElement('label');
        label.className = 'checklist-item';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.dataset.check = String(i);
        box.addEventListener('change', () => {
          saveBtn.disabled = false;
        });
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
      recordEvent(
        'speak',
        {
          responseText: textarea.value,
          spoke: spokeBox.checked,
          listener: listenerValue,
          checklist
        },
        { modelRevealed: true }
      );
      continueLink(pane, 'speak');
    });
    stepNav(pane, 'speak');
  }
};

// AI conversation practice: the tutor plays role B under the lesson's
// scenario; learner turns are typed or dictated through SpeechRecognition.
// AI grades the lesson's own checklist at the end → real production evidence
// instead of a self-report checkbox. Any failure hides the block and the
// static self-report flow below remains the fallback.
function buildRoleplay(pane, lesson) {
  const partnerName =
    /tên\s+([^\s,.–—]+)/.exec(lesson.speak.roleB)?.[1] || 'bạn mới';
  const block = document.createElement('div');
  block.className = 'roleplay';
  block.dataset.role = 'roleplay';
  block.appendChild(
    text(
      'p',
      `Luyện hội thoại — AI đóng vai ${partnerName}. Gõ hoặc đọc tiếng Anh, cuối phiên AI chấm checklist.`,
      'roleplay-intro'
    )
  );

  const log = document.createElement('div');
  log.className = 'roleplay-log';
  log.hidden = true;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'roleplay-input';
  input.placeholder = 'Nhập tiếng Anh… (hoặc bấm mic để nói)';
  input.setAttribute('aria-label', 'Lượt nói của bạn');

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'btn-primary roleplay-send';
  sendBtn.textContent = 'Gửi';

  const micBtn = document.createElement('button');
  micBtn.type = 'button';
  micBtn.className = 'btn-secondary roleplay-mic';
  micBtn.textContent = '🎤 Nói';

  const composer = document.createElement('div');
  composer.className = 'roleplay-composer';
  composer.hidden = true;
  composer.append(input, sendBtn, micBtn);

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'btn-primary';
  startBtn.dataset.role = 'roleplay-start';
  startBtn.textContent = `Bắt đầu hội thoại với ${partnerName}`;

  const endBtn = document.createElement('button');
  endBtn.type = 'button';
  endBtn.className = 'btn-secondary';
  endBtn.dataset.role = 'roleplay-end';
  endBtn.textContent = 'Kết thúc & chấm điểm';
  endBtn.hidden = true;

  const feedback = document.createElement('div');
  feedback.className = 'roleplay-feedback';
  feedback.dataset.role = 'roleplay-feedback';
  feedback.hidden = true;

  const note = text('p', '', 'runner-notice');
  note.hidden = true;

  block.append(startBtn, log, composer, endBtn, feedback, note);
  pane.appendChild(block);

  let session = null;
  let busy = false;

  const addTurn = (who, content) => {
    const msg = document.createElement('p');
    msg.className = `roleplay-msg roleplay-${who}`;
    msg.append(
      text('strong', who === 'partner' ? `${partnerName}: ` : 'Bạn: '),
      document.createTextNode(content)
    );
    if (who === 'partner') msg.appendChild(playButton(content));
    log.appendChild(msg);
    msg.scrollIntoView({ block: 'nearest' });
  };

  const fail = (message) => {
    note.textContent = message;
    note.hidden = false;
    busy = false;
    startBtn.hidden = false;
    composer.hidden = true;
    endBtn.hidden = true;
  };

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'AI đang vào vai…';
    session = state.tutor.startRoleplay({
      scenario: `${lesson.speak.setup} ${lesson.speak.prompt}`,
      roleA: lesson.speak.roleA,
      roleB: lesson.speak.roleB,
      partnerName,
      checklist: lesson.speak.checklist,
      targetPhrases: lesson.speak.model
    });
    try {
      const opener = await session.start();
      addTurn('partner', opener);
    } catch {
      fail('AI chưa kết nối được — luyện ở phần tự luyện bên dưới.');
      return;
    }
    startBtn.hidden = true;
    log.hidden = false;
    composer.hidden = false;
    endBtn.hidden = false;
    input.focus();
  });

  const sendTurn = async () => {
    const value = input.value.trim();
    if (!value || busy || !session) return;
    busy = true;
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    addTurn('learner', value);
    try {
      addTurn('partner', await session.send(value));
    } catch {
      fail('AI mất kết nối giữa chừng — phần đã nói vẫn được giữ. Dùng phần tự luyện để hoàn thành.');
      return;
    } finally {
      busy = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  };
  sendBtn.addEventListener('click', sendTurn);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTurn();
  });

  // Dictation for the learner's turn — the recognizer fills the input so the
  // learner can review/correct what was heard before sending it.
  micBtn.addEventListener('click', () => {
    const rec = speechRecognizer();
    if (!rec) {
      note.textContent = 'Trình duyệt chưa hỗ trợ nhận giọng — thử Chrome/Edge.';
      note.hidden = false;
      return;
    }
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.addEventListener('result', (event) => {
      input.value = [...event.results]
        .map((r) => r[0]?.transcript || '')
        .join(' ');
    });
    micBtn.disabled = true;
    micBtn.textContent = '… đang nghe';
    rec.addEventListener('end', () => {
      micBtn.disabled = false;
      micBtn.textContent = '🎤 Nói';
    });
    rec.addEventListener('error', (event) => {
      if (event.error === 'not-allowed') {
        note.textContent = 'Chưa cấp quyền micro — cho phép micro rồi thử lại.';
        note.hidden = false;
      }
    });
    try {
      rec.start();
    } catch {
      micBtn.disabled = false;
      micBtn.textContent = '🎤 Nói';
    }
  });

  endBtn.addEventListener('click', async () => {
    if (!session) return;
    endBtn.disabled = true;
    endBtn.textContent = 'AI đang chấm…';
    try {
      const fb = await session.feedback();
      if (!feedback.isConnected) return;
      const items = fb.items || [];
      const passed = items.filter((i) => i.ok).length;
      feedback.appendChild(text('h3', `Kết quả hội thoại — ${passed}/${items.length} mục đạt`, 'roleplay-feedback-title'));
      const list = document.createElement('ul');
      list.className = 'roleplay-checklist';
      for (const item of items) {
        list.appendChild(text('li', `${item.ok ? '✓' : '✗'} ${item.check}${item.note ? ` — ${item.note}` : ''}`));
      }
      feedback.appendChild(list);
      if (fb.corrections?.length) {
        const fixes = document.createElement('ul');
        fixes.className = 'roleplay-corrections';
        for (const c of fb.corrections) {
          fixes.appendChild(text('li', `Bạn nói “${c.said}” → tự nhiên hơn: “${c.better}”`));
        }
        feedback.append(text('h4', 'Cần sửa'), fixes);
      }
      if (fb.summary) feedback.appendChild(text('p', fb.summary, 'roleplay-summary'));
      feedback.hidden = false;
      recordEvent(
        'speak',
        {
          roleplay: true,
          partner: partnerName,
          listener: 'ai',
          spoke: true,
          transcript: session.history,
          correct: passed,
          total: items.length,
          aiChecklist: items.map((i) => ({ check: i.check, ok: Boolean(i.ok) }))
        },
        { modelRevealed: false }
      );
      continueLink(pane, 'speak');
      composer.hidden = true;
      endBtn.hidden = true;
    } catch {
      endBtn.disabled = false;
      endBtn.textContent = 'Kết thúc & chấm điểm';
      note.textContent = 'AI chấm lỗi — thử lại hoặc dùng phần tự luyện.';
      note.hidden = false;
    }
  });
}

// Pronunciation check on-device: SpeechRecognition transcript → word diff,
// then the on-device model writes a targeted tip for what was missed (Nano
// is text-only, so the tip reasons from the transcript, not raw audio).
function pronunciationCheck(target) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-secondary pron-check';
  button.dataset.role = 'pron-check';
  button.textContent = '✨ Nói & chấm AI';
  const output = text('p', '', 'pron-check-out');
  output.hidden = true;

  button.addEventListener('click', () => {
    const rec = speechRecognizer();
    if (!rec) {
      output.textContent = 'Trình duyệt chưa hỗ trợ nhận giọng — thử Chrome/Edge.';
      output.hidden = false;
      return;
    }
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    button.disabled = true;
    button.textContent = '… đang nghe';
    output.hidden = true;
    rec.addEventListener('result', async (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      const match = matchSpeech(target, transcript);
      const parts = [
        match.score >= 0.8 ? 'Nghe rõ' : match.score > 0 ? 'Nghe được một phần' : 'Chưa nghe rõ',
        `"${transcript}"`
      ];
      if (match.missedWords.length && match.score < 1) {
        parts.push(`thiếu/lệch: ${match.missedWords.join(', ')}`);
      }
      output.textContent = parts.join(' — ');
      output.hidden = false;
      if (state.tutor?.available) {
        try {
          const { tip } = await state.tutor.assessPronunciation({
            target,
            transcript,
            missed: match.missedWords
          });
          if (tip && output.isConnected) output.textContent += ` ${tip}`;
        } catch {
          // diff output already shown — the tip is a bonus, not a gate
        }
      }
    });
    const reset = () => {
      button.disabled = false;
      button.textContent = '✨ Nói & chấm AI';
    };
    rec.addEventListener('end', reset);
    rec.addEventListener('error', (event) => {
      reset();
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        output.textContent = 'Chưa cấp quyền micro — cho phép micro rồi thử lại.';
        output.hidden = false;
      } else if (event.error === 'no-speech') {
        output.textContent = 'Không nghe thấy gì — nói to hơn rồi thử lại.';
        output.hidden = false;
      }
    });
    try {
      rec.start();
    } catch {
      reset();
    }
  });
  return { button, output };
}

function setTranslationsVisible(list, visible) {
  for (const vi of list.querySelectorAll('.translation')) vi.hidden = !visible;
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
