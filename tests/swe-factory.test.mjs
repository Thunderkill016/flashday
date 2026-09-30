/*
 * SWE work factory tests (issue #62, missions/README.md).
 *
 * Each scenario runs the real scripts/swe.mjs CLI against a throwaway
 * git repo in os.tmpdir() via SWE_REPO / SWE_HOME env overrides — same
 * end-to-end contract a fresh agent session would use.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const SWE = resolve(new URL('../scripts/swe.mjs', import.meta.url).pathname);

const CHECKPOINT_MD = `## MISSION OBJECTIVE
Do the thing.
## CURRENT STATE
Halfway.
## PROVEN FACTS
- fact one
## CHANGES MADE
- edited a.js
## CURRENT TEST STATUS
ok suite green
## CURRENT HYPOTHESIS
next step will work
## OPEN PROBLEMS
- none
## IMPORTANT FILES
- a.js
## NEXT EXACT ACTION
run node tests/ok.mjs
## CURRENT SHA
placeholder
`;

const missionMd = (id, verification = ['node tests/ok.mjs'], extra = {}) => `---
${JSON.stringify({ id, objective: 'validate the factory', verification, browserVerification: null, ...extra }, null, 2)}
---

# Mission ${id}

## OBJECTIVE
Validate the factory end-to-end.
## WHY
Because missions need state.
## INVARIANTS
No product changes.
## IN SCOPE
- missions/ artifacts only.
## OUT OF SCOPE
- Product code.
## ACCEPTANCE CRITERIA
- [ ] lifecycle works
## VERIFICATION
- node tests/ok.mjs
## BROWSER VERIFICATION
not required
## SAFETY CONSTRAINTS
- no force-push
## STOP CONDITIONS
- contradictory reality
## REPORT FORMAT
- outcome + evidence
`;

let n = 0;
const results = [];
const check = (name, fn) => {
  n++;
  try {
    fn();
    results.push(`✓ ${name}`);
  } catch (e) {
    results.push(`✗ ${name}\n  ${e.message}`);
    console.log(results.at(-1));
    process.exit(1);
  }
};

const makeRepo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'swe-test-'));
  const g = (args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  g(['init', '-q']);
  g(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-qm', 'init']);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'tmp', scripts: { green: 'node tests/ok.mjs' } }));
  mkdirSync(join(dir, 'tests'));
  writeFileSync(join(dir, 'tests/ok.mjs'), 'process.exit(0)\n');
  writeFileSync(join(dir, 'tests/fail.mjs'), 'process.exit(1)\n');
  mkdirSync(join(dir, 'missions'));
  g(['add', '.']);
  g(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'files']);
  const env = { ...process.env, SWE_REPO: dir, SWE_HOME: join(dir, 'missions') };
  const swe = (args, { ok = true } = {}) => {
    try {
      const out = execFileSync('node', [SWE, ...args], {
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      if (!ok) throw new Error(`expected failure, got:\n${out}`);
      return out;
    } catch (e) {
      if (ok) throw new Error(`swe ${args.join(' ')} failed:\n${e.stdout ?? ''}${e.stderr ?? e.message}`);
      return (e.stderr || e.stdout || '').toString();
    }
  };
  const addMission = (id, v) => {
    mkdirSync(join(dir, 'missions', id), { recursive: true });
    writeFileSync(join(dir, 'missions', id, 'mission.md'), missionMd(id, v));
    g(['add', `missions/${id}`]);
    g(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', `mission ${id}`]);
  };
  const state = (id) => JSON.parse(readFileSync(join(dir, 'missions', id, 'state.json'), 'utf8'));
  const writeCp = (name = 'cp.md', body = CHECKPOINT_MD) => {
    writeFileSync(join(dir, name), body);
    return join(dir, name);
  };
  return { dir, g, swe, addMission, state, writeCp };
};

/* 1. queued mission is visible, start runs it */
{
  const r = makeRepo();
  r.addMission('001-one');
  check('queued mission listed as QUEUED', () =>
    assert.match(r.swe(['status']), /QUEUED\s+001-one/));
  check('start transitions to RUNNING with start sha', () => {
    const out = r.swe(['start']);
    assert.match(out, /RUNNING/);
    const s = r.state('001-one');
    assert.equal(s.status, 'RUNNING');
    assert.equal(s.startSha, r.g(['rev-parse', 'HEAD']));
  });
}

/* 2. start refuses on dirty tracked file */
{
  const r = makeRepo();
  r.addMission('001-one');
  writeFileSync(join(r.dir, 'tests/ok.mjs'), 'process.exit(0) // touched\n');
  check('start refuses unsafe dirty tree', () => {
    const err = r.swe(['start'], { ok: false });
    assert.match(err, /unsafe start|not clean/i);
    assert.equal(existsSync(join(r.dir, 'missions/001-one/state.json')), false);
  });
}

/* 3. one non-terminal mission at a time */
{
  const r = makeRepo();
  r.addMission('001-one');
  r.addMission('002-two');
  r.swe(['start', '001-one']);
  check('second mission start refused while first active', () =>
    assert.match(r.swe(['start', '002-two'], { ok: false }), /one mission at a time/i));
}

