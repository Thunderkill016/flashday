(function() {
  'use strict';

  const D = window.FlashDayData;
  const A = window.FlashDayBespoke;
  const B = window.BespokeSrs;
  const SC = window.FlashDaySourceCapture;
  const P = window.FlashDayProduct;
  const C = window.FlashDayCloud;
  const KEY = 'flashday-memory-engine-repo-driven';
  const $ = (id) => document.getElementById(id);
  const debugEnabled = new URLSearchParams(window.location.search).has('debug');
  const CLOUD_PAGE_SIZE = 500;

  let db = loadDb();
  let current = null;
  let ratings = {};
  let attempt = blankAttempt();
  let isBack = false;
  let isReported = false;
  let sessionReviews = 0;
  let currentAudio = null;
  let stimulusAudioKind = 'none';
  let toastTimer = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingStream = null;
  let recordingUrl = null;
  let recognizer = null;
  let supabaseClient = null;
  let learner = null;
  let activeDeck = null;
  let cloudKnown = C.emptyKnownIds();
  let syncChain = Promise.resolve();
  let isHydrating = false;
  let cardTelemetry = blankCardTelemetry();
  let errorLoop = blankErrorLoop();

  function blankAttempt() {
    return { text: '', spoke: false, recordedLocally: false, asrPending: false, asrConfirmed: false };
  }

  // Speak-style retry loop state: the FIRST wrong attempt is kept so the
  // review event can tell "needed a correction pass" from "clean recall".
  const MAX_RETRIES = 2;
  function blankErrorLoop() {
    return { retryCount: 0, firstAttempt: '', firstStage: '', firstMissed: [], lastClassification: null, inRetry: false };
  }

  // Per-card learning telemetry. Written into the review event at finalize so
  // recall latency and aid-usage stay measurable after cloud sync.
  function blankCardTelemetry() {
    return {
      presentedAt: 0,
      firstAttemptAt: 0,
      revealedAt: 0,
      sourceViewedPreReveal: false,
      audioPlays: 0
    };
  }

  function markFirstAttempt() {
    if (!cardTelemetry.firstAttemptAt) cardTelemetry.firstAttemptAt = Date.now();
  }

  function loadDb() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return D.migrateDb(JSON.parse(raw));
    } catch (_error) {
      // A malformed local snapshot must not stop the learner from studying.
    }
    return D.createInitialDb();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (_error) {
      toast('Không thể lưu trên thiết bị này. Hãy đăng nhập để đồng bộ.');
    }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => {
      if (char === '&') return '&amp;';
      if (char === '<') return '&lt;';
      if (char === '>') return '&gt;';
      if (char === "'") return '&#39;';
      return '&quot;';
    });
  }

  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.remove('hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.add('hidden'), 3000);
  }

  function itemById(id) {
    return (db.items || []).find((item) => item.id === id);
  }

  // Forms a tagged unit may legitimately appear as in an attempt: the exact
  // card occurance, the canonical target, and curated variants. Any of them
  // counts as "target produced" for the error classifier.
  function attemptUnits(card) {
    return A.cardParts(card)
      .filter((part) => part.unit_id)
      .map((part) => {
        const item = itemById(part.unit_id);
        return {
          unitId: part.unit_id,
          label: part.occurance,
          forms: [part.occurance, item?.target, ...(item?.forms || []), ...(item?.accepted || [])].filter(Boolean)
        };
      });
  }

  function scoreGlyph(score) {
    return score === 3 ? '✓' : score === 1 ? '✕' : '○';
  }

  function scoreText(score) {
    return score === 3 ? 'Nhớ' : score === 1 ? 'Sai' : 'Chưa chấm';
  }

  function setCloudStatus(message, tone = 'local') {
    const node = $('cloudStatus');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone;
  }

  function setView(name) {
    document.querySelectorAll('.tab').forEach((button) => {
      const isActive = button.dataset.view === name;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    ['review', 'memory', 'capture'].forEach((view) => $(view + 'View').classList.toggle('hidden', view !== name));
    if (name === 'memory') renderMemory();
    if (name === 'review' && !current) nextCard();
  }

  function stopAudio() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_error) {
        // The browser may reject operations on an already released audio object.
      }
      currentAudio = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function releaseRecording() {
    if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
    mediaRecorder = null;
    recordedChunks = [];
  }

  function clearRecordedAudio() {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recordingUrl = null;
  }

  function nextCard() {
    stopAudio();
    stopAsr();
    releaseRecording();
    clearRecordedAudio();
    stimulusAudioKind = 'none';
    try {
      current = A.selectNext(db, Date.now());
      ratings = A.initialRatings(current.card);
      attempt = blankAttempt();
      errorLoop = blankErrorLoop();
      cardTelemetry = blankCardTelemetry();
      cardTelemetry.presentedAt = Date.now();
      isBack = false;
      isReported = false;
      $('studyCard').classList.remove('is-revealed');
      renderFront();
      if (current.mode === B.Mode.LISTEN) window.setTimeout(speakTarget, 220);
    } catch (error) {
      renderDone(error.message);
    }
  }

  function renderDone(message) {
    stopAudio();
    current = null;
    const hasContent = (db.items || []).length > 0;
    $('trackBadge').textContent = 'Xong';
    $('trackBadge').className = 'badge neutral';
    delete $('studyCard').dataset.mode;
    delete $('progressTrack').dataset.mode;
    $('sourceChip').classList.add('hidden');
    $('sourceChip').setAttribute('aria-expanded', 'false');
    if (hasContent) {
      $('instruction').textContent = 'Chưa đến lượt ôn.';
      $('prompt').textContent = message || 'Bespoke engine đang chờ lần review tiếp theo.';
    } else {
      $('instruction').textContent = 'Chưa có nội dung để học.';
      $('prompt').textContent = 'Thêm Unit ở tab Bộ nhớ hoặc cài một module gợi ý để bắt đầu.';
    }
    $('audioPrimary').classList.add('hidden');
    $('answerArea').innerHTML = hasContent
      ? '<button class="primary-btn" style="width:100%" id="retryDraw">Kiểm tra lại</button><button class="ghost-btn" style="width:100%" id="switchMemory">Xem trạng thái</button>'
      : '<button class="primary-btn" style="width:100%" id="switchMemory">Thêm nội dung</button>';
    $('feedback').classList.add('hidden');
    $('sourcePanel').classList.add('hidden');
    $('studyCard').classList.remove('is-revealed');
    $('switchMemory').onclick = () => setView('memory');
    if (hasContent) $('retryDraw').onclick = nextCard;
    $('capabilities').innerHTML = '';
    updateHeader();
    $('debugPre').textContent = message || 'No card drawn.';
  }

  function renderFront() {
    const card = current.card;
    const meta = A.MODE_META[current.mode];
    $('trackBadge').textContent = meta.label;
    $('trackBadge').className = `badge mode-${current.mode}`;
    $('studyCard').dataset.mode = current.mode;
    $('progressTrack').dataset.mode = current.mode;
    $('feedback').classList.add('hidden');
    $('sourcePanel').classList.add('hidden');
    $('instruction').textContent = errorLoop.inRetry
      ? `Lần thử ${errorLoop.retryCount + 1} — sửa lại rồi xem đáp án.`
      : meta.front;
    if (current.mode === B.Mode.LISTEN) {
      $('prompt').textContent = '';
      $('audioPrimary').classList.remove('hidden');
    } else if (current.mode === B.Mode.READ) {
      $('prompt').textContent = card.sentence;
      $('audioPrimary').classList.add('hidden');
    } else {
      $('prompt').textContent = card.native_sentence || '—';
      $('audioPrimary').classList.add('hidden');
    }
    // Recall chamber: source metadata is noise during retrieval — the chip
    // only appears on the answer side (renderBack).
    $('sourceChip').classList.add('hidden');
    $('sourceChip').setAttribute('aria-expanded', 'false');
    renderAttemptArea();
    renderCardUnits();
    updateHeader();
    renderDebug();
  }

  function modeAttemptCopy(mode) {
    if (mode === B.Mode.LISTEN) return {
      label: 'Bạn nghe được gì?',
      hint: 'Gõ ý bạn hiểu bằng tiếng Việt hoặc tiếng Anh trước khi xem đáp án.',
      placeholder: 'Ví dụ: Người đó nói họ đang trên đường…'
    };
    if (mode === B.Mode.READ) return {
      label: 'Bạn hiểu câu này thế nào?',
      hint: 'Gõ ý ngắn trước khi xem đáp án. Không dùng để chấm điểm tự động.',
      placeholder: 'Ví dụ: Tôi đang đến nhưng sẽ tới muộn.'
    };
    if (mode === B.Mode.WRITE) return {
      label: 'Viết câu tiếng Anh trước',
      hint: 'Cần có câu trả lời trước khi lật thẻ. Sau đó bạn tự chấm mức nhớ.',
      placeholder: 'Write the English sentence…'
    };
    return {
      label: 'Nói câu tiếng Anh trước',
      hint: 'Tự nói thành tiếng hoặc dùng nút ghi âm chỉ trên thiết bị này. FlashDay không tự nhận là bạn nói đúng.',
      placeholder: ''
    };
  }

  function renderAttemptArea() {
    const copy = modeAttemptCopy(current.mode);
    const canReveal = P.hasObservableAttempt(current.mode, attempt);
    if (current.mode === B.Mode.SPEAK) {
      const isRecording = mediaRecorder && mediaRecorder.state === 'recording';
      const isListening = Boolean(recognizer);
      const asrOk = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
      $('answerArea').innerHTML = `
        <div class="attempt-box">
          <label class="attempt-label">${esc(copy.label)}</label>
          <p class="attempt-help">${esc(copy.hint)}</p>
          <div class="secondary-actions attempt-actions">
            <button id="saidBtn" type="button">${attempt.spoke ? 'Đã nói xong ✓' : 'Tôi đã nói xong'}</button>
            ${asrOk ? `<button id="asrBtn" type="button">${isListening ? 'Đang nghe… (bấm để dừng)' : 'Nói → máy nghe thử'}</button>` : ''}
            <button id="recordBtn" type="button">${isRecording ? 'Dừng ghi âm' : 'Ghi âm trên máy'}</button>
          </div>
          ${isListening ? `<p class="attempt-state asr-live" id="asrLive">Đang nghe…</p>` : ''}
          ${attempt.text ? `<p class="attempt-state asr-transcript">Máy nghe được: “${esc(attempt.text)}”</p>` : ''}
          ${attempt.asrPending && !attempt.asrConfirmed ? `<div class="asr-confirm"><span>Máy nghe đúng lời bạn nói?</span><button id="asrYes" type="button">Đúng</button><button id="asrNo" type="button">Nghe sai</button></div>` : ''}
          <p class="attempt-state" id="attemptState">${isListening ? 'Đang nghe — nói câu tiếng Anh…' : isRecording ? 'Đang ghi âm…' : attempt.asrConfirmed ? 'Đã xác nhận máy nghe đúng — có thể xem đáp án.' : attempt.asrPending ? 'Xác nhận transcript trước khi so sánh.' : attempt.recordedLocally ? 'Audio chỉ ở tab này, không được tải lên hay đồng bộ.' : attempt.spoke ? 'Bạn đã tự xác nhận đã nói.' : 'Chưa có lần nói được ghi nhận.'}</p>
          ${recordingUrl ? `<audio class="local-recording" controls src="${esc(recordingUrl)}"></audio>` : ''}
        </div>
        <button id="flipBtn" class="primary-btn" type="button" ${canReveal ? '' : 'disabled'}>Xem đáp án</button>`;
      // ASR transcript only becomes diff-able evidence after the learner
      // confirms the machine heard them right — ASR smoothing can silently
      // "fix" learner speech, so an unconfirmed transcript is not an error.
      $('asrYes')?.addEventListener('click', () => {
        attempt.asrConfirmed = true;
        attempt.asrPending = false;
        renderAttemptArea();
      });
      $('asrNo')?.addEventListener('click', () => {
        attempt.text = '';
        attempt.asrPending = false;
        attempt.asrConfirmed = false;
        attempt.spoke = true;
        renderAttemptArea();
        toast('Đã bỏ transcript — nói lại hoặc tự xác nhận rồi xem đáp án.');
      });
      $('saidBtn').onclick = () => {
        attempt.spoke = true;
        markFirstAttempt();
        renderAttemptArea();
      };
      $('asrBtn')?.addEventListener('click', () => (recognizer ? stopAsr() : startAsr()));
      $('recordBtn').onclick = () => (isRecording ? stopSpeechRecording() : startSpeechRecording());
    } else {
      $('answerArea').innerHTML = `
        <div class="attempt-box">
          <label class="attempt-label" for="attemptText">${esc(copy.label)}</label>
          <p class="attempt-help">${esc(copy.hint)}</p>
          <textarea id="attemptText" class="attempt-text" placeholder="${esc(copy.placeholder)}"></textarea>
        </div>
        <button id="flipBtn" class="primary-btn" type="button" ${canReveal ? '' : 'disabled'}>Xem đáp án</button>`;
      $('attemptText').value = attempt.text;
      $('attemptText').oninput = (event) => {
        if (event.target.value.trim()) markFirstAttempt();
        attempt.text = event.target.value.slice(0, 1200);
        $('flipBtn').disabled = !P.hasObservableAttempt(current.mode, attempt);
      };
      $('attemptText').onkeydown = (event) => {
        if (!P.isRevealShortcut(event)) return;
        event.preventDefault();
        if (P.hasObservableAttempt(current.mode, attempt)) flipCard();
      };
    }
    $('flipBtn').onclick = flipCard;
  }

  // SpeechRecognition aid: the transcript is "what the machine heard" — an
  // honest signal to diff against the answer, not a pronunciation score
  // (ASR can smooth learner speech into clean text; we never claim more).
  function startAsr() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast('Trình duyệt không hỗ trợ nhận diện giọng nói — tự nói rồi xác nhận như thường.');
      return;
    }
    try {
      recognizer = new SR();
      recognizer.lang = 'en-US';
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 1;
      recognizer.continuous = false;
      let finalText = '';
      recognizer.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) finalText += `${transcript} `;
          else interim += transcript;
        }
        // Interim results are a live preview only — they must never become
        // attempt evidence. Only a final result counts as "the machine heard".
        const heard = `${finalText}${interim}`.trim().slice(0, 1200);
        if (heard) {
          attempt.spoke = true;
          markFirstAttempt();
          const live = $('asrLive');
          if (live) live.textContent = `Máy đang nghe: “${heard}”`;
          else renderAttemptArea();
        }
      };
      recognizer.onend = () => {
        recognizer = null;
        // Only a FINAL transcript becomes the attempt. Interim-only speech
        // means the machine heard something but never committed — that is
        // not evidence of what the learner said, so it stays self-check.
        attempt.text = finalText.trim().slice(0, 1200);
        attempt.asrPending = Boolean(attempt.text);
        attempt.asrConfirmed = false;
        renderAttemptArea();
      };
      recognizer.onerror = (event) => {
        recognizer = null;
        const msg = event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone bị chặn — cho phép quyền mic để dùng nhận diện.'
          : event.error === 'no-speech' ? 'Không nghe được gì — thử nói to/rõ hơn.'
          : `Nhận diện lỗi: ${event.error}`;
        toast(msg);
        renderAttemptArea();
      };
      recognizer.start();
      renderAttemptArea();
    } catch (_error) {
      recognizer = null;
      toast('Không mở được nhận diện giọng nói.');
    }
  }

  function stopAsr() {
    try { recognizer?.stop(); } catch (_error) { /* already stopped */ }
  }

  async function startSpeechRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast('Trình duyệt này chưa hỗ trợ ghi âm. Bạn vẫn có thể tự nói rồi bấm “Tôi đã nói xong”.');
      return;
    }
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(recordingStream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const chunks = recordedChunks;
        const mimeType = mediaRecorder?.mimeType || 'audio/webm';
        if (chunks.length) {
          clearRecordedAudio();
          recordingUrl = URL.createObjectURL(new Blob(chunks, { type: mimeType }));
        }
        attempt.spoke = true;
        attempt.recordedLocally = Boolean(recordingUrl);
        releaseRecording();
        renderAttemptArea();
      };
      mediaRecorder.start();
      markFirstAttempt();
      renderAttemptArea();
    } catch (_error) {
      releaseRecording();
      toast('Không mở được microphone. Bạn vẫn có thể tự nói và xác nhận thủ công.');
    }
  }

  function stopSpeechRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  }

  function flipCard() {
    if (!current) return;
    if (current.mode === B.Mode.SPEAK && recognizer) {
      stopAsr();
      toast('Đã dừng nghe. Kiểm tra phần máy nghe được rồi xem đáp án.');
      return;
    }
    if (current.mode === B.Mode.SPEAK && mediaRecorder?.state === 'recording') {
      stopSpeechRecording();
      toast('Đã dừng ghi âm. Hãy kiểm tra rồi xem đáp án.');
      return;
    }
    if (!P.hasObservableAttempt(current.mode, attempt)) {
      const needsSpeech = current.mode === B.Mode.SPEAK;
      toast(needsSpeech ? 'Hãy nói thành tiếng trước, rồi bấm “Tôi đã nói xong”.' : 'Hãy trả lời thử trước khi xem đáp án.');
      if (!needsSpeech) $('attemptText')?.focus();
      return;
    }
    isBack = true;
    cardTelemetry.revealedAt = Date.now();
    renderBack();
    window.requestAnimationFrame(() => $('ratingParts')?.querySelector('[data-unit]')?.focus());
    if (current.mode !== B.Mode.LISTEN) window.setTimeout(speakTarget, 120);
  }

  function responseSummary() {
    if (current.mode === B.Mode.SPEAK) {
      if (attempt.text.trim()) return `Máy nghe được: “${esc(attempt.text.trim())}”`;
      return attempt.recordedLocally ? 'Bạn đã ghi âm cục bộ và tự xác nhận đã nói.' : 'Bạn đã tự xác nhận đã nói câu này.';
    }
    return attempt.text.trim() ? `Câu trả lời của bạn: “${esc(attempt.text.trim())}”` : 'Bạn chưa ghi câu trả lời; hãy dùng nút nghe lại hoặc thử trả lời ở card tiếp theo.';
  }

  // Error loop for production modes: diff the typed attempt against the
  // answer, show ONE correction, and offer a retry before self-grading.
  // The card only moves on when the learner retries or consciously skips.
  function errorCorrectionHtml(cls, units) {
    const hint = P.primaryErrorHint(cls, units);
    const attemptView = cls.ops.map((op) => {
      if (op.type === 'same') return `<span>${esc(op.actual)}</span>`;
      if (op.type === 'extra') return `<span class="diff-extra">${esc(op.actual)}</span>`;
      if (op.type === 'sub') return `<span class="diff-sub">${esc(op.actual)}</span>`;
      return '';
    }).filter(Boolean).join(' ');
    const answerView = cls.ops.map((op) => {
      if (op.type === 'same') return `<span>${esc(op.expected)}</span>`;
      if (op.type === 'missing') return `<span class="diff-missing">${esc(op.expected)}</span>`;
      if (op.type === 'sub') return `<span class="diff-sub">${esc(op.expected)}</span>`;
      return '';
    }).filter(Boolean).join(' ');
    const isSpeak = current.mode === B.Mode.SPEAK;
    return `<div class="error-panel">
      <p class="error-hint">${esc(hint || 'Câu trả lời còn khác đáp án.')}</p>
      <div class="diff-line"><span class="diff-label">${isSpeak ? 'Máy nghe' : 'Bạn viết'}</span><span class="diff-text">${attemptView || '<i>(trống)</i>'}</span></div>
      <div class="diff-line"><span class="diff-label">Đáp án</span><span class="diff-text">${answerView}</span></div>
      <div class="secondary-actions error-actions">
        <button id="retryAttempt" class="primary-btn" type="button">${isSpeak ? 'Nói lại lần nữa' : 'Viết lại lần nữa'}</button>
        <button id="skipRetry" class="ghost-btn" type="button">Tiếp tục tự chấm</button>
      </div>
    </div>`;
  }

  function startRetry() {
    if (!current) return;
    if (!errorLoop.firstAttempt) {
      errorLoop.firstAttempt = attempt.text || (attempt.spoke ? '(đã nói)' : '');
      errorLoop.firstStage = errorLoop.lastClassification?.stage || 'self-check';
    }
    errorLoop.retryCount += 1;
    errorLoop.inRetry = true;
    attempt = blankAttempt();
    ratings = A.initialRatings(current.card);
    isBack = false;
    $('studyCard').classList.remove('is-revealed');
    renderFront();
    toast(`Lần thử ${errorLoop.retryCount + 1}/${MAX_RETRIES + 1} — sửa lại theo gợi ý vừa rồi.`);
  }

  function renderBack() {
    const card = current.card;
    $('studyCard').classList.add('is-revealed');
    const source = card.source;
    if (source) {
      $('sourceChip').classList.remove('hidden');
      $('sourceChip').textContent = source.label || 'Nguồn';
      $('sourceChip').setAttribute('aria-expanded', 'false');
    }
    $('instruction').textContent = 'Đáp án và tự chấm';
    $('prompt').textContent = card.sentence;
    $('audioPrimary').classList.remove('hidden');
    $('feedback').className = 'feedback';
    let correctionHtml = '';
    // Write attempts and CONFIRMED ASR speak attempts share the word diff.
    // An unconfirmed transcript ("máy nghe được" but never verified) stays
    // self-check — ASR smoothing can silently fix learner speech, so we
    // never turn it into an error record without the learner's confirm.
    if (attempt.text.trim() && (current.mode === B.Mode.WRITE || (current.mode === B.Mode.SPEAK && attempt.asrConfirmed))) {
      const units = attemptUnits(card);
      const cls = P.classifyAttempt(card.sentence, attempt.text, units);
      errorLoop.lastClassification = cls;
      errorLoop.inRetry = false;
      // Snapshot the units the FIRST unaided attempt missed — even if a
      // retry produces them later, that was aided recall, not unaided.
      if (errorLoop.retryCount === 0) errorLoop.firstMissed = [...cls.missingUnits];
      if (cls.stage !== 'exact' && errorLoop.retryCount < MAX_RETRIES) {
        correctionHtml = errorCorrectionHtml(cls, units);
      }
    }
    $('feedback').innerHTML = `${correctionHtml}<p class="attempt-recap">${responseSummary()}</p><div class="answer-key">${card.native_sentence ? esc(card.native_sentence) : '<span class="muted-copy">Card chưa có bản dịch.</span>'}</div>${card.phonetic ? `<p>${esc(card.phonetic)}</p>` : ''}`;
    $('retryAttempt')?.addEventListener('click', startRetry);
    $('skipRetry')?.addEventListener('click', () => {
      $('feedback').querySelector('.error-panel')?.remove();
    });
    renderRatingArea();
    renderCardUnits();
    renderDebug();
  }

  function renderRatingArea(focusUnitId = '') {
    const card = current.card;
    const parts = A.cardParts(card);
    const ratingsComplete = A.hasCompleteRatings(card, ratings);
    const partsHtml = parts.map((part) => {
      if (!part.unit_id) return `<span class="rating-plain">${esc(part.occurance)}</span>`;
      const score = ratings[part.unit_id] ?? 0;
      const item = itemById(part.unit_id);
      const isRated = score !== 0;
      return `<button class="word-chip rating-chip" type="button" aria-pressed="${isRated}" data-score="${score}" data-unit="${esc(part.unit_id)}" title="${esc(item?.meaning || part.unit_id)}"><b>${esc(part.occurance)}</b><small>${scoreGlyph(score)} ${scoreText(score)} · chạm để đổi</small></button>`;
    }).join('');
    const ratingStatus = ratingsComplete
      ? 'Đã chấm tất cả Unit. Bạn có thể lưu lần ôn.'
      : 'Chấm từng Unit trước khi lưu lần ôn.';
    const missed = parts.filter((part) => part.unit_id && (ratings[part.unit_id] ?? 0) === 1);
    const speakRetry = current.mode === B.Mode.SPEAK && missed.length && errorLoop.retryCount < MAX_RETRIES
      ? `<button id="speakRetry" class="ghost-btn" type="button">Nói lại lần nữa (${errorLoop.retryCount + 1}/${MAX_RETRIES + 1})</button>`
      : '';
    // "Tất cả nhớ" only exists on single-unit cards. On multi-unit cards it
    // would mark every unit remembered after ONE attempt — overcrediting
    // units the learner never individually recalled.
    const unitCount = parts.filter((part) => part.unit_id).length;
    const allSuccessBtn = unitCount <= 1 ? '<button id="allSuccessBtn" type="button">Tất cả nhớ</button>' : '';
    $('answerArea').innerHTML = `<div class="rating-intro">Chấm từng phần cần học dựa trên lần thử vừa rồi. “Nhớ” là trạng thái lịch ôn, không phải đánh giá thành thạo.</div><p class="rating-status" aria-live="polite">${ratingStatus}</p><div class="word-bank" id="ratingParts">${partsHtml}</div><div id="selectedDefinition" class="selected-definition hidden"></div><div class="secondary-actions">${allSuccessBtn}${speakRetry}<label class="report-label"><input id="reportError" type="checkbox"> Card lỗi</label></div><button id="nextCardBtn" class="primary-btn" type="button" ${ratingsComplete ? '' : 'disabled'}>Lưu lần ôn</button>`;
    $('speakRetry')?.addEventListener('click', startRetry);
    $('ratingParts').querySelectorAll('[data-unit]').forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.unit;
        ratings[id] = A.cycleRating(ratings[id] ?? 0);
        const item = itemById(id);
        renderRatingArea(id);
        const box = $('selectedDefinition');
        if (box) {
          box.textContent = item?.meaning || id;
          box.classList.remove('hidden');
        }
      };
    });
    const allSuccessEl = $('allSuccessBtn');
    if (allSuccessEl) allSuccessEl.onclick = () => {
      ratings = A.allSuccess(card);
      renderRatingArea();
    };
    $('reportError').checked = isReported;
    $('reportError').onchange = (event) => {
      isReported = event.target.checked;
    };
    $('nextCardBtn').onclick = finalizeCard;
    if (focusUnitId) {
      Array.from($('ratingParts').querySelectorAll('[data-unit]'))
        .find((button) => button.dataset.unit === focusUnitId)
        ?.focus();
    }
  }

  // Build the error record for this review. Write mode uses the real word
  // diff; speak/listen/read fall back to which units the learner self-marked
  // as missed — we never pretend to score pronunciation we did not hear.
  function buildErrorRecord() {
    if (!current) return null;
    const card = current.card;
    const missedUnits = A.cardParts(card)
      .filter((part) => part.unit_id && (ratings[part.unit_id] ?? 0) === 1)
      .map((part) => part.unit_id);
    if (current.mode === B.Mode.WRITE || (current.mode === B.Mode.SPEAK && attempt.text.trim() && attempt.asrConfirmed)) {
      const cls = errorLoop.lastClassification
        || P.classifyAttempt(card.sentence, attempt.text, attemptUnits(card));
      const hadError = errorLoop.retryCount > 0 || cls.stage === 'miss' || missedUnits.length;
      if (!hadError) return null;
      return {
        stage: cls.stage,
        types: cls.errorTypes,
        // Ever-missed = first attempt ∪ final attempt ∪ self-rated-wrong.
        // finalMissing narrows it to units still absent in the last attempt.
        missedUnits: [...new Set([...errorLoop.firstMissed, ...cls.missingUnits, ...missedUnits])],
        finalMissing: [...cls.missingUnits],
        firstAttempt: errorLoop.firstAttempt || attempt.text,
        finalAttempt: attempt.text,
        corrected: cls.corrected,
        retryCount: errorLoop.retryCount
      };
    }
    if (!missedUnits.length && !errorLoop.retryCount) return null;
    return {
      stage: 'self-check',
      types: ['self-check'],
      missedUnits,
      finalMissing: [],
      firstAttempt: '',
      finalAttempt: '',
      corrected: !missedUnits.length && errorLoop.retryCount > 0,
      retryCount: errorLoop.retryCount
    };
  }

  function finalizeCard() {
    if (!current) return;
    if (!A.hasCompleteRatings(current.card, ratings)) {
      toast('Hãy chấm từng Unit trước khi lưu lần ôn.');
      Array.from($('ratingParts')?.querySelectorAll('[data-unit]') || [])
        .find((button) => (ratings[button.dataset.unit] ?? 0) === 0)
        ?.focus();
      return;
    }
    stopAudio();
    const error = buildErrorRecord();
    const result = A.finalizeCard(db, current, ratings, {
      isReported,
      response: P.responseForMode(current.mode, attempt),
      stimulus: { audioKind: current.mode === B.Mode.LISTEN ? stimulusAudioKind : 'none' },
      telemetry: cardTelemetry,
      error,
      nowMs: Date.now()
    });
    save();
    requestCloudSync('review');
    sessionReviews += 1;
    renderDebug(result);
    current = null;
    nextCard();
  }

  function toggleSource() {
    const source = current?.card?.source;
    if (!source) return;
    const panel = $('sourcePanel');
    if (!panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
      $('sourceChip').setAttribute('aria-expanded', 'false');
      return;
    }
    const meta = [];
    if (Number.isFinite(Number(source.mediaTimestamp))) meta.push(`${Number(source.mediaTimestamp).toFixed(2)}s`);
    if (source.subtitleFileName) meta.push(source.subtitleFileName);
    if (source.url) meta.push(source.url);
    const before = (source.surroundingSubtitles || []).filter((subtitle) => subtitle.end <= Number(source.mediaTimestamp || 0)).slice(-1)[0];
    const after = (source.surroundingSubtitles || []).filter((subtitle) => subtitle.start >= Number(source.mediaTimestamp || 0)).slice(0, 1)[0];
    panel.innerHTML = `<div class="source-panel-head"><small>${esc(source.label || source.type || 'Nguồn')}${meta.length ? ` · ${esc(meta.join(' · '))}` : ''}</small><button id="closeSourceBtn" class="source-close" type="button" aria-label="Đóng nguồn">×</button></div>${before ? `<p class="source-context">${esc(before.text)}</p>` : ''}<p>${esc(source.sentence || current.card.sentence || '')}</p>${source.native_sentence ? `<p><em>${esc(source.native_sentence)}</em></p>` : ''}${after ? `<p class="source-context">${esc(after.text)}</p>` : ''}`;
    // Viewing the source before revealing counts as aid, not unaided recall.
    if (!isBack) cardTelemetry.sourceViewedPreReveal = true;
    panel.classList.remove('hidden');
    $('sourceChip').setAttribute('aria-expanded', 'true');
    $('closeSourceBtn').onclick = () => {
      panel.classList.add('hidden');
      $('sourceChip').setAttribute('aria-expanded', 'false');
      $('sourceChip').focus();
    };
  }

  function trackStimulusAudio(kind) {
    if (current?.mode === B.Mode.LISTEN && !isBack) stimulusAudioKind = kind;
  }

  function speakTarget() {
    if (!current) return;
    if (!isBack) cardTelemetry.audioPlays += 1;
    stopAudio();
    const ref = current.card.audio?.ref || current.card.audio_filename || '';
    if (ref) {
      try {
        trackStimulusAudio(current.card.source?.audio?.ref ? 'source-audio' : 'linked-audio');
        currentAudio = new Audio(ref);
        currentAudio.play().catch(fallbackTts);
        return;
      } catch (_error) {
        // Use browser speech only when a linked clip cannot be opened.
      }
    }
    fallbackTts();
  }

  function fallbackTts() {
    currentAudio = null;
    if (!current || !('speechSynthesis' in window)) {
      trackStimulusAudio('none');
      return;
    }
    trackStimulusAudio('browser-tts');
    const utterance = new SpeechSynthesisUtterance(current.card.sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function renderCardUnits() {
    if (!current) {
      $('capabilities').innerHTML = '';
      return;
    }
    const ids = B.unitIds(current.card);
    const engine = current.engine;
    const contextCount = A.cardCountForUnit(db, current.unitId, engine);
    const rotationNote = current.rotation === 'rotated' ? ' · ngữ cảnh mới' : '';
    $('capabilities').innerHTML = `<div class="cap-title"><strong>${ids.length} unit trong card</strong><span>${contextCount} ngữ cảnh cho unit đang được chọn${rotationNote}</span></div><div class="cap-grid">${ids.map((id) => {
      const item = itemById(id);
      const status = A.itemStatus(db, id, Date.now(), engine).find((entry) => entry.mode === current.mode);
      return `<div class="cap-cell" data-mode="${esc(current.mode)}"><label><span>${esc(item?.target || id)}</span><b>${esc(status?.status || 'Mới')}</b></label><small>${esc(item?.meaning || '')}</small></div>`;
    }).join('')}</div>`;
  }

  function updateHeader() {
    const stats = A.deckStats(db, Date.now(), current?.engine || null);
    $('sessionCount').textContent = sessionReviews;
    $('dueCount').textContent = stats.waiting ? `${stats.waiting} đang chờ ôn` : 'Không có thẻ đang chờ';
    // Due work stays visible from the home tab without owning the home —
    // immersion is the default surface, review is one glance away.
    const badge = $('reviewDueBadge');
    if (badge) {
      badge.textContent = stats.waiting || 0;
      badge.classList.toggle('hidden', !stats.waiting);
    }
    const total = sessionReviews + (stats.waiting || 0);
    const progress = total > 0 ? Math.round((sessionReviews / total) * 100) : 0;
    $('progressBar').style.width = `${progress}%`;
    $('progressTrack').setAttribute('aria-valuenow', String(progress));
  }

  const ERROR_LABELS = {
    'missing-target': 'thiếu cụm cần học',
    'word-form': 'sai/thiếu từ',
    'missing-words': 'bỏ sót từ',
    'extra-words': 'thừa từ',
    'word-order': 'lộn thứ tự',
    'self-check': 'tự ghi nhận sai'
  };

  // Duolingo-Mistakes-style surface: units whose production attempts keep
  // failing, derived from the review event log — a repair queue, not a grade.
  function errorMemoryHtml(nowMs) {
    const stats = A.errorStats(db);
    const recent = Object.entries(stats.byUnit)
      .filter(([, bucket]) => bucket.count > 0)
      .sort((a, b) => b[1].lastAt - a[1].lastAt)
      .slice(0, 5);
    if (!recent.length) return '';
    // The user-level pattern matters as much as per-unit misses — "keeps
    // dropping words" is a habit to break, not a fact about one unit.
    const topTypes = Object.entries(stats.byType)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([type, bucket]) => `${ERROR_LABELS[type] || type} ×${bucket.count}`)
      .join(' · ');
    const rows = recent.map(([unitId, bucket]) => {
      const item = itemById(unitId);
      const fixed = bucket.correctedCount ? ` · đã sửa ${bucket.correctedCount}×` : '';
      return `<li><b>${esc(item?.target || unitId)}</b><span class="muted-copy"> — ${bucket.count} lần lỗi${fixed}</span></li>`;
    }).join('');
    return `<div class="error-memory"><b>Lỗi cần sửa</b>${topTypes ? `<p class="muted-copy" style="margin:0 0 6px">Hay gặp: ${esc(topTypes)}</p>` : ''}<ul>${rows}</ul></div>`;
  }

  function renderMemory() {
    const list = $('memoryList');
    const engine = A.buildEngine(db);
    const nowMs = Date.now();
    // Unit search/filter — memory lists grow past a screen quickly; LingQ and
    // Anki both treat vocabulary search as table stakes.
    const query = String($('memorySearch')?.value || '').toLowerCase().trim();
    // Index captured source sentences by unit so search reaches the context
    // the learner actually met the unit in, not just target/meaning.
    const contextByUnit = new Map();
    if (query) {
      for (const cap of db.captures || []) {
        const hay = `${cap.sentence || ''} ${cap.nativeSentence || ''}`.toLowerCase();
        for (const unitId of cap.linkedUnitIds || []) {
          contextByUnit.set(unitId, `${contextByUnit.get(unitId) || ''} ${hay}`);
        }
      }
    }
    const items = (db.items || []).filter((item) =>
      !query || String(item.target || '').toLowerCase().includes(query)
        || String(item.meaning || '').toLowerCase().includes(query)
        || (contextByUnit.get(item.id) || '').includes(query));
    const itemsHtml = items.map((item) => {
      const statuses = A.itemStatus(db, item.id, nowMs, engine);
      const cardCount = A.cardCountForUnit(db, item.id, engine);
      const seenContexts = A.seenContextCount(db, item.id);
      const encounters = window.FlashDayImmersion?.encounterCount?.(db, item.id) || 0;
      // A unit whose only card is the bare-phrase fallback has never been
      // reviewed inside a real source sentence — label that honestly instead
      // of letting "1 ngữ cảnh" imply a context card exists.
      const fallbackOnly = engine.getCardsForUnit(item.id, 50).every((card) => card?.source?.type === 'fallback');
      const contextLabel = fallbackOnly ? 'chưa có câu' : `${cardCount} ngữ cảnh`;
      const pill = `${contextLabel}${seenContexts > 0 && cardCount > 1 ? ` · ôn ${seenContexts}` : ''}${encounters ? ` · gặp lại ${encounters} lần` : ''}`;
      const totalRatings = statuses.reduce((sum, status) => sum + status.ratings, 0);
      const dueNow = statuses.some((status) => status.dueAt != null && status.dueAt <= nowMs);
      const state = totalRatings === 0 ? 'new' : dueNow ? 'due' : 'learning';
      const stateLabel = { new: 'Mới', due: 'Đến hạn', learning: 'Đang học' }[state];
      const nextDue = statuses.map((status) => status.dueAt).filter((dueAt) => dueAt != null).sort((a, b) => a - b)[0];
      const dueText = nextDue == null ? 'chưa lên lịch'
        : nextDue <= nowMs ? 'đang đến hạn'
        : `hạn ${new Date(nextDue).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}`;
      return `<article class="memory-card"><div class="memory-top"><div><div class="memory-title">${esc(item.target)}</div><div class="memory-meaning">${esc(item.meaning)}</div></div><div class="memory-badges"><span class="state-pill state-${state}">${stateLabel}</span><span class="type-pill">${pill}</span></div></div><div class="memory-meta">${dueText} · ${totalRatings} lượt chấm${item.canDo ? ` · ${esc(item.canDo)}` : ''}</div><details class="memory-details"><summary>Chi tiết 4 kỹ năng</summary><div class="cap-grid" style="margin-top:12px">${statuses.map((status) => `<div class="cap-cell" data-mode="${esc(status.mode)}"><label><span>${esc(status.label)}</span><b>${esc(status.status)}</b></label><small>${status.ratings} ratings</small></div>`).join('')}</div></details></article>`;
    }).join('');
    list.innerHTML = errorMemoryHtml(nowMs)
      + (itemsHtml || `<div class="empty">${query ? 'Không unit nào khớp bộ lọc.' : 'Chưa có unit.'}</div>`);
  }

  function renderDebug(last) {
    if (!current) {
      if (last) $('debugPre').textContent = JSON.stringify(last.event || last, null, 2);
      return;
    }
    if (!debugEnabled) return;
    const engine = current.engine || A.buildEngine(db);
    const state = engine.ratingStates[current.unitId];
    $('debugPre').textContent = JSON.stringify({
      upstream: 'google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e',
      sourceContract: 'asbplayer/asbplayer@396c5af3097ed82ca37ea1b46a5da7c7a0dab81e',
      transcriptContract: 'osteele/audio2anki@d64197db9136efbafbcbc706f7de03aea6d70fab',
      side: isBack ? 'back' : 'front',
      selected: { unit: current.unitId, mode: current.mode, card: current.card.id },
      cardUnitIds: B.unitIds(current.card),
      cardIndex: engine.cardIndex.indexObject(),
      captureId: current.card.capture_id || null,
      audioRef: current.card.audio?.ref || null,
      stimulusAudioKind,
      ratings,
      attempt: P.responseForMode(current.mode, attempt),
      selectedUnitRatings: state ? state.ratings() : [],
      lastEvent: last?.event || null
    }, null, 2);
  }

  async function ensureDeck() {
    if (!supabaseClient || !learner) return null;
    if (activeDeck) return activeDeck;
    const { data: existing, error: existingError } = await supabaseClient
      .from('decks')
      .select('id,title,description,goal,created_at')
      .order('created_at', { ascending: true })
      .limit(1);
    if (existingError) throw new Error(existingError.message);
    if (existing?.[0]) {
      activeDeck = existing[0];
      return activeDeck;
    }
    const { data: created, error: createError } = await supabaseClient
      .from('decks')
      .insert({
        owner_id: learner.id,
        title: 'Everyday English',
        description: 'Flashcard practice for ordinary English communication.',
        goal: 'Listen, speak, read and write useful English in everyday situations.'
      })
      .select('id,title,description,goal,created_at')
      .single();
    if (createError) throw new Error(createError.message);
    activeDeck = created;
    return activeDeck;
  }

  function withOwner(rows) {
    return rows.map((row) => ({ ...row, owner_id: learner.id }));
  }

  async function fetchAllDeckRows(table, deckId, orderColumn) {
    const rows = [];
    for (let from = 0; ; from += CLOUD_PAGE_SIZE) {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*')
        .eq('deck_id', deckId)
        .order(orderColumn, { ascending: true })
        .range(from, from + CLOUD_PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const page = data || [];
      rows.push(...page);
      if (page.length < CLOUD_PAGE_SIZE) break;
    }
    return rows;
  }

  async function persistIncrementalDb() {
    if (!supabaseClient || !learner) return;
    const deck = await ensureDeck();
    const pending = {
      units: C.unknownById(db.items || [], cloudKnown.units),
      cards: C.unknownById(db.bespokeCards || [], cloudKnown.cards),
      captures: C.unknownById(db.captures || [], cloudKnown.captures),
      events: C.unknownById(db.events || [], cloudKnown.events)
    };

    const writes = [];
    if (pending.units.length) writes.push(supabaseClient.from('units').upsert(withOwner(pending.units.map((item) => C.unitRow(item, deck.id))), { onConflict: 'owner_id,id' }));
    if (pending.cards.length) writes.push(supabaseClient.from('cards').upsert(withOwner(pending.cards.map((card) => C.cardRow(card, deck.id))), { onConflict: 'owner_id,id' }));
    if (pending.captures.length) writes.push(supabaseClient.from('source_captures').upsert(withOwner(pending.captures.map((capture) => C.captureRow(capture, deck.id))), { onConflict: 'owner_id,id' }));
    if (pending.events.length) writes.push(supabaseClient.from('review_events').upsert(withOwner(pending.events.map((event) => C.reviewRow(event, deck.id))), { onConflict: 'owner_id,id', ignoreDuplicates: true }));

    const results = await Promise.all(writes);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);

    const { error: progressError } = await supabaseClient.from('learning_progress').upsert({
      owner_id: learner.id,
      deck_id: deck.id,
      payload: {
        version: db.version,
        bespokeProgress: db.bespokeProgress,
        fsrsProgress: db.fsrsProgress,
        transferAttempts: db.transferAttempts || [],
        encounters: db.encounters || [],
        scheduler: db.scheduler,
        schedulerSource: db.schedulerSource
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id' });
    if (progressError) throw new Error(progressError.message);

    C.rememberIds(cloudKnown, 'units', pending.units);
    C.rememberIds(cloudKnown, 'cards', pending.cards);
    C.rememberIds(cloudKnown, 'captures', pending.captures);
    C.rememberIds(cloudKnown, 'events', pending.events);
    setCloudStatus('Đã lưu vào tài khoản', 'ready');
  }

  function requestCloudSync(_reason) {
    if (!supabaseClient || !learner || isHydrating) return Promise.resolve();
    setCloudStatus('Đang lưu…', 'saving');
    syncChain = syncChain
      .catch(() => undefined)
      .then(persistIncrementalDb)
      .catch((error) => {
        setCloudStatus('Chưa đồng bộ', 'error');
        toast(`Không đồng bộ được: ${error.message}`);
      });
    return syncChain;
  }

  async function hydrateCloud() {
    if (!supabaseClient || !learner || isHydrating) return;
    isHydrating = true;
    setCloudStatus('Đang tải bộ nhớ…', 'saving');
    try {
      const deck = await ensureDeck();
      const [unitRows, cardRows, captureRows, eventRows, progress] = await Promise.all([
        fetchAllDeckRows('units', deck.id, 'created_at'),
        fetchAllDeckRows('cards', deck.id, 'created_at'),
        fetchAllDeckRows('source_captures', deck.id, 'created_at'),
        fetchAllDeckRows('review_events', deck.id, 'answered_at'),
        supabaseClient.from('learning_progress').select('*').eq('owner_id', learner.id).maybeSingle()
      ]);
      if (progress.error) throw new Error(progress.error.message);

      const remote = { units: unitRows, cards: cardRows, captures: captureRows, events: eventRows };
      cloudKnown = C.knownIds(remote);
      const hasRemote = C.remoteHasLearnerData(remote);
      const localForMerge = hasRemote && D.isPristineDb(db) ? { ...db, items: [] } : db;
      db = D.migrateDb(C.mergeLearnerDb(localForMerge, remote, progress.data?.payload || {}));
      if ((db.events || []).length) A.rebuildProgressFromEvents(db);
      save();

      await persistIncrementalDb();
      current = null;
      renderMemory();
      nextCard();
      setCloudStatus('Đã lưu vào tài khoản', 'ready');
    } catch (error) {
      setCloudStatus('Chưa đồng bộ', 'error');
      toast(`Không tải được dữ liệu tài khoản: ${error.message}`);
    } finally {
      isHydrating = false;
    }
  }

  function renderAuth() {
    const authButton = $('authBtn');
    const signOutButton = $('signOutBtn');
    if (!supabaseClient) {
      authButton.disabled = true;
      authButton.textContent = 'Thiếu cấu hình cloud';
      signOutButton.classList.add('hidden');
      setCloudStatus('Chỉ lưu trên thiết bị', 'local');
      return;
    }
    authButton.disabled = false;
    authButton.textContent = learner ? (learner.email || 'Tài khoản') : 'Đăng nhập';
    signOutButton.classList.toggle('hidden', !learner);
    if (!learner) setCloudStatus('Chỉ lưu trên thiết bị', 'local');
  }

  function openAuthDialog() {
    if (learner) {
      toast(`Đang đăng nhập bằng ${learner.email || 'tài khoản này'}.`);
      return;
    }
    window.location.assign('/login/#signin');
  }

  async function connectCloud(detail) {
    supabaseClient = detail?.client || null;
    renderAuth();
    if (!supabaseClient) {
      if (detail?.error) setCloudStatus('Chỉ lưu trên thiết bị', 'local');
      return;
    }
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) toast(`Không đọc được phiên đăng nhập: ${error.message}`);
    learner = data?.session?.user || null;
    renderAuth();
    if (learner) await hydrateCloud();
    supabaseClient.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION replays the session getSession() just returned — hydrating
      // again would double every Firestore read on each page load.
      if (event === 'INITIAL_SESSION') return;
      window.setTimeout(() => {
        learner = session?.user || null;
        activeDeck = null;
        cloudKnown = C.emptyKnownIds();
        renderAuth();
        if (learner) hydrateCloud();
      }, 0);
    });
  }

  async function resetLearning() {
    const confirmation = learner
      ? 'Xóa toàn bộ bộ thẻ, nguồn và lịch ôn của tài khoản này? Không thể hoàn tác.'
      : 'Xóa tiến trình đang lưu trên thiết bị này và bắt đầu lại?';
    if (!window.confirm(confirmation)) return;
    stopAudio();
    releaseRecording();
    clearRecordedAudio();
    if (supabaseClient && learner && activeDeck) {
      const { error } = await supabaseClient.from('decks').delete().eq('id', activeDeck.id);
      if (error) {
        toast(`Không xóa được dữ liệu cloud: ${error.message}`);
        return;
      }
      activeDeck = null;
      cloudKnown = C.emptyKnownIds();
    }
    localStorage.removeItem(KEY);
    db = D.createInitialDb();
    save();
    sessionReviews = 0;
    current = null;
    if (learner) await requestCloudSync('reset');
    nextCard();
    toast('Đã bắt đầu lại.');
  }

  $('sourceChip').onclick = toggleSource;
  $('audioPrimary').onclick = speakTarget;
  document.querySelectorAll('.tab').forEach((button) => {
    button.onclick = () => setView(button.dataset.view);
  });
  $('resetBtn').onclick = resetLearning;
  $('authBtn').onclick = openAuthDialog;
  if ($('memorySearch')) $('memorySearch').oninput = renderMemory;
  $('themeBtn').onclick = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('flashday:theme', next); } catch (e) { /* storage blocked */ }
  };
  $('signOutBtn').onclick = async () => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) toast(`Không đăng xuất được: ${error.message}`);
    } catch (err) {
      toast(`Không đăng xuất được: ${err.message}`);
    }
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || $('sourcePanel').classList.contains('hidden')) return;
    $('sourcePanel').classList.add('hidden');
    $('sourceChip').setAttribute('aria-expanded', 'false');
    $('sourceChip').focus();
  });

  $('captureForm').onsubmit = (event) => {
    event.preventDefault();
    try {
      const target = $('targetInput').value.trim();
      const sentence = $('sourceSentenceInput').value.trim();
      const nativeSentence = $('sourceTranslationInput').value.trim();
      const context = $('contextInput').value.trim();
      const url = $('sourceUrlInput').value.trim();
      const fileName = $('sourceFileInput').value.trim();
      const timestamp = Number($('sourceTimeInput').value || 0);
      if (sentence && !sentence.toLowerCase().includes(target.toLowerCase())) throw new Error('Câu nguồn phải chứa đúng target để tag unit an toàn.');
      if (sentence && !nativeSentence) throw new Error('Có câu nguồn thì cần bản dịch đầy đủ; FlashDay không tự bịa translation.');
      const draft = P.normalizeUnitDraft({
        target,
        meaning: $('meaningInput').value,
        type: $('typeInput').value,
        contexts: context ? [context] : [],
        intent: $('intentInput').value,
        canDo: $('canDoInput').value,
        exampleSentence: sentence,
        exampleTranslation: nativeSentence,
        origin: sentence ? 'source-captured' : 'learner-created'
      });
      const item = D.addItem(db, draft);
      if (sentence) {
        SC.addCapture(db, {
          sentence,
          nativeSentence,
          url,
          mediaTimestamp: timestamp,
          subtitleFileName: fileName,
          subtitle: { text: sentence, start: timestamp, end: timestamp },
          note: context || undefined
        });
      }
      save();
      requestCloudSync('capture');
      event.target.reset();
      toast(sentence ? `Đã thêm unit + source card cho “${item.target}”` : `Đã thêm unit “${item.target}”.`);
      renderMemory();
      setView('memory');
    } catch (error) {
      toast(error.message);
    }
  };

  // transcriptFileInput/importTranscriptBtn are owned by learning-hub.js
  // (importPersonalTranscript) — it runs after this module and wins onclick.

  window.addEventListener('flashday:supabase-ready', (event) => {
    connectCloud(event.detail);
  });
  window.addEventListener('flashday:learning-state-changed', () => {
    db = loadDb();
    renderMemory();
    requestCloudSync('learning-state');
  });

  if (debugEnabled) $('debugPanel').classList.remove('hidden');
  renderAuth();
  nextCard();
})();
