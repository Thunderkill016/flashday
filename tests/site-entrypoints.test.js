import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const compactHtml = (html) => html.replace(/\s+/g, ' ').replace(/\s+>/g, '>');
const landing = compactHtml(readFileSync(join(root, 'index.html'), 'utf8'));
const app = compactHtml(readFileSync(join(root, 'app', 'index.html'), 'utf8'));
const login = readFileSync(join(root, 'login', 'index.html'), 'utf8');
const auth = readFileSync(join(root, 'auth', 'index.html'), 'utf8');
const viteConfig = readFileSync(join(root, 'vite.config.mjs'), 'utf8');
const firebaseJson = readFileSync(join(root, 'firebase.json'), 'utf8');
const productBootstrap = readFileSync(join(root, 'product-bootstrap.js'), 'utf8');
let checks = 0;
const ok = () => checks++;

// canonical.js is the origin policy enforcer — it must be the first script
// in every HTML entry so it runs before Firebase initialises (lesson 8).
for (const [name, html] of [
  ['landing', landing],
  ['app', app],
  ['login', compactHtml(login)],
  ['auth', compactHtml(auth)]
]) {
  const canonicalAt = html.indexOf('src="/canonical.js"');
  const headAt = html.indexOf('</head>');
  const moduleAt = html.indexOf('type="module"');
  assert(canonicalAt > -1, `${name} must load /canonical.js`);
  assert(canonicalAt < headAt, `${name}: canonical.js must be inside <head>`);
  assert(moduleAt === -1 || canonicalAt < moduleAt, `${name}: canonical.js must precede module scripts`);
  ok();
}

// Landing: A1 course copy, CTAs into /login/, no inline scripts or handlers
// (CSP script-src 'self' blocks them silently).
assert.match(landing, /href="\/login\/#signup"/);
assert.match(landing, /href="\/login\/#signin"/);
assert.match(landing, /A1/);
assert.doesNotMatch(landing, /<script>\s/);
assert.doesNotMatch(landing, /\son(click|input|change|submit)=/);
assert.match(landing, /href="site\.css"/);
ok();

// App shell: module entries + the three tabs + preview badge hook.
assert.match(app, /src="\.\.\/product-bootstrap\.js"/);
assert.doesNotMatch(app, /src="\.\.\/src\/ui\/app\.js"/);
assert.match(productBootstrap, /import\('\.\/src\/ui\/app\.js'\)/);
assert.match(app, /href="\.\.\/app\.css"/);
for (const label of ['Học', 'Ôn', 'Hồ sơ']) assert(app.includes(`>${label}<`), `app tab ${label} missing`);
assert.match(app, /id="previewBadge"/);
assert.doesNotMatch(app, /\son(click|input|change|submit)=/);
ok();

// Login page keeps every id the glue touches — renaming one silently breaks
// sign-in, reset, or the password toggle.
for (const id of [
  'auth-form',
  'auth-tabs',
  'auth-title',
  'auth-sub',
  'auth-providers',
  'auth-google-btn',
  'auth-divider',
  'email-field',
  'email',
  'password-field',
  'password',
  'password-confirm-field',
  'password-confirm',
  'toggle-password',
  'forgot-password',
  'return-to-signin',
  'auth-submit-btn',
  'auth-status'
]) {
  assert(login.includes(`id="${id}"`), `login missing #${id}`);
}
ok();
for (const id of ['auth-spin', 'auth-status', 'auth-retry']) {
  assert(auth.includes(`id="${id}"`), `auth page missing #${id}`);
}
ok();

// Vite still resolves all four page inputs.
for (const input of ['index.html', 'app/index.html', 'login/index.html', 'auth/index.html']) {
  assert(viteConfig.includes(`'${input}'`), `vite input ${input} missing`);
}
ok();

// firebase.json headers: no-cache on every page pattern, immutable on assets.
for (const pattern of [
  '"/"',
  '"/login"',
  '"/login/**"',
  '"/app"',
  '"/app/**"',
  '"/auth"',
  '"/auth/**"',
  '"**/*.html"',
  '"/canonical.js"'
]) {
  assert(
    firebaseJson.includes(`"source": ${pattern.replace(/"/g, '"')}`) || firebaseJson.includes(`"source": ${pattern}`),
    `firebase.json missing source ${pattern}`
  );
}
const noCacheBlocks = (
  firebaseJson.match(/"Cache-Control",\s*"value":\s*"no-cache"/g) || firebaseJson.match(/no-cache/g)
).length;
assert(noCacheBlocks >= 8, 'every page pattern must be no-cache');
assert.match(firebaseJson, /"\/assets\/\*\*"/);
assert.match(firebaseJson, /max-age=31536000, immutable/);
ok();

// product-bootstrap route guard contract.
assert.match(productBootstrap, /event === 'INITIAL_SESSION'/);
assert.match(productBootstrap, /flashday:had-session/);
assert.match(productBootstrap, /\/login\/\?session=lost#signin/);
assert.match(productBootstrap, /\/login\/\?signedOut=1#signin/);
assert.match(productBootstrap, /has\('preview'\)/);
ok();

console.log(`FlashDay entrypoint contract: ${checks} groups of checks passed`);
