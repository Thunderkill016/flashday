import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import lesson from '../src/content/a1/s1-l1.js';

// Isolated preview: no login, no production writes, fresh storage per context.
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

const DB_KEY = 'flashday-a1';
const SESSION_KEY = 'flashday-a1:lesson-session';
const OWNER_KEY = 'flashday:db-owner';
const L1 = 'a1-s1-l1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// With the lazy app bundle, view mount is async — wait for real content inside
// #view, not the static empty div, before asserting anything below it.
const VIEW_READY = '#view:not(:empty)';
async function goto(page, url) {
  await page.goto(url);
  await page.locator(VIEW_READY).waitFor();
}
async function reload(page) {
  await page.reload();
  await page.locator(VIEW_READY).waitFor();
}

let browser;
let passed = 0;
const check = (name) => {
  passed++;
  console.log(`  ✓ ${name}`);
};

try {
  browser = await chromium.launch({ executablePath, headless: true });

  // ── Shell smoke: loads clean, tabs switch, hash routes render ──
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await goto(page, `${origin}app/?preview`);
    for (const label of ['Học', 'Ôn', 'Hồ sơ']) {
      assert.equal(await page.locator('.app-tab', { hasText: label }).count(), 1, `tab ${label}`);
    }
    // hasText inside the selector makes locator actions wait for the NEW h1 —
    // asserting bare textContent() would return the previous view's heading
    // during the async hashchange→route window (CI flake).
    const h1 = (text) => page.locator('#view h1', { hasText: text });
    await page.locator('.app-tab', { hasText: 'Ôn' }).click();
    assert.equal(await h1('Ôn tập').textContent(), 'Ôn tập');
    await page.locator('.app-tab', { hasText: 'Hồ sơ' }).click();
    assert.equal(await h1('Hồ sơ').textContent(), 'Hồ sơ');
    await page.locator('.app-tab', { hasText: 'Học' }).click();
    assert.equal(await h1('Hôm nay').textContent(), 'Hôm nay');
    await goto(page, `${origin}app/?preview#/path`);
    assert.equal(await h1('Lộ trình').textContent(), 'Lộ trình');
    await goto(page, `${origin}app/?preview#/summary/${L1}`);
    assert.equal(await h1('Kết quả buổi học').textContent(), 'Kết quả buổi học');
    await goto(page, `${origin}app/?preview#/lesson/${L1}/listen`);
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('I am Linh from Hue.');
    await sleep(1200); // debounced draft save
    await reload(page);
    await page.waitForSelector('.runner-pane[data-step="write"]:not([hidden])');
    assert.equal(await page.locator('.runner-pane[data-step="write"] .write-area').inputValue(), 'I am Linh from Hue.');
    await context.close();
    check('write draft survives reload');
  }

  // ── 2. Quiz draft + pane identity survive step navigation (no rebuild) ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    const stamp = await readPane.locator('.quiz').getAttribute('data-quiz-mount');
    await readPane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await sleep(1200);
    await page.evaluate(() => {
      window.location.hash = `#/lesson/${'a1-s1-l1'}/listen`;
    });
    await page.waitForSelector('.runner-pane[data-step="listen"]:not([hidden])');
    await page.evaluate(() => {
      window.location.hash = `#/lesson/${'a1-s1-l1'}/read`;
    });
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/read`);
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('old draft text');
    await sleep(1200);
    await page.evaluate(
      ({ key, lessonId }) => {
        const session = JSON.parse(localStorage.getItem(key));
        session.drafts[lessonId].contentVersion = 99;
        localStorage.setItem(key, JSON.stringify(session));
      },
      { key: SESSION_KEY, lessonId: L1 },
    );
    await reload(page);
    await page.waitForSelector('[data-role="stale-notice"]');
    assert.equal(await page.locator('.runner-pane[data-step="write"] .write-area').inputValue(), '', 'stale draft must not replay answers');
    await context.close();
    check('stale draft → notice, empty textarea');
  }

  // ── 5. Another account's namespace never shows this draft ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('alice draft');
    await sleep(1200);
    // claimDbNamespace semantics: owner marker routes reads to the uid slot.
    await page.evaluate((ownerKey) => localStorage.setItem(ownerKey, 'other-uid'), OWNER_KEY);
    await reload(page);
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
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

  // ── 7. Checkpoint lesson: 4 step pills, lands on read; first submit enrolls chunks ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/a1-s1-l5/prepare`);
    assert.equal(await page.locator('.step-pill').count(), 4, 'checkpoint hides the prepare step');
    assert.equal(await page.locator('.runner-pane[data-step="read"]').isVisible(), true);
    assert.equal(await page.locator('.runner-pane[data-step="prepare"]').count(), 0);
    // Checkpoints have no prepare submit, so chunks enroll on the first
    // submitted step (here, the read quiz).
    const pane = page.locator('.runner-pane[data-step="read"]');
    for (let q = 0; q < 4; q++) {
      await pane.locator('.quiz-question').nth(q).locator('.quiz-option').nth(0).click();
    }
    await pane.locator('.quiz-submit').click();
    const enrolled = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(db.fsrs || {}).filter((k) => k.startsWith('a1-s1-l5:')).length;
    }, DB_KEY);
    assert.equal(enrolled, 6, 'checkpoint read submit enrolls its 6 chunks');
    await context.close();
    check('checkpoint → 4 steps, lands on read, enrolls chunks');
  }

  // ── 8. [hidden] must actually hide: retry/save stay invisible until due ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    assert.equal(await readPane.locator('.quiz-retry').isVisible(), false, 'Làm lại must be hidden before submit');
    // submit → retry visible
    await readPane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await readPane.locator('.quiz-question').nth(2).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-submit').click();
    assert.equal(await readPane.locator('.quiz-retry').isVisible(), true);

    await page.evaluate(() => {
      window.location.hash = '#/lesson/a1-s1-l1/write';
    });
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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/today`);
    assert.match(await page.locator('#view').textContent(), /Chưa có thẻ đến hạn/);
    // submit drills on s1-l1 (answers: drills 1-4 correct = 0,2,0,0 — any answers enroll chunks)
    await goto(page, `${origin}app/?preview#/lesson/${L1}/prepare`);
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
    await goto(page, `${origin}app/?preview#/today`);
    assert.match(await page.locator('#view').textContent(), /8 cụm đến hạn/, 'new FSRS cards are due immediately');
    // path pill for s1-l1 now "Đang luyện"
    await goto(page, `${origin}app/?preview#/path`);
    const pill = page.locator('.path-lessons li', { hasText: 'Chào hỏi và giới thiệu' }).locator('.path-status');
    assert.equal(await pill.textContent(), 'Đang luyện');
    // summary: untouched steps show "Chưa làm" links
    await goto(page, `${origin}app/?preview#/summary/${L1}`);
    const todoLinks = page.locator('.summary-steps a', { hasText: 'Chưa làm' });
    assert.equal(await todoLinks.count(), 4, 'read/listen/write/speak untouched');
    await context.close();
    check('today due count + path pill + summary todo links');
  }

  // ── 10. Review: reveal → grade → next card; graded card not due after reload ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    // enroll via drills first
    await goto(page, `${origin}app/?preview#/lesson/${L1}/prepare`);
    const pane = page.locator('.runner-pane[data-step="prepare"]');
    for (let q = 0; q < 4; q++) {
      await pane.locator('.quiz-question').nth(q).locator('.quiz-option').nth(0).click();
    }
    await pane.locator('.quiz-submit').click();

    await goto(page, `${origin}app/?preview#/review`);
    assert.equal(await page.locator('.review-counter').textContent(), '1/8');
    assert.equal(await page.locator('.review-target').isVisible(), false, 'answer hidden before reveal');
    // typed production recall → diff score + suggested grade on reveal
    await page.locator('.review-card .write-area').fill('Hello, I’m …');
    await page.locator('[data-role="reveal"]').click();
    assert.equal(await page.locator('.review-target').isVisible(), true);
    assert.match(await page.locator('.review-suggestion').textContent(), /gợi ý chấm/);
    assert.equal(await page.locator('.grade-btn.suggested').count(), 1, 'one grade lights up');
    await page.locator('[data-grade="3"]').click(); // Nhớ
    assert.equal(await page.locator('.review-counter').textContent(), '2/8');
    const logLen = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.reviewLog || []).filter((e) => e.kind !== 'enroll').length;
    }, DB_KEY);
    assert.equal(logLen, 1, 'grade appends a reviewLog entry (enroll entries are separate)');
    await reload(page);
    assert.equal(await page.locator('.review-counter').textContent(), '1/7', 'graded card no longer due');
    await context.close();
    check('review reveal → grade → persisted scheduling');
  }

  // ── 11. Debounced draft writes must not outlive the unmounted runner ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Type then leave within the 400ms debounce window — before the fix the
    // pending patchDraft read torn-down `state` and threw on the next page.
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('mid-typing draft');
    await goto(page, `${origin}app/?preview#/review`);
    await sleep(800);
    assert.deepEqual(errors, [], `pageerrors: ${errors.join(' | ')}`);
    // Same race across a remount: type, jump to a SECOND lesson's runner.
    await goto(page, `${origin}app/?preview#/lesson/${L1}/speak`);
    await page.locator('.runner-pane[data-step="speak"] .speak-area').fill('stale debounce source');
    await goto(page, `${origin}app/?preview#/lesson/a1-s1-l2/write`);
    await sleep(800);
    assert.deepEqual(errors, [], `pageerrors after remount: ${errors.join(' | ')}`);
    await context.close();
    check('mid-debounce unmount → no stale-state crash');
  }

  // ── 12. TTS play buttons call speak() with the right target text ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.__ttsCalls = [];
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          getVoices: () => [{ name: 'Mock en-US', lang: 'en-US' }],
          cancel: () => {},
          speak: (u) => {
            window.__ttsCalls.push(u.text);
            u.onend?.();
          },
          addEventListener: () => {},
        },
      });
    });
    const page = await context.newPage();
    // prepare: chunk play buttons
    await goto(page, `${origin}app/?preview#/lesson/${L1}/prepare`);
    const plays = page.locator('.runner-pane[data-step="prepare"] .chunk-list [data-role="play-target"]');
    assert.equal(await plays.count(), 8, 'every taught chunk gets a play button');
    await plays.first().click();
    // read: dialogue line play buttons
    await goto(page, `${origin}app/?preview#/lesson/${L1}/read`);
    const linePlays = page.locator('.runner-pane[data-step="read"] .dialogue-lines [data-role="play-target"]');
    assert.equal(await linePlays.count(), lesson.dialogue.lines.length, 'every dialogue line gets a play button');
    await linePlays.first().click();
    const calls = await page.evaluate(() => window.__ttsCalls);
    assert.equal(calls.length, 2, `expected 2 TTS calls, got ${calls.length}`);
    assert.ok(calls[0].length > 0 && calls[1].startsWith('Tom:'), `calls: ${JSON.stringify(calls)}`);
    await context.close();
    check('chunk + dialogue play buttons speak the target');
  }

  // ── 13. Write correction loop: compare shows, retry records attempt 2 ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    const pane = page.locator('.runner-pane[data-step="write"]');
    await pane.locator('.write-area').fill('Hi I am Linh from Hue. Nice to meet you.');
    await pane.locator('[data-role="model-toggle"]').click();
    await pane.locator('[data-role="write-save"]').click();
    assert.equal(await pane.locator('.attempt-compare:not([hidden])').count(), 1, 'compare shown after save');
    assert.ok((await pane.locator('.attempt-compare mark').count()) > 0, 'matched words highlighted');
    assert.equal(await pane.locator('.write-area').isDisabled(), true, 'textarea locked after save');
    await pane.locator('[data-role="write-retry"]').click();
    assert.equal(await pane.locator('.write-area').isDisabled(), false, 'retry unlocks textarea');
    await pane.locator('.write-area').fill('I am Linh. I am from Hue.');
    await pane.locator('[data-role="write-save"]').click();
    const events = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'write').map((e) => e.payload?.attempt);
    }, DB_KEY);
    assert.deepEqual(events, [1, 2], 'two attempts recorded in order');
    await context.close();
    check('write compare + retry records attempt 2');
  }

  // ── 14. AI tutor paths (mocked): explain, write review, roleplay ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.__FLASHDAY_TUTOR__ = {
        available: true,
        explainWrong: async () => 'Giải thích AI mẫu: chủ ngữ "I" đi với "am".',
        reviewWriting: async () => ({
          correct: false,
          errors: [{ said: 'i', fix: 'I', why: 'Viết hoa chữ đầu câu.' }],
          better: 'I’m Linh. I’m from Hue.',
          praise: 'Bạn đã nói đúng tên và quê mình.',
        }),
        startRoleplay: () => ({
          partnerName: 'Sam',
          history: [],
          start: async () => 'Hi! I’m Sam. What’s your name?',
          send: async () => 'Nice to meet you. Where are you from?',
          feedback: async () => ({
            items: [
              { check: 'Chào và giới thiệu tên', ok: true, note: 'Đã chào và nói tên.' },
              { check: 'Hỏi tên và quê người kia', ok: true, note: 'Đã hỏi lại.' },
              { check: 'Câu đáp lịch sự', ok: false, note: 'Chưa nói "Nice to meet you".' },
            ],
            corrections: [{ said: 'i linh', better: 'I’m Linh' }],
            summary: 'Hội thoại đủ ý — mức A1.',
          }),
        }),
        assessPronunciation: async () => ({ score: 90, unclear: [], tip: 'Phát âm rõ.' }),
        generateDrills: async () => ({
          questions: [
            { q: 'She ___ from London.', options: ['is', 'am', 'are'], answer: 0, hint: 'she đi với is.' },
            { q: 'Đáp "Nice to meet you.":', options: ['Nice to meet you too.', 'I am Mai.', 'Bye.'], answer: 0, hint: 'Thêm too.' },
          ],
        }),
        generateVariant: async () => ({
          title: 'Ở quán cà phê',
          lines: [
            ['Emma: Hi! I’m Emma.', 'Emma: Chào! Mình là Emma.'],
            ['Binh: I’m Binh. Where are you from?', 'Binh: Mình là Bình. Bạn đến từ đâu?'],
            ['Emma: I’m from Sydney.', 'Emma: Mình đến từ Sydney.'],
          ],
          questions: [
            { q: 'Emma đến từ đâu?', options: ['Sydney', 'Hà Nội', 'Đà Nẵng'], answer: 0, hint: '"I’m from Sydney."' },
          ],
        }),
      };
    });
    const page = await context.newPage();

    // Explain my answer: wrong drill answer → AI button → explanation text
    await goto(page, `${origin}app/?preview#/lesson/${L1}/prepare`);
    const preparePane = page.locator('.runner-pane[data-step="prepare"]');
    for (let i = 0; i < 4; i++) {
      await preparePane.locator('.quiz-question').nth(i).locator('.quiz-option').nth(2).click();
    }
    await preparePane.locator('.quiz-submit').click();
    const explainBtn = preparePane.locator('.quiz-question').nth(0).locator('.quiz-explain-btn');
    assert.equal(await explainBtn.isVisible(), true, 'AI explain button on wrong answer');
    await explainBtn.click();
    await preparePane.locator('.quiz-explain:not([hidden])').waitFor();
    assert.match(await preparePane.locator('.quiz-explain').first().textContent(), /AI mẫu/);

    // Remediation: wrong answers → "Luyện thêm" → AI mini-quiz → records event
    const remBtn = preparePane.locator('[data-role="remediation"]');
    assert.equal(await remBtn.isVisible(), true, 'remediation offered after wrongs');
    await remBtn.click();
    await preparePane.locator('.remediation .quiz-question').first().waitFor();
    for (const q of await preparePane.locator('.remediation .quiz-question').all()) {
      await q.locator('.quiz-option').first().click();
    }
    await preparePane.locator('.remediation .quiz-submit').click();
    const remEvents = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.payload?.remediation);
    }, DB_KEY);
    assert.equal(remEvents.length, 1, 'remediation attempt recorded');

    // Write review: save → AI feedback with error + suggestion
    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    const writePane = page.locator('.runner-pane[data-step="write"]');
    await writePane.locator('.write-area').fill('i am linh. i from hue.');
    await writePane.locator('[data-role="model-toggle"]').click();
    await writePane.locator('[data-role="write-save"]').click();
    await writePane.locator('[data-role="ai-review"]:not([hidden])').waitFor();
    const reviewText = await writePane.locator('[data-role="ai-review"]').textContent();
    assert.match(reviewText, /Viết hoa chữ đầu câu/);
    assert.match(reviewText, /I’m Linh/);

    // Roleplay: start → partner opener → learner turn → AI graded checklist
    await goto(page, `${origin}app/?preview#/lesson/${L1}/speak`);
    const speakPane = page.locator('.runner-pane[data-step="speak"]');
    await speakPane.locator('[data-role="roleplay-start"]').click();
    await speakPane.locator('.roleplay-msg.roleplay-partner').waitFor();
    await speakPane.locator('.roleplay-input').fill('Hi Sam. I am Linh. I am from Hue.');
    await speakPane.locator('.roleplay-send').click();
    await speakPane.locator('.roleplay-msg.roleplay-partner').nth(1).waitFor();
    assert.equal(await speakPane.locator('.roleplay-msg').count(), 3, 'opener + learner + reply in log');
    await speakPane.locator('[data-role="roleplay-end"]').click();
    await speakPane.locator('[data-role="roleplay-feedback"]:not([hidden])').waitFor();
    const fbText = await speakPane.locator('[data-role="roleplay-feedback"]').textContent();
    assert.match(fbText, /2\/3 mục đạt/);
    assert.match(fbText, /i linh.*I’m Linh/s);
    const speakEvents = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'speak' && e.payload?.roleplay);
    }, DB_KEY);
    assert.equal(speakEvents.length, 1, 'roleplay recorded as speak event');
    assert.deepEqual(
      [speakEvents[0].payload.correct, speakEvents[0].payload.total],
      [2, 3],
      'AI checklist mapped onto correct/total'
    );

    // Vary context: AI-written dialogue + its own comprehension quiz
    await goto(page, `${origin}app/?preview#/lesson/${L1}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    await readPane.locator('[data-role="variant"]').click();
    await readPane.locator('.variant .dialogue-lines li').first().waitFor();
    assert.match(await readPane.locator('.variant').textContent(), /quán cà phê/);
    assert.equal(
      await readPane.locator('.variant .quiz-question').count(),
      1,
      'variant ships its own comprehension quiz'
    );

    // Dictation: type back the heard sentence → word-diff feedback
    await goto(page, `${origin}app/?preview#/lesson/${L1}/listen`);
    const listenPane = page.locator('.runner-pane[data-step="listen"]');
    const dictRow = listenPane.locator('.dictation-row').first();
    await dictRow.locator('.dictation-input').fill('Hello, my name is Anna.');
    await dictRow.locator('button:has-text("Kiểm")').click();
    await dictRow.locator('.dictation-out:not([hidden])').waitFor();
    assert.match(await dictRow.locator('.dictation-out').textContent(), /Khớp \d+%|Đúng hết/);

    await context.close();
    check('AI explain + write review + roleplay end-to-end (mocked tutor)');
  }

  // ── 15. No tutor → AI affordances absent, static flow intact ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.__FLASHDAY_TUTOR__ = { available: false };
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/prepare`);
    const preparePane = page.locator('.runner-pane[data-step="prepare"]');
    for (let i = 0; i < 4; i++) {
      await preparePane.locator('.quiz-question').nth(i).locator('.quiz-option').nth(2).click();
    }
    await preparePane.locator('.quiz-submit').click();
    assert.equal(await preparePane.locator('.quiz-explain-btn').count(), 0, 'no AI button without tutor');
    await goto(page, `${origin}app/?preview#/lesson/${L1}/speak`);
    assert.equal(await page.locator('[data-role="roleplay"]').count(), 0, 'no roleplay block without tutor');
    assert.equal(await page.locator('[data-role="spoke"]').isVisible(), true, 'self-report flow still present');
    await context.close();
    check('tutor absent → static fallbacks only');
  }

  // ── 16. Engagement layer: chunk pager, match pairs, word bank, banner,
  //        progress bar, celebration, streak ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.__FLASHDAY_TUTOR__ = { available: false };
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L1}/prepare`);
    const prep = page.locator('.runner-pane[data-step="prepare"]');

    // Chunk pager: one card at a time, nav moves through all chunks
    assert.equal(await prep.locator('.chunk-card:visible').count(), 1, 'pager shows one chunk');
    await prep.locator('[data-role="chunk-next"]').click();
    assert.match(await prep.locator('.chunk-counter').textContent(), /Cụm 2\/8/);

    // Match pairs: click EN chip then its VI counterpart → all lock
    for (let i = 0; i < 4; i++) {
      await prep.locator(`.match-en [data-pair="${i}"]`).click();
      await prep.locator(`.match-vi [data-pair="${i}"]`).click();
    }
    assert.match(await prep.locator('.match-status:not([hidden])').textContent(), /Ghép xong/);

    // Word bank: rebuild the first sentence-answer drill, chip by chip
    const wbDrill = lesson.drills.find((d) => {
      const ans = d.options[d.answer];
      return ans && ans.replace(/[.,!?…]/g, '').split(/\s+/).filter(Boolean).length >= 3;
    });
    assert.ok(wbDrill, 'lesson has a sentence-answer drill for word bank');
    const bankItem = prep.locator('.wb-item').first();
    for (const w of wbDrill.options[wbDrill.answer].replace(/[.,!?…]/g, '').split(/\s+/)) {
      await bankItem.locator(`.wb-bank .wb-chip[data-word="${w}"]`).first().click();
    }
    await bankItem.locator('.wb-check').click();
    assert.match(await bankItem.locator('.wb-feedback:not([hidden])').textContent(), /Đúng/);

    // Drill submit → colored pass banner + progress bar fills
    const fieldsets = prep.locator('.quiz-question');
    const qCount = await fieldsets.count();
    for (let i = 0; i < qCount; i++) {
      await fieldsets.nth(i).locator('.quiz-option input').nth(lesson.drills[i].answer).check();
    }
    await prep.locator('.quiz-submit').click();
    assert.match(await prep.locator('.quiz-feedback.pass').textContent(), /Đúng 4\/4/);
    const width = await page.locator('[data-role="lesson-progress"] i').evaluate((el) => el.style.width);
    assert.equal(width, '20%', `progress bar ${width} after 1/5 steps`);

    // Finish the remaining four steps → celebration + streak
    await goto(page, `${origin}app/?preview#/lesson/${L1}/read`);
    const read = page.locator('.runner-pane[data-step="read"]');
    const rq = read.locator('.quiz-question');
    for (let i = 0; i < await rq.count(); i++) {
      await rq.nth(i).locator('.quiz-option input').nth(lesson.dialogue.questions[i].answer).check();
    }
    await read.locator('.quiz-submit').click();

    await goto(page, `${origin}app/?preview#/lesson/${L1}/listen`);
    const lis = page.locator('.runner-pane[data-step="listen"]');
    const lq = lis.locator('.quiz-question');
    for (let i = 0; i < await lq.count(); i++) {
      await lq.nth(i).locator('.quiz-option input').nth(lesson.listening.questions[i].answer).check();
    }
    await lis.locator('.quiz-submit').click();

    await goto(page, `${origin}app/?preview#/lesson/${L1}/write`);
    const write = page.locator('.runner-pane[data-step="write"]');
    await write.locator('.write-area').fill('I am Linh from Hue.');
    await write.locator('[data-role="model-toggle"]').click();
    const wChecks = write.locator('[data-check]');
    for (let i = 0; i < await wChecks.count(); i++) await wChecks.nth(i).check();
    await write.locator('[data-role="write-save"]').click();

    await goto(page, `${origin}app/?preview#/lesson/${L1}/speak`);
    const speak = page.locator('.runner-pane[data-step="speak"]');
    await speak.locator('.speak-area').fill('Hi I am Linh. I am from Hue.');
    await speak.locator('[data-role="spoke"]').check();
    await speak.locator('[data-role="model-toggle"]').click();
    const sChecks = speak.locator('[data-check]');
    for (let i = 0; i < await sChecks.count(); i++) await sChecks.nth(i).check();
    await speak.locator('[data-role="speak-save"]').click();

    await goto(page, `${origin}app/?preview#/summary/${L1}`);
    assert.equal(await page.locator('[data-role="celebration"]').count(), 1, 'celebration banner after all steps');
    await goto(page, `${origin}app/?preview`);
    assert.match(await page.locator('[data-role="streak"]').textContent(), /ngày liên tiếp/);
    await context.close();
    check('engagement layer: pager + match pairs + word bank + banner + progress + celebration + streak');
  }

  console.log(`FlashDay app browser tests: ${passed} groups passed`);
} finally {
  await browser?.close();
  await server.close();
}
