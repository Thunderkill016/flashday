import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Isolated preview: no login, no production writes, fresh storage per viewport.
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];
let browser;
try {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  browser = await chromium.launch({ executablePath, headless: true });
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}app/?preview`);

    // Shell renders: three tabs present.
    for (const label of ['Học', 'Ôn', 'Hồ sơ']) {
      assert.equal(await page.locator('.app-tab', { hasText: label }).count(), 1, `tab ${label}`);
    }

    // Tabs switch views.
    await page.locator('.app-tab', { hasText: 'Ôn' }).click();
    assert.equal(await page.locator('#view h1').textContent(), 'Ôn tập');
    await page.locator('.app-tab', { hasText: 'Hồ sơ' }).click();
    assert.equal(await page.locator('#view h1').textContent(), 'Hồ sơ');
    await page.locator('.app-tab', { hasText: 'Học' }).click();
    assert.equal(await page.locator('#view h1').textContent(), 'Hôm nay');

    // Hash routes render their titles.
    await page.goto(`${origin}app/?preview#/path`);
    assert.equal(await page.locator('#view h1').textContent(), 'Lộ trình');
    await page.goto(`${origin}app/?preview#/summary/a1-s1-l1`);
    assert.equal(await page.locator('#view h1').textContent(), 'Kết quả buổi học');

    // Runner: 5 step panes, exactly one visible (hidden-toggle pattern).
    await page.goto(`${origin}app/?preview#/lesson/a1-s1-l1/listen`);
    const panes = page.locator('.runner-pane[data-step]');
    assert.equal(await panes.count(), 5);
    let visible = 0;
    for (let i = 0; i < 5; i++) {
      if (await panes.nth(i).isVisible()) visible++;
    }
    assert.equal(visible, 1, 'exactly one step pane visible');
    assert.equal(await page.locator('.runner-pane[data-step="listen"]').isVisible(), true);

    assert.deepEqual(errors, [], `pageerrors at ${width}px: ${errors.join(' | ')}`);
    await context.close();
  }
  console.log('FlashDay app shell browser test: PASS (390 + 1280, tabs, routes, runner panes)');
} finally {
  await browser?.close();
  await server.close();
}
