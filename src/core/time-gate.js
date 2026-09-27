/*
 * Minimal 'time' gate for write tasks (write.gate = { type:'time',
 * expected:'7:00', strict }): the learner declares the time they committed to
 * and the response text must mention it.
 */

const WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
  'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40, 'forty-five': 45, 'half': 30,
  quarter: 15
};

// '7' | '7:00' | 'seven' | 'seven thirty' | '7 am' | '19:00' → minutes-of-day.
export function parseDeclaredTime(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return null;
  const pm = /\bpm\b/.test(raw);
  const am = /\bam\b/.test(raw);
  const cleaned = raw.replace(/\b(am|pm|o'?clock|giờ|rưỡi)\b/g, ' ').trim();

  let hour = null;
  let minute = 0;
  const numeric = cleaned.match(/^(\d{1,2})(?:[:.](\d{1,2}))?/);
  if (numeric) {
    hour = Number(numeric[1]);
    minute = numeric[2] != null ? Number(numeric[2]) : 0;
  } else {
    const words = cleaned.split(/[\s-]+/).filter(Boolean);
    if (!words.length || WORDS[words[0]] == null || WORDS[words[0]] > 12) return null;
    hour = WORDS[words[0]];
    if (words[1] === 'half') minute = 30;
    else if (words[1] != null) {
      if (WORDS[words[1]] == null) return null;
      minute = WORDS[words[1]];
    }
  }
  if (hour == null || hour > 24 || minute > 59) return null;
  if (pm && hour < 12) hour += 12;
  if (am && hour === 12) hour = 0;
  if (!pm && !am && hour === 24) return null;
  return hour * 60 + minute;
}

export function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// expected like '7:00'/'19:00'. strict=false → compare mod 12 (7 == 19).
export function checkTimeGate({ gate, declaredTime, responseText }) {
  if (!gate || gate.type !== 'time') return { ok: true };
  const declared = parseDeclaredTime(declaredTime);
  if (declared == null) return { ok: false, reason: 'unparsed', normalized: null };
  const expected = parseDeclaredTime(gate.expected);
  const sameClock = gate.strict
    ? declared === expected
    : declared % 720 === expected % 720;
  if (!sameClock) return { ok: false, reason: 'mismatch', normalized: formatMinutes(declared) };
  // The declared time must actually appear in the response, not just the field.
  const normalized = formatMinutes(declared);
  const rawDeclared = String(declaredTime || '').trim().toLowerCase();
  const mention = [normalized, `${Math.floor(declared / 60)}:${String(declared % 60).padStart(2, '0')}`,
    String(Math.floor(declared / 60) % 12 || 12), rawDeclared];
  const body = String(responseText || '').toLowerCase();
  const mentioned = mention.some((variant) => body.includes(variant.toLowerCase()));
  return { ok: mentioned, reason: mentioned ? null : 'not-mentioned', normalized };
}
