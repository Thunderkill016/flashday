// FlashDay is served from both default Firebase domains; auth is configured
// against firebaseapp.com (authDomain). Loading the app on web.app would put
// the auth helper iframe on a different origin — third-party storage rules
// could then break sign-in. Canonicalise before anything else runs.
if (window.location.hostname === 'flashday-22ae1.web.app') {
  window.location.replace(
    'https://flashday-22ae1.firebaseapp.com' +
      window.location.pathname +
      window.location.search +
      window.location.hash
  );
}
