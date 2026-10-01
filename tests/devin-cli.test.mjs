/*
 * Devin CLI operating-contract tests (.devin/, scripts/devin-guard.mjs).
 *
 * Covers the committed agent surface as a contract:
 *   - the PreToolUse guard blocks the dangerous-command matrix and
 *     allows the safe-command matrix (synthetic hook payloads — nothing
 *     here ever executes a real deploy/reset/push);
 *   - committed JSON config parses and matches the CLI's schema;
 *   - every skill has valid frontmatter and the intended triggers;
 *   - every custom subagent has its intended restrictive tool profile;
 *   - no secrets or machine-local files are committed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = new URL('..', import.meta.url).pathname;
const GUARD = join(ROOT, 'scripts/devin-guard.mjs');
const DEVIN_DIR = join(ROOT, '.devin');

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (err) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${err.message.split('\n')[0]}`);
  }
}

function parseFrontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(m, `${file}: missing frontmatter block`);
  const fields = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*?)\s*$/);
    if (item && listKey) {
      fields[listKey].push(item[1]);
    } else if (kv) {
      if (kv[2] === '') {
        fields[kv[1]] = [];
        listKey = kv[1];
      } else {
        fields[kv[1]] = kv[2];
        listKey = null;
      }
    }
  }
  return fields;
}

function runGuard(toolInput) {
  const payload = { hook_event_name: 'PreToolUse', tool_name: 'exec', tool_input: toolInput };
  return spawnSync('node', [GUARD], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, DEVIN_PROJECT_DIR: ROOT }
  });
}

// --- Guard matrices -------------------------------------------------

const DANGEROUS = [
  'git push --force origin feature',
  'git push -f',
  'git push --force-with-lease',
  'git push --force-if-includes',
  'git push -uf origin feature',
  'git push origin main',
  'git push origin HEAD:main',
  'git push --delete origin main',
  'git push origin :main',
  'git reset --hard',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git clean -fdx',
  'git clean --force',
  'git checkout -- .',
  'git checkout .',
  'git checkout -f feature',
  'git switch --discard-changes',
  'git restore .',
  'git restore --worktree src',
  'git branch -D main',
  'git branch -D master',
  'git filter-branch --all',
  'git filter-repo',
  'git update-ref -d refs/heads/main',
  'rm -rf /',
  'rm -rf /*',
  'rm -rf ~',
  'rm -rf "$HOME"',
  'rm -rf "$HOME/.config"',
  'rm -rf .',
  'rm -rf ..',
  'rm -rf *',
  'rm -rf /etc/nginx',
  'rm -rf /usr/lib',
  'rm --no-preserve-root -rf /',
  'rm -rf',
  'firebase deploy',
  'firebase deploy --only hosting',
  'firebase deploy --only firestore:rules --project flashday-22ae1',
  'npx firebase-tools deploy',
  'npx --yes firebase-tools@15.30.2 deploy',
  'firebase hosting:channel:deploy live',
  'vercel --prod',
  'vercel deploy --prod',
  'vercel --production',
  'vercel promote',
  'npx vercel --prod',
  'gh pr merge 42',
  'gh pr merge --squash --auto',
  'sudo apt-get install x',
  'sudo rm -rf /var/x',
  'bash -c "git push --force"',
  "sh -c 'rm -rf /'",
  'eval "firebase deploy"',
  'env -u DEBUG git push --force origin main',
  'timeout 60 git push -f',
  'nice -n 5 rm -rf ~',
  'mkfs.ext4 /dev/sda1',
  'dd if=/dev/zero of=/dev/sda',
  'git status && rm -rf /',
  'npm test; firebase deploy',
  'git commit -m x && git push --force',
  // Executable-path and git-global-option evasions (OPS-CLI-001 review).
  '/usr/bin/git push --force origin feature',
  '/bin/rm -rf /',
  '/usr/bin/rm -rf ~',
  'env F=1 /usr/bin/git push --force',
  'git -C . push --force',
  'git --no-pager push --force origin feature',
  'git -c protocol.version=2 push -f',
  'git --git-dir /tmp/x push --force',
  // '+'-prefixed refspecs force the update just like --force.
  'git push origin +HEAD',
  'git push origin +HEAD:main',
  'git push origin +refs/heads/feature:refs/heads/feature',
  // Recursive rm against repo-owned work (generated dirs excepted).
  'rm -rf .git',
  'rm -rf .git/objects',
  'rm .git/HEAD',
  'rm -rf src',
  'rm -rf src/components/x',
  'rm -rf .devin',
  'rm -rf tests/unit',
  'rm -rf package.json',
  'rm -rf ../other-project/build',
  // Quoted dangerous payloads are recursively evaluated: a quoted string
  // is indistinguishable from `bash -c "…"` at text level, so these
  // block by design (documented conservative choice).
  'echo "firebase deploy"',
  'echo "git push --force"',
  'echo "rm -rf /"'
];

const SAFE = [
  'git status',
  'git diff --staged',
  'git log --oneline -5',
  'git show HEAD',
  'git push -u origin feature-x',
  'git push origin devin/m008h',
  'git push --delete origin stale-feature',
  'git fetch origin',
  'git reset --soft HEAD~1',
  'git clean -n',
  'git checkout -b feature',
  'git checkout main',
  'git switch feature',
  'git restore --staged src/x.js',
  'git branch -d merged-feature',
  'git commit -m "msg"',
  'git rebase main',
  'git merge feature',
  'rm dist/file.js',
  'rm -rf dist',
  'rm -rf node_modules/.vite',
  'rm -rf /tmp/flashday-test-x',
  'rm -r build/out',
  // Feature-branch refspecs whose names merely contain 'main' — the
  // protected-branch rule matches the refspec destination exactly.
  'git push origin feature/main-fix',
  'git push origin main:feature-copy',
  'git push -o ci.skip origin feature',
  'git push --push-option=ci.skip origin feature',
  'git push origin --delete feature',
  // Git global options before the subcommand.
  'git -C . status',
  'git --no-pager log -5',
  'git -c core.pager=cat diff',
  // Non-recursive file rm and generated-dir cleanups.
  'rm -f src/old-file.ts',
  'rm -rf ./build',
  'rm -rf coverage',
  'firebase emulators:exec --project demo-flashday-test --only firestore "node tests/x.mjs"',
  'env -u DEBUG npx --yes --package=firebase-tools@15.30.2 firebase emulators:exec --project demo-flashday-test --only firestore "node tests/firestore-emulator.test.mjs"',
  'vercel deploy',
  'vercel ls',
  'gh pr view 42',
  'gh pr checks 42',
  'gh pr create --title x --body y',
  'gh pr diff 42',
  'gh auth status',
  'npm run verify',
  'npm run verify:full',
  'npm test',
  'npm run test:firestore',
  'node tests/devin-cli.test.mjs',
  'echo git push --force',
  'git log | grep firebase',
  'ls -la && cat package.json'
];

for (const cmd of DANGEROUS) {
  test(`guard blocks: ${cmd}`, () => {
    const r = runGuard({ command: cmd });
    assert.equal(r.status, 2, `expected exit 2, got ${r.status} (${r.stdout.trim()})`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, 'block');
    assert.ok(out.reason && out.reason.length > 10);
  });
}

for (const cmd of SAFE) {
  test(`guard allows: ${cmd}`, () => {
    const r = runGuard({ command: cmd });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status} (${r.stdout.trim()} ${r.stderr.trim()})`);
  });
}

test('guard allows malformed/empty payloads', () => {
  for (const input of ['not json', '{}', '{"tool_input":{}}', '']) {
    const r = spawnSync('node', [GUARD], { input, encoding: 'utf8' });
    assert.equal(r.status, 0, `payload ${JSON.stringify(input)} should exit 0`);
  }
});

test('guard inspects write_to_process text_input and bytes_input', () => {
  const text = runGuard({ text_input: 'git push --force' });
  assert.equal(text.status, 2);
  const bytes = runGuard({ bytes_input: 'rm -rf /<CR>' });
  assert.equal(bytes.status, 2);
  const benign = runGuard({ bytes_input: '<C-c>' });
  assert.equal(benign.status, 0);
});

// --- Committed JSON config ------------------------------------------

test('.devin/config.json parses with only schema-known keys', () => {
  const cfg = JSON.parse(readFileSync(join(DEVIN_DIR, 'config.json'), 'utf8'));
  const allowedTop = new Set(['permissions', 'read_config_from', 'hooks']);
  for (const k of Object.keys(cfg)) assert.ok(allowedTop.has(k), `unexpected config key: ${k}`);
  const importers = ['agents_standard', 'cursor', 'windsurf', 'claude', 'copilot', 'opencode', 'vscode', 'zed'];
  assert.deepEqual(Object.keys(cfg.read_config_from).sort(), importers.sort());
  for (const v of Object.values(cfg.read_config_from)) assert.equal(v, true);
  for (const section of ['allow', 'ask', 'deny']) {
    assert.ok(Array.isArray(cfg.permissions[section]), `permissions.${section} must be an array`);
    for (const e of cfg.permissions[section]) assert.equal(typeof e, 'string');
  }
  // The exec/write_to_process hook cannot see MCP tool calls — merge,
  // deploy and direct-repo-mutation channels must be denied in config.
  for (const mcpDeny of [
    'mcp__github-mcp-server__merge_pull_request',
    'mcp__github-mcp-server__push_files',
    'mcp__github-mcp-server__create_or_update_file',
    'mcp__github-mcp-server__delete_file',
    'mcp__vercel__*',
    'mcp__supabase-mcp-server__*'
  ]) {
    assert.ok(cfg.permissions.deny.includes(mcpDeny), `permissions.deny missing ${mcpDeny}`);
  }
});

test('.devin/hooks.v1.json parses and wires the guard for exec', () => {
  const hooks = JSON.parse(readFileSync(join(DEVIN_DIR, 'hooks.v1.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.PreToolUse) && hooks.PreToolUse.length >= 1);
  const entry = hooks.PreToolUse[0];
  assert.ok(entry.matcher.includes('exec'), 'matcher must cover exec');
  assert.ok(Array.isArray(entry.hooks));
  const cmd = entry.hooks[0].command;
  assert.ok(cmd.includes('scripts/devin-guard.mjs'), 'hook must call the guard script');
  assert.ok(existsSync(GUARD), 'guard script must exist');
  assert.ok(entry.hooks[0].timeout >= 1 && entry.hooks[0].timeout <= 60);
});

// --- Skills ----------------------------------------------------------

const EXPECTED_SKILLS = {
  'flashday-mission': ['user'],
  'flashday-policy-review': ['user', 'model'],
  'verify-pr': ['user', 'model']
};

for (const [name, triggers] of Object.entries(EXPECTED_SKILLS)) {
  test(`skill ${name}: exists with valid frontmatter and triggers [${triggers}]`, () => {
    const file = join(DEVIN_DIR, 'skills', name, 'SKILL.md');
    assert.ok(existsSync(file), `${file} missing`);
    const fm = parseFrontmatter(file);
    assert.equal(fm.name, name);
    assert.ok(fm.description && fm.description.length > 20, 'needs a real description');
    assert.deepEqual(fm.triggers, triggers);
  });
}

test('no stray skills directories', () => {
  const dirs = readdirSync(join(DEVIN_DIR, 'skills')).sort();
  assert.deepEqual(dirs, Object.keys(EXPECTED_SKILLS).sort());
});

// Skills run inline with the session's full tool set (allowed-tools is
// auto-approval, not a restriction), so merge/deploy channels must be
// hard-denied via permissions.deny — the exec hook cannot see MCP calls.
const SKILL_DENIES = {
  'flashday-mission': ['mcp__github-mcp-server__merge_pull_request',
    'mcp__github-mcp-server__push_files', 'mcp__vercel__*'],
  'flashday-policy-review': ['edit',
    'mcp__github-mcp-server__merge_pull_request',
    'mcp__github-mcp-server__push_files', 'mcp__vercel__*'],
  'verify-pr': ['edit',
    'mcp__github-mcp-server__merge_pull_request',
    'mcp__github-mcp-server__push_files', 'mcp__vercel__*']
};

for (const [name, denies] of Object.entries(SKILL_DENIES)) {
  test(`skill ${name}: denies merge/deploy channels`, () => {
    const fm = parseFrontmatter(join(DEVIN_DIR, 'skills', name, 'SKILL.md'));
    for (const d of denies) {
      assert.ok((fm.permissions || []).includes(d), `${name} permissions.deny missing ${d}`);
    }
  });
}

// --- Custom subagents -------------------------------------------------

const EXPECTED_AGENTS = {
  'repo-researcher': ['glob', 'grep', 'read'],
  'adversarial-reviewer': ['exec', 'glob', 'grep', 'read'],
  'test-runner': ['exec', 'glob', 'grep', 'read']
};

for (const [name, tools] of Object.entries(EXPECTED_AGENTS)) {
  test(`subagent ${name}: restrictive tool profile`, () => {
    const file = join(DEVIN_DIR, 'agents', `${name}.md`);
    assert.ok(existsSync(file), `${file} missing`);
    const fm = parseFrontmatter(file);
    assert.equal(fm.name, name);
    assert.ok(fm.description && fm.description.length > 20);
    assert.deepEqual([...fm['allowed-tools']].sort(), tools);
    for (const t of fm['allowed-tools']) {
      assert.ok(!['edit', 'write', 'apply_patch'].includes(t), `${name} must not write`);
    }
    assert.ok(!('max-nesting' in fm), `${name} must not spawn nested subagents`);
    assert.ok(fm.model === undefined || typeof fm.model === 'string');
    assert.ok(!['subagent_explore', 'subagent_general'].includes(fm.name),
      'must not shadow a built-in profile');
  });
}

test('no stray subagent files', () => {
  const files = readdirSync(join(DEVIN_DIR, 'agents')).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(files.map((f) => f.replace(/\.md$/, '')), Object.keys(EXPECTED_AGENTS).sort());
});

// --- Secrets & local-file hygiene -------------------------------------

test('no secrets in committed .devin / guard / test / AGENTS surfaces', () => {
  const files = [join(ROOT, 'AGENTS.md'), GUARD, new URL(import.meta.url).pathname];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(DEVIN_DIR);
  const SECRET_RES = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /AIza[0-9A-Za-z_\-]{35}/,          // GCP/Firebase API key
    /ghp_[0-9A-Za-z]{36}/,             // GitHub PAT
    /github_pat_[0-9A-Za-z_]{22,}/,
    /xox[bapors]-[0-9A-Za-z-]{10,}/,   // Slack tokens
    /sk-[0-9A-Za-z]{20,}/,             // OpenAI-style key
    /ya29\.[0-9A-Za-z_\-]+/,           // Google OAuth access token
    /(?<![\w.])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ // JWT
  ];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const re of SECRET_RES) {
      assert.ok(!re.test(text), `secret-like value in ${f}: ${re}`);
    }
  }
});

test('local override files are gitignored and no env files are tracked', () => {
  const ignored = ['.devin/config.local.json', '.devin/mcp_config.local.json',
    '.devin/hooks.local.json', 'AGENTS.local.md', '.env', '.env.local'];
  for (const f of ignored) {
    try {
      execFileSync('git', ['check-ignore', f], { cwd: ROOT, stdio: 'pipe' });
    } catch {
      assert.fail(`${f} is not covered by .gitignore`);
    }
  }
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const bad = tracked.filter((f) =>
    /(^|\/)\.env(\.|$)/.test(f) || /\.devin\/.*\.local\.json$/.test(f) ||
    /serviceAccount.*\.json$/i.test(f) || /\.pem$/.test(f));
  assert.deepEqual(bad, [], `secret-shaped files tracked: ${bad.join(', ')}`);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
