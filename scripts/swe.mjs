#!/usr/bin/env node
/*
 * SWE work factory V1 (issue #62, missions/README.md).
 *
 * Repository-local mission orchestration for long autonomous engineering
 * sessions. One non-terminal mission at a time; state lives in plain
 * artifacts under missions/<id>/ so a fresh session can reconstruct
 * everything without conversational memory.
 *
 * Lifecycle: QUEUED → RUNNING → VERIFYING → DONE / FAILED / BLOCKED.
 *
 * Commands: status | start | checkpoint | verify | finish | resume
 *   node scripts/swe.mjs status [id]
 *   node scripts/swe.mjs start [id]
 *   node scripts/swe.mjs checkpoint <id> --file <md> [--blocked]
 *   node scripts/swe.mjs verify <id>
 *   node scripts/swe.mjs finish <id> [--result done|failed] [--summary <md>]
 *   node scripts/swe.mjs resume [id]
 *
 * Env overrides (tests): SWE_REPO (repo root), SWE_HOME (missions dir).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const STATUSES = ['QUEUED', 'RUNNING', 'VERIFYING', 'DONE', 'FAILED', 'BLOCKED'];
const TERMINAL = new Set(['DONE', 'FAILED']);

const CHECKPOINT_SECTIONS = [
  'MISSION OBJECTIVE',
  'CURRENT STATE',
  'PROVEN FACTS',
  'CHANGES MADE',
  'CURRENT TEST STATUS',
  'CURRENT HYPOTHESIS',
  'OPEN PROBLEMS',
  'IMPORTANT FILES',
  'NEXT EXACT ACTION',
  'CURRENT SHA'
];

const MISSION_SECTIONS = [
  'OBJECTIVE',
  'WHY',
  'INVARIANTS',
  'IN SCOPE',
  'OUT OF SCOPE',
  'ACCEPTANCE CRITERIA',
  'VERIFICATION',
  'BROWSER VERIFICATION',
  'SAFETY CONSTRAINTS',
  'STOP CONDITIONS',
  'REPORT FORMAT'
];

const die = (msg) => {
  console.error(`swe: ${msg}`);
  process.exit(2);
};

const now = () => new Date().toISOString();

/* ── Repo discovery ──────────────────────────────────────────── */
const findRepoRoot = () => {
  if (process.env.SWE_REPO) return resolve(process.env.SWE_REPO);
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8'
    }).trim();
  } catch {
    die('not inside a git repository');
  }
};

const REPO = findRepoRoot();
const MISSIONS = process.env.SWE_HOME
  ? resolve(process.env.SWE_HOME)
  : join(REPO, 'missions');

const git = (args, { trim = true } = {}) => {
  const out = execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
  return trim ? out.trim() : out;
};

const headSha = () => git(['rev-parse', 'HEAD']);
const branch = () => git(['rev-parse', '--abbrev-ref', 'HEAD']);
const shortSha = () => git(['rev-parse', '--short', 'HEAD']);

/*
 * Dirty-tree policy: a mission may not start on top of unrelated human
 * work. Tracked modifications are always fatal. Untracked paths are
 * fatal except the factory's own state dir and dependency dirs (their
 * contents can never be human work the mission would overwrite).
 */
const UNTRACKED_ALLOWED = /^missions\/|^node_modules$/;
const dirtyTree = () => {
  // --porcelain lines are 'XY <path>' — the X/Y columns are positional,
  // so the output must NOT be trimmed (leading space of an unstaged file
  // is its X column).
  const lines = git(['status', '--porcelain'], { trim: false })
    .split('\n')
    .filter(Boolean);
  const tracked = [];
  const untracked = [];
  for (const line of lines) {
    const file = line.slice(3);
    if (line.startsWith('??')) {
      if (!UNTRACKED_ALLOWED.test(file)) untracked.push(file);
    } else {
      tracked.push(file);
    }
  }
  return { tracked, untracked, clean: tracked.length === 0 && untracked.length === 0 };
};

/* ── Mission loading ─────────────────────────────────────────── */
const missionDir = (id) => join(MISSIONS, id);
const missionFile = (id) => join(missionDir(id), 'mission.md');
const stateFile = (id) => join(missionDir(id), 'state.json');

const missionIds = () => {
  if (!existsSync(MISSIONS)) return [];
  return readdirSync(MISSIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(MISSIONS, d.name, 'mission.md')))
    .map((d) => d.name)
    .sort();
};

const hasSection = (body, name) =>
  new RegExp(`^##\\s+${name.replace(/ /g, '\\s+')}\\s*$`, 'mi').test(body);

