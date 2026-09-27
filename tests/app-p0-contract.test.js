const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app-bespoke.js'), 'utf8');
const learningEntry = fs.readFileSync(path.join(__dirname, '..', 'learning-entry.js'), 'utf8');
const learningHub = fs.readFileSync(path.join(__dirname, '..', 'learning-hub.js'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '..', 'bespoke-adapter.js'), 'utf8');
const firebaseJson = fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8');
const firestoreRules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
const cloud = fs.readFileSync(path.join(__dirname, '..', 'flashday-cloud.js'), 'utf8');
const appHtml = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');
const loginJs = fs.readFileSync(path.join(__dirname, '..', 'login', 'login.js'), 'utf8');

assert(source.includes('persistIncrementalDb'), 'runtime must use incremental cloud writes');
assert(!source.includes('function persistCurrentDb'), 'legacy full-database sync must stay removed');
assert(source.includes('mergeLearnerDb'), 'cloud hydration must merge local and remote learner data');
assert(source.includes('rebuildProgressFromEvents'), 'merged review history must rebuild Bespoke cache');
assert(source.includes('.pageAfter(cursor, CLOUD_PAGE_SIZE)'), 'cloud history fetch must paginate');
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

// Context Rotation: a unit's context cards must rotate across reviews —
// lastTaskEvent + pickCardForTask guarantee the same card is not served twice
// in a row for a unit+mode while alternatives exist, and the durable event
// records which rotation happened so the log stays replayable.
assert(adapter.includes('function pickCardForTask'), 'context rotation picker must exist');
assert(adapter.includes('function lastTaskEvent'), 'rotation must read the last served card from durable events');
assert(adapter.includes("rotation=!last?'first'"), 'first-encounter rotation must be detectable');
// The cloud write path and the rules allowlist must stay in lockstep — the
// isIsoDateString incident proved a schema/rules drift denies every write.
assert(cloud.includes('rotation: optStr(event.rotation)'), 'review events must persist the rotation marker');
assert(firestoreRules.includes("'rotation'"), 'rules allowlist must accept the rotation field');

// Production ladder: unseen modes must open recognition-first. If the ladder
// order drifts (e.g. speak before read), fresh units would demand production
// before recognition — a silent pedagogy regression.
assert(adapter.includes("MODE_LADDER=['read','listen','write','speak']"), 'mode ladder must order recognition before production');
assert(firestoreRules.includes("'error'"), 'rules allowlist must accept the error record');
assert(cloud.includes('error: optMap(event.error)'), 'cloud mapping must persist the error record');
assert(cloud.includes('error: optMap(row.error)'), 'cloud mapping must restore the error record');
// Evidence split (kind/aided/unaidedUnits) is learner-visible truth — the
// cloud write path and the rules allowlist must carry it like the error record.
assert(cloud.includes('evidence: optMap(event.evidence)'), 'cloud mapping must persist the evidence record');
assert(cloud.includes('evidence: optMap(row.evidence)'), 'cloud mapping must restore the evidence record');
assert(firestoreRules.includes("'evidence'"), 'rules allowlist must accept the evidence field');
assert(adapter.includes('firstMissed'), 'the first-attempt miss snapshot must feed the evidence split');

// Memory search is table stakes (LingQ/Anki both ship it): the toolbar input
// must exist and renderMemory must filter on target + meaning + source context.
assert(appHtml.includes('id="memorySearch"'), 'memory view must expose a search input');
assert(source.includes('contextByUnit'), 'memory search must reach captured source sentences, not just target/meaning');
assert(source.includes("$('memorySearch').oninput = renderMemory"), 'search input must re-render the list on input');
// Capture edits are the only in-place cloud mutation — the merge must honor
// updatedAt or a stale remote row wipes the translation the learner typed.
assert(cloud.includes('mergeCaptures'), 'captures must merge by updatedAt, not blanket remote-wins');
assert(learningHub.includes('row.updatedAt=Date.now()'), 'in-place capture edits must stamp updatedAt');

// Quiz DOM lifetime is exercised by learning-browser.test.mjs: source-call
// counts cannot prove that feedback survives a save or that retry works.
// Regression: reveal and submit must share checkFinalTimeConfirm — if either
// path re-implemented the gate, "Xem mẫu" and the saved record could disagree.
assert(learningHub.includes('L.checkFinalTimeConfirm('), 'reveal gate must share the final-time check');
assert(learningEntry.split('checkFinalTimeConfirm(').length - 1 >= 2, 'submit gate must share the final-time check');
// Regression: the confirmation mission pins the scenario's agreed time —
// self-consistency between declared time and response text is not enough.
assert(learningEntry.includes("expectedFinalTime:'7:00'"), 'confirm mission must pin the scenario final time');
assert(learningEntry.includes('meridiemStrict'), 'strict AM/PM matching must be available per-mission');

// Regression: hydrateCloud replaced the learner db but only re-rendered
// memory + current card — authenticated page loads showed capture surfaces
// (cluster cards, mission lock, sources) in their pre-hydrate state.
assert(source.includes("'flashday:cloud-hydrated'"), 'hydrate must notify the hub that learner data was replaced');
assert(learningHub.includes("addEventListener('flashday:cloud-hydrated'"), 'hub must re-render data surfaces after cloud hydration');

// Regression: the auth listener exists for OAuth redirect completions, but
// SIGNED_IN also fires when createUserWithEmailAndPassword succeeds — signUp
// then signs out to wait for email verification, so auto-navigation raced the
// sign-out (some signups landed in /app/, some stayed on #signin).
assert(
  loginJs.includes('mode !== AUTH_MODE.SIGN_UP'),
  'auth listener must not navigate while an email sign-up is in flight'
);

console.log('FlashDay app P0 contracts passed');
