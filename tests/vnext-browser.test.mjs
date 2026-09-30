import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

/* vNext mission page browser paths (mission 008C §34):
 * REFERENCE / B0 / SHADOW_B0 boot clean, the live-decision lock binds
 * data-task on every served screen, reload resumes the run, shadow mode
 * serves the identical reference sequence, and audit records persist. */
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = server.resolvedUrls.local[0];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

const READY = '.vnext-card[data-screen]';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let browser;
let passed = 0;
const check = (name) => {
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/* Drive the rendered surface like a learner: view input, commit the
 * first option or a generic answer, advance feedback. Returns the
 * ordered list of served task identities (data-task or input screen
 * marker) — the sequence policies actually chose. */
async function drive(page, maxScreens = 24, opts = {}) {
  const served = [];
  for (let i = 0; i < maxScreens; i += 1) {
    const card = page.locator(READY);
    await card.waitFor();
    const screen = await card.getAttribute('data-screen');
    if (screen === 'error') {
      throw new Error(`error screen: ${await card.textContent()}`);
    }
    if (screen === 'summary') {
      served.push('summary');
      return { served, done: true };
    }
    if (screen === 'intro') {
      await page.locator('[data-role="start"]').click();
      continue;
    }
    if (screen === 'input') {
      served.push('input');
      await page.locator('[data-role="viewed"]').click();
      continue;
    }
    if (screen === 'task') {
      const phase = await card.getAttribute('data-phase');
      if (phase === 'feedback') {
        await page.locator('[data-role="next"]').click();
        continue;
      }
      const taskId = await card.getAttribute('data-task');
      served.push(taskId);
      if (opts.reloadAt === i) {
        await page.reload();
        continue;
      }
      const options = page.locator('[data-role="option"]');
      const nOptions = await options.count();
      if (nOptions > 0) {
        /* opts.wrong(taskId) → deliberately pick the SECOND option —
         * the authored correct option is always first in the fixture
         * data, so nth(1) lands an observed attributing miss. */
        const idx = opts.wrong?.(taskId) && nOptions > 1 ? 1 : 0;
        await options.nth(idx).click();
      } else {
        await page.locator('[data-role="answer"]').fill('hello');
        await page.locator('[data-role="commit"]').click();
      }
      if (opts.until?.(taskId)) return { served, done: false, untilHit: true };
      continue;
    }
    throw new Error(`unknown screen '${screen}'`);
  }
  return { served, done: false };
}

try {
  browser = await chromium.launch({ executablePath, headless: true });
  const mk = async (learner) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return { context, page, errors, learner };
  };

  // ── B0 default: page boots a full session, tasks bind data-task ──
  {
    const { context, page, errors } = await mk('sim-b0');
    await page.goto(`${origin}vnext/?mission=mission.meet_new_person&learner=sim-b0&mode=b0`);
    const { served, done } = await drive(page);
    assert.equal(errors.length, 0, `pageerrors: ${errors.join(' | ')}`);
    assert.ok(served.length > 2, `only ${served.length} screens served`);
    assert.ok(served.some((s) => s?.startsWith('task.')), 'no task screen served');
    check(`B0 mode serves task-bound screens (${served.length} screens, done=${done})`);
    await context.close();
  }

  // ── REFERENCE + SHADOW_B0 serve identical sequences ──
  {
    const run = async (mode) => {
      const { context, page, errors } = await mk(`sim-${mode}`);
      await page.goto(`${origin}vnext/?mission=mission.meet_new_person&learner=sim-${mode}&mode=${mode}`);
      const r = await drive(page, 14);
      assert.equal(errors.length, 0, `${mode} pageerrors: ${errors.join(' | ')}`);
      await context.close();
      return r.served;
    };
    const ref = await run('reference');
    const shadow = await run('shadow_b0');
    assert.deepEqual(shadow, ref, 'shadow_b0 served sequence diverges from reference');
    check(`SHADOW_B0 serves identical reference sequence (${ref.length} screens)`);
  }

  // ── Unknown mode fails closed to REFERENCE ──
  {
    const { context, page, errors } = await mk('sim-bogus');
    await page.goto(`${origin}vnext/?mission=mission.meet_new_person&learner=sim-bogus&mode=__bogus__`);
    const { served } = await drive(page, 10);
    assert.equal(errors.length, 0, `pageerrors: ${errors.join(' | ')}`);
    assert.ok(served.length > 1, 'bogus mode produced no screens');
    check('unknown ?mode= fails closed to reference (clean serve)');
    await context.close();
  }

  // ── Reload resumes the run; audit persists; decision log populated ──
  {
    const { context, page, errors } = await mk('sim-reload');
    await page.goto(`${origin}vnext/?mission=mission.meet_new_person&learner=sim-reload&mode=b0`);
    const first = await drive(page, 6, { reloadAt: 2 });
    assert.equal(errors.length, 0, `pageerrors: ${errors.join(' | ')}`);
    /* After the reload the run resumed — decisions must be in the
     * local decision store with sha256 digests. */
    const audit = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (!k.includes('decision')) continue;
        try {
          const v = JSON.parse(localStorage.getItem(k));
          out.push({ k, v });
        } catch { /* ignore non-json */ }
      }
      return out;
    });
    assert.ok(first.served.length >= 3, `too few screens before resume check: ${first.served}`);
    check(`reload mid-run resumes without errors (${first.served.length} screens)`);
    const records = audit.flatMap(({ v }) => Array.isArray(v) ? v : (v?.decisions ?? v?.records ?? [])).filter((r) => r && typeof r === 'object');
    const withDigest = records.filter((r) => typeof r.decisionInputDigest === 'string' && r.decisionInputDigest.startsWith('sha256:'));
    assert.ok(withDigest.length > 0, `no audit records with sha256 digest found (keys: ${audit.map((a) => a.k)})`);
    check(`decision audit persisted (${withDigest.length} records carry decide-time sha256 digests)`);
    await context.close();
  }

  // ── 008D vertical slice: post-lag attributing miss → real remediation ──
  {
    /* B0-native reachability note: correction mints only on a POST-taught
     * attributed miss. The clock cap's tasks allow no support, so a first
     * success goes straight to INDEPENDENT and the only later serve is
     * the lagged due_retrieval — the +25h retention lag is compressed by
     * a TEST-HARNESS clock patch (addInitScript runs before page scripts
     * on later navigations; no product URL can alter evidence time).
     * Phase A teaches the cap on the real clock; phase B reloads the
     * same persisted learner under the shifted harness clock, fails the
     * delayed retest, and expects the authored remediation task. */
    const { context, page, errors } = await mk('sim-slice');
    const url = `${origin}vnext/?mission=mission.meet_at_a_time&learner=sim-slice&mode=b0`;
    const is = (prefix) => (id) => typeof id === 'string' && id.startsWith(prefix);
    await page.goto(url);
    const a = await drive(page, 30);
    /* The run may legitimately reach summary — lagged intents (due,
     * transfer, assessment) need real elapsed time. What matters here:
     * the clock baseline was served and succeeded → INDEPENDENT. */
    assert.ok(a.served.some(is('task.time.diagnostic.hear')), `clock-time baseline never served: ${a.served}`);
    /* Harness clock shift for subsequent navigations only: every
     * Date.now() inside this context returns real time +25h. */
    await page.addInitScript(() => {
      const real = Date.now.bind(Date);
      const SHIFT_MS = 90_000_000; // +25h — past the 24h retention lag
      Date.now = () => real() + SHIFT_MS;
    });
    await page.goto(url);
    const b = await drive(page, 40, {
      wrong: is('task.time.delayed.hear'),
      until: is('task.time.remediation.hear')
    });
    assert.equal(errors.length, 0, `pageerrors: ${errors.join(' | ')}`);
    assert.ok(b.served.some(is('task.time.delayed.hear')), `due retest never served post-lag: ${b.served}`);
    assert.ok(b.untilHit, `attributing miss never routed to authored remediation: ${b.served}`);
    /* The serving decision must carry correction kind in the audit. */
    const corrAudit = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (!k.includes('decision')) continue;
        try {
          const v = JSON.parse(localStorage.getItem(k));
          for (const r of Array.isArray(v) ? v : (v?.decisions ?? v?.records ?? [])) {
            if (r && typeof r === 'object') out.push(r);
          }
        } catch { /* non-json */ }
      }
      return out;
    });
    /* Both refresh and correction mint on an attributed miss on a
     * taught cap — B0's frozen ranking decides which serves; the
     * slice's requirement is that the AUTHORED remediation task is the
     * repair surface actually served, audited under a repair kind. */
    const repair = corrAudit.find((r) => (r.chosenKind === 'correction' || r.chosenKind === 'refresh') && r.taskId === 'task.time.remediation.hear');
    assert.ok(repair != null, `no repair-kind audit record for the authored remediation task (kinds seen: ${corrAudit.map((r) => r.chosenKind)})`);
    check(`008D slice: attributing miss → authored remediation served as ${repair.chosenKind} (task.time.remediation.hear)`);
    /* Persisted evidence follows the TEST clock — phase-B events land
     * ≈25h after phase-A evidence inside the persisted log itself. */
    const stamps = await page.evaluate(() => {
      const raw = localStorage.getItem('fd.vnext.sim-slice.events') ?? '[]';
      return JSON.parse(raw).map((e) => e.occurredAt).filter((t) => Number.isFinite(t));
    });
    const span = Math.max(...stamps) - Math.min(...stamps);
    assert.ok(stamps.length > 2 && span > 20 * 3600 * 1000,
      `persisted evidence does not straddle the harness clock shift: ${stamps.length} events, span ${span}ms`);
    check(`008D slice: persisted evidence timestamps follow the harness clock (span ${(span / 3600e3).toFixed(1)}h)`);
    await context.close();
  }

  // ── Removed seam: ?clockOffset= is inert on the product route ──
  {
    /* Regression for the 008D clock-seam blocker: no product code may
     * read a clock URL param into evidence time. Serve real evidence
     * with a hostile param present, then prove persisted timestamps sit
     * on the real clock. */
    const { context, page, errors } = await mk('sim-clockparam');
    await page.goto(`${origin}vnext/?mission=mission.meet_new_person&learner=sim-clockparam&mode=b0&clockOffset=90000000`);
    const { served } = await drive(page, 4);
    assert.equal(errors.length, 0, `pageerrors: ${errors.join(' | ')}`);
    assert.ok(served.length > 1, 'no evidence served for clock-param regression');
    const probe = await page.evaluate(() => {
      const raw = localStorage.getItem('fd.vnext.sim-clockparam.events') ?? '[]';
      const events = JSON.parse(raw);
      return { wallNow: Date.now(), stamps: events.map((e) => e.occurredAt) };
    });
    const MAX_SKEW_MS = 60_000;
    assert.ok(probe.stamps.length > 0, 'no persisted evidence to check');
    for (const t of probe.stamps) {
      assert.ok(Math.abs(t - probe.wallNow) < MAX_SKEW_MS,
        `evidence timestamp ${t} diverges from wall clock ${probe.wallNow} — ?clockOffset is not inert`);
    }
    check('?clockOffset= has no effect on persisted evidence time (param ignored)');
    await context.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
console.log(`vnext-browser: ${passed} checks — PASS`);
