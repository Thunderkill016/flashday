/*
 * Feedback sounds — the reward cue every top product plays on answers.
 * Two-tone WebAudio blips synthesized at runtime: no assets, no network.
 * AudioContext requires a user gesture; callers fire this from click
 * handlers, and a still-suspended context just plays nothing.
 */
let audioContext = null;

function ctx() {
  if (audioContext) return audioContext;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioContext = new AC();
  return audioContext;
}

function tone(ac, { freq, start, duration, gain = 0.12 }) {
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(gain, ac.currentTime + start);
  env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + duration);
  osc.connect(env).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration);
}

const SEQUENCES = {
  pass: [
    { freq: 660, start: 0, duration: 0.12 },
    { freq: 880, start: 0.1, duration: 0.18 }
  ],
  retry: [{ freq: 220, start: 0, duration: 0.18, gain: 0.08 }],
  complete: [
    { freq: 523, start: 0, duration: 0.12 },
    { freq: 659, start: 0.1, duration: 0.12 },
    { freq: 784, start: 0.2, duration: 0.22 }
  ]
};

export function playFeedback(kind) {
  try {
    const ac = ctx();
    if (!ac) return;
    const go = () => {
      for (const note of SEQUENCES[kind] || []) tone(ac, note);
    };
    // Autoplay policy: a suspended context resumes on the next gesture;
    // notes are scheduled only once running so nothing plays silently.
    if (ac.state === 'suspended') ac.resume().then(go).catch(() => {});
    else go();
  } catch {
    // sound is a bonus layer — never let audio break the flow
  }
}