/*
 * Verification commands are allowlisted shapes only — a mission file can
 * never cause arbitrary shell execution:
 *   npm run <existing-script>
 *   node tests/<existing-file>.mjs|.js
 *   node scripts/<existing-file>.mjs|.js
 */
const pkgScripts = () => JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts || {};

const checkVerifyCmd = (cmd) => {
  let m = cmd.match(/^npm run ([a-zA-Z0-9:_-]+)$/);
  if (m) {
    if (!(m[1] in pkgScripts())) return `unknown npm script '${m[1]}'`;
    return null;
  }
  m = cmd.match(/^node (tests|scripts)\/([a-zA-Z0-9_.-]+\.(?:mjs|js))$/);
  if (m) {
    if (!existsSync(join(REPO, m[1], m[2]))) return `missing file '${m[1]}/${m[2]}'`;
    return null;
  }
  return `command not allowlisted: '${cmd}'`;
};

const loadMission = (id) => {
  const file = missionFile(id);
  if (!existsSync(file)) die(`mission '${id}' not found (${file})`);
  const raw = readFileSync(file, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fm) die(`mission '${id}': missing JSON frontmatter (see missions/TEMPLATE.md)`);
  let meta;
  try {
    meta = JSON.parse(fm[1]);
  } catch (e) {
    die(`mission '${id}': frontmatter is not valid JSON — ${e.message}`);
  }
  if (meta.id && meta.id !== id) die(`mission '${id}': frontmatter id '${meta.id}' does not match directory name`);
  const body = fm[2];
  const missingSections = MISSION_SECTIONS.filter((s) => !hasSection(body, s));
  if (missingSections.length)
    die(`mission '${id}': missing required sections: ${missingSections.join(', ')}`);
  if (!Array.isArray(meta.verification) || meta.verification.length === 0)
    die(`mission '${id}': frontmatter needs a non-empty "verification" array`);
  for (const cmd of meta.verification) {
    const err = checkVerifyCmd(cmd);
    if (err) die(`mission '${id}': verification ${err}`);
  }
  return { id, meta, body, file };
};

const loadState = (id) =>
  existsSync(stateFile(id)) ? JSON.parse(readFileSync(stateFile(id), 'utf8')) : null;

const saveState = (id, state) => {
  state.currentSha = headSha();
  writeFileSync(stateFile(id), JSON.stringify(state, null, 2) + '\n');
};

const statusOf = (id) => loadState(id)?.status ?? 'QUEUED';

const nonTerminal = () =>
  missionIds().filter((id) => {
    const s = loadState(id);
    return s && !TERMINAL.has(s.status);
  });

const recordCommand = (state, type, detail = '') =>
  state.commands.push({ at: now(), type, detail });

const commitsSince = (startSha) =>
  git(['log', '--oneline', `${startSha}..HEAD`])
    .split('\n')
    .filter(Boolean);

const filesChangedSince = (startSha) =>
  git(['diff', '--name-status', `${startSha}..HEAD`])
    .split('\n')
    .filter(Boolean);

/* ── Commands ────────────────────────────────────────────────── */
const pickMission = (id, { wantQueued = false, wantActive = false } = {}) => {
  if (id) return id;
  const candidates = wantQueued
    ? missionIds().filter((m) => !loadState(m))
    : wantActive
      ? nonTerminal()
      : missionIds();
  if (candidates.length === 0) die('no matching mission found');
  if (candidates.length > 1)
    die(`multiple missions match — pass an id: ${candidates.join(', ')}`);
  return candidates[0];
};

const cmdStatus = (id) => {
  if (id) {
    const m = loadMission(id);
    const s = loadState(id);
    console.log(`mission ${m.id} — ${statusOf(id)}`);
    console.log(`  objective : ${(m.meta.objective || '').trim()}`);
    if (s) {
      console.log(`  branch    : ${s.startBranch}`);
      console.log(`  start sha : ${s.startSha.slice(0, 12)}`);
      console.log(`  current   : ${s.currentSha.slice(0, 12)}`);
      console.log(`  checkpoints: ${s.checkpoints.length}`);
      const v = s.verifications.at(-1);
      console.log(`  last verify: ${v ? `${v.ok ? 'PASS' : 'FAIL'} @ ${v.sha.slice(0, 12)}` : 'never'}`);
      if (s.result) console.log(`  result    : ${s.result.status} — ${s.result.summary || '(no summary)'}`);
    }
    return;
  }
  const ids = missionIds();
  if (!ids.length) return console.log('no missions in', MISSIONS);
  for (const m of ids) {
    const s = loadState(m);
    const v = s?.verifications.at(-1);
    console.log(
      `${statusOf(m).padEnd(9)} ${m.padEnd(28)} cps:${String(s?.checkpoints.length ?? 0).padStart(2)}  verify:${v ? (v.ok ? 'PASS' : 'FAIL') : '—'}`
    );
  }
};

