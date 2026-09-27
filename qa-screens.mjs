// FlashDay visual QA + learner simulation.
// 1) Screenshots every route at 390px and 1280px.
// 2) Drives a1-s1-l1 end-to-end like a real learner: all 5 steps submitted,
//    correct answers taken from the lesson data itself.
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { lessonById } from '/home/thunder/Code/FlashDay/src/content/a1/index.js';

const OUT = '/tmp/fd-shots';
mkdirSync(OUT, { recursive: true });

const server = await createServer({
  root: '/home/thunder/Code/FlashDay',
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
const origin = server.resolvedUrls.local[0];
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

const lesson = lessonById('a1-s1-l1');
const PANE = '.runner-pane:not([hidden])';
const VIEW_READY = '#view:not(:empty)';
const results = [];
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  📸 ${name}`);
};
const mark = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await chromium.launch({ executablePath, headless: true });

async function goto(page, url) {
  await page.goto(url);
  await page.locator(VIEW_READY).waitFor();
}

async function answerQuizCorrectly(page, questions) {
  const fieldsets = page.locator(PANE + ' .quiz-question');
  const count = await fieldsets.count();
  for (let i = 0; i < count; i++) {
    const correct = questions[i].answer;
    await fieldsets.nth(i).locator('.quiz-option input').nth(correct).check();
  }
  await page.locator(PANE + ' .quiz-submit').click();
  return page.locator(PANE + ' .quiz-feedback').textContent();
}

// ── 1. Static routes, both viewports ─────────────────────
for (const [label, width] of [['m', 390], ['d', 1280]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${origin}`).catch(() => {});
  await shot(page, `${label}1-landing`);
  await page.goto(`${origin}login/`).catch(() => {});
  await shot(page, `${label}2-login`);
  await goto(page, `${origin}app/?preview`);
  await shot(page, `${label}3-today`);
  await goto(page, `${origin}app/?preview#/path`);
  await shot(page, `${label}4-path`);
  await goto(page, `${origin}app/?preview#/review`);
  await shot(page, `${label}5-review`);
  await goto(page, `${origin}app/?preview#/profile`);
  await shot(page, `${label}6-profile`);
  await ctx.close();
}

// ── 2. Learner simulation on a1-s1-l1 at 390px ───────────
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
// Mock an English TTS voice so play buttons are verifiable headlessly.
await ctx.addInitScript(() => {
  window.__ttsCalls = [];
  const fakeVoice = { name: 'Mock en-US', lang: 'en-US' };
  // Stub the utterance class too — the real setter rejects plain-object voices.
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      getVoices: () => [fakeVoice],
      cancel: () => {},
      speak: (u) => { window.__ttsCalls.push(u.text); u.onend?.(); },
      addEventListener: () => {}
    }
  });
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(`${e.message}\n${e.stack || ''}`));

