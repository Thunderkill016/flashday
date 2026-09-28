/*
 * Mission runner (issue #33, lesson.format === 'mission'): ONE communicative
 * mission — context → gist → notice → retrieve → interact → exit. One
 * screen at a time, one primary action; support fades instead of being
 * dumped up front. Every stage appends its own durable lesson event so the
 * evidence separates an unaided first attempt from work done after help.
 *
 * Forward motion is earned, not skipped: a stage's activity must be
 * submitted before its continue control exists. Revisiting an earlier
 * completed stage is allowed and just records another attempt.
 */
import { lessonById } from '../../content/a1/index.js';
import { restoreDraft } from '../../core/session.js';
import { appendLessonEvent } from '../../core/evidence.js';
import { enrollTasks } from '../../core/scheduler.js';
import { scoreExitTurn } from '../../core/mission-checks.js';
import { MISSION_STEPS, STEP_LABELS } from '../../core/progress.js';
import { mountQuiz } from '../components/quiz.js';
import { mountWordBank } from '../components/wordbank.js';
import {
  pickEnglishVoice,
  LEARNER_SPEECH_RATE,
  playButton,
  speakCheck,
  matchSpeech
} from '../speech.js';
import { lessonIcon } from '../icons.js';
import { playFeedback } from '../sound.js';

const STAGES = MISSION_STEPS;
let state = null;

export function mount(root, ctx) {
  const lesson = lessonById(ctx.params?.lessonId);
  if (!lesson || lesson.format !== 'mission') {
    root.innerHTML = `
      <section class="view-section">
        <h1>Không tìm thấy bài</h1>
        <p class="view-placeholder">Bài "${ctx.params?.lessonId || ''}" không phải dạng nhiệm vụ hoặc không tồn tại.</p>
        <p><a class="btn-secondary" href="#/today">Về Hôm nay</a></p>
      </section>`;
    state = null;
    return;
  }

  const draft = ctx.session.getDraft(lesson.id);
  const restore = restoreDraft(draft, lesson.contentVersion);

  state = {
    ctx,
    lesson,
    draft: restore.status === 'applied' ? draft : null,
    timers: new Set(),
    draftSaveTimer: null,
    stage: null
  };

  const section = document.createElement('section');
  section.className = 'view-section mission';

  const topbar = document.createElement('div');
  topbar.className = 'runner-topbar';
  topbar.innerHTML = `
    <a class="runner-back" href="#/path">← Lộ trình</a>
    <span class="runner-title">${lessonIcon(lesson)} ${escapeHtml(lesson.title)}</span>
    <span class="runner-progress" data-role="progress"></span>`;
  section.appendChild(topbar);

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

  // One live stage pane — the mission is a linear flow, not parallel panes.
  const host = document.createElement('div');
  host.className = 'mission-stage';
  host.dataset.role = 'mission-stage';
  section.appendChild(host);
  state.host = host;

  if (restore.status === 'stale') {
    const notice = document.createElement('p');
    notice.className = 'runner-notice';
    notice.dataset.role = 'stale-notice';
    notice.textContent = 'Bản nháp cũ từ phiên bản bài trước — nội dung đã đổi, bản nháp không được áp dụng.';
    section.insertBefore(notice, host);
    ctx.session.clearDraft(lesson.id);
    ctx.session.save();
  }

  root.appendChild(section);
  showStage(startStageIndex(ctx.params?.step));
}

// Router entry while the view stays mounted: a different stage param moves
// the flow (clamped by the same forward-only rule as mount).
export function update(ctx) {
  if (!state?.lesson || String(ctx.params?.lessonId) !== String(state.lesson.id)) return false;
  showStage(startStageIndex(ctx.params?.step));
  return true;
}

