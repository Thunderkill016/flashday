/*
 * Deterministic communicative-goal matching for mission exit checks
 * (issue #33 round 2). NOT a keyword bag — each `match` entry is one of:
 *
 *   'stem *'        — stem phrase followed by a real content word. The slot
 *                     word must not be a function word ("i am *" misses
 *                     "i am your name" because 'your' is not a name), but a
 *                     capitalised raw token always counts ("I'm An" works —
 *                     proper nouns like An collide with articles otherwise).
 *   'two or more'   — an ordered phrase, matched on word boundaries. A
 *                     question form only counts when the whole form is
 *                     present: 'your name' alone is not an ask.
 *   'word'          — one exact token (greeting forms like 'hi').
 *
 * Everything is pure text — no DOM — so the unit tests pin the
 * counterexamples without a browser.
 */

// Canonical form: lowercase, punctuation stripped, contractions expanded —
// "I'm"/"im"/"i am" all land on the same token stream.
const EXPANSIONS = {
  "i'm": ['i', 'am'],
  im: ['i', 'am'],
  "what's": ['what', 'is'],
  whats: ['what', 'is'],
  "it's": ['it', 'is'],
  its: ['it', 'is'],
  "that's": ['that', 'is'],
  thats: ['that', 'is'],
  "you're": ['you', 'are'],
  "we're": ['we', 'are'],
  "they're": ['they', 'are'],
  "don't": ['do', 'not'],
  "doesn't": ['does', 'not'],
  "can't": ['can', 'not'],
  "won't": ['will', 'not']
};

function expandWord(word) {
  return EXPANSIONS[word] || [word];
}

export function canonLine(value) {
  const flat = String(value || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?…;:()"“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.split(' ').filter(Boolean).flatMap(expandWord).join(' ');
}

// Tokens that can follow a stem without being the learner-filled slot value.
// "i am your name" must NOT satisfy the name check — 'your' is grammar glue,
// not a name. Articles stay excluded; capitalised raw tokens bypass the list
// so a learner named An writing "I'm An" still counts.
const SLOT_GLUE = new Set([
  'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'am', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'not',
  'my', 'your', 'his', 'her', 'our', 'their', 'its',
  'me', 'him', 'us', 'them', 'name', 'names',
  'to', 'too', 'and', 'or', 'of', 'in', 'on', 'at', 'from', 'for', 'with',
  'what', 'where', 'who', 'how', 'when', 'why',
  'meet', 'nice', 'please', 'very', 'so', 'much', 'this', 'that', 'here', 'there'
]);

// One response analysed once: canon tokens + the raw casing of each source
// token, so slot checks can see "An" was written as a name.
function analyze(response) {
  const rawTokens = String(response || '')
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?…;:()"“”«»]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const canonWords = [];
  const rawIndex = [];
  rawTokens.forEach((token, i) => {
    for (const word of expandWord(token.toLowerCase())) {
      canonWords.push(word);
      rawIndex.push(i);
    }
  });
  return { canon: canonWords.join(' '), canonWords, rawTokens, rawIndex };
}

// Ordered phrase match on word boundaries — indexOf alone would accept
// 'what is your name' inside 'what is your namesake'.
function phraseAt(canon, phrase) {
  let idx = canon.indexOf(phrase);
  while (idx !== -1) {
    const before = idx === 0 || canon[idx - 1] === ' ';
    const end = idx + phrase.length;
    const after = end === canon.length || canon[end] === ' ';
    if (before && after) return true;
    idx = canon.indexOf(phrase, idx + 1);
  }
  return false;
}

function stemMet(a, stem) {
  const words = stem.split(' ');
  const n = words.length;
  for (let i = 0; i + n <= a.canonWords.length; i++) {
    if (!words.every((w, j) => a.canonWords[i + j] === w)) continue;
    const slotIdx = i + n;
    const slot = a.canonWords[slotIdx];
    if (!slot) continue; // stem at the end with no value — nothing produced
    if (!SLOT_GLUE.has(slot)) return true;
    // Function word in the slot — except when the raw token is capitalised,
    // which marks a proper noun the glue list can't know about ("I'm An").
    const raw = a.rawTokens[a.rawIndex[slotIdx]] || '';
    if (/^\p{Lu}/u.test(raw)) return true;
  }
  return false;
}

function patternMet(a, rawPattern) {
  const p = canonLine(rawPattern);
  if (!p) return false;
  if (p.endsWith(' *')) return stemMet(a, p.slice(0, -2));
  if (p.includes(' ')) return phraseAt(a.canon, p);
  return a.canonWords.includes(p);
}

export function meetsCheck(response, check) {
  const a = analyze(response);
  return (Array.isArray(check?.match) ? check.match : []).some((pattern) => patternMet(a, pattern));
}

export function scoreExitTurn(turn, response) {
  const checks = (Array.isArray(turn?.checks) ? turn.checks : []).map((check) => ({
    key: check.key,
    label: check.label,
    hint: check.hint,
    met: meetsCheck(response, check)
  }));
  const met = checks.filter((c) => c.met).length;
  return { checks, met, total: checks.length, score: checks.length ? met / checks.length : 1 };
}
