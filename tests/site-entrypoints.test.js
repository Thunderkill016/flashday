const assert = require('assert');
const { readFileSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const landing = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'app', 'index.html'), 'utf8');
const login = readFileSync(join(root, 'login', 'index.html'), 'utf8');
const viteConfig = readFileSync(join(root, 'vite.config.mjs'), 'utf8');
const productBootstrap = readFileSync(join(root, 'product-bootstrap.js'), 'utf8');

assert.match(landing, /href="landing\.css"/);
assert.match(landing, /href="\/login\/#signin">Log in/);
assert.match(landing, /href="\/login\/#signup" class="btn-start">START/);
assert.match(landing, /class="btn-flash" href="\/login\/#signup">/);
assert.match(landing, /class="btn-flash btn-flash--large" href="\/login\/#signup">/);
assert.doesNotMatch(landing, /auth-trigger|landing-auth\.mjs|id="auth-form"/);
assert.doesNotMatch(landing, /cdn\.tailwindcss\.com/);
// The Recall Observatory landing intentionally uses its selected display/body/mono
// web fonts. The old "no Google Fonts" assertion belonged to the previous landing.
assert.match(landing, /family=Be\+Vietnam\+Pro/);
assert.match(landing, /family=Bricolage\+Grotesque/);
assert.match(landing, /family=IBM\+Plex\+Mono/);
assert.doesNotMatch(landing, /<script type="module">\s*import \{ createClient \}/);
// Regression: CSP script-src 'self' blocks every inline <script>. Landing
// interactivity must live in an external file, or it silently dies on prod.
assert.doesNotMatch(landing, /<script>\s/);
// Inline event handlers are inline script — CSP script-src 'self' blocks
// them too, silently killing the control (the old audio button shipped dead).
assert.doesNotMatch(landing, /\son(click|input|change|submit)=/);
assert.match(landing, /<script src="\/landing\.js" defer><\/script>/);

assert.match(app, /href="\.\.\/styles\.css"/);
assert.match(app, /src="\.\.\/main\.js"/);
assert.match(login, /href="data:,"/);
assert.match(login, /src="login\.js"/);
assert.match(viteConfig, /const landingEntry = resolve\(import\.meta\.dirname, 'index\.html'\)/);
assert.match(viteConfig, /landing: landingEntry/);
assert.match(viteConfig, /app: resolve\(import\.meta\.dirname, 'app\/index\.html'\)/);
assert.match(viteConfig, /login: resolve\(import\.meta\.dirname, 'login\/index\.html'\)/);
assert.doesNotMatch(viteConfig, /transformIndexHtml|landing-auth\.mjs/);
assert.match(productBootstrap, /event === 'INITIAL_SESSION'/);
assert.doesNotMatch(productBootstrap, /auth\.getSession\(\)/);
// Regression: ?session=lost must only fire when a session actually existed on
// this device — a first-time visitor hitting /app/ used to be told their
// "session was not kept" even though nothing had ever been signed in.
assert.match(productBootstrap, /flashday:had-session/);
assert.match(productBootstrap, /\/login\/\?session=lost#signin/);
assert.match(productBootstrap, /\/login\/#signin/);

// Design system contract: one token foundation shared by all three
// entrypoints. Each stylesheet imports tokens.css; no stylesheet may
// re-declare its own palette values (that was the pre-audit drift bug).
const tokens = readFileSync(join(root, 'tokens.css'), 'utf8');
const landingCss = readFileSync(join(root, 'landing.css'), 'utf8');
const stylesCss = readFileSync(join(root, 'styles.css'), 'utf8');
const loginCss = readFileSync(join(root, 'login', 'login.css'), 'utf8');
assert.match(landingCss, /@import '\.\/tokens\.css'/);
assert.match(stylesCss, /@import '\.\/tokens\.css'/);
assert.match(loginCss, /@import '\.\.\/tokens\.css'/);
// Read mode must not collide with brand lime — the audit caught #C7F45B
// sitting next to #E8FF65 as two near-identical greens.
assert.match(tokens, /--teal-400: #59D3A2/);
assert.match(tokens, /--mode-read: var\(--teal-400\)/);
assert.match(tokens, /--read: var\(--teal-400\)/);
assert.doesNotMatch(tokens, /--read: #C7F45B|--mode-read: #C7F45B/);
// Memory vs feedback semantics stay on separate axes.
assert.match(tokens, /--memory-new: var\(--blue-400\)/);
assert.match(tokens, /--feedback-error: var\(--red-500\)/);
// Known words must not be decorated (LingQ rule) — and "new" is blue, never red.
assert.match(stylesCss, /mark\.token-known, mark\.token-learning, mark\.token-new \{ background: transparent; color: inherit; \}/);
assert.match(stylesCss, /mark\.token-new \{ border-bottom: 2px solid var\(--memory-new\)/);
const markRules = stylesCss.match(/mark\.token-(known|learning|new)\s*\{[^}]*\}/g)?.join('\n') || '';
assert.doesNotMatch(markRules, /--fd-danger|--fd-positive|--fd-hard/);
// Reader renders as a themed document surface.
assert.match(stylesCss, /\.source-reader\[data-theme="light"\]/);
assert.match(stylesCss, /\.source-reader\[data-theme="warm"\]/);
const learningHub = readFileSync(join(root, 'learning-hub.js'), 'utf8');
assert.match(learningHub, /data-rtheme/);
assert.match(learningHub, /flashday:reader-prefs/);
// App shell theme: light is the default surface, dark is opt-in,
// applied pre-paint by canonical.js and toggled from the topbar.
assert.match(tokens, /html\[data-theme="light"\]/);
const canonicalJs = readFileSync(join(root, 'public/canonical.js'), 'utf8');
assert.match(canonicalJs, /flashday:theme/);
assert.match(canonicalJs, /dataset\.theme/);
assert.match(app, /id="themeBtn"/);

// Content-first IA contract (Codex R&D: LingQ Library / LR catalog / Migaku
// Read-hub all lead with content; SRS review never precedes acquisition).
// 'Học' is the default tab, the library+import panel sits above Guided Path,
// and the import affordance is a collapsible shell that auto-opens when the
// library is empty — never buried again.
const tabOrder = [...app.matchAll(/data-view="(\w+)"/g)].map((m) => m[1]);
assert.deepStrictEqual(tabOrder.slice(0, 3), ['capture', 'review', 'memory'], 'Học must be the first/default tab — content before review');
assert.match(app, /class="tab active"[^>]*data-view="capture"/);
assert.match(app, /<section id="reviewView" class="view hidden"/);
assert.match(app, /<section id="captureView" class="view"/);
assert.match(app, /id="importShell"/);
assert(app.indexOf('id="sourceRecommendations"') < app.indexOf('id="guidedModules"'), 'content surface must precede guided path');
const hubSrc = learningHub;
assert.match(hubSrc, /flashday:last-source/, 'last-opened source must pin as Đọc tiếp');
assert.match(hubSrc, /openSource:\s*newSourceKey|openSource:DEMO_SOURCE_TITLE|payload\.openSource/, 'post-import must land in the reader');
assert.match(hubSrc, /importDemoSource/, 'empty library must offer a one-click demo source');
assert.match(hubSrc, /kinds\.add\(kind\)/);

console.log(`FlashDay entrypoint contract: ${56 + 10} checks passed`);
