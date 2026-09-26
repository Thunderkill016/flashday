/*
 * Mapping boundary between FlashDay's browser model and Supabase rows.
 * No key or privileged operation belongs here; RLS owns authorization.
 */
(function(root, factory) {
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayCloud = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const HYBRID_SCHEDULER = 'bespoke-language-policy+fsrs6';
  const HYBRID_SOURCE = 'open-spaced-repetition/ts-fsrs@v5.4.2 + google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function unitRow(item, deckId) {
    return {
      id: String(item.id),
      deck_id: deckId,
      target: String(item.target || ''),
      meaning: String(item.meaning || ''),
      unit_type: String(item.type || 'chunk'),
      intent: String(item.intent || ''),
      can_do: String(item.canDo || ''),
      context: Array.isArray(item.contexts) ? String(item.contexts[0] || '') : '',
      example_sentence: String(item.exampleSentence || item.source?.sentence || ''),
      example_translation: String(item.exampleTranslation || item.source?.native_sentence || ''),
      forms: Array.isArray(item.forms) ? item.forms : [],
      accepted: Array.isArray(item.accepted) ? item.accepted : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      origin: String(item.origin || (item.source ? 'source-captured' : 'learner-created')),
      difficulty: item.difficulty ? String(item.difficulty) : null
    };
  }

  function itemFromRow(row) {
    return {
      id: String(row.id),
      target: String(row.target || ''),
      meaning: String(row.meaning || ''),
      type: String(row.unit_type || 'chunk'),
      forms: Array.isArray(row.forms) ? row.forms : [],
      accepted: Array.isArray(row.accepted) ? row.accepted : [],
      contexts: row.context ? [String(row.context)] : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      intent: String(row.intent || ''),
      canDo: String(row.can_do || ''),
      exampleSentence: String(row.example_sentence || ''),
      exampleTranslation: String(row.example_translation || ''),
      origin: String(row.origin || 'learner-created'),
      difficulty: row.difficulty ? String(row.difficulty) : undefined
    };
  }

  function cardRow(card, deckId) {
    return {
      id: String(card.id),
      deck_id: deckId,
      unit_ids: Array.isArray(card.unit_tags) ? card.unit_tags.map((tag) => tag.unit_id).filter(Boolean) : [],
      payload: card
    };
  }

  function captureRow(capture, deckId) {
    return { id: String(capture.id), deck_id: deckId, payload: capture };
  }

  function optMap(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function optStr(value) {
    return value == null ? '' : String(value);
  }

  function reviewRow(event, deckId) {
    return {
      id: String(event.id),
      deck_id: deckId,
      unit_ids: Array.isArray(event.unitIds) ? event.unitIds : [],
      card_id: String(event.cardId || ''),
      mode: String(event.mode || ''),
      ratings: optMap(event.ratings),
      response: optMap(event.response),
      stimulus: optMap(event.stimulus),
      sentence: optStr(event.sentence),
      native_sentence: optStr(event.nativeSentence),
      capture_id: optStr(event.captureId),
      rotation: optStr(event.rotation),
      source: optMap(event.source),
      scheduler: optStr(event.scheduler),
      memory_scheduler: optStr(event.memoryScheduler),
      language_policy: optStr(event.languagePolicy),
      fsrs_grades: optMap(event.fsrsGrades),
      telemetry: optMap(event.telemetry),
      error: optMap(event.error),
      memory: optMap(event.memory),
      is_reported: Boolean(event.isReported),
      answered_at: new Date(Number(event.answeredAt) || Date.now()).toISOString()
    };
  }

  function eventFromRow(row) {
    return {
      id: String(row.id),
      mode: String(row.mode),
      cardId: String(row.card_id),
      unitIds: Array.isArray(row.unit_ids) ? row.unit_ids : [],
      ratings: optMap(row.ratings),
      response: optMap(row.response),
      stimulus: optMap(row.stimulus),
      sentence: optStr(row.sentence),
      nativeSentence: optStr(row.native_sentence),
      captureId: optStr(row.capture_id) || null,
      rotation: optStr(row.rotation) || null,
      source: optMap(row.source),
      scheduler: optStr(row.scheduler),
      memoryScheduler: optStr(row.memory_scheduler),
      languagePolicy: optStr(row.language_policy),
      fsrsGrades: optMap(row.fsrs_grades),
      telemetry: optMap(row.telemetry),
      error: optMap(row.error),
      memory: optMap(row.memory),
      isReported: Boolean(row.is_reported),
      answeredAt: Date.parse(row.answered_at) || Date.now()
    };
  }

  function remoteHasLearnerData({ units = [], captures = [], cards = [], events = [] } = {}) {
    return units.length > 0 || captures.length > 0 || cards.length > 0 || events.length > 0;
  }

  function mergeById(remoteValues, localValues) {
    const merged = new Map();
    for (const value of Array.isArray(localValues) ? localValues : []) {
      if (value?.id != null) merged.set(String(value.id), clone(value));
    }
    // Remote wins an ID collision. Offline work is represented by new IDs in the
    // current product; in-place offline editing is intentionally not supported yet.
    for (const value of Array.isArray(remoteValues) ? remoteValues : []) {
      if (value?.id != null) merged.set(String(value.id), clone(value));
    }
    return Array.from(merged.values());
  }

  function mergeLearningProfile(localProfile, remoteProfile) {
    if (!remoteProfile) return clone(localProfile || null);
    if (!localProfile) return clone(remoteProfile);
    const localAt = Number(localProfile.updatedAt || 0);
    const remoteAt = Number(remoteProfile.updatedAt || 0);
    return clone(remoteAt >= localAt ? remoteProfile : localProfile);
  }

  function mergeLearnerDb(localDb = {}, remote = {}, progressPayload = {}) {
    const remoteItems = (remote.units || []).map(itemFromRow);
    const remoteCards = (remote.cards || []).map((row) => row?.payload).filter(Boolean);
    const remoteCaptures = (remote.captures || []).map((row) => row?.payload).filter(Boolean);
    const remoteEvents = (remote.events || []).map(eventFromRow);
    const events = mergeById(remoteEvents, localDb.events || [])
      .sort((a, b) => Number(a.answeredAt || 0) - Number(b.answeredAt || 0));
    // Transfer attempts live beside scheduler caches in learning_progress. They
    // are learner-owned observations, not review events and never affect FSRS.
    const transferAttempts = mergeById(progressPayload.transferAttempts || [], localDb.transferAttempts || [])
      .sort((a, b) => Number(a.submittedAt || 0) - Number(b.submittedAt || 0));

    return {
      version: String(localDb.version || progressPayload.version || 'repo-driven-2'),
      createdAt: Number(localDb.createdAt || Date.now()),
      items: mergeById(remoteItems, localDb.items || []),
      bespokeCards: mergeById(remoteCards, localDb.bespokeCards || []),
      captures: mergeById(remoteCaptures, localDb.captures || []),
      events,
      transferAttempts,
      learningProfile: mergeLearningProfile(localDb.learningProfile, progressPayload.learningProfile),
      // Review events are durable history. Both scheduler objects are caches and
      // must be rebuilt after a multi-device merge whenever history exists.
      bespokeProgress: events.length ? null : clone(progressPayload.bespokeProgress || localDb.bespokeProgress || null),
      fsrsProgress: events.length ? null : clone(progressPayload.fsrsProgress || localDb.fsrsProgress || null),
      scheduler: String(progressPayload.scheduler || localDb.scheduler || HYBRID_SCHEDULER),
      schedulerSource: String(progressPayload.schedulerSource || localDb.schedulerSource || HYBRID_SOURCE)
    };
  }

  function knownIds(remote = {}) {
    const ids = (values, selector) => new Set((Array.isArray(values) ? values : []).map(selector).filter(Boolean).map(String));
    return {
      units: ids(remote.units, (row) => row?.id),
      cards: ids(remote.cards, (row) => row?.id),
      captures: ids(remote.captures, (row) => row?.id),
      events: ids(remote.events, (row) => row?.id)
    };
  }

  function emptyKnownIds() {
    return { units: new Set(), cards: new Set(), captures: new Set(), events: new Set() };
  }

  function unknownById(values, known) {
    const set = known instanceof Set ? known : new Set();
    return (Array.isArray(values) ? values : []).filter((value) => value?.id != null && !set.has(String(value.id)));
  }

  function rememberIds(known, key, values) {
    if (!known?.[key]) return;
    for (const value of Array.isArray(values) ? values : []) {
      if (value?.id != null) known[key].add(String(value.id));
    }
  }

  return {
    unitRow,
    itemFromRow,
    cardRow,
    captureRow,
    reviewRow,
    eventFromRow,
    remoteHasLearnerData,
    mergeById,
    mergeLearningProfile,
    mergeLearnerDb,
    knownIds,
    emptyKnownIds,
    unknownById,
    rememberIds
  };
});
