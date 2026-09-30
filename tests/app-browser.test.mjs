import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import missionLesson from '../src/content/a1/s1-l1.js';
import lesson from '../src/content/a1/s1-l2.js';

// Isolated preview: no login, no production writes, fresh storage per context.
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

const DB_KEY = 'flashday-a1';
const SESSION_KEY = 'flashday-a1:lesson-session';
const OWNER_KEY = 'flashday:db-owner';
// L1 is the mission-format vertical slice (issue #33); the five-pane runner
// tests exercise lesson 2, which still loads through the old path.
const L1 = 'a1-s1-l1';
const L2 = 'a1-s1-l2';
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
    await goto(page, `${origin}app/?preview#/summary/${L2}`);
    assert.equal(await h1('Kết quả buổi học').textContent(), 'Kết quả buổi học');
    await goto(page, `${origin}app/?preview#/lesson/${L2}/listen`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('It is Linh, L-I-N-H.');
    await sleep(1200); // debounced draft save
    await reload(page);
    await page.waitForSelector('.runner-pane[data-step="write"]:not([hidden])');
    assert.equal(await page.locator('.runner-pane[data-step="write"] .write-area').inputValue(), 'It is Linh, L-I-N-H.');
    await context.close();
    check('write draft survives reload');
  }

  // ── 2. Quiz draft + pane identity survive step navigation (no rebuild) ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L2}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    const stamp = await readPane.locator('.quiz').getAttribute('data-quiz-mount');
    await readPane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await sleep(1200);
    await page.evaluate((lessonId) => {
      window.location.hash = `#/lesson/${lessonId}/listen`;
    }, L2);
    await page.waitForSelector('.runner-pane[data-step="listen"]:not([hidden])');
    await page.evaluate((lessonId) => {
      window.location.hash = `#/lesson/${lessonId}/read`;
    }, L2);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/read`);
    const pane = page.locator('.runner-pane[data-step="read"]');
    // s1-l2 read answers are [1, 0, 0] — pick all-wrong first.
    await pane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(0).click();
    await pane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(1).click();
    await pane.locator('.quiz-question').nth(2).locator('.quiz-option').nth(1).click();
    await pane.locator('.quiz-submit').click();
    assert.equal(await pane.locator('.quiz-hint:not([hidden])').count(), 3, 'hints show for wrong answers');
    assert.equal(await pane.locator('.quiz-retry').isVisible(), true);
    await pane.locator('.quiz-retry').click();
    assert.equal(await pane.locator('.quiz-question').nth(0).locator('input').nth(0).isEnabled(), true, 'options re-enabled');
    // answer correctly
    await pane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(1).click();
    await pane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(0).click();
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('old draft text');
    await sleep(1200);
    await page.evaluate(
      ({ key, lessonId }) => {
        const session = JSON.parse(localStorage.getItem(key));
        session.drafts[lessonId].contentVersion = 99;
        localStorage.setItem(key, JSON.stringify(session));
      },
      { key: SESSION_KEY, lessonId: L2 },
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
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
    assert.equal(guest.drafts?.[L2]?.write?.[L2]?.responseText, 'alice draft');
    await context.close();
    check('account switch hides the other namespace draft');
  }

  // ── 6. Double fast "Lưu lần thử" → exactly 1 write event ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    const pane = page.locator('.runner-pane[data-step="write"]');
    await pane.locator('.write-area').fill('My name is Linh Pham');
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
    assert.equal(enrolled, 24, 'checkpoint read submit enrolls all 4 tasks × 6 chunks');
    await context.close();
    check('checkpoint → 4 steps, lands on read, enrolls chunks');
  }

  // ── 8. [hidden] must actually hide: retry/save stay invisible until due ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L2}/read`);
    const readPane = page.locator('.runner-pane[data-step="read"]');
    assert.equal(await readPane.locator('.quiz-retry').isVisible(), false, 'Làm lại must be hidden before submit');
    // submit → retry visible
    await readPane.locator('.quiz-question').nth(0).locator('.quiz-option').nth(1).click();
    await readPane.locator('.quiz-question').nth(1).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-question').nth(2).locator('.quiz-option').nth(0).click();
    await readPane.locator('.quiz-submit').click();
    assert.equal(await readPane.locator('.quiz-retry').isVisible(), true);

    await page.evaluate((lessonId) => {
      window.location.hash = `#/lesson/${lessonId}/write`;
    }, L2);
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
    // submit drills on s1-l2 (old-format lesson; any answers enroll chunks)
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
    const pane = page.locator('.runner-pane[data-step="prepare"]');
    for (let q = 0; q < 4; q++) {
      await pane.locator('.quiz-question').nth(q).locator('.quiz-option').nth(0).click();
    }
    await pane.locator('.quiz-submit').click();
    const enrolled = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(db.fsrs || {}).length;
    }, DB_KEY);
    assert.equal(enrolled, 14, 'drill submit enrolls prepare tasks for all 7 chunks');
    await goto(page, `${origin}app/?preview#/today`);
    const todayText = await page.locator('#view').textContent();
    assert.match(todayText, /Chưa có thẻ đến hạn/, 'brand-new tasks are introductions, not due review');
    assert.match(todayText, /14 thẻ mới chờ làm quen/, 'new-task pool counted separately');
    // path pill for s1-l2 shows step progress after the drill submit
    await goto(page, `${origin}app/?preview#/path`);
    const pill = page.locator('.path-lessons li', { hasText: 'Đánh vần, số điện thoại và email' }).locator('.path-status');
    assert.equal(await pill.textContent(), '1/5 bước');
    // summary: untouched steps show "Chưa làm" links
    await goto(page, `${origin}app/?preview#/summary/${L2}`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
    const pane = page.locator('.runner-pane[data-step="prepare"]');
    for (let q = 0; q < 4; q++) {
      await pane.locator('.quiz-question').nth(q).locator('.quiz-option').nth(0).click();
    }
    await pane.locator('.quiz-submit').click();

    await goto(page, `${origin}app/?preview#/review`);
    // Bounded introduction: 14 new tasks exist but the session is capped —
    // one new task per component (7 chunks → 7 cards).
    assert.equal(await page.locator('.review-counter').textContent(), '1/7');
    assert.equal(await page.locator('[data-role="fresh-badge"]').count(), 1, 'new card flagged as introduction');
    assert.equal(await page.locator('.review-target').isVisible(), false, 'answer hidden before reveal');
    // Task-graded cards: sibling bury serves the recognition ability first —
    // the badge names the ability being retrieved.
    assert.equal(await page.locator('[data-task-kind]').textContent(), 'Nhìn hiểu');
    assert.equal(await page.locator('.review-front-en').isVisible(), true, 'recognition front shows the EN form');
    // REGRESSION (review): keyboard grades must be inert before reveal —
    // a grade produced before seeing the answer panel is uninterpretable
    // evidence and must never reach the log.
    await page.keyboard.press('2');
    await sleep(100);
    const ratesAfterPreKey = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.reviewLog || []).filter((e) => e.kind === 'rate').length;
    }, DB_KEY);
    assert.equal(ratesAfterPreKey, 0, 'keyboard grade before reveal writes nothing');
    assert.equal(await page.locator('.review-counter').textContent(), '1/7', 'still on card 1');
    // typed production recall → diff score + suggested grade on reveal
    await page.locator('.review-card .write-area').fill('Hello, I’m …');
    await page.locator('[data-role="reveal"]').click();
    assert.equal(await page.locator('.review-target').isVisible(), true);
    assert.match(await page.locator('.review-suggestion').textContent(), /gợi ý chấm/);
    assert.equal(await page.locator('.grade-btn.suggested').count(), 1, 'one grade lights up');
    await page.locator('[data-grade="3"]').click(); // Nhớ
    assert.equal(await page.locator('.review-counter').textContent(), '2/7');
    // Sibling bury: the next card is c2's recognition task, not c1's
    // meaning_recall sibling — one ability per component per session.
    assert.equal(await page.locator('[data-task-kind]').textContent(), 'Nhìn hiểu');
    const rateEntries = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.reviewLog || []).filter((e) => e.kind === 'rate');
    }, DB_KEY);
    assert.match(rateEntries[0].taskKey, /^a1-s1-l2:c1@[0-9a-f]{8}:form_recognition$/,
      'rate lands on the revision-carrying task key');
    // Provenance: observable pre-reveal attempt → unaided; the attempt text
    // is frozen at reveal and both facts are durable.
    assert.equal(rateEntries[0].attempted, true, 'frozen attempt exists');
    assert.equal(rateEntries[0].aided, false, 'typed-before-reveal = unaided evidence');
    assert.equal(rateEntries[0].revealed, true);
    assert.equal(rateEntries[0].attempt, 'Hello, I’m …', 'attempt frozen verbatim at reveal');
    // Observed quality recorded separately from the self-grade: typing the
    // EN form against a VI expected answer is a weak observable match even
    // though the learner pressed "Nhớ".
    assert(typeof rateEntries[0].attemptScore === 'number' && rateEntries[0].attemptScore < 0.9,
      `attemptScore records observed quality, got ${rateEntries[0].attemptScore}`);
    const logLen = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.reviewLog || []).filter((e) => e.kind !== 'enroll').length;
    }, DB_KEY);
    assert.equal(logLen, 1, 'grade appends a reviewLog entry (enroll entries are separate)');
    await reload(page);
    // Remount: c1's remaining sibling (meaning_recall) is now c1's next
    // introduction — the queue is a fresh bounded snapshot, not a leak.
    assert.equal(await page.locator('.review-counter').textContent(), '1/7', 'graded card no longer in queue');
    assert.equal(await page.locator('[data-task-kind]').textContent(), 'Nhớ cụm từ',
      'c1’s next pending ability surfaces after reload');
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    await page.locator('.runner-pane[data-step="write"] .write-area').fill('mid-typing draft');
    await goto(page, `${origin}app/?preview#/review`);
    await sleep(800);
    assert.deepEqual(errors, [], `pageerrors: ${errors.join(' | ')}`);
    // Same race across a remount: type, jump to a SECOND lesson's runner.
    await goto(page, `${origin}app/?preview#/lesson/${L2}/speak`);
    await page.locator('.runner-pane[data-step="speak"] .speak-area').fill('stale debounce source');
    await goto(page, `${origin}app/?preview#/lesson/a1-s1-l3/write`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
    const plays = page.locator('.runner-pane[data-step="prepare"] .chunk-list [data-role="play-target"]');
    assert.equal(await plays.count(), lesson.chunks.length, 'every taught chunk gets a play button');
    await plays.first().click();
    // read: dialogue line play buttons
    await goto(page, `${origin}app/?preview#/lesson/${L2}/read`);
    const linePlays = page.locator('.runner-pane[data-step="read"] .dialogue-lines [data-role="play-target"]');
    assert.equal(await linePlays.count(), lesson.dialogue.lines.length, 'every dialogue line gets a play button');
    await linePlays.first().click();
    const calls = await page.evaluate(() => window.__ttsCalls);
    assert.equal(calls.length, 2, `expected 2 TTS calls, got ${calls.length}`);
    assert.ok(calls[0].length > 0 && calls[1].startsWith('Staff:'), `calls: ${JSON.stringify(calls)}`);
    await context.close();
    check('chunk + dialogue play buttons speak the target');
  }

  // ── 13. Write correction loop: compare shows, retry records attempt 2 ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    const pane = page.locator('.runner-pane[data-step="write"]');
    await pane.locator('.write-area').fill('My name is Linh Pham, P-H-A-M.');
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    const writePane = page.locator('.runner-pane[data-step="write"]');
    await writePane.locator('.write-area').fill('i am linh. i from hue.');
    await writePane.locator('[data-role="model-toggle"]').click();
    await writePane.locator('[data-role="write-save"]').click();
    await writePane.locator('[data-role="ai-review"]:not([hidden])').waitFor();
    const reviewText = await writePane.locator('[data-role="ai-review"]').textContent();
    assert.match(reviewText, /Viết hoa chữ đầu câu/);
    assert.match(reviewText, /I’m Linh/);

    // Roleplay: start → partner opener → learner turn → AI graded checklist
    await goto(page, `${origin}app/?preview#/lesson/${L2}/speak`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/read`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/listen`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
    const preparePane = page.locator('.runner-pane[data-step="prepare"]');
    for (let i = 0; i < 4; i++) {
      await preparePane.locator('.quiz-question').nth(i).locator('.quiz-option').nth(2).click();
    }
    await preparePane.locator('.quiz-submit').click();
    assert.equal(await preparePane.locator('.quiz-explain-btn').count(), 0, 'no AI button without tutor');
    await goto(page, `${origin}app/?preview#/lesson/${L2}/speak`);
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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
    const prep = page.locator('.runner-pane[data-step="prepare"]');

    // Chunk pager: one card at a time, nav moves through all chunks
    assert.equal(await prep.locator('.chunk-card:visible').count(), 1, 'pager shows one chunk');
    await prep.locator('[data-role="chunk-next"]').click();
    assert.match(await prep.locator('.chunk-counter').textContent(), /Cụm 2\/7/);

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
    await goto(page, `${origin}app/?preview#/lesson/${L2}/read`);
    const read = page.locator('.runner-pane[data-step="read"]');
    const rq = read.locator('.quiz-question');
    for (let i = 0; i < await rq.count(); i++) {
      await rq.nth(i).locator('.quiz-option input').nth(lesson.dialogue.questions[i].answer).check();
    }
    await read.locator('.quiz-submit').click();

    await goto(page, `${origin}app/?preview#/lesson/${L2}/listen`);
    const lis = page.locator('.runner-pane[data-step="listen"]');
    const lq = lis.locator('.quiz-question');
    for (let i = 0; i < await lq.count(); i++) {
      await lq.nth(i).locator('.quiz-option input').nth(lesson.listening.questions[i].answer).check();
    }
    await lis.locator('.quiz-submit').click();

    await goto(page, `${origin}app/?preview#/lesson/${L2}/write`);
    const write = page.locator('.runner-pane[data-step="write"]');
    await write.locator('.write-area').fill('My name is Linh Pham, P-H-A-M.');
    await write.locator('[data-role="model-toggle"]').click();
    const wChecks = write.locator('[data-check]');
    for (let i = 0; i < await wChecks.count(); i++) await wChecks.nth(i).check();
    await write.locator('[data-role="write-save"]').click();

    await goto(page, `${origin}app/?preview#/lesson/${L2}/speak`);
    const speak = page.locator('.runner-pane[data-step="speak"]');
    await speak.locator('.speak-area').fill('It is Linh Pham, P-H-A-M. My number is 0908.');
    await speak.locator('[data-role="spoke"]').check();
    await speak.locator('[data-role="model-toggle"]').click();
    const sChecks = speak.locator('[data-check]');
    for (let i = 0; i < await sChecks.count(); i++) await sChecks.nth(i).check();
    await speak.locator('[data-role="speak-save"]').click();

    await goto(page, `${origin}app/?preview#/summary/${L2}`);
    assert.equal(await page.locator('[data-role="celebration"]').count(), 1, 'celebration banner after all steps');
    await goto(page, `${origin}app/?preview`);
    assert.match(await page.locator('[data-role="streak"]').textContent(), /ngày liên tiếp/);

    // Path visuals: stage + lesson progress bars reflect submitted steps —
    // the L2 row's bar fills (L1 is the mission lesson, untouched here).
    await goto(page, `${origin}app/?preview#/path`);
    const l2Bar = page.locator('.path-stage').first().locator('.path-lessons li', { hasText: 'Đánh vần, số điện thoại và email' }).locator('.path-bar i');
    assert.equal(await l2Bar.evaluate((el) => el.style.width), '100%', 'lesson 2 bar full');
    const stageBarWidth = await page.locator('.path-stage-progress .path-bar i').first().evaluate((el) => el.style.width);
    assert.equal(stageBarWidth, '20%', `stage bar ${stageBarWidth} after 1/5 lessons`);
    assert.ok((await page.locator('.path-lesson-icon').count()) >= 5, 'lesson icons present');

    // Review recap: grade all enrolled task cards → per-grade session
    // summary. A full lesson stages 32 task cards (8 chunks × prepare 2 +
    // listen 1 + write 1 kinds).
    await goto(page, `${origin}app/?preview#/review`);
    for (let i = 0; i < 40; i++) {
      if (await page.locator('[data-role="review-recap"]').count()) break;
      const reveal = page.locator('[data-role="reveal"]');
      if (!(await reveal.count())) break;
      await reveal.click();
      await page.locator('[data-grade="3"]').click();
    }
    assert.match(await page.locator('[data-role="review-recap"]').textContent(), /Nhớ \d+/);
    await context.close();
    check('engagement layer: pager + match pairs + word bank + banner + progress + celebration + streak + path bars + review recap');
  }

  // ── 17. Mission acceptance (issue #33): context → gist → notice → retrieve
  //        → interact → unaided exit → hint-level retry; no AI, mobile ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    // English voice present so the listening path mints real tasks.
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
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const stage = (name) => page.locator(`.mission-stage[data-stage="${name}"]`);
    const eventsOfKind = async (kind) => page.evaluate(
      ({ key, kind }) => {
        const db = JSON.parse(localStorage.getItem(key) || '{}');
        return (db.lessonEvents || []).filter((e) => e.kind === kind);
      },
      { key: DB_KEY, kind },
    );

    // A deep link to the exit task must NOT skip scaffolding — the route
    // clamps forward jumps to the first unfinished stage.
    await goto(page, `${origin}app/?preview#/lesson/${L1}/exit`);
    await stage('context').waitFor();
    assert.equal(await page.locator('.runner-pane').count(), 0, 'mission lesson never mounts the five panes');
    assert.equal(await page.locator('.step-pill').count(), 0, 'no step-tab navigation to bypass the flow');
    assert.equal(await page.locator('[data-role="roleplay"]').count(), 0, 'no AI affordance inside the mission');

    // CONTEXT — one exchange; the continue action exists only AFTER a real
    // exposure. "Hiện nghĩa" is support only — it reveals text but must
    // NOT arm the gate when a voice exists (issue #33 round 3).
    const ctxStage = stage('context');
    assert.equal(await ctxStage.locator('.mission-line').count(), 4, 'one four-line exchange');
    assert.equal(await ctxStage.locator('.translation:not([hidden])').count(), 0, 'translations hidden by default');
    assert.equal(await ctxStage.locator('.mission-primary:not([hidden])').count(), 0,
      'no continue before a real exposure action');
    await ctxStage.locator('[data-role="translation-toggle"]').click();
    assert.equal(await ctxStage.locator('.translation:not([hidden])').count(), 4);
    assert.equal(await ctxStage.locator('.mission-primary:not([hidden])').count(), 0,
      'opening translations alone must NOT bypass the audio gate');
    await ctxStage.locator('[data-role="play-all"]').click();
    const ttsCalls = await page.evaluate(() => window.__ttsCalls);
    assert.equal(ttsCalls.length, 4, 'the whole exchange is heard as one sequence');
    assert.equal(await ctxStage.locator('.mission-primary:not([hidden])').count(), 0,
      'audio alone is not enough — the name contract must be declared first');
    await ctxStage.locator('[data-role="learner-name"]').fill('Linh');
    await ctxStage.locator('.mission-primary').click();
    await stage('gist').waitFor();

    // GIST — two meaning checks about what just happened.
    const gist = stage('gist');
    await gist.locator('.quiz-question').nth(0).locator('.quiz-option').nth(missionLesson.mission.gist[0].answer).click();
    await gist.locator('.quiz-question').nth(1).locator('.quiz-option').nth(missionLesson.mission.gist[1].answer).click();
    await gist.locator('.quiz-submit').click();
    await gist.locator('.mission-primary').click();
    await stage('notice').waitFor();

    // NOTICE — page through all four chunks, then continue is armed.
    const notice = stage('notice');
    assert.match(await notice.locator('.chunk-pager-nav').textContent(), /Cụm 1\/4/);
    assert.equal(await notice.locator('.mission-primary:not([hidden])').count(), 0, 'continue stays armed only after all chunks seen');
    for (let i = 0; i < 3; i++) await notice.locator('button', { hasText: 'Cụm tiếp' }).click();
    assert.match(await notice.locator('.chunk-pager-nav').textContent(), /Cụm 4\/4/);
    await notice.locator('.mission-primary').click();
    await stage('retrieve').waitFor();

    // RETRIEVE — VI cue → type the English. Hint once (recorded support);
    // every item must be produced, not chosen.
    const retrieve = stage('retrieve');
    for (let i = 0; i < missionLesson.mission.retrieval.length; i++) {
      assert.match(await retrieve.locator('.mission-retrieve-card').textContent(), new RegExp(`Nhớ lại ${i + 1}/4`));
      if (i === 1) await retrieve.locator('[data-role="retrieve-hint"]').click(); // recorded aid
      // <name> resolves to the captured learner name (Linh in this run).
      await retrieve.locator('.mission-input').fill(missionLesson.mission.retrieval[i].answer.replaceAll('<name>', 'Linh'));
      await retrieve.locator('[data-role="retrieve-check"]').click();
      if (i < missionLesson.mission.retrieval.length - 1) await sleep(650); // item-advance defer
    }
    await stage('interact').waitFor({ timeout: 5000 });

    // INTERACT — Mia speaks; each reply is assembled from a word bank.
    const interact = stage('interact');
    const turns = missionLesson.mission.interact.turns;
    for (let t = 0; t < turns.length; t++) {
      const wb = interact.locator('.mission-interact-wb').last();
      for (const word of turns[t].you.replaceAll('<name>', 'Linh').split(/\s+/).filter(Boolean)) {
        await wb.locator(`.wb-bank .wb-chip[data-word="${word}"]`).first().click();
      }
      await wb.locator('.wb-check').click();
      if (t < turns.length - 1) await sleep(700);
    }
    await interact.locator('.mission-primary').click();
    await stage('exit').waitFor();

    // EXIT — attempt 1 is frozen BEFORE any model is revealed. A nonsense
    // response must NOT pass the communicative checks (keyword-soup
    // counterexample from review). Reload mid-attempt proves the frozen
    // response survives (draft restore).
    const exit = stage('exit');
    await exit.locator('[aria-label="Lượt của bạn 1"]').fill('Hi, I am your name');
    await exit.locator('[data-role="exit-send"]:not([disabled])').click();
    await sleep(600); // draft persistence is debounced ~400ms
    await reload(page);
    await stage('exit').waitFor();
    assert.equal(await stage('exit').locator('[aria-label="Lượt của bạn 2"]').count(), 1,
      'frozen turn survives reload; the next turn still asks');
    assert.match(await stage('exit').textContent(), /Hi, I am your name/, 'restored frozen response on screen');
    await stage('exit').locator('[aria-label="Lượt của bạn 2"]').fill('Nice to meet you too.');
    await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
    await exit.locator('.mission-exit-feedback').waitFor();

    // Feedback shows per-goal results + targeted hints — NO model yet,
    // and NO "Xem kết quả": a failed mission cannot complete.
    assert.equal(await exit.locator('.exit-checks .check-met').count(), 2, 'greet + polite met; name + ask missed');
    assert.equal(await exit.locator('.exit-checks .check-missed').count(), 2);
    assert.equal(await exit.locator('[data-role="exit-model"] .en').count(), 0,
      'attempt-1 feedback shows hints, never the full model');
    assert.equal(await exit.locator('[data-role="exit-model-reveal"]').count(), 1,
      'explicit model reveal is available but not automatic');
    assert.equal(await exit.locator('[data-role="exit-done"]').count(), 0,
      'failed attempt must not offer the completion path');

    // Attempt 1 recorded ONCE (restore did not duplicate), fully unaided,
    // and explicitly NOT passed — the lesson is still unfinished.
    let exitEvents = await eventsOfKind('exit');
    assert.equal(exitEvents.length, 1, 'restored mid-attempt did not double-record');
    assert.equal(exitEvents[0].payload.attempt, 1);
    assert.equal(exitEvents[0].payload.unaidedFirst, true, 'attempt 1 frozen before any support');
    assert.equal(exitEvents[0].payload.aided, false);
    assert.equal(exitEvents[0].support.hintViewed, false);
    assert.equal(exitEvents[0].support.modelRevealed, false);
    assert.equal(exitEvents[0].payload.correct, 2);
    assert.equal(exitEvents[0].payload.passed, false, '2/4 is work, not a pass');
    assert.deepEqual(exitEvents[0].payload.responses[0].missed, ['name', 'ask'],
      'structured scorer: keyword soup fails name + ask');

    // The failed mission shows as unfinished on the summary — no
    // celebration, and the next action routes back to the exit task.
    await goto(page, `${origin}app/?preview#/summary/${L1}`);
    assert.equal(await page.locator('[data-role="celebration"]').count(), 0,
      'no "Xong bài!" while the exit task is failed');
    const retryLink = page.locator('.summary-steps a', { hasText: 'Cần làm lại' });
    assert.equal(await retryLink.count(), 1, 'exit lists as retryable work, not done');
    const retryNav = page.locator('.runner-nav a.btn-primary');
    assert.match(await retryNav.textContent(), /Tự làm/, 'next action sends learner back to the exit');
    await goto(page, `${origin}app/?preview#/lesson/${L1}/exit`);
    await stage('exit').waitFor();

    // RETRY — re-entering the stage after a failed attempt is the retry:
    // the persisted support shows the targeted hint under the input,
    // still no model; provenance is hintViewed, not modelRevealed.
    assert.equal(await stage('exit').locator('.exit-hint').count(), 1, 'hint shown for the turn that missed');
    assert.equal(await stage('exit').locator('text=Mẫu:').count(), 0, 'still no model on a hint retry');
    await stage('exit').locator('[aria-label="Lượt của bạn 1"]').fill('Hi, I’m Linh. What’s your name?');
    await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
    await stage('exit').locator('[aria-label="Lượt của bạn 2"]').fill('Nice to meet you too.');
    await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
    await exit.locator('.mission-exit-feedback').waitFor();
    assert.equal(await exit.locator('.exit-checks .check-met').count(), 4, 'all four checks met on retry');
    // A clean aided attempt finishes WITHOUT auto-revealing the model.
    assert.equal(await exit.locator('[data-role="exit-model"] .en').count(), 0, 'clean run never dumps the model');
    exitEvents = await eventsOfKind('exit');
    assert.equal(exitEvents.length, 2, 'retry is a separate durable record');
    assert.equal(exitEvents[1].payload.attempt, 2);
    assert.equal(exitEvents[1].payload.unaidedFirst, false);
    assert.equal(exitEvents[1].payload.aided, true);
    assert.equal(exitEvents[1].support.hintViewed, true, 'hint-level aid recorded');
    assert.equal(exitEvents[1].support.modelRevealed, false, 'model never revealed for this attempt');
    assert.equal(exitEvents[1].payload.correct, 4);
    assert.equal(exitEvents[1].payload.passed, true, 'aided but complete — the mission passes');
    // Only now does the completion path exist.
    assert.equal(await exit.locator('[data-role="exit-done"]').count(), 1,
      '"Xem kết quả" appears only after a passed attempt');

    // Staged enrollment — only exercised modalities/chunks mint tasks.
    // Lesson 1 mints NO listening cards (issue #33 round 3): audio next
    // to its own text is exposure, not retrieval. Pool: notice (seen) →
    // form 4; retrieve (attempted) → meaning 4; exit produces c1,c2,c4
    // → 3 — c3 is Sam's line and must NOT mint a production card.
    const taskCounts = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      const keys = Object.keys(db.fsrs || {}).filter((k) => k.startsWith('a1-s1-l1:'));
      const byKind = {};
      for (const k of keys) {
        const kind = k.split(':').pop();
        byKind[kind] = (byKind[kind] || 0) + 1;
      }
      return { keys, byKind };
    }, DB_KEY);
    assert.equal(taskCounts.keys.length, 11, `11 honest tasks minted, got ${taskCounts.keys.length}`);
    assert.deepEqual(taskCounts.byKind, {
      form_recognition: 4,
      meaning_recall: 4,
      cued_production: 3
    }, 'task kinds match modalities actually exercised');
    assert.equal(
      taskCounts.keys.filter((k) => k.endsWith(':listening_recognition')).length,
      0,
      'no listening cards — lesson 1 has no audio→meaning retrieval'
    );
    assert.equal(
      taskCounts.keys.filter((k) => k.startsWith('a1-s1-l1:c3@') && k.endsWith(':cued_production')).length,
      0,
      'no production card for c3 — the learner never says it'
    );

    // Every stage event exists exactly once except exit (two attempts).
    for (const kind of ['context', 'gist', 'notice', 'retrieve', 'interact']) {
      assert.equal((await eventsOfKind(kind)).length, 1, `${kind} recorded once`);
    }
    const retrieveEvents = await eventsOfKind('retrieve');
    assert.equal(retrieveEvents[0].support.hintViewed, true, 'hint use is recorded support');
    const contextEvents = await eventsOfKind('context');
    assert.equal(contextEvents[0].payload.heardAll, true, 'the exchange was heard');
    assert.equal(contextEvents[0].payload.ttsUnavailable, false);
    assert.equal(contextEvents[0].payload.audioSkipped, false, 'audio path, not a skip');
    assert.equal(contextEvents[0].payload.learnerName, 'Linh', 'the name contract is on record');

    // Summary shows can-do evidence from the exit task, not a mixed
    // "N câu đúng" counter — and no stage left undone.
    await goto(page, `${origin}app/?preview#/summary/${L1}`);
    assert.equal(await page.locator('[data-role="celebration"]').count(), 1, 'all six stages attempted → celebration');
    const missionResult = page.locator('[data-role="mission-result"]');
    await missionResult.waitFor();
    const resultText = await missionResult.textContent();
    assert.match(resultText, /Chào lại/);
    assert.match(resultText, /Hỏi tên họ/);
    assert.match(resultText, /sau gợi ý/, 'final attempt was hint-aided, and the summary says so');
    assert.match(await page.locator('.summary-steps').textContent(), /Xem tình huống/);
    assert.equal(await page.locator('.summary-steps a', { hasText: 'Chưa làm' }).count(), 0, 'no stage left undone');
    assert.deepEqual(errors, [], `pageerrors: ${errors.join(' | ')}`);
    await context.close();
    check('mission: context→gist→notice→retrieve→interact→unaided exit→hinted retry (mobile, no AI)');
  }

  // ── 18. Name durability: the captured name lives in the durable
  //        context event. Losing the device-local lesson-session (a
  //        device switch restores lessonEvents, never drafts) must NOT
  //        silently revert <name> to the 'Linh' fallback (issue #33 r5) ──
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
          speak: (u) => { window.__ttsCalls.push(u.text); u.onend?.(); },
          addEventListener: () => {},
        },
      });
    });
    const page = await context.newPage();
    const stage = (name) => page.locator(`.mission-stage[data-stage="${name}"]`);

    // Context submitted with the learner's real name — recorded in the
    // durable event payload, which is the only copy that syncs.
    await goto(page, `${origin}app/?preview#/lesson/${L1}/context`);
    await stage('context').waitFor();
    await stage('context').locator('[data-role="play-all"]').click();
    await stage('context').locator('[data-role="learner-name"]').fill('Hoàng');
    await stage('context').locator('.mission-primary').click();
    await stage('gist').waitFor();
    await sleep(600); // let the debounced draft save flush first
    const ctxEvents = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'context');
    }, DB_KEY);
    assert.equal(ctxEvents[0]?.payload?.learnerName, 'Hoàng',
      'the durable context event carries the name');

    // The device-local session is gone — draft, learnerName, everything.
    await page.evaluate((key) => localStorage.removeItem(key), SESSION_KEY);

    // Resume where the durable events say the learner is: gist. Every
    // later stage must still resolve <name> from the event — with the
    // bug these steps would expect/render 'Linh' instead.
    await goto(page, `${origin}app/?preview#/lesson/${L1}/gist`);
    const gist = stage('gist');
    await gist.waitFor();
    await gist.locator('.quiz-question').nth(0).locator('.quiz-option').nth(missionLesson.mission.gist[0].answer).click();
    await gist.locator('.quiz-question').nth(1).locator('.quiz-option').nth(missionLesson.mission.gist[1].answer).click();
    await gist.locator('.quiz-submit').click();
    await gist.locator('.mission-primary').click();
    await stage('notice').waitFor();
    const notice = stage('notice');
    for (let i = 0; i < 3; i++) await notice.locator('button', { hasText: 'Cụm tiếp' }).click();
    await notice.locator('.mission-primary').click();
    await stage('retrieve').waitFor();

    const retrieve = stage('retrieve');
    for (let i = 0; i < missionLesson.mission.retrieval.length; i++) {
      await retrieve.locator('.mission-input').fill(
        missionLesson.mission.retrieval[i].answer.replaceAll('<name>', 'Hoàng')
      );
      await retrieve.locator('[data-role="retrieve-check"]').click();
      if (i < missionLesson.mission.retrieval.length - 1) await sleep(650);
    }
    await stage('interact').waitFor({ timeout: 5000 });

    const interact = stage('interact');
    const turns = missionLesson.mission.interact.turns;
    for (let t = 0; t < turns.length; t++) {
      const wb = interact.locator('.mission-interact-wb').last();
      for (const word of turns[t].you.replaceAll('<name>', 'Hoàng').split(/\s+/).filter(Boolean)) {
        await wb.locator(`.wb-bank .wb-chip[data-word="${word}"]`).first().click();
      }
      await wb.locator('.wb-check').click();
      if (t < turns.length - 1) await sleep(700);
    }
    await interact.locator('.mission-primary').click();
    await stage('exit').waitFor();

    // And the exit scorer accepts the diacritic-free spelling — the
    // contract is "Hoàng", and "I'm Hoang" is the same name.
    const exit = stage('exit');
    await exit.locator('[aria-label="Lượt của bạn 1"]').fill('Hi, I’m Hoang. What’s your name?');
    await exit.locator('[data-role="exit-send"]:not([disabled])').click();
    await exit.locator('[aria-label="Lượt của bạn 2"]').fill('Nice to meet you too.');
    await exit.locator('[data-role="exit-send"]:not([disabled])').click();
    await exit.locator('.mission-exit-feedback').waitFor();
    const exitEvents = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return (db.lessonEvents || []).filter((e) => e.kind === 'exit');
    }, DB_KEY);
    assert.equal(exitEvents.length, 1);
    assert.equal(exitEvents[0].payload.passed, true,
      '"I\'m Hoang" passes against the durable-captured Hoàng');
    assert.equal(exitEvents[0].payload.unaidedFirst, true,
      'the restored-session attempt is still a real unaided first try');
    await context.close();
    check('learner name survives device-local draft loss — restored from the durable context event');
  }

  // ── 19. No-TTS context: explicit fallback, and silent click-through
  //        mints zero tasks ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const stage = (name) => page.locator(`.mission-stage[data-stage="${name}"]`);
    await goto(page, `${origin}app/?preview#/lesson/${L1}/context`);
    await stage('context').waitFor();
    assert.equal(await stage('context').locator('.mission-primary:not([hidden])').count(), 0,
      'no continue before exposure');
    await stage('context').locator('[data-role="play-all"]').click();
    // Headless has no English voice → explicit fallback: translations open,
    // the click is recorded as ttsUnavailable — and mints NOTHING.
    assert.equal(await stage('context').locator('.translation:not([hidden])').count(), 4,
      'no-TTS fallback opens the text path');
    assert.equal(await stage('context').locator('.mission-primary:not([hidden])').count(), 0,
      'fallback alone is not enough — name still required');
    await stage('context').locator('[data-role="learner-name"]').fill('Linh');
    await stage('context').locator('.mission-primary').click();
    await stage('gist').waitFor();
    await sleep(600); // debounced save
    const after = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return {
        tasks: Object.keys(db.fsrs || {}).filter((k) => k.startsWith('a1-s1-l1:')),
        ctx: (db.lessonEvents || []).find((e) => e.kind === 'context'),
      };
    }, DB_KEY);
    assert.equal(after.tasks.length, 0, 'silent/degraded context mints no tasks at all');
    assert.equal(after.ctx?.payload?.ttsUnavailable, true, 'fallback is recorded, not silent');
    assert.equal(after.ctx?.payload?.heardAll, false);
    await context.close();
    check('no-TTS context falls back explicitly and mints zero tasks');
  }

  // ── 20. Deliberate audio skip: "Đọc thay vì nghe" is an explicit
  //        action with its own provenance — support ≠ silent bypass ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.__ttsCalls = [];
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          getVoices: () => [{ name: 'Mock en-US', lang: 'en-US' }],
          cancel: () => {},
          speak: (u) => { window.__ttsCalls.push(u.text); u.onend?.(); },
          addEventListener: () => {},
        },
      });
    });
    const page = await context.newPage();
    const stage = (name) => page.locator(`.mission-stage[data-stage="${name}"]`);
    await goto(page, `${origin}app/?preview#/lesson/${L1}/context`);
    await stage('context').waitFor();
    assert.equal(await stage('context').locator('.mission-primary:not([hidden])').count(), 0);
    // TTS works, but the learner chooses the text path explicitly.
    await stage('context').locator('[data-role="read-skip"]').click();
    assert.equal(await stage('context').locator('.translation:not([hidden])').count(), 4,
      'the skip opens the text path');
    await stage('context').locator('[data-role="learner-name"]').fill('Linh');
    await stage('context').locator('.mission-primary').click();
    await stage('gist').waitFor();
    await sleep(600); // debounced save
    const after = await page.evaluate((key) => {
      const db = JSON.parse(localStorage.getItem(key) || '{}');
      return {
        tasks: Object.keys(db.fsrs || {}).filter((k) => k.startsWith('a1-s1-l1:')),
        ctx: (db.lessonEvents || []).find((e) => e.kind === 'context'),
      };
    }, DB_KEY);
    assert.equal((await page.evaluate(() => window.__ttsCalls)).length, 0, 'no audio was played');
    assert.equal(after.ctx?.payload?.audioSkipped, true, 'deliberate skip recorded as its own provenance');
    assert.equal(after.ctx?.payload?.heardAll, false);
    assert.equal(after.ctx?.payload?.ttsUnavailable, false, 'a choice, not a failure');
    assert.equal(after.tasks.length, 0, 'reading instead of listening mints nothing');
    await context.close();
    check('explicit "Đọc thay vì nghe" skip is recorded and mints nothing');
  }

  // ── 21. Old lessons still load — the five-pane runner is intact for the
  //        29 untouched lessons ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await goto(page, `${origin}app/?preview#/lesson/${L2}/prepare`);
    assert.equal(await page.locator('.runner-pane[data-step]').count(), 5, 'old lesson keeps five panes');
    assert.equal(await page.locator('.step-pill').count(), 5);
    await goto(page, `${origin}app/?preview#/lesson/a1-s6-l5/read`);
    assert.equal(await page.locator('.runner-pane[data-step]').count(), 4, 'stage-6 checkpoint keeps four panes');
    assert.deepEqual(errors, [], `pageerrors: ${errors.join(' | ')}`);
    await context.close();
    check('old lessons 2–30 still load via the five-pane runner');
  }

  // ── 22. /vnext/ mission page — the honest-UI contract on a real
  //        browser: baseline first, pre-commit support is evidence,
  //        reload resumes the same run ──
  {
    const VNEXT_TEXT = {
      'task.meet.diagnostic.opening': 'hi',
      'task.meet.diagnostic.own_name': 'i am linh',
      'task.meet.diagnostic.ask_name': 'uhhh',
      'task.meet.diagnostic.repair': 'sorry',
      'task.meet.diagnostic.polite': 'nice to meet you too',
      'task.meet.retrieval.ask_name': "what's your name",
    };
    const VNEXT_CHOICE = {
      'task.meet.diagnostic.listen': 'greeting',
      'task.meet.diagnostic.identity_q': 'ask_name',
    };

    for (const width of [1280, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${origin}vnext/?learner=browser.${width}`);
      await page.locator('.vnext-card[data-screen="intro"]').waitFor();
      if (await page.locator('[data-role="name-input"]').count()) {
        await page.locator('[data-role="name-input"]').fill('Linh');
      }
      await page.locator('[data-role="start"]').click();
      await page.locator('.vnext-card[data-screen="task"]').waitFor();
      const card = page.locator('.vnext-card');
      assert.equal(await card.getAttribute('data-purpose'), 'diagnostic',
        `baseline diagnostic first at ${width}px`);
      assert.equal(await page.locator('[data-role^="support-"]').count(), 0,
        'diagnostic offers no support controls');

      if (width === 1280) {
        // Drive the declared sequence until the retrieval prompt.
        const vstep = async () => {
          const c = page.locator('.vnext-card');
          const scr = await c.getAttribute('data-screen');
          if (scr === 'input') { await page.locator('[data-role="viewed"]').click(); return; }
          if (scr !== 'task') return;
          if ((await c.getAttribute('data-phase')) === 'feedback') {
            await page.locator('[data-role="next"]').click();
            return;
          }
          const taskId = (await c.getAttribute('data-task')).split('@')[0];
          if (await page.locator('[data-role="option"]').count()) {
            await page.locator(`[data-role="option"][data-option="${VNEXT_CHOICE[taskId]}"]`).click();
            return;
          }
          await page.locator('[data-role="answer"]').fill(VNEXT_TEXT[taskId] ?? '');
          await page.locator('[data-role="commit"]').click();
        };
        let at = null;
        for (let i = 0; i < 40 && !at; i++) {
          const c = page.locator('.vnext-card');
          const task = await c.getAttribute('data-task');
          const phase = await c.getAttribute('data-phase');
          if (task === 'task.meet.retrieval.ask_name@1' && phase === 'prompt') at = 'prompt';
          else { await vstep(); await page.waitForTimeout(40); }
        }
        assert.equal(at, 'prompt', 'never reached the retrieval prompt');

        // Pre-commit support is persisted evidence BEFORE the attempt.
        await page.locator('[data-role="support-hint"]').click();
        await page.waitForTimeout(40);
        const mid = await page.evaluate(() => window.__FD_VNEXT__.session.log());
        assert.ok(mid.find((e) => e.eventType === 'support_use' && e.taskId === 'task.meet.retrieval.ask_name'),
          'support_use event missing after hint');
        assert.equal(mid.filter((e) => e.taskId === 'task.meet.retrieval.ask_name' && e.attempt?.outcome != null).length, 0,
          'no attempt may exist before commit');
        assert.equal(await page.locator('[data-support-kind="hint"]').count() > 0, true, 'hint content not shown');

        // Commit → the attempt is stamped with the support actually used
        // and the feedback screen says so — never "unaided".
        const runId = await page.evaluate(() => window.__FD_VNEXT__.session.runInfo().id);
        await page.locator('[data-role="answer"]').fill("what's your name");
        await page.locator('[data-role="commit"]').click();
        await page.locator('.vnext-card[data-phase="feedback"]').waitFor();
        const after = await page.evaluate(() => window.__FD_VNEXT__.session.log());
        const attempt = after.find((e) => e.taskId === 'task.meet.retrieval.ask_name' && e.attempt?.outcome != null);
        assert.equal(attempt?.support?.hint, true, 'attempt did not stamp the hint snapshot');
        assert.equal(attempt?.attempt?.outcome, 'success');
        const fb = await page.locator('[data-role="outcome"]').textContent();
        assert.ok(fb.length > 0, 'no outcome text in feedback');

        // Reload → same missionRunId, evidence intact, never a new run.
        // The run resumes straight into the next selector-chosen screen
        // (learnerName is persisted — no second intro).
        await page.reload();
        await page.locator('.vnext-card').waitFor();
        assert.equal(await page.evaluate(() => window.__FD_VNEXT__.session.runInfo().id), runId,
          'reload minted a new missionRunId');
        assert.equal((await page.evaluate(() => window.__FD_VNEXT__.session.log())).length, after.length,
          'reload lost or duplicated evidence');
        await context.close();
        check('vnext: baseline first → support_use before commit → stamped attempt → reload resumes run');
        continue;
      }

      assert.deepEqual(errors, [], `pageerrors at ${width}px: ${errors.join(' | ')}`);
      await context.close();
    }
    check('vnext page renders intro + first diagnostic on mobile and desktop');
  }

  console.log(`FlashDay app browser tests: ${passed} groups passed`);
} finally {
  await browser?.close();
  await server.close();
}