const cmdStart = (id) => {
  id = pickMission(id, { wantQueued: true });
  const mission = loadMission(id);
  const existing = loadState(id);
  if (existing) die(`mission '${id}' already has state (${existing.status}) — use resume`);
  const active = nonTerminal();
  if (active.length)
    die(`refusing: mission '${active[0]}' is ${statusOf(active[0])} — V1 runs one mission at a time`);

  const dirty = dirtyTree();
  if (!dirty.clean) {
    const parts = [];
    if (dirty.tracked.length)
      parts.push(`tracked modifications: ${dirty.tracked.join(', ')}`);
    if (dirty.untracked.length)
      parts.push(`untracked files: ${dirty.untracked.join(', ')}`);
    die(
      `refusing unsafe start — working tree is not clean (${parts.join('; ')}). ` +
        `Commit, stash or remove unrelated work first.`
    );
  }

  const state = {
    id,
    status: 'RUNNING',
    startedAt: now(),
    finishedAt: null,
    startSha: headSha(),
    startBranch: branch(),
    currentSha: headSha(),
    checkpoints: [],
    commands: [],
    verifications: [],
    knownFailures: [],
    browserVerification: mission.meta.browserVerification ?? null,
    result: null
  };
  mkdirSync(join(missionDir(id), 'checkpoints'), { recursive: true });
  mkdirSync(join(missionDir(id), 'logs'), { recursive: true });
  recordCommand(state, 'start', `${state.startBranch}@${state.startSha.slice(0, 12)}`);
  saveState(id, state);
  console.log(`mission '${id}' RUNNING on ${state.startBranch}@${shortSha()}`);
  console.log(`objective: ${mission.meta.objective || '(see mission.md)'}`);
  console.log('next: work the mission; `swe:checkpoint` early and often.');
};

const cmdCheckpoint = (id, args) => {
  const file = args.file ?? die(`checkpoint needs --file <path>`);
  const s = loadState(id) ?? die(`mission '${id}' has no state — start it first`);
  if (TERMINAL.has(s.status)) die(`mission '${id}' is ${s.status} — terminal`);
  const src = resolve(file);
  if (!existsSync(src)) die(`checkpoint file not found: ${src}`);
  const body = readFileSync(src, 'utf8');
  const missing = CHECKPOINT_SECTIONS.filter((sec) => !hasSection(body, sec));
  if (missing.length)
    die(`checkpoint missing sections: ${missing.join(', ')}`);

  const n = s.checkpoints.length + 1;
  const name = `${String(n).padStart(3, '0')}-checkpoint.md`;
  const dirty = dirtyTree();
  const commits = commitsSince(s.startSha);
  const stamp = [
    `<!-- stamped by swe:checkpoint -->`,
    `- checkpoint: ${n}`,
    `- at: ${now()}`,
    `- mission: ${id}`,
    `- status: ${args.blocked ? 'BLOCKED' : s.status}`,
    `- current sha: ${headSha()} (${branch()})`,
    `- start sha: ${s.startSha}`,
    `- commits since start: ${commits.length ? commits.join(' | ') : 'none'}`,
    `- dirty tracked files: ${dirty.tracked.length ? dirty.tracked.join(', ') : 'none'}`,
    `---`,
    ``
  ].join('\n');
  writeFileSync(join(missionDir(id), 'checkpoints', name), stamp + body);

  s.checkpoints.push({ n, file: `checkpoints/${name}`, at: now(), sha: headSha() });
  if (args.blocked) s.status = 'BLOCKED';
  recordCommand(s, 'checkpoint', `cp ${n}${args.blocked ? ' (blocked)' : ''}`);
  saveState(id, s);
  console.log(`checkpoint ${n} recorded for '${id}' @ ${shortSha()}${args.blocked ? ' — mission BLOCKED' : ''}`);
};

