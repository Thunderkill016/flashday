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
      recordedLocally: Boolean(raw.recordedLocally)
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
      isReported: Boolean(event?.isReported),
      answeredAt: Number(event?.answeredAt) || Date.now()
    };
  }

  return { MODES, normalizeUnitDraft, responseForMode, hasObservableAttempt, isRevealShortcut, reviewPayload };
});
