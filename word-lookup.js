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
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) { return text; }
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

  // ── YouTube transcript fetch (youtube-transcript.ai) ─────────────────────
  // Free, key-less, CORS-open endpoint that returns a Markdown document:
  //   # Transcript: <title>
  //   Source video: <url>
  //   Language: en · Duration: 3:27 · Words: 481
  //   ...
  //   ## Transcript
  //   [0:01] paragraph text…
  // The learner's own fetch, for their own study — same user-initiated model
  // as Language Reactor / Yomitan. Timestamps arrive per ~30s paragraph, so
  // sentence positions inside a paragraph are linearly interpolated —
  // accurate enough to seek the embedded player close to the spoken line.
  const TRANSCRIPT_ENDPOINT = 'https://youtube-transcript.ai/transcript/';

  function paragraphTimestamp(tag) {
    const m = String(tag).match(/^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
    if (!m) return null;
    // [m:ss] or [h:mm:ss]
    return m[3] != null
      ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
      : Number(m[1]) * 60 + Number(m[2]);
  }

  function cleanCueText(text) {
    return String(text || '')
      .replace(/♪/g, ' ')
      .replace(/\[[^\]]*(music|applause|laughter|♪)[^\]]*\]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function splitSentences(text) {
    return String(text || '')
      .split(/(?<=[.!?…])\s+/)
      .map(s => s.trim())
      .filter(s => /[\p{L}\p{N}]/u.test(s));
  }

  function parseYouTubeTranscript(md) {
    const raw = String(md || '');
    const title = (raw.match(/^# Transcript:\s*(.+)$/m) || [])[1]?.trim() || '';
    const segments = [];
    // Body ends at the service's "---\nGenerated by …" footer separator.
    const blocks = (raw.split(/^## Transcript\s*$/m)[1] || '').split(/^---\s*$/m)[0];
    const paragraphRe = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*/g;
    const marks = [];
    let mm;
    while ((mm = paragraphRe.exec(blocks))) marks.push({ tag: mm[1], begin: mm.index, end: paragraphRe.lastIndex });
    for (let i = 0; i < marks.length; i++) {
      const start = paragraphTimestamp('[' + marks[i].tag + ']');
      const nextStart = i + 1 < marks.length ? paragraphTimestamp('[' + marks[i + 1].tag + ']') : null;
      // Slice this paragraph's text between its tag and the next tag's bracket.
      const rawText = blocks.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].begin : blocks.length);
      const sentences = splitSentences(cleanCueText(rawText));
      if (!sentences.length || start == null) continue;
      const span = nextStart != null && nextStart > start ? nextStart - start : 30;
      const totalChars = sentences.reduce((a, s) => a + s.length, 0);
      let cursor = start;
      for (const s of sentences) {
        const share = totalChars ? (s.length / totalChars) * span : span / sentences.length;
        segments.push({ start: Math.round(cursor * 10) / 10, end: Math.round((cursor + share) * 10) / 10, text: s });
        cursor += share;
      }
    }
    return { title, segments };
  }

  async function fetchYouTubeTranscript(videoId) {
    const id = String(videoId || '').trim();
    if (!id) throw new Error('Thiếu video id.');
    const res = await fetchJson(TRANSCRIPT_ENDPOINT + encodeURIComponent(id) + '.txt');
    if (typeof res !== 'string') throw new Error('Transcript trả về sai định dạng.');
    const parsed = parseYouTubeTranscript(res);
    if (!parsed.segments.length) throw new Error('Video này không có phụ đề lấy được.');
    return parsed;
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

  return { lookup, youtubeVideoId, ensureYouTubeApi, fetchYouTubeTranscript, parseYouTubeTranscript, CACHE_TTL_MS };
});
