// Canonical host for FlashDay. authDomain is flashday.web.app — the auth
// helper iframe is first-party only when the app runs on that origin, so any
// other serving host (flashday.firebaseapp.com, the legacy flashday-22ae1
// domains) must hand off before Firebase initialises. localhost and Hosting
// preview channels (`--channel`) are exempt so local dev and previews work.
const flashdayHost = window.location.hostname;
const flashdayAllowed =
  flashdayHost === 'flashday.web.app' ||
  flashdayHost === 'localhost' ||
  flashdayHost === '127.0.0.1' ||
  flashdayHost.includes('--');
if (!flashdayAllowed) {
  window.location.replace(
    'https://flashday.web.app' +
      window.location.pathname +
      window.location.search +
      window.location.hash
  );
}