const cmdVerify = (id) => {
  const mission = loadMission(id);
  const s = loadState(id) ?? die(`mission '${id}' has no state — start it first`);
  if (TERMINAL.has(s.status)) die(`mission '${id}' is ${s.status} — terminal`);

  // VERIFYING is observable in state.json while the run is in flight; a
  // crash mid-verify leaves the status visible for resume to diagnose.
  s.status = 'VERIFYING';
  saveState(id, s);

  const sha = headSha();
  const results = [];
  for (const cmd of mission.meta.verification) {
    const argv = cmd.split(' ');
    const t0 = Date.now();
    const run = spawnSync(argv[0], argv.slice(1), {
      cwd: REPO,
      encoding: 'utf8',
      timeout: 30 * 60 * 1000
    });
    const logName = `logs/verify-${Date.now()}-${results.length}.log`;
    writeFileSync(
      join(missionDir(id), logName),
      `$ ${cmd}\n\n${run.stdout ?? ''}\n${run.stderr ?? ''}`
    );
    const exitCode = run.status ?? -1;
    results.push({ cmd, exitCode, ok: exitCode === 0, ms: Date.now() - t0, log: logName });
    console.log(`  ${exitCode === 0 ? 'PASS' : 'FAIL'} ${cmd} (${exitCode}) → ${logName}`);
  }

  const ok = results.every((r) => r.ok);
  s.verifications.push({ at: now(), sha, ok, results });
  s.status = 'RUNNING';
  recordCommand(s, 'verify', ok ? 'PASS' : 'FAIL');
  saveState(id, s);
  console.log(`verification ${ok ? 'PASS' : 'FAIL'} for '${id}' @ ${sha.slice(0, 12)}`);
  if (!ok) process.exitCode = 1;
};

const cmdFinish = (id, args) => {
  const mission = loadMission(id);
  const s = loadState(id) ?? die(`mission '${id}' has no state — start it first`);
  if (TERMINAL.has(s.status)) die(`mission '${id}' is already ${s.status}`);
  const wanted = args.result ?? 'done';
  if (!['done', 'failed'].includes(wanted)) die(`--result must be done|failed`);

  if (wanted === 'done') {
    const v = s.verifications.at(-1);
    if (!v) die(`refusing DONE: no verification was ever run — run swe:verify`);
    if (!v.ok) die(`refusing DONE: last verification FAILED — fix and re-verify, or finish --result failed`);
    if (v.sha !== headSha())
      die(
        `refusing DONE: HEAD moved since last green verify (${v.sha.slice(0, 12)} → ${headSha().slice(0, 12)}). ` +
          `Verification must cover the final state — run swe:verify again.`
      );
  }

  const status = wanted === 'done' ? 'DONE' : 'FAILED';
  const summary = args.summary && existsSync(resolve(args.summary))
    ? readFileSync(resolve(args.summary), 'utf8').trim()
    : '';
  s.status = status;
  s.finishedAt = now();
  s.result = { status: wanted, summary: summary.split('\n')[0] || null };
  recordCommand(s, 'finish', wanted);
  saveState(id, s);

  const commits = commitsSince(s.startSha);
  const files = filesChangedSince(s.startSha);
  const section = (name) => {
    const m = mission.body.match(new RegExp(`^##\\s+${name.replace(/ /g, '\\s+')}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\s*$)`, 'mi'));
    return m ? m[1].trim() : '(not declared)';
  };
  const report = `# Mission report: ${id}

- status: **${status}**
- mission: \`missions/${id}/mission.md\`
- started: ${s.startedAt}
- finished: ${s.finishedAt}
- branch: ${s.startBranch}
- starting sha: \`${s.startSha}\`
- ending sha: \`${headSha()}\`

## Objective
${mission.meta.objective || section('OBJECTIVE')}

## Commits (${commits.length})
${commits.length ? commits.map((c) => `- \`${c}\``).join('\n') : '- (none)'}

## Files changed vs start (${files.length})
${files.length ? files.map((f) => `- \`${f}\``).join('\n') : '- (none)'}

## Verification runs (${s.verifications.length})
${s.verifications
  .map(
    (v) =>
      `- ${v.at} @ \`${v.sha.slice(0, 12)}\` — **${v.ok ? 'PASS' : 'FAIL'}**\n${v.results
        .map((r) => `  - \`${r.cmd}\` → exit ${r.exitCode} (${r.log})`)
        .join('\n')}`
  )
  .join('\n') || '- (none)'}

## Commands executed (${s.commands.length})
${s.commands.map((c) => `- ${c.at} ${c.type}${c.detail ? `: ${c.detail}` : ''}`).join('\n')}

## Checkpoints (${s.checkpoints.length})
${s.checkpoints.map((c) => `- #${c.n} ${c.at} @ \`${c.sha.slice(0, 12)}\` — ${c.file}`).join('\n') || '- (none)'}

## Acceptance criteria
${section('ACCEPTANCE CRITERIA')}