/* 4. checkpoint validates required sections */
{
  const r = makeRepo();
  r.addMission('001-one');
  r.swe(['start']);
  check('checkpoint missing sections refused', () =>
    assert.match(
      r.swe(['checkpoint', '001-one', '--file', r.writeCp('bad.md', '## CURRENT STATE\nx\n')], { ok: false }),
      /missing sections/i));
  check('full checkpoint recorded + stamped with real sha', () => {
    const out = r.swe(['checkpoint', '001-one', '--file', r.writeCp()]);
    assert.match(out, /checkpoint 1 recorded/);
    const cp = readFileSync(join(r.dir, 'missions/001-one/checkpoints/001-checkpoint.md'), 'utf8');
    assert.match(cp, /current sha: [0-9a-f]{40}/);
    assert.match(cp, /NEXT EXACT ACTION/);
    assert.equal(r.state('001-one').checkpoints.length, 1);
  });
}

/* 5. verify runs allowlisted commands, records results */
{
  const r = makeRepo();
  r.addMission('001-one', ['node tests/ok.mjs', 'npm run green']);
  r.swe(['start']);
  check('verify PASS recorded with sha', () => {
    const out = r.swe(['verify', '001-one']);
    assert.match(out, /verification PASS/);
    const v = r.state('001-one').verifications.at(-1);
    assert.equal(v.ok, true);
    assert.equal(v.results.length, 2);
    assert.equal(v.sha, r.g(['rev-parse', 'HEAD']));
  });
}

/* 6. finish gates on green verify covering HEAD */
{
  const r = makeRepo();
  r.addMission('001-one');
  r.swe(['start']);
  check('finish refused without any verification', () =>
    assert.match(r.swe(['finish', '001-one'], { ok: false }), /no verification/i));
  r.swe(['verify', '001-one']);
  r.g(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-qm', 'post-verify work']);
  check('finish refused when HEAD moved after verify', () =>
    assert.match(r.swe(['finish', '001-one'], { ok: false }), /HEAD moved/i));
  r.swe(['verify', '001-one']);
  check('finish DONE after green verify on HEAD + REPORT.md written', () => {
    const out = r.swe(['finish', '001-one']);
    assert.match(out, /DONE/);
    const report = readFileSync(join(r.dir, 'missions/001-one/REPORT.md'), 'utf8');
    assert.match(report, /status: \*\*DONE\*\*/);
    assert.match(report, /Verification runs \(2\)/);
    assert.match(report, /Acceptance criteria/);
  });
}

/* 7. red verify can never produce DONE */
{
  const r = makeRepo();
  r.addMission('001-one', ['node tests/fail.mjs']);
  r.swe(['start']);
  const vout = r.swe(['verify', '001-one'], { ok: false });
  check('verify FAIL exits nonzero and is recorded', () => {
    assert.match(vout, /verification FAIL/);
    assert.equal(r.state('001-one').verifications.at(-1).ok, false);
  });
  check('finish refused after red verify', () =>
    assert.match(r.swe(['finish', '001-one'], { ok: false }), /last verification FAILED/i));
  check('finish --result failed still allowed + report', () => {
    const out = r.swe(['finish', '001-one', '--result', 'failed']);
    assert.match(out, /FAILED/);
    assert.equal(r.state('001-one').status, 'FAILED');
  });
}

/* 8. blocked → checkpoint → resume flow */
{
  const r = makeRepo();
  r.addMission('001-one');
  r.swe(['start']);
  r.swe(['checkpoint', '001-one', '--file', r.writeCp(), '--blocked']);
  check('blocked checkpoint sets BLOCKED', () =>
    assert.equal(r.state('001-one').status, 'BLOCKED'));
  check('resume prints packet + unblocks', () => {
    const out = r.swe(['resume']);
    assert.match(out, /RESUME: mission '001-one'/);
    assert.match(out, /NEXT EXACT ACTION/);
    assert.match(out, /run node tests\/ok\.mjs/);
    assert.match(out, /unblocked/);
    assert.equal(r.state('001-one').status, 'RUNNING');
  });
}

/* 9. verification command allowlist enforced at mission load */
{
  const r = makeRepo();
  r.addMission('001-evil', ['rm -rf /', 'node tests/ok.mjs']);
  check('non-allowlisted verification command rejected', () =>
    assert.match(r.swe(['start', '001-evil'], { ok: false }), /not allowlisted/i));
  r.addMission('002-missing', ['node tests/nope.mjs']);
  check('verification on missing file rejected', () =>
    assert.match(r.swe(['start', '002-missing'], { ok: false }), /missing file/i));
  r.addMission('003-badscript', ['npm run nonexistent']);
  check('verification on unknown npm script rejected', () =>
    assert.match(r.swe(['start', '003-badscript'], { ok: false }), /unknown npm script/i));
}

/* 10. resume auto-picks the only active mission; dirty warnings shown */
{
  const r = makeRepo();
  r.addMission('001-one');
  r.swe(['start']);
  r.swe(['checkpoint', '001-one', '--file', r.writeCp()]);
  writeFileSync(join(r.dir, 'tests/ok.mjs'), 'process.exit(0) // dirty\n');
  check('resume warns on uncommitted tracked changes', () =>
    assert.match(r.swe(['resume']), /uncommitted tracked changes: tests\/ok\.mjs/));
}

/* 11. terminal missions are immutable */
{
  const r = makeRepo();
  r.addMission('001-one');
  r.swe(['start']);
  r.swe(['verify', '001-one']);
  r.swe(['finish', '001-one']);
  check('checkpoint on DONE mission refused', () =>
    assert.match(r.swe(['checkpoint', '001-one', '--file', r.writeCp()], { ok: false }), /terminal/i));
  check('second finish refused', () =>
    assert.match(r.swe(['finish', '001-one'], { ok: false }), /already DONE/));
}

console.log(`\nswe-factory: ${results.length} checks — PASS`);
results.forEach((r) => console.log('  ' + r.split('\n')[0]));
