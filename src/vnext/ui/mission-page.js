/*
 * vNext mission page (issue #55).
 *
 * Thin DOM layer over createMissionSession — renders screen
 * descriptors, forwards learner actions, and displays support the
 * learner actually saw. It never computes outcomes or capability
 * state; every visible claim about progress comes from the session's
 * evidence-derived descriptors.
 */
import { createMissionSession } from '../ui-session.js';
import { createLocalEventStore, createLocalRunStore, createLocalDecisionStore } from './local-store.js';
import { SELECTION_MODES } from '../next-for-you/selector.js';
import {
  PURPOSE_FRAME, FUNCTION_MODEL, FUNCTION_HINT, CAP_LABEL,
  TASK_SITUATION, MISSION_INTRO, progressCopy, SUMMARY_COPY,
  FEEDBACK_COPY, SUPPORT_LABEL
} from './copy.js';
import { speakEnglish } from '../../ui/speech.js';
import { FIXTURES } from '../fixtures.js';
import { CAPABILITIES } from '../capabilities.js';
import { RISK_PRIORS } from '../risk-priors.js';
import { LEARNING_POLICY_V1 } from '../policy.js';

const MISSIONS = Object.fromEntries(
  FIXTURES.map((f) => [f.mission.id, f])
);
/* The task registry is the WHOLE curriculum, not just this mission's
 * taskIds — evidence bound under earlier missions' tasks must still
 * verify here or prerequisite gates appear unmet (carried prereqs
 * would look NOT_SEEN and the mission would deadlock). Routing stays
 * scoped: the selector only serves ids declared in mission.taskIds. */
const TASK_REGISTRY = FIXTURES.flatMap((f) => f.tasks);

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'class') node.className = v;
    else if (k.startsWith('data-')) node.setAttribute(k, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) node.append(c);
  return node;
};

const modelFor = (functions, learnerName) =>
  functions.map((fn) => (FUNCTION_MODEL[fn] ?? null))
    .filter(Boolean)
    .map((m) => m.split('<name>').join(learnerName ?? '…'));