await goto(page, `${origin}app/?preview`);
const startHref = await page.locator('a.btn-primary', { hasText: /Bắt đầu|Tiếp tục/ }).getAttribute('href');
mark('today → nút bắt đầu trỏ vào bài học', /#\/lesson\//.test(startHref || ''), startHref);

// prepare
await goto(page, `${origin}app/?preview${startHref || '#/lesson/a1-s1-l1/prepare'}`);
await shot(page, 's1-prepare');
// every taught chunk has a TTS play button speaking the target text
await page.locator(PANE + ' .chunk-list [data-role="play-target"]').first().click();
const tts = await page.evaluate(() => window.__ttsCalls);
mark('prepare: nút nghe cụm phát đúng target', tts.includes(lesson.chunks[0].target), tts[0]);
let fb = await answerQuizCorrectly(page, lesson.drills);
mark('prepare: nộp drill', /Đúng \d+\/\d+/.test(fb), fb);
await shot(page, 's1-prepare-done');

// read
await goto(page, `${origin}app/?preview#/lesson/a1-s1-l1/read`);
await shot(page, 's2-read');
await page.locator(PANE + ' [data-role="translation-toggle"]').click().catch(() => {});
await page.locator(PANE + ' .dialogue-lines [data-role="play-target"]').first().click();
const ttsRead = await page.evaluate(() => window.__ttsCalls);
mark('read: nút nghe dòng hội thoại phát đúng', ttsRead.includes(lesson.dialogue.lines[0][0]));
await shot(page, 's2-read-translation');
fb = await answerQuizCorrectly(page, lesson.dialogue.questions);
mark('read: nộp câu hỏi hiểu', /Đúng \d+\/\d+/.test(fb), fb);

// listen
await goto(page, `${origin}app/?preview#/lesson/a1-s1-l1/listen`);
await page.locator(PANE + ' button', { hasText: 'Nghe mẫu' }).click().catch(() => {});
await page.waitForTimeout(800);
const voiceText = await page.locator(PANE + ' .runner-notice').textContent().catch(() => '');
await shot(page, 's3-listen');
fb = await answerQuizCorrectly(page, lesson.listening.questions);
mark('listen: nộp câu hỏi nghe', /Đúng \d+\/\d+/.test(fb), `${fb} | voice: ${voiceText}`);

// write
await goto(page, `${origin}app/?preview#/lesson/a1-s1-l1/write`);
await page.locator(PANE + ' .write-area').fill('Hi everyone! I am Devin. I am from Da Nang. Nice to meet you all.');
await page.locator(PANE + ' button', { hasText: 'Xem mẫu' }).click();
await shot(page, 's4-write-model');
const checks = page.locator(PANE + ' [data-check]');
for (let i = 0; i < (await checks.count()); i++) await checks.nth(i).check();
await page.locator(PANE + ' button', { hasText: 'Lưu lần thử' }).click();
await shot(page, 's4-write-saved');
const postSubmit = await page.locator(PANE + ' a.runner-continue').count();
mark('write sau khi lưu: chỉ 1 nút tiếp tục', postSubmit === 1, `count=${postSubmit}`);
// correction loop: compare block shows marked matches + retry records attempt 2
const compareShown = await page.locator(PANE + ' .attempt-compare:not([hidden])').count();
const markedWords = await page.locator(PANE + ' .attempt-compare mark').count();
mark('write: so sánh bài với mẫu gần nhất', compareShown === 1 && markedWords > 0, `marks=${markedWords}`);
await page.locator(PANE + ' [data-role="write-retry"]').click();
await page.locator(PANE + ' .write-area').fill('Hi! I am Devin and I am from Da Nang. Nice to meet you.');
await page.locator(PANE + ' [data-role="write-save"]').click();
const writeEvents = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('flashday-a1') || '{}');
  return (db.lessonEvents || []).filter((e) => e.kind === 'write').length;
});
mark('write: viết lại ghi attempt thứ 2', writeEvents === 2, `events=${writeEvents}`);
await shot(page, 's4-write-retry');

// speak — order matters: check "đã nói" → Xem mẫu enabled → checklist → Lưu
await goto(page, `${origin}app/?preview#/lesson/a1-s1-l1/speak`);
await page.locator(PANE + ' .speak-area').fill('Hi, I am Devin. I am from Da Nang. Nice to meet you.');
await page.locator(PANE + ' [data-role="spoke"]').check();
await page.locator(PANE + ' button', { hasText: 'Xem mẫu' }).click();
const speakChecks = page.locator(PANE + ' [data-check]');
for (let i = 0; i < (await speakChecks.count()); i++) await speakChecks.nth(i).check();
await shot(page, 's5-speak');
await page.locator(PANE + ' [data-role="speak-save"]').click();
await shot(page, 's5-speak-saved');

// summary
await goto(page, `${origin}app/?preview#/summary/a1-s1-l1`);
await shot(page, 's6-summary');
const summaryText = await page.locator('#view').textContent();
mark('summary hiển thị kết quả bài học', /đúng|Đúng|xong|Xong|bước/.test(summaryText));
mark('summary: cả 5 bước đều xong (không còn "Chưa làm")', !/Chưa làm/.test(summaryText));

// no duplicate "Học tiếp" / "Xem kết quả" continue buttons after submit
await goto(page, `${origin}app/?preview#/lesson/a1-s1-l1/write`);
const continueCount = await page.locator(PANE + ' a.runner-continue').count();
mark('write pane sau nộp: chỉ 1 nút tiếp tục', continueCount === 1, `count=${continueCount}`);

// review: FSRS cards should exist now
await goto(page, `${origin}app/?preview#/review`);
await shot(page, 's7-review-after');
const reviewText = await page.locator('#view').textContent();
mark('ôn: có thẻ FSRS sau khi nộp bước học', !/Chưa có thẻ đến hạn/.test(reviewText), reviewText.slice(0, 80));
// reveal → target + audio
await page.locator('[data-role="reveal"]').click();
await page.locator('.review-back [data-role="play-target"]').click();
const ttsReview = await page.evaluate(() => window.__ttsCalls);
mark('ôn: đáp án phát âm được', ttsReview.length > 0, ttsReview.at(-1));

// persistence after reload
await page.reload();
await page.locator(VIEW_READY).waitFor();
mark('reload: app không crash', pageErrors.length === 0, pageErrors.join('; ').slice(0, 120));

await ctx.close();
await browser.close();
await server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} learner-flow checks passed, ${OUT}/`);
process.exit(failed.length ? 1 : 0);
