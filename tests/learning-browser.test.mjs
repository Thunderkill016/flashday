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
    const preparation = page.locator("[data-preparation-quiz]");
    assert.equal(
      await preparation
        .locator(".quiz-opt")
        .first()
        .evaluate((node) => getComputedStyle(node).borderTopWidth),
      "1px",
      "lesson options must remain visibly selectable outside the reader",
    );
    assert.equal(
      await page.locator(".lesson-preparation").evaluate((node) => node.open),
      true,
    );
    assert.match(
      await page
        .locator("[data-cluster-card] .cluster-note")
        .first()
        .innerText(),
      /chưa phải khóa A1/,
    );
    assert.match(
      await page.locator("[data-guided-cluster]").innerText(),
      /6 Unit|5 Unit/,
    );
    for (const question of await preparation.locator(".sq-q").all())
      await question.locator(".quiz-opt").first().click();
    await preparation.locator(".sq-submit").click();
    assert.match(await preparation.locator(".sq-result").innerText(), /1\/3/);
    assert.equal(await preparation.locator(".sq-hint:not(.hidden)").count(), 2);
    await preparation.locator(".sq-retry").click();
    for (const [index, answer] of [1, 2, 0].entries())
      await preparation
        .locator(".sq-q")
        .nth(index)
        .locator(".quiz-opt")
        .nth(answer)
        .click();
    await preparation.locator(".sq-submit").click();
    assert.match(await preparation.locator(".sq-result").innerText(), /3\/3/);
    const prepRecords = await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(window.FlashDayData.dbKey(localStorage)),
        ).comprehensionChecks,
    );
    assert.deepEqual(
      prepRecords.map((r) => r.correct),
      [1, 3],
    );
    assert(
      prepRecords.every(
        (r) =>
          r.activity === "supported-language-practice" &&
          r.contentVersion === 2 &&
          r.sourceKey.endsWith(":v2:preparation"),
      ),
    );
    assert.equal(
      await page.locator(".lesson-evidence").count(),
      0,
      "supported language practice must not masquerade as scenario comprehension",
    );
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
  // Synthetic prior review: exercise next-day practice without pretending
  // that an automated fixture is evidence of a real learner's retention.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const DAY_MS = 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "flashday-memory-engine-repo-driven",
        JSON.stringify({
          items: [
            {
              id: "delayed-fixture",
              target: "on my way",
              meaning: "đang trên đường",
              type: "chunk",
            },
          ],
          events: [
            {
              id: "review-fixture",
              mode: "write",
              unitIds: ["delayed-fixture"],
              ratings: { "delayed-fixture": 3 },
              answeredAt: Date.now() - DAY_MS - 1000,
              evidence: { aided: false, unaidedUnits: ["delayed-fixture"] },
            },
          ],
          transferAttempts: [],
        }),
      );
    });
    await page.goto(`${origin}app/?preview`);
    const task = page.locator("[data-unit-transfer]");
    await task
      .locator("#unitTransferResponse")
      .fill("I am on my way to Hanoi.");
    await task.locator("[data-unit-reveal]").click();
    await task.locator("[data-unit-save]").click();
    assert.equal(
      await task.count(),
      1,
      "unreviewed attempt must remain available",
    );
    assert.equal(
      await task.locator("#unitTransferResponse").inputValue(),
      "I am on my way to Hanoi.",
    );
    await task.locator("[data-unit-reveal]").click();
    await task.locator("[data-unit-self-review]").check();
    await task.locator("[data-unit-save]").click();
    assert.equal(
      await task.count(),
      0,
      "self-reviewed attempt closes this practice task",
    );
    const attempts = await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(window.FlashDayData.dbKey(localStorage)),
        ).transferAttempts,
    );
    assert.deepEqual(
      attempts.map((a) => a.selfReviewed),
      [false, true],
    );
    assert.ok(
      attempts.every(
        (a) =>
          a.sourceEventId === "review-fixture" &&
          a.evidenceBasis === "explicit-unaided" &&
          a.submittedAt >= a.dueAt,
      ),
    );
    assert.ok(
      (await page.locator(".lesson-evidence").allTextContents()).every(
        (text) => !text.includes("unit transfer"),
      ),
      "personal-unit practice must not inflate the guided-cluster evidence",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await context.close();
    console.log("Learning browser: delayed transfer resume and evidence PASS");
  }

  // Delayed cloud responses must never cross an account boundary. The fake
  // transport controls timing; the real app/hub session handlers still run.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${origin}app/?preview`);
    await page.locator("[data-guided-cluster]").waitFor();
    await page.evaluate(() => {
      const D = window.FlashDayData;
      const fixture = (window.__sessionFixture = {
        listeners: [],
        writes: [],
        reads: [],
        deferred: [],
      });
      const originalTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => {
        if (delay === 0) {
          fixture.deferred.push(() => callback(...args));
          return -1;
        }
        return originalTimeout(callback, delay, ...args);
      };
      for (const id of ["alice", "bob"]) {
        localStorage.setItem(
          `${D.DB_BASE_KEY}:u:${id}`,
          JSON.stringify(
            D.createInitialDb([
              { id: `${id}-only`, target: id, meaning: id, type: "word_sense" },
            ]),
          ),
        );
      }
      const client = {
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: "alice" } } },
          }),
          onAuthStateChange: (callback) => {
            fixture.listeners.push(callback);
            return { data: { subscription: { unsubscribe() {} } } };
          },
        },
        from(table) {
          let write = false;
          const builder = {
            select() {
              return this;
            },
            order() {
              return this;
            },
            limit() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle() {
              return this;
            },
            single() {
              return this;
            },
            pageAfter() {
              return this;
            },
            upsert() {
              write = true;
              return this;
            },
            insert() {
              write = true;
              return this;
            },
            then(resolve, reject) {
              if (write) {
                fixture.writes.push(table);
                return Promise.resolve({ data: [], error: null }).then(
                  resolve,
                  reject,
                );
              }
              fixture.reads.push(table);
              if (table === "decks")
                return new Promise((done) => {
                  fixture.resolveDeck = () =>
                    done({ data: [{ id: "alice-deck" }], error: null });
                }).then(resolve, reject);
              if (table === "learner_profiles")
                return new Promise((done) => {
                  fixture.resolveProfile = () =>
                    done({
                      data: {
                        payload: {
                          overallLevel: "C2",
                          updatedAt: 9999999999999,
                        },
                      },
                      error: null,
                    });
                }).then(resolve, reject);
              return Promise.resolve({ data: [], error: null }).then(
                resolve,
                reject,
              );
            },
          };
          return builder;
        },
      };
      window.dispatchEvent(
        new CustomEvent("flashday:supabase-ready", { detail: { client } }),
      );
    });
    await page.waitForFunction(() =>
      Boolean(window.__sessionFixture.resolveDeck),
    );
    assert.equal(
      await page.evaluate(() => window.__sessionFixture.listeners.length),
      2,
      "both cloud listeners must subscribe before awaiting hydration",
    );
    await page.waitForFunction(() =>
      Boolean(window.__sessionFixture.resolveProfile),
    );
    await page.evaluate(() => {
      const fixture = window.__sessionFixture;
      for (const callback of fixture.listeners)
        callback("SIGNED_IN", { user: { id: "bob" } });
      window.FlashDayData.claimDbNamespace(localStorage, "bob");
      fixture.resolveDeck();
      fixture.resolveProfile();
    });
    // Drain asynchronous continuations via a browser task, not an arbitrary sleep.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const result = await page.evaluate(() => {
      const D = window.FlashDayData;
      return {
        writes: window.__sessionFixture.writes,
        reads: window.__sessionFixture.reads,
        bob: JSON.parse(localStorage.getItem(`${D.DB_BASE_KEY}:u:bob`)),
      };
    });
    assert.deepEqual(
      result.writes,
      [],
      "stale work must not upload under the new account",
    );
    assert.deepEqual(result.reads.sort(), ["decks", "learner_profiles"]);
    assert.deepEqual(
      result.bob.items.map((item) => item.id),
      ["bob-only"],
    );
    assert.equal(
      result.bob.learningProfile,
      null,
      "stale profile must not replace Bob profile",
    );
    await context.close();
    console.log("Learning browser: in-flight account-switch isolation PASS");
  }
} finally {
  await browser?.close();
  await server.close();
}
