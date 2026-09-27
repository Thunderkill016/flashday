import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Isolated preview: no login, no production writes, fresh storage per context.
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

const DB_KEY = 'flashday-a1';
const SESSION_KEY = 'flashday-a1:lesson-session';
const OWNER_KEY = 'flashday:db-owner';
const L1 = 'a1-s1-l1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let browser;
let passed = 0;
const check = (name) => { passed++; console.log(`  ✓ ${name}`); };

try {
  browser = await chromium.launch({ executablePath, headless: true });

  // ── Shell smoke: loads clean, tabs switch, hash routes render ──
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}app/?preview`);
    for (const label of ['Học', 'Ôn', 'Hồ sơ']) {
      assert.equal(await page.locator('.app-tab', { hasText: label }).count(), 1, `tab ${label}`);
    }
    await page.locator('.app-tab', { hasText: 'Ôn' }).click();
    assert.equal(await page.locator('#view h1').textContent(), 'Ôn tập');
    await page.locator('.app-tab', { hasText: 'Hồ sơ' }).click();
    assert.equal(await page.locator('#view h1').textContent(), 'Hồ sơ');
    await page.locator('.app-tab', { hasText: 'Học' }).click();
    assert.equal(await page.locator('#view h1').textContent(), 'Hôm nay');
    await page.goto(`${origin}app/?preview#/path`);
    assert.equal(await page.locator('#view h1').textContent(), 'Lộ trình');
    await page.goto(`${origin}app/?preview#/summary/${L1}`);
    assert.equal(await page.locator('#view h1').textContent(), 'Kết quả buổi học');
    await page.goto(`${origin}app/?preview#/lesson/${L1}/listen`);
    assert.equal(await page.locator('.runner-pane[data-step]').count(), 5);
    let visible = 0;
    for (let i = 0; i < 5; i++) if (await page.locator('.runner-pane[data-step]').nth(i).isVisible()) visible++;
    assert.equal(visible, 1, 'exactly one step pane visible');
    assert.equal(await page.locator('.runner-pane[data-step="listen"]').isVisible(), true);
    assert.equal(await page.locator('#cloudStatus').textContent(), 'Chỉ lưu trên thiết bị');
    assert.deepEqual(errors, [], `pageerrors at ${width}px: ${errors.join(' | ')}`);
    await context.close();
    check(`shell smoke at ${width}px`);
  }

  // ── 1. Write draft survives reload ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('I am Linh from Hue.');
    await sleep(1200); // debounced draft save
    await page.reload();
    await page.waitForSelector('.runner-pane[data-step="write"]:not([hidden])');
    assert.equal(await page.locator('.runner-pane[data-step="write"] .write-area').inputValue(), 'I am Linh from Hue.');
    await context.close();
    check('write draft survives reload');
  }

  // ── 2. Quiz draft + pane identity survive step navigation (no rebuild) ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    const stamp = await readPane.locator('.quiz').getAttribute('data-quiz-mount');
    await readPane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await sleep(1200);
    await page.evaluate(() => { window.location.hash = `#/lesson/${'a1-s1-l1'}/listen`; });
    await page.waitForSelector('.runner-pane[data-step="listen"]:not([hidden])');
    await page.evaluate(() => { window.location.hash = `#/lesson/${'a1-s1-l1'}/read`; });
    await page.waitForSelector('.runner-pane[data-step="read"]:not([hidden])');
    const pane = page.locator('.runner-pane[data-step="read"]');
    assert.equal(await pane.locator('.quiz').getAttribute('data-quiz-mount'), stamp, 'quiz DOM must be the same mounted node');
    assert.equal(await pane.locator('.quiz-question').nth(0).locator('input').nth(0).isChecked(), true);
    assert.equal(await pane.locator('.quiz-question').nth(1).locator('input').nth(1).isChecked(), true);
    await context.close();
    check('quiz draft + pane identity survive step nav');
  }

  // ── 3. Quiz retry flow records exactly 2 read events ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/read`);
    const pane = page.locator('.runner-pane[data-step="read"]');
    // s1-l1 read answers are [0, 1, 0] — pick all-wrong first.
    await pane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(1).click();
    await pane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(0).click();
    await pane.locator('.quiz-question').nth(2).locator('.quiz-option').nth(1).click();
    await pane.locator('.quiz-submit').click();
    assert.equal(await pane.locator('.quiz-hint:not([hidden])').count(), 3, 'hints show for wrong answers');
    assert.equal(await pane.locator('.quiz-retry').isVisible(), true);
    await pane.locator('.quiz-retry').click();
    assert.equal(await pane.locator('.quiz-question').nth(0).locator('input').nth(0).isEnabled(), true, 'options re-enabled');
    // answer correctly
    await pane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await pane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await pane.locator('.quiz-question').nth(2).locator('.quiz-option').nth(0).click();
    await pane.locator('.quiz-submit').click();
    assert.match(await pane.locator('.quiz-feedback').textContent(), /Đúng 3\/3/);
    const events = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'read').length;
    }, DB_KEY);
    assert.equal(events, 2, 'retry + resubmit = exactly 2 read events');
    await context.close();
    check('quiz retry flow → 2 read events');
  }

  // ── 4. Stale draft (old contentVersion) → notice, nothing applied ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('old draft text');
    await sleep(1200);
    await page.evaluate(({ key, lessonId }) => {
      const session = JSON.parse(localStorage.getItem(key));
      session.drafts[lessonId].contentVersion = 99;
      localStorage.setItem(key, JSON.stringify(session));
    }, { key: SESSION_KEY, lessonId: L1 });
    await page.reload();
    await page.waitForSelector('[data-role="stale-notice"]');
    assert.equal(await page.locator('.runner-pane[data-step="write"] .write-area').inputValue(), '', 'stale draft must not replay answers');
    await context.close();
    check('stale draft → notice, empty textarea');
  }

  // ── 5. Another account's namespace never shows this draft ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('alice draft');
    await sleep(1200);
    // claimDbNamespace semantics: owner marker routes reads to the uid slot.
    await page.evaluate((ownerKey) => localStorage.setItem(ownerKey, 'other-uid'), OWNER_KEY);
    await page.reload();
    await page.waitForSelector('.runner-pane[data-step]:not([hidden])');
    const writePane = page.locator('.runner-pane[data-step="write"]');
    if (await writePane.isVisible()) {
      assert.equal(await writePane.locator('.write-area').inputValue(), '');
    }
    // Also assert the session record under the guest key still holds it (not leaked).
    const guest = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), SESSION_KEY);
    assert.equal(guest.drafts?.[L1]?.write?.[L1]?.responseText, 'alice draft');
    await context.close();
    check('account switch hides the other namespace draft');
  }

  // ── 6. Double fast "Lưu lần thử" → exactly 1 write event ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/write`);
    const pane = page.locator('.runner-pane[data-step="write"]');
    await pane.locator('.write-area').fill('Hi I am Linh from Hue');
    assert.equal(await pane.locator('[data-role="model-toggle"]').isEnabled(), true, 'Xem mẫu enabled at ≥3 words');
    await pane.locator('[data-role="model-toggle"]').click();
    const save = pane.locator('[data-role="write-save"]');
    await save.click();
    await save.click({ force: true }).catch(() => {}); // second click may be disabled
    const events = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'write').length;
    }, DB_KEY);
    assert.equal(events, 1, 'double submit must not duplicate the write event');
    await context.close();
    check('double "Lưu lần thử" → 1 write event');
  }

  // ── 7. Checkpoint lesson: 4 step pills, lands on read ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/a1-s1-l5/prepare`);
    assert.equal(await page.locator('.step-pill').count(), 4, 'checkpoint hides the prepare step');
    assert.equal(await page.locator('.runner-pane[data-step="read"]').isVisible(), true);
    assert.equal(await page.locator('.runner-pane[data-step="prepare"]').count(), 0);
    await context.close();
    check('checkpoint → 4 steps, lands on read');
  }

  // ── 8. [hidden] must actually hide: retry/save stay invisible until due ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/lesson/${L1}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    assert.equal(await readPane.locator('.quiz-retry').isVisible(), false, 'Làm lại must be hidden before submit');
    // submit → retry visible
    await readPane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await readPane.locator('.quiz-question').nth(2).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-submit').click();
    assert.equal(await readPane.locator('.quiz-retry').isVisible(), true);

    await page.evaluate(() => { window.location.hash = '#/lesson/a1-s1-l1/write'; });
    const writePane = page.locator('.runner-pane[data-step="write"]');
    assert.equal(await writePane.locator('[data-role="write-save"]').isVisible(), false, 'Lưu lần thử hidden before Xem mẫu');
    // empty text → Xem mẫu stays disabled
    assert.equal(await writePane.locator('[data-role="model-toggle"]').isEnabled(), false);
    await writePane.locator('.write-area').fill('Hi I am Linh');
    await writePane.locator('[data-role="model-toggle"]').click();
    assert.equal(await writePane.locator('[data-role="write-save"]').isVisible(), true);
    // empty the answer → save shows notice, no event
    await writePane.locator('.write-area').fill('');
    await writePane.locator('[data-role="write-save"]').click();
    assert.equal(await writePane.locator('.runner-notice').isVisible(), true);
    const writes = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'write').length;
    }, DB_KEY);
    assert.equal(writes, 0, 'empty text must not append a write event');
    await context.close();
    check('hidden controls + empty save guarded');
  }

  // ── 9. Today: fresh → no due cards; after drills → N cụm đến hạn ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview#/today`);
    assert.match(await page.locator('#view').textContent(), /Chưa có thẻ đến hạn/);
    // submit drills on s1-l1 (answers: drills 1-4 correct = 0,2,0,0 — any answers enroll chunks)
    await page.goto(`${origin}app/?preview#/lesson/${L1}/prepare`);
    const pane = page.locator('.runner-pane[data-step="prepare"]');
    for (let q = 0; q < 4; q++) {
      await pane.locator('.quiz-question').nth(q).locator('.quiz-option').nth(0).click();
    }
    await pane.locator('.quiz-submit').click();
    const enrolled = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(db.fsrs || {}).length;
    }, DB_KEY);
    assert.equal(enrolled, 8, 'drill submit enrolls all 8 chunks');
    await page.goto(`${origin}app/?preview#/today`);
    assert.match(await page.locator('#view').textContent(), /8 cụm đến hạn/, 'new FSRS cards are due immediately');
    // path pill for s1-l1 now "Đang luyện"
    await page.goto(`${origin}app/?preview#/path`);
    const pill = page.locator('.path-lessons li', { hasText: 'Chào hỏi và giới thiệu' }).locator('.path-status');
    assert.equal(await pill.textContent(), 'Đang luyện');
    // summary: untouched steps show "Chưa làm" links
    await page.goto(`${origin}app/?preview#/summary/${L1}`);
    const todoLinks = page.locator('.summary-steps a', { hasText: 'Chưa làm' });
    assert.equal(await todoLinks.count(), 4, 'read/listen/write/speak untouched');
    await context.close();
    check('today due count + path pill + summary todo links');
  }

  // ── 10. Review: reveal → grade → next card; graded card not due after reload ──
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    // enroll via drills first
    await page.goto(`${origin}app/?preview#/lesson/${L1}/prepare`);
    const pane = page.locator('.runner-pane[data-step="prepare"]');
    for (let q = 0; q < 4; q++) {
      await pane.locator('.quiz-question').nth(q).locator('.quiz-option').nth(0).click();
    }
    await pane.locator('.quiz-submit').click();

    await page.goto(`${origin}app/?preview#/review`);
    assert.equal(await page.locator('.review-counter').textContent(), '1/8');
    assert.equal(await page.locator('.review-target').isVisible(), false, 'answer hidden before reveal');
    await page.locator('[data-role="reveal"]').click();
    assert.equal(await page.locator('.review-target').isVisible(), true);
    await page.locator('[data-grade="3"]').click(); // Nhớ
    assert.equal(await page.locator('.review-counter').textContent(), '2/8');
    const logLen = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.reviewLog || []).filter((e) => e.kind !== 'enroll').length;
    }, DB_KEY);
    assert.equal(logLen, 1, 'grade appends a reviewLog entry (enroll entries are separate)');
    await page.reload();
    assert.equal(await page.locator('.review-counter').textContent(), '1/7', 'graded card no longer due');
    await context.close();
    check('review reveal → grade → persisted scheduling');
  }

  console.log(`FlashDay app browser tests: ${passed} groups passed`);
} finally {
  await browser?.close();
  await server.close();
}