export async function bootMissionPage(root) {
  const params = new URLSearchParams(location.search);
  const learnerId = params.get('learner') || 'dev';
  const missionId = params.get('mission') || 'mission.meet_new_person';
  const spec = MISSIONS[missionId];
  if (!spec) {
    root.replaceChildren(el('p', { text: `Không tìm thấy nhiệm vụ '${missionId}'.`, class: 'vnext-error' }));
    return;
  }

  /* 008C §19: this dedicated surface deliberately runs B0 by default;
   * ?mode=reference|shadow overrides for comparison and debugging. An
   * unrecognized value fails closed to reference, never silently to an
   * unintended policy. */
  const modeParam = params.get('mode');
  const selectionMode = modeParam == null
    ? SELECTION_MODES.B0
    : Object.values(SELECTION_MODES).includes(modeParam)
      ? modeParam
      : SELECTION_MODES.REFERENCE;

  const session = createMissionSession({
    learnerId,
    mission: spec.mission,
    tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1,
    eventStore: createLocalEventStore(learnerId),
    runStore: createLocalRunStore(learnerId),
    decisionStore: createLocalDecisionStore(learnerId),
    selectionMode
  });

  // Test/debug seam — never used by the page itself.
  window.__FD_VNEXT__ = { session };

  let busy = false;
  const act = async (fn) => {
    if (busy) return;
    busy = true;
    try {
      render(await fn());
    } catch (err) {
      renderError(err);
    } finally {
      busy = false;
    }
  };

  const renderError = (err) => {
    root.replaceChildren(el('div', { class: 'vnext-card vnext-error', 'data-screen': 'error' }, [
      el('p', { text: `Có lỗi xảy ra: ${err?.message ?? err}` }),
      el('button', { type: 'button', class: 'vnext-btn', text: 'Thử lại' })
    ]));
    root.querySelector('button')?.addEventListener('click', () => location.reload());
  };

  /* ── screens ─────────────────────────────────────────── */

  const renderIntro = (screen) => {
    const intro = MISSION_INTRO[screen.missionId] ?? { title: screen.missionId, blurb: screen.learnerGoal ?? '', startLabel: 'Bắt đầu' };
    const nameInput = screen.needsName
      ? el('input', { type: 'text', class: 'vnext-input', 'data-role': 'name-input', placeholder: 'Tên của bạn (ví dụ: Linh)', autocomplete: 'off' })
      : null;
    const card = el('div', { class: 'vnext-card', 'data-screen': 'intro' }, [
      el('h1', { text: intro.title }),
      el('p', { class: 'vnext-blurb', text: intro.blurb }),
      screen.resumed
        ? el('p', { class: 'vnext-note', text: 'Bạn đang tiếp tục nhiệm vụ này — tiến trình đã lưu được giữ nguyên.' })
        : null,
      screen.needsName
        ? el('label', { class: 'vnext-field' }, [
            el('span', { text: 'Bạn tên là gì? (để luyện “I’m …”)' }),
            nameInput
          ])
        : null,
      el('button', { type: 'button', class: 'vnext-btn vnext-btn-primary', 'data-role': 'start', text: screen.resumed ? 'Tiếp tục' : intro.startLabel })
    ].filter(Boolean));

    card.querySelector('[data-role="start"]').addEventListener('click', () =>
      act(() => session.start({ learnerName: nameInput?.value ?? undefined })));
    root.replaceChildren(card);
  };

  const renderLines = (prompt) => {
    const wrap = el('div', { class: 'vnext-dialogue', 'data-role': 'dialogue' });
    if (prompt.textVisible) {
      for (const line of prompt.lines) wrap.append(el('p', { class: 'vnext-line', text: line }));
    } else {
      wrap.append(el('p', { class: 'vnext-line vnext-hidden-text', text: '— nghe rồi trả lời —' }));
    }
    return wrap;
  };

  const supportBlock = (screen, kind) => {
    const content = {
      hint: (screen.requiredFunctions ?? []).map((fn) => FUNCTION_HINT[fn]).filter(Boolean).join(' · '),
      modelAnswer: modelFor(screen.requiredFunctions, session.runInfo()?.learnerName).join(' — '),
      transcript: (screen.prompt?.lines ?? []).join(' / '),
      translation: '—'
    }[kind];
    if (!content || content === '—') return null;
    return el('div', { class: 'vnext-support', 'data-role': `support-${kind}`, 'data-support-kind': kind }, [
      el('strong', { text: `${SUPPORT_LABEL[kind]} (đã ghi là dùng trợ giúp): ` }),
      el('span', { text: content })
    ]);
  };

  const renderInput = (screen) => {
    const frame = PURPOSE_FRAME[screen.purpose] ?? PURPOSE_FRAME.input;
    const card = el('div', { class: 'vnext-card', 'data-screen': 'input', 'data-purpose': screen.purpose }, [
      el('p', { class: 'vnext-frame', text: frame.label }),
      renderLines(screen.prompt),
      screen.prompt.audioText
        ? el('button', { type: 'button', class: 'vnext-btn', 'data-role': 'play', text: '▶ Nghe' })
        : null,
      el('div', { class: 'vnext-support-row', 'data-role': 'supports' }),
      el('button', { type: 'button', class: 'vnext-btn vnext-btn-primary', 'data-role': 'viewed', text: 'Đã xem/nghe — tiếp tục' })
    ].filter(Boolean));

    card.querySelector('[data-role="play"]')?.addEventListener('click', async () => {
      if (screen.prompt.audioText) speakEnglish(screen.prompt.audioText);
    });
    const supportRow = card.querySelector('[data-role="supports"]');
    for (const kind of screen.supportOffered ?? []) {
      const btn = el('button', { type: 'button', class: 'vnext-btn vnext-btn-ghost', 'data-role': `support-${kind}`, text: SUPPORT_LABEL[kind] ?? kind });
      btn.addEventListener('click', async () => {
        // Reveal the hidden words and record the support_use event —
        // on an input screen this is honest provenance, not
        // contamination (there is no attempt to contaminate). Awaited
        // so the event lands before any later view() write.
        await session.support('transcript');
        supportRow.append(el('p', { class: 'vnext-support', 'data-support-kind': kind, text: screen.prompt.lines.join(' / ') }));
        btn.disabled = true;
      });
      supportRow.append(btn);
    }
    card.querySelector('[data-role="viewed"]').addEventListener('click', () => act(() => session.view()));
    root.replaceChildren(card);
  };

  const renderTask = (screen) => {
    const frame = PURPOSE_FRAME[screen.purpose] ?? PURPOSE_FRAME.retrieval;
    const situation = TASK_SITUATION[screen.taskId];
    const card = el('div', {
      class: 'vnext-card',
      'data-screen': 'task',
      'data-purpose': screen.purpose,
      'data-phase': screen.phase,
      'data-task': `${screen.taskId}@${screen.taskRevision}`,
      'data-attempt': screen.attemptId
    });

    card.append(el('p', { class: 'vnext-frame', text: frame.label }));
    if (situation) card.append(el('p', { class: 'vnext-situation', text: situation }));
    if (screen.prompt.stimulusType !== 'cued_prompt') card.append(renderLines(screen.prompt));
    if (screen.prompt.cue) card.append(el('p', { class: 'vnext-cue', text: `Mẫu gợi ý: ${screen.prompt.cue}` }));
    card.append(el('p', { class: 'vnext-hintline', text: frame.hint }));

    if (screen.prompt.audioText) {
      const play = el('button', { type: 'button', class: 'vnext-btn', 'data-role': 'play', text: '▶ Nghe' });
      play.addEventListener('click', async () => {
        speakEnglish(screen.prompt.audioText);
        await session.play();
      });
      card.append(play);
    }

    const supportRow = el('div', { class: 'vnext-support-row', 'data-role': 'supports' });
    for (const kind of screen.supportOffered) {
      const used = screen.supportUsed?.[kind] === true;
      const btn = el('button', { type: 'button', class: 'vnext-btn vnext-btn-ghost', 'data-role': `support-${kind}`, text: SUPPORT_LABEL[kind] ?? kind });
      /* What was shown stays shown — used support renders below and the
       * button disables; closing a hint never decontaminates the
       * attempt, and re-clicking can never mint a second support_use. */
      if (used) btn.disabled = true;
      else btn.addEventListener('click', () => act(() => session.support(kind)));
      supportRow.append(btn);
    }
    if (screen.supportOffered.length) card.append(supportRow);
    for (const kind of Object.keys(screen.supportUsed ?? {}).filter((k) => screen.supportUsed[k] === true && k !== 'repeat')) {
      const block = supportBlock(screen, kind);
      if (block) card.append(block);
    }
    if (screen.supportUsed?.repeat) {
      card.append(el('p', { class: 'vnext-note', text: `Đã nghe lại ${screen.supportUsed.repeatCount} lần.` }));
    }

    if (screen.phase === 'prompt') {
      if (screen.responseType === 'choice') {
        const list = el('div', { class: 'vnext-options', 'data-role': 'options' });
        for (const opt of screen.options ?? []) {
          const btn = el('button', { type: 'button', class: 'vnext-btn vnext-option', 'data-role': 'option', 'data-option': opt.id, text: opt.text });
          btn.addEventListener('click', () => act(() => session.commit({ optionId: opt.id })));
          list.append(btn);
        }
        card.append(list);
      } else {
        const input = el('input', {
          type: 'text', class: 'vnext-input', 'data-role': 'answer',
          placeholder: 'Gõ câu tiếng Anh của bạn…', autocomplete: 'off'
        });
        const commit = el('button', { type: 'button', class: 'vnext-btn vnext-btn-primary', 'data-role': 'commit', text: 'Trả lời' });
        commit.addEventListener('click', () => act(() => session.commit({ text: input.value })));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') act(() => session.commit({ text: input.value }));
        });
        card.append(el('div', { class: 'vnext-answer-row' }, [input, commit]));
      }
      session.markPromptShown();
    }

    if (screen.phase === 'feedback' && screen.evaluation) {
      const outcome = screen.evaluation.outcome;
      card.append(el('p', { class: `vnext-outcome vnext-outcome-${outcome}`, 'data-role': 'outcome', text: FEEDBACK_COPY[outcome] ?? outcome }));
      const supported = Object.entries(screen.supportUsed ?? {}).some(([k, v]) => v === true && k !== 'repeat') || screen.supportUsed?.repeat;
      card.append(el('p', { class: 'vnext-note', text: supported ? FEEDBACK_COPY.supportedNote : FEEDBACK_COPY.unaidedNote }));
      if (screen.revealModelAfterAttempt || outcome !== 'success') {
        const model = modelFor(screen.requiredFunctions, session.runInfo()?.learnerName).join(' — ');
        if (model) card.append(el('p', { class: 'vnext-model', 'data-role': 'model', text: `Mẫu: ${model}` }));
      }
      const next = el('button', { type: 'button', class: 'vnext-btn vnext-btn-primary', 'data-role': 'next', text: 'Tiếp tục' });
      next.addEventListener('click', () => act(() => session.next()));
      card.append(next);
    }

    root.replaceChildren(card);
  };

  const renderSummary = (screen) => {
    const card = el('div', { class: 'vnext-card', 'data-screen': 'summary', 'data-status': screen.status }, [
      el('h1', { text: 'Kết quả nhiệm vụ' }),
      el('p', { text: SUMMARY_COPY[screen.status] ?? screen.reason })
    ]);
    const list = el('ul', { class: 'vnext-progress', 'data-role': 'progress' });
    for (const entry of screen.progress ?? []) {
      const li = el('li', { 'data-cap': entry.capabilityId });
      li.append(el('strong', { text: CAP_LABEL[entry.capabilityId] ?? entry.capabilityId }));
      for (const line of progressCopy(entry)) li.append(el('p', { class: 'vnext-progress-line', text: line }));
      list.append(li);
    }
    card.append(list);
    const again = el('button', { type: 'button', class: 'vnext-btn', 'data-role': 'restart', text: 'Học lại nhiệm vụ này (lượt mới)' });
    again.addEventListener('click', async () => {
      await session.abandon();
      location.reload();
    });
    card.append(again);
    root.replaceChildren(card);
  };

  const render = (screen) => {
    if (!screen) return;
    if (screen.type === 'intro') renderIntro(screen);
    else if (screen.type === 'input') renderInput(screen);
    else if (screen.type === 'task') renderTask(screen);
    else if (screen.type === 'summary') renderSummary(screen);
    else renderError(new Error(`unknown screen type '${screen.type}'`));
  };

  render(await session.init());
}
