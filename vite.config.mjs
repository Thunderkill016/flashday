import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const landingEntry = resolve(import.meta.dirname, 'index.html');
  return {
    base: '/',
    plugins: [],
    build: {
      rolldownOptions: {
        input: {
          landing: landingEntry,
          app: resolve(import.meta.dirname, 'app/index.html'),
          login: resolve(import.meta.dirname, 'login/index.html'),
          auth: resolve(import.meta.dirname, 'auth/index.html'),
        },
      },
    },
    define: {
      __FLASHDAY_FIREBASE_CONFIG__: JSON.stringify({
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      }),
    },
  };
});
