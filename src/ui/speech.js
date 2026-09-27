/*
 * Shared English TTS for lesson targets. Every top product lets learners hear
 * each phrase — prepare chunks, dialogue lines and review answers must not be
 * silent text for an A1 learner.
 */
export const LEARNER_SPEECH_RATE = 0.85;

export function pickEnglishVoice(voices) {
  const priority = (voice) => {
    const lang = voice.lang?.replace('_', '-').toLowerCase();
    if (lang === 'en-us') return 0;
    if (lang === 'en-gb') return 1;
    if (/^en-/.test(lang || '')) return 2;
    return 3;
  };
  return (
    [...voices]
      .filter((voice) => priority(voice) < 3)
      .sort(
        (a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name, 'en') || a.lang.localeCompare(b.lang, 'en')
      )[0] || null
  );
}

// Plays `text` with the deterministic English voice; returns false when the
// device has no English voice so callers can degrade visibly.
export function speakEnglish(text, { rate = LEARNER_SPEECH_RATE } = {}) {
  const synthesis = window.speechSynthesis;
  if (!synthesis) return false;
  const voice = pickEnglishVoice(synthesis.getVoices());
  if (!voice) return false;
  const utter = new SpeechSynthesisUtterance(text);
  try {
    utter.voice = voice;
    utter.lang = voice.lang;
  } catch {
    return false; // engine rejected the picked voice — degrade, don't crash
  }
  utter.rate = rate;
  synthesis.cancel();
  synthesis.speak(utter);
  return true;
}

// Small consistent "play this target" control. `onDegraded` runs when no
// English voice exists so the host view can show its own fallback notice.
export function playButton(text, { label = 'Nghe', onDegraded } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-secondary play-target';
  btn.dataset.role = 'play-target';
  btn.textContent = `▶ ${label}`;
  btn.addEventListener('click', () => {
    if (!speakEnglish(text)) onDegraded?.(btn);
  });
  return btn;
}

/* ── Speech recognition (say-it-back check) ─────────────── */

// Chrome/Edge only today; Safari/Firefox return null and callers hide the
// control — the static flow must still work there.
export function speechRecognizer() {
  const Ctor =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!Ctor) return null;
  return new Ctor();
}

// Normalizes learner-vs-target text for comparison: contractions expand so
// "I'm" heard as "I am" still counts, punctuation and case don't penalize.
const CONTRACTION_EQUIVALENTS = [
  ["i'm", 'i am'],
  ["what's", 'what is'],
  ["where's", 'where is'],
  ["it's", 'it is'],
  ["that's", 'that is'],
  ["you're", 'you are'],
  ["we're", 'we are'],
  ["they're", 'they are'],
  ["isn't", 'is not'],
  ["aren't", 'are not'],
  ["don't", 'do not'],
  ["doesn't", 'does not'],
  ["can't", 'can not'],
  ["won't", 'will not']
];

function words(text) {
  let normalized = String(text || '')
    .toLowerCase()
    .replace(/[.,!?;:"""''()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [short, long] of CONTRACTION_EQUIVALENTS) {
    normalized = normalized.split(short).join(long);
  }
  return normalized ? normalized.split(' ') : [];
}

// Longest-common-subsequence match: which target words the recognizer heard.
// Returns { matchedWords, missedWords, heard, score } — score in [0,1] is the
// share of target words heard; not a phoneme score, just "was it understood".
export function matchSpeech(target, transcript) {
  const targetWords = words(target);
  const heardWords = words(transcript);
  const n = targetWords.length;
  const m = heardWords.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] =
        targetWords[i - 1] === heardWords[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
  // Walk back the LCS to flag which target words were heard.
  const heardFlag = new Array(n).fill(false);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    if (targetWords[i - 1] === heardWords[j - 1]) {
      heardFlag[i - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return {
    matchedWords: targetWords.filter((_, i) => heardFlag[i]),
    missedWords: targetWords.filter((_, i) => !heardFlag[i]),
    heard: heardWords.join(' '),
    score: n ? heardFlag.filter(Boolean).length / n : 0
  };
}

// Records a short mic clip for AI pronunciation assessment. Returns null when
// MediaRecorder/getUserMedia is unavailable — callers hide the control.
export async function startClipRecorder() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return null;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => chunks.push(e.data));
  const done = new Promise((resolve) => {
    recorder.addEventListener('stop', () => {
      for (const track of stream.getTracks()) track.stop();
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    });
  });
  recorder.start();
  return {
    stop() {
      if (recorder.state !== 'inactive') recorder.stop();
    },
    done
  };
}

// "Nói thử" control: records via SpeechRecognition, then shows a word-level
// diff against the target so the learner sees what the recognizer heard.
// Returns { button, output } — mount both next to a model line.
export function speakCheck(target, { label = 'Nói thử' } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-secondary say-check';
  button.dataset.role = 'say-check';
  button.textContent = `🎤 ${label}`;
  const output = document.createElement('p');
  output.className = 'say-check-result';
  output.hidden = true;
  output.setAttribute('aria-live', 'polite');

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
    rec.addEventListener('result', (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      const match = matchSpeech(target, transcript);
      output.textContent = '';
      const em = document.createElement('em');
      em.textContent = `"${transcript}"`;
      output.append(
        document.createTextNode(
          match.score >= 0.8 ? 'Nghe rõ: ' : match.score > 0 ? 'Nghe được một phần: ' : 'Chưa nghe rõ: '
        ),
        em
      );
      if (match.missedWords.length && match.score < 1) {
        const detail = document.createElement('span');
        detail.className = 'say-check-missed';
        detail.textContent = ` — thiếu/không rõ: ${match.missedWords.join(', ')}`;
        output.appendChild(detail);
      }
      output.hidden = false;
    });
    const reset = () => {
      button.disabled = false;
      button.textContent = `🎤 ${label}`;
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
