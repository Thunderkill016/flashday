import { createClient } from './firebase-client.js';

const config = __FLASHDAY_FIREBASE_CONFIG__;

if (!config?.apiKey || !config?.projectId || !config?.appId) {
  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client: null, error: 'Thiếu cấu hình cloud.' }
  }));
} else {
  const client = createClient(config);

  // Wait for Firebase Auth to settle before any route guard can kick in.
  let initialSessionResolved = false;
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      initialSessionResolved = true;
      if (!session && window.location.pathname.includes('/app/')) window.location.replace('/');
      return;
    }
    if (event === 'SIGNED_OUT' && initialSessionResolved && window.location.pathname.includes('/app/')) {
      window.location.replace('/');
    }
  });

  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client, error: null }
  }));
}
