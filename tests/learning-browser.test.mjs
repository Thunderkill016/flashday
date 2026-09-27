import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

// Isolated preview: no login, no production writes, fresh storage per viewport.
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];
let browser;
try {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync("/usr/bin/google-chrome")
      ? "/usr/bin/google-chrome"
      : undefined);
  browser = await chromium.launch({ executablePath, headless: true });
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}app/?preview`);
    await page.locator("[data-guided-cluster]").click();
    await page.locator("[data-guided-cluster]:disabled").waitFor();
    await page.locator(".lesson-scenario summary").click();
    const quiz = page.locator("[data-scenario-quiz]");
    const originalNode = await quiz.elementHandle();
    const questions = quiz.locator(".sq-q");
    for (const index of [0, 1, 2])
      await questions.nth(index).locator(".quiz-opt").nth(1).click();
    await quiz.locator(".sq-submit").click();
    assert.equal(
      await quiz.evaluate((node, original) => node === original, originalNode),
      true,
    );
    assert.equal(await quiz.locator(".sq-hint:not(.hidden)").count(), 3);
    assert.equal(
      await page.locator(".lesson-scenario").evaluate((node) => node.open),
      true,
    );
    assert.match(await quiz.locator(".sq-result").innerText(), /0\/3/);
    await quiz.locator(".sq-retry").click();
    assert.equal(await quiz.locator(".quiz-opt:enabled").count(), 12);
    assert.equal(await quiz.locator(".sq-hint:not(.hidden)").count(), 0);
    assert.equal(await quiz.locator(".sq-submit").isDisabled(), true);
    for (const [index, answer] of [0, 2, 0].entries())
      await questions.nth(index).locator(".quiz-opt").nth(answer).click();
    await quiz.locator(".sq-submit").click();
    assert.match(await quiz.locator(".sq-result").innerText(), /3\/3/);
    const scores = await page.evaluate(() => {
      const D = window.FlashDayData;
      return JSON.parse(localStorage.getItem(D.dbKey(localStorage)))
        .comprehensionChecks.filter((record) =>
          record.sourceKey.endsWith(":scenario"),
        )
        .map((record) => record.correct);
    });
    assert.deepEqual(scores, [0, 3]);
    const mission = page.locator("[data-transfer-mission]");
    await mission.locator('input[id^="finalTime-"]').fill("7");
    await mission.locator("textarea").fill("See you at 7:30pm.");
    await mission.locator("[data-transfer-reveal]").click();
    assert.equal(await mission.locator(".transfer-model").isVisible(), false);
    await mission.locator("textarea").fill("See you at 7:00pm.");
    await mission.locator("[data-transfer-reveal]").click();
    assert.equal(await mission.locator(".transfer-model").isVisible(), true);
    await mission.locator("[data-transfer-save]").click();
    assert.match(
      await page.locator(".lesson-evidence").innerText(),
      /vận dụng 1 lần/,
    );
    assert.match(await quiz.locator(".sq-result").innerText(), /3\/3/);
    // Check the entire document, with the import form open, not only the cluster.
    await page.locator("#importUrlInput").evaluate((node) => {
      for (
        let parent = node.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        if (parent.tagName === "DETAILS") parent.open = true;
      }
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `overflow at ${width}px`,
    );
    // Create both meanings through the real form, then explicitly choose one
    // while mining. Surface text alone must not attach both senses.
    for (const meaning of ["ngân hàng", "bờ sông"]) {
      const shell = page.locator(".manual-unit-shell");
      if (!(await shell.evaluate((node) => node.open)))
        await shell.locator(":scope > summary").click();
      await page.locator("#targetInput").fill("bank");
      await page.locator("#meaningInput").fill(meaning);
      const details = page.locator("#captureForm .capture-details");
      if (!(await details.evaluate((node) => node.open)))
        await details.locator(":scope > summary").click();
      await page.locator("#typeInput").selectOption("word_sense");
      await page.locator('#captureForm button[type="submit"]').click();
      await page.getByRole("tab", { name: "Bộ nhớ", exact: true }).waitFor();
      await page.getByRole("tab", { name: "Học", exact: true }).click();
    }
    const importShell = page.locator("#importShell");
    if (!(await importShell.evaluate((node) => node.open)))
      await importShell.locator(":scope > summary").click();
    await page.locator("#importPasteInput").fill("We sat by the bank.");
    await page.locator("#importSourceTitle").fill("Synthetic river fixture");
    await page.locator("#importTranscriptBtn").click();
    await page.locator('.tok-word[data-word="bank"]').click();
    await page
      .locator(".wc-known-meanings")
      .getByRole("button", { name: "bờ sông", exact: true })
      .click();
    await page
      .locator("#wcSentenceTranslation")
      .fill("Chúng tôi ngồi bên bờ sông.");
    await page.locator("#wcSave").click();
    await page.locator('.reader-line mark[title="bờ sông"]').waitFor();
    const senseState = await page.evaluate(() => {
      const D = window.FlashDayData;
      const db = JSON.parse(localStorage.getItem(D.dbKey(localStorage)));
      const senses = db.items.filter((item) => item.target === "bank");
      const capture = db.captures.find(
        (item) => item.sentence === "We sat by the bank.",
      );
      return {
        count: senses.length,
        selected: capture.linkedUnitIds,
        river: senses.find((item) => item.meaning === "bờ sông").id,
      };
    });
    assert.equal(senseState.count, 2);
    assert.deepEqual(senseState.selected, [senseState.river]);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `Learning browser: quiz lifecycle, records, mission gate, layout PASS (${width}px)`,
    );
  }
} finally {
  await browser?.close();
  await server.close();
}
