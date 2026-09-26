const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app-bespoke.js'), 'utf8');
const learningEntry = fs.readFileSync(path.join(__dirname, '..', 'learning-entry.js'), 'utf8');
const learningHub = fs.readFileSync(path.join(__dirname, '..', 'learning-hub.js'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '..', 'bespoke-adapter.js'), 'utf8');
const firebaseJson = fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8');
const appHtml = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');

assert(source.includes('persistIncrementalDb'), 'runtime must use incremental cloud writes');
assert(!source.includes('function persistCurrentDb'), 'legacy full-database sync must stay removed');
assert(source.includes('mergeLearnerDb'), 'cloud hydration must merge local and remote learner data');
assert(source.includes('rebuildProgressFromEvents'), 'merged review history must rebuild Bespoke cache');
assert(source.includes('.range(from, from + CLOUD_PAGE_SIZE - 1)'), 'cloud history fetch must paginate');
assert(source.includes('ignoreDuplicates: true'), 'append-only review upload must be idempotent');
assert(source.includes('D.isPristineDb(db)'), 'fresh demo seeds must not pollute an existing remote account');
assert(source.includes("'browser-tts'"), 'listening stimulus provenance must distinguish browser TTS');
assert(source.includes("'source-audio'"), 'listening stimulus provenance must distinguish source audio');
assert(learningEntry.includes('GUIDED_CLUSTERS'), 'guided content must be organized as a situation cluster, not isolated cards');
assert(learningEntry.includes('TRANSFER_MISSIONS'), 'the learner model must define transfer tasks separately from review events');
assert(learningEntry.includes('submitTransferAttempt'), 'transfer attempts must be explicit learner records');
assert(learningHub.includes('Xem mẫu sau khi đã thử'), 'transfer UI must require an observable attempt before revealing the model');
assert(appHtml.includes('id="transferMissions"'), 'the learner shell must reserve a transfer-mission region');

// Regression: INITIAL_SESSION replays the session connectCloud just hydrated —
// without this guard every /app/ load used to run hydrateCloud/pullProfile twice.
assert(source.includes("if (event === 'INITIAL_SESSION') return;"), 'auth listener must skip INITIAL_SESSION to avoid double hydration');
assert(learningHub.includes("event==='INITIAL_SESSION'"), 'learning-hub listener must skip INITIAL_SESSION to avoid double profile pull');
// Regression: an exhausted queue must not be a dead end or misreported as "no
// valid card" — the empty state distinguishes "no content" from "not due yet"
// and offers a retry.
assert(source.includes('id="retryDraw"'), 'done state must offer a retry button');
assert(source.includes('Chưa có nội dung để học'), 'done state must distinguish empty deck from not-yet-due');
// Regression: render paths reuse the engine selectNext built instead of
// re-indexing every capture once per unit (was 2N engine builds per render).
assert(adapter.includes('engine=engine||buildEngine(db)'), 'adapter readers must accept a shared engine');
// Regression: HTML entry points must never be served with a long cache — a
// cached index.html pins users to stale hashed chunks after every deploy.
assert(firebaseJson.includes('"no-cache"'), 'HTML entry points must always revalidate');
assert(firebaseJson.includes('max-age=31536000, immutable'), 'hashed assets must be cached immutably');
// Regression: transcript import is owned by learning-hub — a second handler in
// app-bespoke silently overwrote the richer one (or lost, depending on order).
assert(!source.includes("$('importTranscriptBtn').onclick"), 'app-bespoke must not register a duplicate import handler');

console.log('FlashDay app P0 contract: 21 checks passed');