export function unmount() {
  if (!state) return;
  if (state.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  for (const timer of state.timers || []) clearTimeout(timer);
  state.ctx?.session.save();
  state = null;
}

/* ── stage bookkeeping ─────────────────────────────────────── */

function events() {
  return state.ctx.store.getState().lessonEvents || [];
}

function stageDone(stage) {
  return events().some((e) => e.lessonId === state.lesson.id && e.step === stage);
}

function firstIncomplete() {
  const idx = STAGES.findIndex((stage) => !stageDone(stage));
  return idx === -1 ? STAGES.length : idx;
}

// A requested stage is allowed when it does not skip unfinished work:
// completed stages and the first incomplete one are fair targets.
function startStageIndex(requested) {
  const open = firstIncomplete();
  const reqIdx = STAGES.indexOf(requested);
  if (open === STAGES.length) return reqIdx >= 0 ? reqIdx : STAGES.length - 1;
  if (reqIdx >= 0 && reqIdx <= open) return reqIdx;
  const draftIdx = STAGES.indexOf(state?.draft?.step);
  if (reqIdx < 0 && draftIdx >= 0 && draftIdx <= open) return draftIdx;
  return open;
}

function showStage(index) {
  const stage = STAGES[Math.max(0, Math.min(STAGES.length - 1, index))];
  state.stage = stage;
  state.host.textContent = '';
  state.host.dataset.stage = stage;
  builders[stage](state.host);
  const top = state.host.closest('.mission');
  const done = STAGES.filter(stageDone).length;
  top.querySelector('[data-role="progress"]').textContent =
    `Phần ${STAGES.indexOf(stage) + 1}/${STAGES.length} — ${STEP_LABELS[stage]}`;
  const bar = top.querySelector('[data-role="lesson-progress"] i');
  bar.style.width = `${Math.round((done / STAGES.length) * 100)}%`;
  state.ctx.session.setLast({ lessonId: state.lesson.id, step: stage });
  state.draft = state.ctx.session.setDraft(state.lesson.id, {
    contentVersion: state.lesson.contentVersion,
    step: stage
  });
  scheduleDraftSave();
  const h2 = state.host.querySelector('h2');
  if (h2) {
    h2.tabIndex = -1;
    h2.focus();
  }
}

function nextStage() {
  showStage(STAGES.indexOf(state.stage) + 1);
}

// taskPlan = [{ kinds, chunkIds }] — enrollment is computed per stage from
// what the learner ACTUALLY exercised, never "every chunk × every kind":
// notice mints recognition for seen chunks, retrieve mints recall for
// attempted items, exit mints production only for chunks the turn's
// `produces` declares. Lesson 1 mints NO listening cards: playing audio
// while the text is visible is exposure, not audio→meaning retrieval
// (issue #33 round 3).
function recordStage(stage, payload, support, taskPlan = []) {
  const { ctx, lesson } = state;
  ctx.store.transact((db) => {
    appendLessonEvent(db, {
      lessonId: lesson.id,
      contentVersion: lesson.contentVersion,
      step: stage,
      kind: stage,
      payload,
      support
    });
    for (const plan of taskPlan) {
      if (!plan?.kinds?.length) continue;
      if (plan.chunkIds != null && !plan.chunkIds.length) continue;
      enrollTasks(db, lesson, plan.kinds, Date.now(), plan.chunkIds ?? null);
    }
  });
}

function patchMission(patch) {
  const current = state.draft?.mission && typeof state.draft.mission === 'object' ? state.draft.mission : {};
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || (Array.isArray(value) && !value.length)) delete next[key];
    else next[key] = value;
  }
  state.draft = state.ctx.session.setDraft(state.lesson.id, {
    contentVersion: state.lesson.contentVersion,
    step: state.stage,
    mission: next
  });
  scheduleDraftSave();
}

function defer(fn, ms) {
  const timer = setTimeout(() => {
    state?.timers?.delete(timer);
    fn();
  }, ms);
  state?.timers?.add(timer);
  return timer;
}

