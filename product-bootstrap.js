import { createClient } from './firebase-client.mjs';

const config = __FLASHDAY_FIREBASE_CONFIG__;

if (!config?.apiKey || !config?.projectId || !config?.appId) {
  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client: null, error: 'Thiếu cấu hình cloud.' }
  }));
} else {
  const client = createClient(config, { mergeProgressPayload: window.FlashDayCloud?.mergeProgressPayload });
  const HAD_SESSION_KEY = 'flashday:had-session';
  const markSession = (had) => {
    try { window.localStorage.setItem(HAD_SESSION_KEY, had ? '1' : ''); } catch (_e) {}
  };

  // Wait for Firebase Auth to settle before any route guard can kick in.
  let initialSessionResolved = false;
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      initialSessionResolved = true;
      // ?session=lost tells /login/ the session was expected but vanished
      // (blocked storage, expired token) — only send it when a session has
      // existed on this device, otherwise first-time visitors get blamed.
      if (session) markSession(true);
      const previewMode = new URLSearchParams(window.location.search).has('preview');
      if (previewMode && !session) {
        document.getElementById('previewBadge')?.classList.remove('hidden');
      }
      if (!session && window.location.pathname.includes('/app/') && !previewMode) {
        let hadSession = true; // blocked storage is exactly the case session=lost explains
        try { hadSession = window.localStorage.getItem(HAD_SESSION_KEY) === '1'; } catch (_e) {}
        window.location.replace(hadSession ? '/login/?session=lost#signin' : '/login/#signin');
      }
      return;
    }
    if (event === 'SIGNED_OUT' && initialSessionResolved && window.location.pathname.includes('/app/')) {
      markSession(false);
      window.location.replace('/login/?signedOut=1#signin');
    }
  });

  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client, error: null }
  }));
}
