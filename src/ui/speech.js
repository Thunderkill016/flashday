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
