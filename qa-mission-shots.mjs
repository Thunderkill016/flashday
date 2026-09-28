// One-off QA capture: mission lesson 1 at 390px, one shot per screen.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import missionLesson from './src/content/a1/s1-l1.js';
import { mkdirSync, existsSync } from 'node:fs';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];
// Repo-relative by default so CI can upload it as an artifact
// (mission-shots in .gitignore); SHOT_DIR overrides for local /tmp use.
const out = process.env.SHOT_DIR || 'mission-shots';
mkdirSync(out, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const stage = (name) => page.locator(`.mission-stage[data-stage="${name}"]`);
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`${origin}app/?preview#/lesson/a1-s1-l1/context`);
await page.locator('#view:not(:empty)').waitFor();
await stage('context').waitFor();
await shot('01-context-initial');
// "Hiện nghĩa" is support only — the gate stays up until a real exposure.
await stage('context').locator('[data-role="translation-toggle"]').click();
await shot('02-context-translation-support');
// Headless has no English voice → the explicit no-TTS fallback path.
await stage('context').locator('[data-role="play-all"]').click();
await shot('03-context-no-tts-fallback');
await stage('context').locator('[data-role="learner-name"]').fill('Linh');
await stage('context').locator('.mission-primary').click();
await stage('gist').waitFor();
await shot('04-gist');
for (const q of missionLesson.mission.gist) {
  // wrong first on Q1 to show feedback, then right
}
await stage('gist').locator('.quiz-question').nth(0).locator('.quiz-option').nth(missionLesson.mission.gist[0].answer).click();
await stage('gist').locator('.quiz-question').nth(1).locator('.quiz-option').nth(missionLesson.mission.gist[1].answer).click();
await stage('gist').locator('.quiz-submit').click();
await shot('05-gist-done');
await stage('gist').locator('.mission-primary').click();
await stage('notice').waitFor();
await shot('06-notice');
for (let i = 0; i < 3; i++) await stage('notice').locator('button', { hasText: 'Cụm tiếp' }).click();
await stage('notice').locator('.mission-primary').click();
await stage('retrieve').waitFor();
await shot('07-retrieve');
for (const item of missionLesson.mission.retrieval) {
  await stage('retrieve').locator('.mission-input').fill(item.answer.replaceAll('<name>', 'Linh'));
  await stage('retrieve').locator('[data-role="retrieve-check"]').click();
  await sleep(650);
}
await stage('interact').waitFor();
await shot('08-interact');
for (const turn of missionLesson.mission.interact.turns) {
  const wb = stage('interact').locator('.mission-interact-wb').last();
  for (const word of turn.you.replaceAll('<name>', 'Linh').split(/\s+/).filter(Boolean)) {
    await wb.locator(`.wb-bank .wb-chip[data-word="${word}"]`).first().click();
  }
  await wb.locator('.wb-check').click();
  await sleep(700);
}
await shot('09-interact-done');
await stage('interact').locator('.mission-primary').click();
await stage('exit').waitFor();
await shot('10-exit-unaided');
await stage('exit').locator('[aria-label="Lượt của bạn 1"]').fill('Hi, I am your name');
await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
await stage('exit').locator('[aria-label="Lượt của bạn 2"]').fill('Nice to meet you too.');
await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
await stage('exit').locator('.mission-exit-feedback').waitFor();
await shot('11-exit-feedback-hints');
await stage('exit').locator('[data-role="exit-retry"]').click();
await shot('12-exit-retry-hinted');
await stage('exit').locator('[aria-label="Lượt của bạn 1"]').fill('Hi, I’m Linh. What’s your name?');
await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
await stage('exit').locator('[aria-label="Lượt của bạn 2"]').fill('Nice to meet you too.');
await stage('exit').locator('[data-role="exit-send"]:not([disabled])').click();
await stage('exit').locator('.mission-exit-feedback').waitFor();
await shot('13-exit-feedback-clean');
await stage('exit').locator('[data-role="exit-done"]').click();
await page.locator('[data-role="mission-result"]').waitFor();
await shot('14-summary');
await browser.close();
await server.close();
console.log(`shots in ${out}`);
