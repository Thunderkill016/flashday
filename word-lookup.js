/*
 * Tap-word lookup for the reader — the foundation gap every content-first
 * product covers: LingQ hints, Language Reactor popup, Migaku/Yomitan
 * dictionaries. Sources (all free, no key):
 *   English definitions: api.dictionaryapi.dev (Free Dictionary API)
 *   Vietnamese glosses:  api.mymemory.translated.net (machine translation —
 *                        always labeled "dịch máy", never presented as verified)
 * Results cache in localStorage for 30 days; MyMemory rate-limits anonymous
 * usage so the cache is also the polite path.
 */
(function(root, factory) {
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayLookup = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const CACHE_KEY = 'flashday:dict-cache-v1';
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 6000;
  let memCache = null;

  function storageGet() {
    if (typeof localStorage === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function storageSet(cache) {
    if (typeof localStorage === 'undefined') return;
    try {
      const keys = Object.keys(cache);
      if (keys.length > 800) {
        keys.sort((a, b) => (cache[a].at || 0) - (cache[b].at || 0));
        keys.slice(0, keys.length - 800).forEach(k => delete cache[k]);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* storage full/blocked — lookups still work uncached */ }
  }

  function readCache() {
    if (!memCache) memCache = storageGet();
    return memCache;
  }

  async function fetchJson(url) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function englishEntries(word) {
    const data = await fetchJson('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
    const out = [];
    for (const entry of Array.isArray(data) ? data : []) {
      for (const m of entry.meanings || []) {
        const def = ((m.definitions || [])[0] || {}).definition;
        if (def) out.push({ pos: String(m.partOfSpeech || ''), def: String(def) });
      }
    }
    return out.slice(0, 4);
  }

  async function vietnameseGloss(text) {
    const data = await fetchJson('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|vi');
    const main = data && data.responseData && data.responseData.translatedText;
    const seen = new Set();
    const alternatives = (data && data.matches || [])
      .map(m => String(m.translation || '').trim())
      .filter(t => {
        const k = t.toLowerCase();
        if (!t || t.toUpperCase() === t && t.length > 3 || seen.has(k) || (main && k === String(main).toLowerCase())) return false;
        seen.add(k);
        return true;
      });
    return { main: main ? String(main) : '', alternatives: alternatives.slice(0, 3) };
  }

  async function lookup(text, opts) {
    const word = String(text || '').toLowerCase().trim();
    if (!word) return { word: '', en: [], vi: null };
    const online = !opts || opts.online !== false;
    const hit = readCache()[word];
    if (hit && Date.now() - (hit.at || 0) < CACHE_TTL_MS) {
      return { word, en: hit.en || [], vi: hit.vi || null, cached: true };
    }
    if (!online || typeof fetch !== 'function') {
      return { word, en: (hit && hit.en) || [], vi: (hit && hit.vi) || null, offline: true };
    }
    const settled = await Promise.allSettled([englishEntries(word), vietnameseGloss(word)]);
    const result = {
      en: settled[0].status === 'fulfilled' ? settled[0].value : [],
      vi: settled[1].status === 'fulfilled' ? settled[1].value : null
    };
    const cache = readCache();
    cache[word] = { en: result.en, vi: result.vi, at: Date.now() };
    storageSet(cache);
    return { word, ...result };
  }

  function youtubeVideoId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
    return m ? m[1] : null;
  }

  let ytApiPromise = null;
  function ensureYouTubeApi() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (!ytApiPromise) {
      ytApiPromise = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function() {
          if (typeof prev === 'function') prev();
          resolve(window.YT);
        };
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => { ytApiPromise = null; reject(new Error('youtube api load failed')); };
        document.head.appendChild(tag);
        setTimeout(() => reject(new Error('youtube api timeout')), 10000);
      });
      ytApiPromise.catch(() => { ytApiPromise = null; });
    }
    return ytApiPromise;
  }

  return { lookup, youtubeVideoId, ensureYouTubeApi, CACHE_TTL_MS };
});
