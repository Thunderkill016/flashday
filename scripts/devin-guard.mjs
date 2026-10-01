/*
 * Devin CLI PreToolUse guard (see .devin/hooks.v1.json).
 *
 * Reads one hook payload as JSON on stdin:
 *   { "tool_name": "exec", "tool_input": { "command": "..." } }
 * (write_to_process payloads carry `text_input` / `bytes_input` instead.)
 *
 * Exit 0 = allow. Exit 2 = block, with {"decision":"block","reason":...}
 * on stdout. Malformed payloads and non-command inputs are allowed —
 * the hook engine and permission prompt remain the outer boundary.
 *
 * This script NEVER executes the inspected command. It is pure string
 * analysis, so tests/devin-cli.test.mjs exercises it with synthetic
 * payloads — do not "test" it by actually deploying anything.
 *
 * Known limits: it sees the literal command text only. A payload inside
 * a variable, a fetched script, or a remote shell argument the matcher
 * cannot statically see is out of reach — permission prompts and human
 * review cover that residual.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROJECT_DIR = process.env.DEVIN_PROJECT_DIR || process.cwd();
const PROTECTED_BRANCHES = /\b(?:main|master)\b/;
const MAX_DEPTH = 3;

// Words that launch another command — skipped when locating the real
// command, and allowed as the prefix of a rescan.
const WRAPPERS = /^(?:env|command|builtin|exec|nice|ionice|nohup|time|timeout|xargs|watch)$/;
const SHELLISH = /^(?:bash|sh|zsh|dash|fish|ksh|eval|source|\.|find|parallel|ssh)$/;
// Wrapper options that consume the following token (env -u DEBUG,
// timeout -k 5, xargs -I{}, ...). Conservative superset.
const WRAPPER_ARG_FLAGS = new Set([
  '-u', '-C', '-S', '-P', '-0', '-i',
  '--unset', '--chdir', '--split-string', '--ignore-signal',
  '--block-signal', '--default-signal', '--ignore-environment',
  '-k', '-s', '-t', '--kill-after', '--signal',
  '-n', '--adjustment', '-c', '-p',
  '-I', '-L', '-e', '-E', '-d', '--replace', '--max-lines',
  '--eof', '--delimiter', '--max-args', '-o'
]);

function segments(command) {
  return command.split(/\|\||&&|;|\||\n/).map((s) => s.trim()).filter(Boolean);
}

function tokens(segment) {
  // Quotes are kept on the token so multi-word quoted strings are
  // visible as one token — they get re-evaluated recursively.
  return segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
}

function stripQuotes(t) {
  return t.replace(/^(['"])([\s\S]*)\1$/, '$2');
}

// Consume leading launcher words plus their options/option-args and
// VAR= assignments; return the argv of the real command.
function unwrap(argv) {
  let i = 0;
  while (i < argv.length) {
    const head = stripQuotes(argv[i]);
    if (!WRAPPERS.test(head)) break;
    const w = head;
    i++;
    while (i < argv.length) {
      const x = stripQuotes(argv[i]);
      if (WRAPPER_ARG_FLAGS.has(x.split('=')[0])) { i += 2; continue; }
      if (/^-/.test(x) || /^[A-Za-z_]\w*=/.test(x)) { i++; continue; }
      if (w === 'timeout' && /^\d/.test(x)) { i++; continue; }
      break;
    }
  }
  return argv.slice(i);
}

// Is every token before index i launcher/inert shell syntax? Used to
// rescan "bash -c 'git push --force'" shapes without flagging
// "echo git push --force" (echo is a real command, not a wrapper).
function inertPrefix(argv, i) {
  for (let k = 0; k < i; k++) {
    const t = stripQuotes(argv[k]);
    if (WRAPPERS.test(t) || SHELLISH.test(t)) continue;
    if (/^-/.test(t) || /^[A-Za-z_]\w*=/.test(t)) continue;
    if (/^\\?;$/.test(t) || /^\d/.test(t)) continue;
    return false;
  }
  return true;
}

function flagInfo(args) {
  const shorts = new Set();
  const longs = new Set();
  const positional = [];
  let afterDashDash = false;
  for (const raw of args) {
    const t = stripQuotes(raw);
    if (t === '--' && !afterDashDash) {
      afterDashDash = true;
      continue;
    }
    if (!afterDashDash && /^--/.test(t)) {
      longs.add(t.replace(/=.*$/, ''));
    } else if (!afterDashDash && /^-[^-]/.test(t)) {
      for (const ch of t.slice(1)) shorts.add(ch);
    } else {
      positional.push(t);
    }
  }
  return { shorts, longs, positional };
}

function currentBranch() {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null; // detection failure must not break feature pushes
  }
}

function checkGit(args) {
  const sub = args[0] && stripQuotes(args[0]);
  const rest = args.slice(1);

  if (sub === 'push') {
    const { shorts, longs, positional } = flagInfo(rest);
    if (longs.has('--force') || longs.has('--force-with-lease') ||
        longs.has('--force-if-includes') || shorts.has('f')) {
      return 'git push --force rewrites remote history — never allowed';
    }
    if (positional.some((p) => PROTECTED_BRANCHES.test(p))) {
      return 'direct push to a protected branch (main/master) — open a PR instead';
    }
    const implicit = positional.length <= 1 ||
      positional.every((p) => /^(origin|upstream|HEAD)$/.test(p));
    if (implicit) {
      const br = currentBranch();
      if (br && PROTECTED_BRANCHES.test(br)) {
        return `current branch is '${br}' — a bare 'git push' would publish to it directly`;
      }
    }
    return null;
  }

  if (sub === 'reset' && flagInfo(rest).longs.has('--hard')) {
    return 'git reset --hard discards uncommitted work';
  }

  if (sub === 'clean') {
    const { shorts, longs } = flagInfo(rest);
    if (shorts.has('f') || longs.has('--force')) {
      return 'git clean -f permanently deletes untracked files';
    }
    return null;
  }

  if (sub === 'checkout' || sub === 'switch') {
    const { shorts, longs, positional } = flagInfo(rest);
    const discards = longs.has('--force') || longs.has('--discard-changes') ||
      shorts.has('f') ||
      positional.some((p) => p === '.' || p === '..') ||
      rest.some((r) => stripQuotes(r) === '--');
    if (discards) {
      return `git ${sub} with force/--/path targets discards uncommitted work`;
    }
    return null;
  }

  if (sub === 'restore') {
    const { shorts, longs } = flagInfo(rest);
    const staged = longs.has('--staged') || shorts.has('S');
    const worktree = longs.has('--worktree') || shorts.has('W');
    if (worktree || !staged) {
      return 'git restore without --staged discards uncommitted file changes';
    }
    return null;
  }

  if (sub === 'branch') {
    const { shorts, longs, positional } = flagInfo(rest);
    const forceDelete = shorts.has('D') || (longs.has('--delete') && longs.has('--force'));
    if (forceDelete && positional.some((p) => PROTECTED_BRANCHES.test(p))) {
      return 'force-deleting a protected branch destroys shared history';
    }
    return null;
  }

  if (sub === 'filter-branch' || sub === 'filter-repo') {
    return `git ${sub} rewrites repository history`;
  }

  if (sub === 'update-ref') {
    const idx = rest.indexOf('-d');
    if (idx >= 0 && /refs\/heads\/(main|master)\b/.test(rest[idx + 1] || '')) {
      return 'deleting the ref of a protected branch';
    }
    return null;
  }

  return null;
}

const EXACT_RM_TARGETS = new Set([
  '/', '/*', '~', '~/', '~/*', '.', './', './*', '..', '../', '../*', '*',
  '$HOME', '${HOME}', '$DEVIN_PROJECT_DIR', '${DEVIN_PROJECT_DIR}'
]);

function isDangerousRmTarget(t) {
  const c = stripQuotes(t);
  if (!c) return false;
  if (EXACT_RM_TARGETS.has(c)) return true;
  if (/^(~|\$\{?HOME\}?|\$\{?DEVIN_PROJECT_DIR\}?)\//.test(c)) return true;
  if (PROJECT_DIR && (c === PROJECT_DIR || c === PROJECT_DIR + '/')) return true;
  // System roots (absolute paths outside the project, incl. /home).
  return /^\/(bin|boot|dev|etc|home|lib|lib64|opt|proc|root|run|sbin|snap|srv|sys|usr|var)(\/.*)?$/.test(c);
}

function checkRm(args) {
  const { shorts, longs, positional } = flagInfo(args);
  if (longs.has('--no-preserve-root')) return 'rm --no-preserve-root targets the filesystem root';
  const recursive = shorts.has('r') || shorts.has('R') || longs.has('--recursive');
  if (!recursive) return null;
  if (positional.length === 0) return 'recursive rm with no resolvable target';
  if (positional.some(isDangerousRmTarget)) {
    return 'recursive rm against a repo/system/root path';
  }
  return null;
}

const HEAD_RULES = { git: checkGit, rm: checkRm };

const ANYWHERE_RULES = [
  [/\bfirebase(?:-tools)?(?:@[\w.~-]+)?\b/, (seg) =>
    /\bdeploy\b/.test(seg)
      ? 'firebase deploy mutates production (hosting/rules) — human-only action'
      : null],
  [/\bvercel\b/, (seg) =>
    /(--prod|--production|\bpromote\b)/.test(seg)
      ? 'vercel production deploy/promote — human-only action'
      : null],
  [/\bgh\s+pr\s+merge\b/, () => 'gh pr merge — the user is merge authority'],
  [/\bsudo\b/, () => 'sudo escalates privileges — not allowed from agent sessions'],
  [/\b(?:mkfs|fdisk|wipefs|shred)\b/, () => 'filesystem-destructive command'],
  [/\bdd\b[^|;&]*\bof=\/dev\//, () => 'dd writing to a device node'],
];

function scanArgv(argv) {
  const realArgv = unwrap(argv);
  const realHead = realArgv.length ? stripQuotes(realArgv[0]) : '';
  for (const [cmd, check] of Object.entries(HEAD_RULES)) {
    // Normal position: first real command after wrappers.
    if (realHead === cmd) {
      const reason = check(realArgv.slice(1));
      if (reason) return reason;
    }
    // Rescan: git/rm buried behind inert shell syntax
    // ("bash -c 'cmd'" is handled by quoted-token recursion instead).
    for (let i = 0; i < argv.length; i++) {
      if (stripQuotes(argv[i]) === cmd && inertPrefix(argv, i)) {
        const reason = check(argv.slice(i + 1));
        if (reason) return reason;
      }
    }
  }
  return null;
}

export function evaluate(command, depth = 0) {
  if (typeof command !== 'string' || !command.trim() || depth > MAX_DEPTH) return null;
  for (const seg of segments(command)) {
    const argv = tokens(seg);
    const headReason = scanArgv(argv);
    if (headReason) return headReason;
    for (const [re, check] of ANYWHERE_RULES) {
      if (re.test(seg)) {
        const reason = check(seg);
        if (reason) return reason;
      }
    }
    // Quoted command strings ("bash -c 'rm -rf /'") get re-evaluated.
    for (const tok of argv) {
      const inner = stripQuotes(tok);
      if (inner !== tok && /[\s|;&]/.test(inner)) {
        const reason = evaluate(inner, depth + 1);
        if (reason) return reason;
      }
    }
  }
  return null;
}

function extractCommand(payload) {
  const input = payload && payload.tool_input;
  if (!input || typeof input !== 'object') return '';
  const parts = [];
  if (typeof input.command === 'string') parts.push(input.command);
  if (typeof input.text_input === 'string') parts.push(input.text_input);
  if (typeof input.bytes_input === 'string') {
    // <CR>, <C-c>, ... notations are control keys, not command text.
    parts.push(input.bytes_input.replace(/<[A-Za-z][^>]*>/g, ' '));
  }
  return parts.join('\n');
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { raw += d; });
  process.stdin.on('end', () => {
    let payload = {};
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      process.exit(0); // unreadable payload: not a command, allow
    }
    const reason = evaluate(extractCommand(payload));
    if (reason) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `devin-guard: ${reason}`
      }) + '\n');
      process.exit(2);
    }
    process.exit(0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