## Known failures
${s.knownFailures.length ? s.knownFailures.map((f) => `- ${f}`).join('\n') : '- (none recorded)'}

## Browser verification
${mission.meta.browserVerification ? mission.meta.browserVerification : 'not required'}

## Final result
${summary || (wanted === 'done' ? 'Completed; required verification green on ending SHA.' : 'Marked FAILED — see checkpoints for history.')}
`;
  writeFileSync(join(missionDir(id), 'REPORT.md'), report);
  console.log(`mission '${id}' → ${status}; report: missions/${id}/REPORT.md`);
};

const cmdResume = (id) => {
  id = pickMission(id, { wantActive: true });
  const mission = loadMission(id);
  const s = loadState(id) ?? die(`mission '${id}' has no state`);

  const dirty = dirtyTree();
  const commits = commitsSince(s.startSha);
  const lastCp = s.checkpoints.at(-1);
  const v = s.verifications.at(-1);

  console.log(`═══ RESUME: mission '${id}' (${s.status}) ═══`);
  console.log(`objective : ${mission.meta.objective || '(see mission.md)'}`);
  console.log(`branch    : ${s.startBranch}   start sha: ${s.startSha.slice(0, 12)}   HEAD: ${headSha().slice(0, 12)}`);
  console.log(`commits since start: ${commits.length}${commits.length ? ` — ${commits.join(' | ')}` : ''}`);
  console.log(`checkpoints: ${s.checkpoints.length}   verifications: ${s.verifications.length}` +
    (v ? `   last verify: ${v.ok ? 'PASS' : 'FAIL'} @ ${v.sha.slice(0, 12)}` : ''));
  console.log(`mission definition: missions/${id}/mission.md`);

  const warnings = [];
  if (s.status === 'VERIFYING')
    warnings.push('last run died mid-VERIFY — rerun `swe:verify` before trusting test status');
  if (v && v.sha !== headSha())
    warnings.push(`HEAD moved since last verify (${v.sha.slice(0, 12)} → ${headSha().slice(0, 12)}) — verify again before finish`);
  if (dirty.tracked.length)
    warnings.push(`uncommitted tracked changes: ${dirty.tracked.join(', ')}`);
  if (dirty.untracked.length)
    warnings.push(`untracked files outside missions/: ${dirty.untracked.join(', ')}`);
  if (warnings.length) console.log(`warnings:\n${warnings.map((w) => `  ! ${w}`).join('\n')}`);

  if (lastCp) {
    const cpPath = join(missionDir(id), lastCp.file);
    console.log(`\n── latest checkpoint (#${lastCp.n}, ${lastCp.at}) ──\n`);
    if (existsSync(cpPath)) console.log(readFileSync(cpPath, 'utf8').trim());
    else console.log(`(checkpoint file missing: ${cpPath})`);
  } else {
    console.log('\n(no checkpoints yet — write one before relying on resume)');
  }

  if (s.status === 'BLOCKED') {
    s.status = 'RUNNING';
    recordCommand(s, 'resume', 'unblocked');
    saveState(id, s);
    console.log(`\nmission unblocked → RUNNING`);
  }
};

/* ── Arg parsing + dispatch ──────────────────────────────────── */
const parseFlags = (argv) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--blocked') args.blocked = true;
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--result') args.result = argv[++i];
    else if (a === '--summary') args.summary = argv[++i];
    else if (a.startsWith('--')) die(`unknown flag: ${a}`);
    else args._.push(a);
  }
  return args;
};

const [cmd, ...rest] = process.argv.slice(2);
const args = parseFlags(rest);
const id = args._[0];

switch (cmd) {
  case 'status': cmdStatus(id); break;
  case 'start': cmdStart(id); break;
  case 'checkpoint': cmdCheckpoint(id ?? die('checkpoint needs a mission id'), args); break;
  case 'verify': cmdVerify(id ?? die('verify needs a mission id')); break;
  case 'finish': cmdFinish(id ?? die('finish needs a mission id'), args); break;
  case 'resume': cmdResume(id); break;
  default:
    console.log(`usage: node scripts/swe.mjs <status|start|checkpoint|verify|finish|resume> [id] [flags]
  status [id]                 list missions or detail one
  start [id]                  QUEUED → RUNNING (auto-picks if exactly one is queued)
  checkpoint <id> --file <md> record checkpoint [--blocked]
  verify <id>                 run the mission's required project checks
  finish <id> [--result done|failed] [--summary <md>]   write REPORT.md
  resume [id]                 print resumable context packet (auto-picks the active mission)`);
    process.exit(cmd ? 2 : 0);
}
