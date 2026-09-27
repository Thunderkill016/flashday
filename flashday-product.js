/*
 * FlashDay-owned learning-product contract. It keeps user-generated Units and
 * attempts explicit; the Bespoke scheduler remains responsible for timing.
 */
(function(root, factory) {
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayProduct = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const MODES = Object.freeze(['listen', 'speak', 'read', 'write']);

  function clean(value, maxLength) {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  function normalizeList(value) {
    return (Array.isArray(value) ? value : [])
      .map((entry) => clean(entry, 280))
      .filter(Boolean);
  }

  function normalizeUnitDraft(raw = {}) {
    const target = clean(raw.target, 280);
    const meaning = clean(raw.meaning, 500);
    if (!target || !meaning) throw new Error('English target và nghĩa là bắt buộc.');
    return {
      target,
      meaning,
      type: clean(raw.type || 'chunk', 40) || 'chunk',
      forms: normalizeList(raw.forms),
      accepted: normalizeList(raw.accepted),
      contexts: normalizeList(raw.contexts),
      tags: normalizeList(raw.tags),
      intent: clean(raw.intent, 280),
      canDo: clean(raw.canDo, 500),
      exampleSentence: clean(raw.exampleSentence, 1000),
      exampleTranslation: clean(raw.exampleTranslation, 1200),
      origin: clean(raw.origin || 'learner-created', 40) || 'learner-created',
      difficulty: clean(raw.difficulty, 32) || undefined
    };
  }

  function responseForMode(mode, raw = {}) {
    if (!MODES.includes(mode)) throw new Error('Mode review không hợp lệ.');
    return {
      text: clean(raw.text, 1200),
      spoke: Boolean(raw.spoke),
      recordedLocally: Boolean(raw.recordedLocally),
      // ASR self-report is metadata, never a pronunciation score — it records
      // only whether the learner confirmed the machine heard their wording.
      asrConfirmed: Boolean(raw.asrConfirmed)
    };
  }

  function hasObservableAttempt(mode, raw = {}) {
    const response = responseForMode(mode, raw);
    return mode === 'speak' ? response.spoke : Boolean(response.text);
  }

  function isRevealShortcut(event = {}) {
    return Boolean(
      !event.isComposing &&
      event.key === 'Enter' &&
      (event.ctrlKey || event.metaKey)
    );
  }

  // ── Output error loop ────────────────────────────────────────────────
  // After a write/speak attempt, surface ONE meaningful error, let the
  // learner retry, and record whether the corrected attempt landed. The
  // diff is deterministic — token alignment over canonicalized words — so
  // it never invents grammar claims we cannot observe (ASR "auto-corrects"
  // learner speech into clean transcripts, hiding exactly the errors that
  // need teaching; we diff what the user actually typed instead).

  const CONTRACTIONS = Object.freeze({
    "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is',
    "it's": 'it is', "we're": 'we are', "they're": 'they are',
    "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
    "i'll": 'i will', "you'll": 'you will', "he'll": 'he will', "she'll": 'she will',
    "we'll": 'we will', "they'll": 'they will',
    "i'd": 'i would', "you'd": 'you would', "he'd": 'he would', "she'd": 'she would',
    "we'd": 'we would', "they'd": 'they would',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
    "can't": 'can not', "cannot": 'can not', "won't": 'will not',
    "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
    "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
    "couldn't": 'could not', "shouldn't": 'should not', "wouldn't": 'would not',
    "mustn't": 'must not', "needn't": 'need not',
    "let's": 'let us', "that's": 'that is', "there's": 'there is',
    "what's": 'what is', "who's": 'who is', "here's": 'here is',
    'gonna': 'going to', 'wanna': 'want to', 'gotta': 'got to'
  });

  function canonicalTokens(text) {
    const raw = String(text ?? '')
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const out = [];
    for (const token of raw) {
      const cleaned = token.replace(/^'+|'+$/g, '');
      if (!cleaned) continue;
      const expanded = CONTRACTIONS[cleaned];
      if (expanded) for (const part of expanded.split(' ')) out.push(part);
      else out.push(cleaned);
    }
    return out;
  }

  // Word-level LCS alignment: 'same' | 'missing' | 'extra', then adjacent
  // missing+extra pairs merge into 'sub' so "my"→"the" renders as one
  // substitution rather than a deletion plus an insertion.
  function diffWords(expected, actual) {
    const e = canonicalTokens(expected);
    const a = canonicalTokens(actual);
    const m = e.length;
    const n = a.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i][j] = e[i] === a[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const raw = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
      if (e[i] === a[j]) { raw.push({ type: 'same', expected: e[i], actual: a[j] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { raw.push({ type: 'missing', expected: e[i], actual: '' }); i++; }
      else { raw.push({ type: 'extra', expected: '', actual: a[j] }); j++; }
    }
    while (i < m) { raw.push({ type: 'missing', expected: e[i], actual: '' }); i++; }
    while (j < n) { raw.push({ type: 'extra', expected: '', actual: a[j] }); j++; }
    const ops = [];
    for (let k = 0; k < raw.length; k++) {
      const op = raw[k];
      if (op.type === 'missing' && raw[k + 1]?.type === 'extra') {
        ops.push({ type: 'sub', expected: op.expected, actual: raw[k + 1].actual });
        k++;
      } else if (op.type === 'extra' && raw[k + 1]?.type === 'missing') {
        ops.push({ type: 'sub', expected: raw[k + 1].expected, actual: op.actual });
        k++;
      } else ops.push(op);
    }
    return ops;
  }

  const ERROR_TYPES = Object.freeze([
    'missing-target', 'word-form', 'missing-words', 'extra-words', 'word-order', 'self-check'
  ]);

  // units: [{unitId, label, forms:[strings]}] — forms should include the card's
  // tagged occurance plus the unit's target/forms/accepted variants.
  function classifyAttempt(expected, actual, units = []) {
    const attemptTokens = canonicalTokens(actual);
    const expectedTokens = canonicalTokens(expected);
    if (!attemptTokens.length) {
      return { stage: 'empty', errorTypes: [], ops: [], missingUnits: [], mismatchRatio: 1, corrected: false };
    }
    const ops = diffWords(expected, actual);
    const mismatches = ops.filter((op) => op.type !== 'same');
    const mismatchRatio = mismatches.length / Math.max(1, expectedTokens.length);
    const missingUnits = [];
    for (const unit of units) {
      const forms = (Array.isArray(unit.forms) ? unit.forms : [])
        .map((form) => canonicalTokens(form))
        .filter((tokens) => tokens.length);
      const present = forms.some((formTokens) => {
        for (let start = 0; start + formTokens.length <= attemptTokens.length; start++) {
          if (formTokens.every((token, offset) => attemptTokens[start + offset] === token)) return true;
        }
        return false;
      });
      if (!present) missingUnits.push(unit.unitId);
    }
    // Same multiset in a different order is word-order, not dropped words —
    // check it before reading token ops so "way my on" isn't "2 missing + 2 extra".
    const counts = new Map();
    let multisetEqual = attemptTokens.length === expectedTokens.length;
    if (multisetEqual) {
      for (const token of expectedTokens) counts.set(token, (counts.get(token) || 0) + 1);
      for (const token of attemptTokens) {
        const left = (counts.get(token) || 0) - 1;
        counts.set(token, left);
        if (left < 0) { multisetEqual = false; break; }
      }
    }
    const types = new Set();
    let subs = 0;
    let missing = 0;
    let extra = 0;
    for (const op of mismatches) {
      if (op.type === 'sub') subs++;
      else if (op.type === 'missing') missing++;
      else if (op.type === 'extra') extra++;
    }
    if (missingUnits.length) types.add('missing-target');
    if (subs) types.add('word-form');
    if (missing) types.add('missing-words');
    if (extra) types.add('extra-words');
    if (multisetEqual && mismatches.length) {
      // Every token is present but misplaced — report order, not dropped or
      // substituted words (the missing/extra ops here are an artifact of LCS
      // alignment on a reorder, not vocabulary errors).
      types.add('word-order');
      types.delete('word-form');
      types.delete('missing-words');
      types.delete('extra-words');
    }
    const stage = !mismatches.length && !missingUnits.length ? 'exact'
      : (missingUnits.length || mismatchRatio > 0.5) ? 'miss'
      : 'close';
    return {
      stage,
      errorTypes: [...types],
      ops,
      missingUnits,
      mismatchRatio,
      // 'corrected' means the learner produced every tagged unit with at
      // most light surface noise — the honest bar for closing a retry loop.
      corrected: stage === 'exact' || stage === 'close'
    };
  }

  // ONE correction at a time: pick the single most pedagogically important
  // error instead of dumping the whole diff on the learner.
  function primaryErrorHint(classification, units = []) {
    if (!classification || classification.stage === 'exact' || classification.stage === 'empty') return '';
    const labelFor = (unitId) => units.find((unit) => unit.unitId === unitId)?.label || unitId;
    if (classification.missingUnits.length) {
      const names = classification.missingUnits.slice(0, 2).map(labelFor).join('”, “');
      return `Câu trả lời thiếu cụm cần học: “${names}”.`;
    }
    const sub = classification.ops.find((op) => op.type === 'sub');
    if (sub) return `Từ “${sub.actual}” chưa đúng — đáp án dùng “${sub.expected}”.`;
    const missing = classification.ops.find((op) => op.type === 'missing');
    if (missing) return `Câu còn thiếu từ “${missing.expected}”.`;
    if (classification.errorTypes.includes('word-order')) return 'Các từ đúng nhưng thứ tự chưa đúng.';
    const extraOp = classification.ops.find((op) => op.type === 'extra');
    if (extraOp) return `Câu thừa từ “${extraOp.actual}”.`;
    return 'Câu trả lời còn khác đáp án — nhìn kỹ phần được đánh dấu.';
  }

  // Clamp the error record before it enters the append-only event log —
  // the same defensive shape used for response/stimulus/telemetry.
  function normalizeError(raw = {}) {
    const types = (Array.isArray(raw.types) ? raw.types : [])
      .map((type) => clean(type, 40))
      .filter((type) => ERROR_TYPES.includes(type))
      .slice(0, 8);
    const missedUnits = (Array.isArray(raw.missedUnits) ? raw.missedUnits : [])
      .map((id) => clean(id, 160))
      .filter(Boolean)
      .slice(0, 24);
    const stage = ['exact', 'close', 'miss', 'empty', 'self-check'].includes(raw.stage) ? raw.stage : '';
    const firstMissed = (Array.isArray(raw.firstMissed) ? raw.firstMissed : [])
      .map((id) => clean(id, 160))
      .filter(Boolean)
      .slice(0, 24);
    return {
      stage,
      types,
      missedUnits,
      // firstMissed = units absent in the FIRST unaided attempt — the
      // evidence layer uses it to separate unaided recall from aided recall.
      firstMissed,
      firstAttempt: clean(raw.firstAttempt, 1200),
      finalAttempt: clean(raw.finalAttempt, 1200),
      corrected: Boolean(raw.corrected),
      retryCount: Math.max(0, Math.min(9, Math.round(Number(raw.retryCount) || 0)))
    };
  }

  function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function reviewPayload(event, response) {
    return {
      id: clean(event?.id, 200),
      mode: clean(event?.mode, 20),
      cardId: clean(event?.cardId, 200),
      unitIds: Array.isArray(event?.unitIds) ? event.unitIds.map((id) => clean(id, 160)).filter(Boolean) : [],
      ratings: plainObject(event?.ratings),
      response: responseForMode(event?.mode, response),
      sentence: clean(event?.sentence, 1200),
      nativeSentence: clean(event?.nativeSentence, 1200),
      captureId: clean(event?.captureId, 200),
      source: plainObject(event?.source),
      stimulus: plainObject(event?.stimulus),
      telemetry: plainObject(event?.telemetry),
      memory: plainObject(event?.memory),
      scheduler: clean(event?.scheduler, 200),
      memoryScheduler: clean(event?.memoryScheduler, 200),
      languagePolicy: clean(event?.languagePolicy, 200),
      fsrsGrades: plainObject(event?.fsrsGrades),
      error: event?.error != null ? normalizeError(event.error) : undefined,
      isReported: Boolean(event?.isReported),
      answeredAt: Number(event?.answeredAt) || Date.now()
    };
  }

  return {
    MODES, ERROR_TYPES, normalizeUnitDraft, responseForMode, hasObservableAttempt,
    isRevealShortcut, reviewPayload, canonicalTokens, diffWords, classifyAttempt,
    primaryErrorHint, normalizeError
  };
});
