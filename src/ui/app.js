/*
 * FlashDay A1 app shell: header + 3 tabs + hash router.
 * Views are empty-but-navigable in Phase 1; content lands in later phases.
 */
import { createPersistentStore } from '../core/store.js';
import { createInitialDb, hydrateDb } from '../core/evidence.js';
import { createSession } from '../core/session.js';
import { claimDbNamespace, dbKey, releaseDbNamespace } from '../core/namespace.js';
import { createCloudSync } from '../core/cloud.js';
import * as todayView from './views/today.js';
import * as runnerView from './views/runner.js';
import * as summaryView from './views/summary.js';
import * as pathView from './views/path.js';
import * as reviewView from './views/review.js';
import * as profileView from './views/profile.js';

const root = document.getElementById('view');
const storage = window.localStorage;
const previewMode = new URLSearchParams(window.location.search).has('preview');

const store = createPersistentStore({
  storage,
  key: () => dbKey(storage),
  hydrate: hydrateDb,
  fallback: createInitialDb
});
const session = createSession({ storage });

const ctx = {
  client: null,
  user: null,
  preview: previewMode,
  storage,
  store,
  session,
  navigate(hash) { window.location.hash = hash; }
};

// Small honest sync pill in the header. Preview mode and signed-out states
// both read "Chỉ lưu trên thiết bị" — nothing pretends to reach the cloud.
const cloudStatusEl = document.getElementById('cloudStatus');
const CLOUD_STATUS_TEXT = {
  saving: 'Đang lưu…',
  saved: 'Đã lưu vào tài khoản',
  offline: 'Chưa đồng bộ',
  error: 'Lỗi đồng bộ — thử lại',
  local: 'Chỉ lưu trên thiết bị'
};
function setCloudPill(status) {
  if (!cloudStatusEl) return;
  cloudStatusEl.textContent = CLOUD_STATUS_TEXT[status] || CLOUD_STATUS_TEXT.local;
  cloudStatusEl.dataset.state = status;
}
// Created lazily once the bootstrap hands us a client — preview/no-config
// sessions stay on the "Chỉ lưu trên thiết bị" pill and never sync.
let cloudSync = null;
function cloud() {
  if (!cloudSync && ctx.client) {
    cloudSync = createCloudSync({ client: ctx.client, store, storage, onStatus: setCloudPill });
  }
  return cloudSync;
}
setCloudPill('local');

window.addEventListener('flashday:cloud-hydrated', () => render());

const routes = [
  { pattern: /^#\/lesson\/([^/]+)\/([^/]+)$/, view: runnerView, tab: 'learn',
    params: (m) => ({ lessonId: m[1], step: m[2] }) },
  { pattern: /^#\/summary\/([^/]+)$/, view: summaryView, tab: 'learn',
    params: (m) => ({ lessonId: m[1] }) },
  { pattern: /^#\/review$/, view: reviewView, tab: 'review' },
  { pattern: /^#\/profile$/, view: profileView, tab: 'profile' },
  { pattern: /^#\/path$/, view: pathView, tab: 'learn' },
  { pattern: /^#\/today$/, view: todayView, tab: 'learn' }
];

let currentView = null;

function route() {
  const hash = window.location.hash || '#/today';
  const match = routes.find((r) => r.pattern.test(hash)) || routes[routes.length - 1];
  const params = match.params ? match.params(hash.match(match.pattern)) : {};

  // Rule 1: a step switch inside the same lesson must never rebuild the DOM —
  // the runner keeps all panes mounted and just toggles `hidden`.
  if (currentView === match.view && typeof match.view.update === 'function'
      && match.view.update({ ...ctx, params })) {
    // handled in place
  } else {
    if (currentView?.unmount) currentView.unmount();
    root.textContent = '';
    currentView = match.view;
    match.view.mount(root, { ...ctx, params });
  }

  for (const tab of document.querySelectorAll('.app-tab')) {
    const active = tab.dataset.tab === match.tab;
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
}

function wireAuth() {
  const client = ctx.client;
  if (!client) { render(); return; }
  // Hydrate explicitly, then ignore the listener's INITIAL_SESSION replay —
  // handling both would double every read per page load (AGENTS.md lesson 10).
  client.auth.getSession().then(({ data }) => {
    if (applySession(data?.session || null)) render();
  });
  client.auth.onAuthStateChange((event, sessionEvent) => {
    if (event === 'INITIAL_SESSION') return;
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // Only a real identity change justifies re-rendering — TOKEN_REFRESHED
      // fires periodically and must not wipe an in-progress lesson.
      if (applySession(sessionEvent)) render();
    } else if (event === 'SIGNED_OUT') {
      cloudSync?.disconnect();
      setCloudPill('local');
      releaseDbNamespace(storage);
      ctx.user = null;
      store.refresh();
      render();
    }
  });
}

// Returns whether the signed-in identity actually changed.
function applySession(sess) {
  const uid = sess?.user?.id || sess?.user?.uid || null;
  if (uid === (ctx.user?.id || null)) return false;
  if (uid) {
    claimDbNamespace(storage, uid);
    ctx.user = { id: uid, email: sess.user.email || '' };
    store.refresh();
    session.load();
    cloud()?.connect(ctx.user);
  } else {
    cloudSync?.disconnect();
    ctx.user = null;
    setCloudPill('local');
  }
  return true;
}

let renderQueued = false;
function render() {
  // Re-render the active view after auth/cloud state changes (rule 5).
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => { renderQueued = false; route(); });
}

// The product bootstrap creates the shared client and owns the /app/ route
// guard; when config is missing (or for local preview) we run unauthenticated.
// Wired AFTER all declarations: a missing config announces synchronously and
// bootstrapReady→wireAuth→render would otherwise hit the TDZ on renderQueued.
function bootstrapReady(detail) {
  ctx.client = detail?.client || null;
  wireAuth();
}
window.addEventListener('flashday:supabase-ready', (event) => bootstrapReady(event.detail));
// The bootstrap module evaluates before this one, so its ready event may
// already have fired — read the stashed detail in that case.
if (window.FlashDayBootstrap) bootstrapReady(window.FlashDayBootstrap);

window.addEventListener('hashchange', route);
route();
