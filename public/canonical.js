// Canonical host for FlashDay. authDomain is flashday.web.app — the auth
// helper iframe is first-party only when the app runs on that origin, so any
// other serving host (flashday.firebaseapp.com, the legacy flashday-22ae1
// domains) must hand off before Firebase initialises. localhost and Hosting
// preview channels (`--channel`) are exempt so local dev and previews work.
// Theme for the app shell — applied before first paint so there's no
// dark→light flash. Scoped to /app/; the landing keeps its own paper
// palette and the login page stays branded dark.
if (window.location.pathname.startsWith('/app')) {
  var flashdayTheme = 'light';
  try {
    var savedTheme = localStorage.getItem('flashday:theme');
    if (savedTheme === 'dark' || savedTheme === 'light') flashdayTheme = savedTheme;
  } catch (e) { /* storage blocked — default light */ }
  document.documentElement.dataset.theme = flashdayTheme;
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = flashdayTheme === 'light' ? '#F5F6F1' : '#090B0D';
}

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