function scheduleDraftSave() {
  const status = state.host?.closest('.mission')?.querySelector('[data-role="draft-status"]');
  if (state.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = defer(() => {
    const result = state.ctx.session.save();
    if (status) {
      status.textContent = result.ok ? 'Đã lưu nháp trên thiết bị' : 'Không lưu được bản nháp trên thiết bị';
      status.dataset.tone = result.ok ? 'ok' : 'error';
    }
  }, 400);
}

/* ── small shared ui ───────────────────────────────────────── */

function text(tag, content, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = content;
  return el;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function speakerAvatar(name) {
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = String(name || '?')[0];
  avatar.style.setProperty('--avatar-h', String(((name || '?').charCodeAt(0) * 47) % 360));
  avatar.title = name;
  return avatar;
}

function chatLine({ speaker, en, vi, you = false, onPlay = null, onPlayDegraded = null }) {
  const row = document.createElement('div');
  row.className = `mission-line${you ? ' mission-line-you' : ''}`;
  const bubble = document.createElement('div');
  bubble.className = 'mission-bubble';
  bubble.append(speakerAvatar(speaker), text('span', en, 'en'));
  const viEl = text('p', vi || '', 'vi translation');
  bubble.appendChild(viEl);
  const play = playButton(en, { onDegraded: () => onPlayDegraded?.() });
  // playButton's own handler runs first and marks degradation, so onPlay
  // here means the click happened — callers decide how to count it.
  if (onPlay) play.addEventListener('click', onPlay);
  row.append(play, bubble);
  return row;
}

// Sequential TTS over a list of texts — the situation is heard as one
// exchange, not a pile of separate play buttons.
function speakSequence(texts, { rate = LEARNER_SPEECH_RATE, onend } = {}) {
  const synthesis = window.speechSynthesis;
  if (!synthesis) return false;
  const voice = pickEnglishVoice(synthesis.getVoices());
  if (!voice) return false;
  synthesis.cancel();
  let i = 0;
  const next = () => {
    if (i >= texts.length) {
      onend?.();
      return;
    }
    const utter = new SpeechSynthesisUtterance(texts[i++]);
    utter.voice = voice;
    utter.lang = voice.lang;
    utter.rate = rate;
    utter.onend = next;
    utter.onerror = () => {};
    synthesis.speak(utter);
  };
  next();
  return true;
}

/* ── stage renderers ───────────────────────────────────────── */

const builders = {
  // 1. SEE THE SITUATION — the whole exchange first, translation on demand.
  // Completion requires ONE real exposure action: hearing the exchange
  // (play-all or a line), the explicit no-TTS fallback, or the explicit
  // "read instead" skip — translations alone are support, not exposure,
  // and a silent click-through mints nothing — issue #33 round 2/3.
  context(host) {
    const m = state.lesson.mission;
    host.appendChild(text('h2', `${STEP_LABELS.context} — ${m.title}`));
    host.appendChild(text('p', m.scene, 'mission-scene'));

    const playedLines = new Set();
    const degradedLines = new Set();
    let playedAll = false;
    let ttsUnavailable = false;
    let translationViewed = false;
    // audioSkipped = the learner explicitly chose text over audio — an
    // accessibility path recorded as its own provenance, distinct from
    // a broken-voice fallback.
    let audioSkipped = false;
    let armed = false;

    const nav = missionNav(null);
    const gate = text('p', 'Nghe đoạn hội thoại — hoặc bấm "Đọc thay vì nghe" — để tiếp tục.', 'view-placeholder');

    const showTranslations = () => {
      translationViewed = true;
      for (const viEl of lines.querySelectorAll('.translation')) viEl.hidden = false;
    };

    const lines = document.createElement('div');
    lines.className = 'mission-dialogue';
    m.lines.forEach((line, i) => {
      lines.appendChild(
        chatLine({
          ...line,
          you: Boolean(line.you),
          onPlay: () => {
            // playButton's handler ran first: only count the play as
            // exposure when the speech actually fired.
            if (degradedLines.has(i)) return;
            playedLines.add(i);
            maybeArm();
          },
          onPlayDegraded: () => {
            degradedLines.add(i);
            ttsUnavailable = true;
            // Explicit fallback: no voice → the text path is the exposure.
            showTranslations();
            maybeArm();
          }
        })
      );
    });
    // Translations hidden until asked for — support is on-demand, recorded.
    for (const viEl of lines.querySelectorAll('.translation')) viEl.hidden = true;
    host.appendChild(lines);

    // "Hiện nghĩa" is support only — it reveals the text but does NOT
    // complete exposure when a voice exists (issue #33 round 3).
    const translateBtn = document.createElement('button');
    translateBtn.type = 'button';
    translateBtn.className = 'btn-secondary';
    translateBtn.dataset.role = 'translation-toggle';
    translateBtn.textContent = 'Hiện nghĩa';
    translateBtn.addEventListener('click', () => {
      showTranslations();
      translateBtn.disabled = true;
    });
    host.appendChild(translateBtn);

    // The deliberate audio skip: an explicit action for learners who
    // can't/don't want audio — arms the gate and is recorded as its own
    // provenance (audioSkipped), never laundered into a play.
    const skipAudio = document.createElement('button');
    skipAudio.type = 'button';
    skipAudio.className = 'btn-secondary';
    skipAudio.dataset.role = 'read-skip';
    skipAudio.textContent = 'Đọc thay vì nghe';
    skipAudio.addEventListener('click', () => {
      audioSkipped = true;
      showTranslations();
      translateBtn.disabled = true;
      skipAudio.disabled = true;
      maybeArm();
    });
    host.appendChild(skipAudio);

    const voiceStatus = text('p', '', 'runner-notice');
    voiceStatus.setAttribute('aria-live', 'polite');
    const playAll = document.createElement('button');
    playAll.type = 'button';
    playAll.className = 'btn-secondary';
    playAll.dataset.role = 'play-all';
    playAll.textContent = '🔊 Nghe cả đoạn';
    playAll.addEventListener('click', () => {
      const ok = speakSequence(m.lines.map((line) => line.en));
      if (!ok) {
        // Explicit no-TTS fallback: the text path IS the exposure — show
        // the translations and record that audio never happened.
        ttsUnavailable = true;
        showTranslations();
        voiceStatus.textContent =
          'Thiết bị không có giọng đọc tiếng Anh — hãy đọc lời thoại kèm nghĩa bên dưới.';
        translateBtn.disabled = true;
        skipAudio.disabled = true;
        playAll.disabled = true;
        maybeArm();
        return;
      }
      playedAll = true;
      maybeArm();
    });
    host.append(playAll, voiceStatus, gate, nav);

    function maybeArm() {
      if (armed) return;
      const exposed = playedAll || playedLines.size > 0 || audioSkipped || ttsUnavailable;
      if (!exposed) return;
      armed = true;
      gate.hidden = true;
      armPrimary(nav, 'Hiểu đoạn này →', () => {
        const linesHeard = [...playedLines].filter((i) => !degradedLines.has(i));
        // Context is exposure only — it mints NO tasks. Listening cards
        // would be dishonest here: the learner saw the text while audio
        // played, which is not audio→meaning retrieval.
        recordStage(
          'context',
          {
            lines: m.lines.length,
            plays: playedLines.size + (playedAll ? 1 : 0),
            linesHeard,
            heardAll: playedAll || linesHeard.length === m.lines.length,
            translationViewed,
            ttsUnavailable,
            audioSkipped
          },
          { translationViewed }
        );
        nextStage();
      });
    }
  },

  // 2. UNDERSTAND — 1–2 gist checks about what just happened.
  gist(host) {
    const m = state.lesson.mission;
    host.appendChild(text('h2', STEP_LABELS.gist));
    host.appendChild(text('p', 'Trả lời về đoạn hội thoại vừa nghe.'));
    const quizHost = document.createElement('div');
    host.appendChild(quizHost);
    const nav = missionNav('context');
    host.appendChild(nav);
    mountQuiz(quizHost, m.gist, {
      onSubmit: (result) => {
        recordStage('gist', result, {});
        armPrimary(nav, 'Học các cụm →', nextStage);
      }
    });
  },

  // 3. NOTICE + IMITATE — each phrase once: see it, hear it, say it back.
  notice(host) {
    const chunks = state.lesson.chunks;
    host.appendChild(text('h2', STEP_LABELS.notice));
    host.appendChild(text('p', 'Bốn cụm từ bạn vừa nghe. Nghe → đọc theo → qua cụm tiếp.'));

    const card = document.createElement('div');
    card.className = 'mission-notice-card';
    host.appendChild(card);
    const counter = text('p', '', 'view-placeholder');
    const seen = new Set();
    const heard = new Set();
    const degradedChunks = new Set();
    let speakAttempts = 0;
    let cursor = 0;

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn-secondary';
    prev.textContent = '← Trước';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn-secondary';
    next.textContent = 'Cụm tiếp →';
    const nav = document.createElement('div');
    nav.className = 'chunk-pager-nav';
    nav.append(prev, counter, next);
    host.appendChild(nav);

    const navRow = missionNav('gist');
    let continueBtn = null;
    host.appendChild(navRow);

    const render = () => {
      const chunk = chunks[cursor];
      seen.add(chunk.id);
      card.textContent = '';
      card.append(
        text('strong', chunk.target, 'chunk-target'),
        text('span', ` ${chunk.meaning}`, 'chunk-meaning'),
        text('p', `${chunk.example} — ${chunk.exampleVi}`, 'mission-example')
      );
      const controls = document.createElement('div');
      controls.className = 'chunk-controls';
      const sayCheck = speakCheck(chunk.example);
      sayCheck.button.addEventListener('click', () => {
        speakAttempts += 1;
      });
      // Play clicks go into the payload as activity evidence only —
      // lesson 1 mints no listening tasks (issue #33 round 3): audio
      // played next to its own text is exposure, not retrieval.
      const play = playButton(chunk.example, {
        onDegraded: () => degradedChunks.add(chunk.id)
      });
      play.addEventListener('click', () => {
        if (!degradedChunks.has(chunk.id)) heard.add(chunk.id);
      });
      controls.append(play, sayCheck.button);
      card.append(controls, sayCheck.output);
      counter.textContent = `Cụm ${cursor + 1}/${chunks.length}`;
      prev.disabled = cursor === 0;
      next.disabled = cursor === chunks.length - 1;
      if (seen.size === chunks.length && !continueBtn) {
        continueBtn = armPrimary(navRow, 'Nhớ lại các cụm →', () => {
          // Saw the chunk→meaning pair = form recognition introduced.
          // Meaning→English recall has NOT happened yet — that mints at
          // retrieve. Audio plays mint nothing (exposure, not retrieval).
          recordStage(
            'notice',
            { chunks: chunks.length, viewed: [...seen], heard: [...heard], speakAttempts },
            {},
            [{ kinds: ['form_recognition'], chunkIds: [...seen] }]
          );
          nextStage();
        });
      }
    };
    prev.addEventListener('click', () => { if (cursor > 0) { cursor -= 1; render(); } });
    next.addEventListener('click', () => { if (cursor < chunks.length - 1) { cursor += 1; render(); } });
    render();
  },

  // 4. GUIDED RETRIEVAL — VI cue → type the English. Hint and answer are
  // support levels, each recorded; an item only completes when typed right.
  retrieve(host) {
    const items = state.lesson.mission.retrieval;
    host.appendChild(text('h2', STEP_LABELS.retrieve));
    host.appendChild(text('p', 'Nghe lời nhắc tiếng Việt — tự gõ câu tiếng Anh. Không có đáp án sẵn.'));

    const results = [];
    let index = 0;

    const card = document.createElement('div');
    card.className = 'mission-retrieve-card';
    const navRow = missionNav('notice');
    host.append(card, navRow);

    const finish = () => {
      const correct = results.filter((r) => r.ok && !r.usedHint && !r.usedAnswer).length;
      // VI cue → typed English IS meaning recall — mint it here, per chunk
      // actually attempted, not at notice where the pair was only shown.
      const attempted = results.filter((r) => r && r.attempts > 0).map((r) => r.chunkId);
      recordStage(
        'retrieve',
        {
          items: results,
          correct,
          total: results.length
        },
        {
          hintViewed: results.some((r) => r.usedHint),
          modelRevealed: results.some((r) => r.usedAnswer)
        },
        attempted.length ? [{ kinds: ['meaning_recall'], chunkIds: attempted }] : []
      );
      nextStage();
    };

    const renderItem = () => {
      const item = items[index];
      const record = { chunkId: item.chunkId, attempts: 0, usedHint: false, usedAnswer: false, ok: false };
      card.textContent = '';
      card.append(
        text('p', `Nhớ lại ${index + 1}/${items.length}`, 'view-placeholder'),
        text('p', item.cue, 'mission-cue')
      );
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'mission-input';
      input.placeholder = 'Gõ câu tiếng Anh…';
      input.setAttribute('aria-label', 'Câu trả lời');
      const out = text('p', '', 'mission-feedback');
      out.hidden = true;
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'btn-primary';
      check.dataset.role = 'retrieve-check';
      check.textContent = 'Kiểm tra';
      const hintBtn = document.createElement('button');
      hintBtn.type = 'button';
      hintBtn.className = 'btn-secondary';
      hintBtn.dataset.role = 'retrieve-hint';
      hintBtn.textContent = 'Gợi ý';
      const answerBtn = document.createElement('button');
      answerBtn.type = 'button';
      answerBtn.className = 'btn-secondary';
      answerBtn.dataset.role = 'retrieve-answer';
      answerBtn.textContent = 'Xem đáp án';
      const row = document.createElement('div');
      row.className = 'mission-row';
      row.append(check, hintBtn, answerBtn);
      card.append(input, row, out);

      const showScaffold = (level) => {
        out.hidden = false;
        if (level === 'hint') {
          record.usedHint = true;
          const scaffold = item.answer
            .split(' ')
            .map((w) => (w.length > 1 ? `${w[0]}${'·'.repeat(w.length - 1)}` : w))
            .join(' ');
          out.textContent = `Gợi ý: ${scaffold}`;
        } else {
          record.usedAnswer = true;
          out.textContent = `Đáp án: ${item.answer} — gõ lại để qua.`;
        }
      };
      hintBtn.addEventListener('click', () => showScaffold('hint'));
      answerBtn.addEventListener('click', () => showScaffold('answer'));

      const submit = () => {
        const value = input.value.trim();
        if (!value) return;
        record.attempts += 1;
        const match = matchSpeech(item.answer, value);
        if (match.score >= 0.9) {
          record.ok = true;
          results[index] = record;
          out.hidden = false;
          out.textContent = match.score >= 1 ? 'Đúng.' : `Đúng — nghe được "${match.heard}".`;
          out.classList.add('mission-ok');
          index += 1;
          if (index < items.length) defer(renderItem, 500);
          else defer(finish, 500);
        } else {
          out.hidden = false;
          out.classList.remove('mission-ok');
          out.textContent = match.missedWords.length
            ? `Còn thiếu: ${match.missedWords.join(', ')} — thử lại.`
            : 'Chưa đúng — thử lại hoặc dùng gợi ý.';
          if (record.attempts >= 3) answerBtn.disabled = false;
        }
      };
      check.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
      // Hint is requestable at any time (its use is recorded); the full
      // answer stays behind two failed attempts so it is a last resort.
      answerBtn.disabled = true;
      input.focus();
    };
    renderItem();
  },

  // 5. MICRO-INTERACTION — Mia speaks; the learner assembles each reply
  // from a word bank (still scaffolded, inside a real exchange frame).
  interact(host) {
    const data = state.lesson.mission.interact;
    host.appendChild(text('h2', `${STEP_LABELS.interact} — ${data.partner}`));
    host.appendChild(text('p', data.setup));

    const thread = document.createElement('div');
    thread.className = 'mission-dialogue';
    host.appendChild(thread);
    const navRow = missionNav('retrieve');
    host.appendChild(navRow);

    const results = [];
    let index = 0;

    const renderTurn = () => {
      const turn = data.turns[index];
      thread.appendChild(chatLine({ speaker: data.partner, en: turn.them, vi: turn.themVi }));
      const record = { turn: index, attempts: 0, ok: false };
      const wbHost = document.createElement('div');
      wbHost.className = 'mission-interact-wb';
      thread.appendChild(wbHost);
      const words = turn.you.split(/\s+/).filter(Boolean);
      mountWordBank(wbHost, [{ prompt: 'Bạn trả lời:', answer: turn.you, words, extra: turn.extra || [] }], {
        onDone: () => {
          record.ok = true;
          results[index] = record;
          index += 1;
          if (index < data.turns.length) {
            defer(renderTurn, 500);
          } else {
            const correct = results.filter((r) => r.attempts <= 1).length;
            recordStage('interact', { turns: results, correct, total: results.length }, {});
            armPrimary(navRow, 'Tự làm với người mới →', nextStage);
          }
        }
      });
      // mountWordBank hides attempt counts — count every check press so
      // "first-try" stays honest in the durable payload.
      wbHost.querySelector('.wb-check').addEventListener('click', () => {
        record.attempts += 1;
      });
    };
    renderTurn();
  },

  // 6. EXIT TASK — a new person. Progressive support, never model-first:
  //   attempt 1: unaided, frozen before ANY feedback
  //   feedback 1: per-goal ✓/✗ + targeted hints for misses — no model
  //   attempt 2: hintViewed; if it still misses → full model revealed
  //   attempt 3+: modelRevealed
  // A perfect unaided run never reveals the model.
  exit(host) {
    const ex = state.lesson.mission.exit;
    host.appendChild(text('h2', `${STEP_LABELS.exit} — gặp ${ex.partner}`));
    host.appendChild(text('p', ex.setup));

    const priorAttempts = events().filter((e) => e.lessonId === state.lesson.id && e.step === 'exit').length;
    const draftMission = state.draft?.mission || {};
    const draftResponses = Array.isArray(draftMission.exitResponses) && priorAttempts === 0
      ? draftMission.exitResponses
      : [];

    // Support that was visible BEFORE this attempt — restored from the
    // draft so a reload can't launder an aided retry into an unaided one.
    const priorSupport = priorAttempts > 0 && draftMission.exitSupport
      ? { ...draftMission.exitSupport }
      : {};

    // Which goals the previous recorded attempt missed — rebuilt from the
    // durable event (not the draft) so per-turn hints survive a reload.
    const lastExit = events()
      .filter((e) => e.lessonId === state.lesson.id && e.step === 'exit')
      .at(-1);
    const missedByTurn = new Map();
    for (const r of lastExit?.payload?.responses || []) {
      const missed = (r.missed || [])
        .map((key) => ex.turns[r.turn]?.checks.find((c) => c.key === key))
        .filter(Boolean);
      if (missed.length) missedByTurn.set(r.turn, missed);
    }

    const attempt = {
      no: priorAttempts + 1,
      support: priorSupport,
      missedByTurn,
      responses: draftResponses.map((r) => ({ ...r }))
    };

    const thread = document.createElement('div');
    thread.className = 'mission-dialogue';
    host.appendChild(thread);
    host.appendChild(missionNav('interact'));

    const feedback = document.createElement('div');
    feedback.className = 'mission-exit-feedback';

    const recordAttempt = () => {
      const all = attempt.responses;
      const met = all.reduce((sum, r) => sum + r.met, 0);
      const total = all.reduce((sum, r) => sum + r.total, 0);
      // Production tasks mint only for chunks the learner was actually
      // asked to produce in a submitted turn (`produces`) — the partner's
      // own phrases (e.g. c3 "Nice to meet you." from Sam) never enroll.
      const produced = new Set();
      for (const r of all) (ex.turns[r.turn]?.produces || []).forEach((id) => produced.add(id));
      const aided = Boolean(attempt.support.hintViewed || attempt.support.modelRevealed);
      recordStage(
        'exit',
        {
          attempt: attempt.no,
          unaidedFirst: attempt.no === 1 && !aided,
          aided,
          responses: all.map((r) => ({
            turn: r.turn,
            response: r.response,
            met: r.checks.filter((c) => c.met).map((c) => c.key),
            missed: r.checks.filter((c) => !c.met).map((c) => c.key),
            score: r.score
          })),
          correct: met,
          total
        },
        {
          hintViewed: Boolean(attempt.support.hintViewed),
          modelRevealed: Boolean(attempt.support.modelRevealed)
        },
        produced.size ? [{ kinds: ['cued_production'], chunkIds: [...produced] }] : []
      );
      patchMission({ exitResponses: [], exitSupport: null });
    };

    const showFeedback = () => {
      feedback.textContent = '';
      const missedByTurnNow = new Map();
      for (const r of attempt.responses) {
        const missed = r.checks.filter((c) => !c.met);
        if (missed.length) missedByTurnNow.set(r.turn, missed);
      }
      const totalMissed = [...missedByTurnNow.values()].reduce((n, l) => n + l.length, 0);
      // The full model auto-reveals only after an AIDED attempt still
      // misses goals — attempt-1 feedback stays at hint level.
      let modelShown = attempt.no >= 2 && totalMissed > 0;

      feedback.appendChild(text('h3', totalMissed ? 'Kết quả lần thử' : 'Làm được rồi'));
      const modelSlots = [];
      for (const r of attempt.responses) {
        const turn = ex.turns[r.turn];
        const block = document.createElement('div');
        block.className = 'exit-check';
        block.appendChild(text('p', `Bạn nói: "${r.response}"`, 'exit-response'));
        const list = document.createElement('ul');
        list.className = 'exit-checks';
        for (const check of r.checks) {
          const li = text('li', check.met ? `✓ ${check.label}` : `✗ ${check.label} — ${check.hint}`);
          li.className = check.met ? 'check-met' : 'check-missed';
          list.appendChild(li);
        }
        block.appendChild(list);
        const modelSlot = document.createElement('div');
        modelSlot.dataset.role = 'exit-model';
        if (modelShown) {
          modelSlot.append(text('p', `Mẫu: ${turn.model}`, 'en'), playButton(turn.model));
        }
        block.appendChild(modelSlot);
        modelSlots.push({ slot: modelSlot, turn });
        feedback.appendChild(block);
      }

      // The NEXT attempt's provenance is written the moment support lands
      // on screen — persisting at render/click time (not at retry) keeps an
      // intervening reload from laundering an aided retry into unaided.
      const nextSupport = {
        hintViewed: Boolean(attempt.support.hintViewed) || totalMissed > 0,
        modelRevealed: Boolean(attempt.support.modelRevealed) || modelShown
      };
      patchMission({ exitSupport: nextSupport, exitResponses: [] });

      const actions = document.createElement('div');
      actions.className = 'mission-row';
      // Explicit reveal is the learner's choice — the NEXT attempt records
      // modelRevealed for it; the frozen attempt is already durable.
      if (!modelShown) {
        const showModel = document.createElement('button');
        showModel.type = 'button';
        showModel.className = 'btn-secondary';
        showModel.dataset.role = 'exit-model-reveal';
        showModel.textContent = 'Xem mẫu';
        showModel.addEventListener('click', () => {
          modelShown = true;
          nextSupport.modelRevealed = true;
          patchMission({ exitSupport: nextSupport });
          for (const { slot, turn } of modelSlots) {
            slot.append(text('p', `Mẫu: ${turn.model}`, 'en'), playButton(turn.model));
          }
          showModel.disabled = true;
        });
        actions.appendChild(showModel);
      }
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn-secondary';
      retry.dataset.role = 'exit-retry';
      retry.textContent = nextSupport.modelRevealed || totalMissed === 0 ? 'Thử lại từ đầu' : 'Thử lại có gợi ý';
      retry.addEventListener('click', () => {
        attempt.support = { ...nextSupport };
        attempt.missedByTurn = missedByTurnNow;
        feedback.remove();
        thread.textContent = '';
        attempt.responses = [];
        attempt.no += 1;
        renderTurn(0);
      });
      const done = document.createElement('a');
      done.className = 'btn-primary';
      done.dataset.role = 'exit-done';
      done.href = `#/summary/${state.lesson.id}`;
      done.textContent = 'Xem kết quả';
      actions.append(retry, done);
      feedback.appendChild(actions);
      host.appendChild(feedback);
      feedback.querySelector('h3')?.focus?.();
      playFeedback('complete');
    };

    const renderTurn = (turnIdx) => {
      const turn = ex.turns[turnIdx];
      thread.appendChild(chatLine({ speaker: ex.partner, en: turn.them, vi: turn.themVi }));
      const row = document.createElement('div');
      row.className = 'mission-line mission-line-you';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'mission-input';
      input.placeholder = attempt.support.modelRevealed
        ? 'Nói lại — lần này đã có mẫu ở dưới'
        : attempt.support.hintViewed
          ? 'Thử lại — có gợi ý ở dưới'
          : 'Bạn nói gì? (không có mẫu)';
      input.setAttribute('aria-label', `Lượt của bạn ${turnIdx + 1}`);
      const send = document.createElement('button');
      send.type = 'button';
      send.className = 'btn-primary';
      send.dataset.role = 'exit-send';
      send.textContent = 'Gửi';
      row.append(input, send);
      thread.appendChild(row);
      // Aid under the input: the model when revealed, else only the hints
      // for goals this turn missed last time — never the full answer.
      if (attempt.support.modelRevealed) {
        row.appendChild(text('p', `Mẫu: ${turn.model}`, 'view-placeholder'));
      } else if (attempt.support.hintViewed) {
        const missed = attempt.missedByTurn?.get(turnIdx) || [];
        if (missed.length) {
          row.appendChild(
            text('p', `Gợi ý: ${missed.map((c) => c.hint).join(' ')}`, 'view-placeholder exit-hint')
          );
        }
      }
      input.focus();

      const submit = () => {
        const value = input.value.trim();
        if (!value) return;
        input.disabled = true;
        send.disabled = true;
        const scored = scoreExitTurn(turn, value);
        attempt.responses[turnIdx] = { turn: turnIdx, response: value, ...scored };
        // Freeze-and-record happens once per whole exchange — the attempt
        // is only durable after the learner finishes all turns.
        patchMission({ exitResponses: attempt.responses.filter(Boolean).map((r) => ({ ...r })) });
        if (turnIdx + 1 < ex.turns.length) renderTurn(turnIdx + 1);
        else {
          recordAttempt();
          showFeedback();
        }
      };
      send.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    };

    // Restore frozen pre-reload responses: they were typed unaided before
    // any support existed, so keeping them in this attempt stays honest.
    let resumeIdx = 0;
    for (const saved of attempt.responses) {
      const turn = ex.turns[saved.turn];
      thread.appendChild(chatLine({ speaker: ex.partner, en: turn.them, vi: turn.themVi }));
      const row = document.createElement('div');
      row.className = 'mission-line mission-line-you';
      const frozen = text('p', saved.response, 'en');
      row.appendChild(frozen);
      thread.appendChild(row);
      resumeIdx = saved.turn + 1;
    }
    if (resumeIdx < ex.turns.length) renderTurn(resumeIdx);
    else {
      recordAttempt();
      showFeedback();
    }
  }
};

function missionNav(prevStage) {
  const nav = document.createElement('div');
  nav.className = 'runner-nav mission-nav';
  if (prevStage) {
    const back = document.createElement('a');
    back.className = 'btn-secondary';
    back.textContent = `← ${STEP_LABELS[prevStage]}`;
    back.href = `#/lesson/${state.lesson.id}/${prevStage}`;
    nav.appendChild(back);
  }
  const primary = document.createElement('button');
  primary.type = 'button';
  primary.className = 'btn-primary mission-primary';
  primary.textContent = 'Tiếp tục';
  primary.hidden = true;
  nav.appendChild(primary);
  return nav;
}

// The single primary action exists only when the stage's work is done —
// there is no "Học tiếp" that skips an empty exercise.
function armPrimary(nav, label, onClick) {
  const primary = nav.querySelector('.mission-primary');
  primary.textContent = label;
  primary.hidden = false;
  primary.addEventListener('click', onClick);
  return primary;
}
