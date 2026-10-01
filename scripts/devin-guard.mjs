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
import { basename, resolve, sep } from 'node:path';

const PROJECT_DIR = (process.env.DEVIN_PROJECT_DIR || process.cwd()).replace(/[\\/]+$/, '');
const PROTECTED_DEST = /^(?:main|master|refs\/heads\/(?:main|master))$/;
const MAX_DEPTH = 3;

// Canonical executable name: strips path prefixes and Windows suffixes
// so /usr/bin/git, C:\Git\bin\git.exe and git resolve to the same head.
function cmdName(head) {
  const base = basename(head.replace(/\\/g, '/'));
  return base.replace(/\.(?:exe|bat|cmd|com)$/i, '');
}

// Words that launch another command — skipped when locating the real
// command, and allowed as the prefix of a rescan.
const WRAPPERS = /^(?:env|command|builtin|exec|nice|ionice|nohup|time|timeout|xargs|watch)$/;
const SHELLISH = /^(?:bash|sh|zsh|dash|fish|ksh|eval|source|\.|find|parallel|ssh)$/;
// Wrapper options that REQUIRE a following argument token
// (env -u DEBUG, timeout -k 5, xargs -a cmds.txt, ...).
const WRAPPER_ARG_FLAGS = new Set([
  '-u', '-C', '-S', '-P',
  '--unset', '--chdir', '--split-string',
  '-k', '-s', '-t', '--kill-after', '--signal',
  '-n', '--adjustment',
  '-I', '-L', '-E', '-d', '--replace', '--max-lines',
  '--eof', '--delimiter', '--max-args', '--max-procs',
  '--max-chars', '-a', '--arg-file', '--interval'
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
    if (!WRAPPERS.test(cmdName(head))) break;
    const w = cmdName(head);
    i++;
    while (i < argv.length) {
      const x = stripQuotes(argv[i]);
      if (WRAPPER_ARG_FLAGS.has(x.split('=')[0])) {
        // '--arg-file=F' carries its value inline — consume 1 token;
        // '-a F' / '--arg-file F' consume the next token as well.
        i += x.includes('=') ? 1 : 2;
        continue;
      }
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
    if (WRAPPERS.test(cmdName(t)) || SHELLISH.test(cmdName(t))) continue;
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

// Git global options that consume the following token
// (git -C path, -c k=v, --git-dir d, --work-tree d, --namespace n, ...).
const GIT_VALUE_OPTS = new Set([
  '-C', '-c', '--git-dir', '--work-tree', '--namespace',
  '--exec-path', '--html-path', '--man-path', '--info-path',
  '--config-env', '--super-prefix', '--attr-source', '--list-cmds'
]);

// Split `git [global opts] <subcommand> <args>`; unknown dash tokens are
// skipped conservatively so an unrecognized option never hides the verb.
// `-c`/`--config-env` values are inspected for `alias.<name>=<body>`
// definitions — an alias body is literal command text the invocation
// expands (git -c alias.p='push origin HEAD:main' p).
function gitInvocation(args) {
  const aliases = Object.create(null);
  const configs = Object.create(null);
  const opaqueKeys = new Set();
  const remotePushSpecs = [];
  let opaqueAlias = false;
  let opaqueRemotePush = false;
  let i = 0;
  while (i < args.length) {
    const t = stripQuotes(args[i]);
    if (GIT_VALUE_OPTS.has(t)) {
      const v = i + 1 < args.length ? stripQuotes(args[i + 1]) : '';
      if (t === '-c' || t === '--config-env') {
        const eq = v.indexOf('=');
        // '-c name' without '=' sets the key to implicit 'true'
        // (git boolean semantics); 'name=' sets an empty value.
        if (eq !== 0) {
          const key = (eq === -1 ? v : v.slice(0, eq)).toLowerCase();
          const val = eq === -1 ? 'true' : v.slice(eq + 1);
          if (t === '--config-env') {
            // Value comes from the environment — statically invisible.
            opaqueKeys.add(key);
            if (key.startsWith('alias.')) opaqueAlias = true;
            if (/^remote\.[^.]+\.push$/.test(key)) opaqueRemotePush = true;
          } else {
            configs[key] = stripQuotes(val);
            // remote.<name>.push is multi-valued: repeated -c entries
            // ALL apply, so every value must be checked.
            if (/^remote\.[^.]+\.push$/.test(key)) {
              remotePushSpecs.push(stripQuotes(val));
            }
            const am = /^alias\.([\w-]+)$/.exec(key);
            // The body arrives with its quoting intact
            // (alias.p='push origin HEAD:main') — unwrap then
            // retokenize so the expansion sees real argv words.
            if (am) aliases[am[1]] = tokens(stripQuotes(val));
          }
        }
      }
      i += 2; continue;
    }
    if (/^--[^=]+=/.test(t)) {
      // Inline forms: --config-env=alias.x=VAR (opaque body) or
      // --exec-path=..., etc.
      const ie = /^--config-env=([^=]+)=/.exec(t);
      if (ie) {
        const ik = ie[1].toLowerCase();
        opaqueKeys.add(ik);
        if (ik.startsWith('alias.')) opaqueAlias = true;
        if (/^remote\.[^.]+\.push$/.test(ik)) opaqueRemotePush = true;
      }
      i++; continue;
    }
    if (/^-/.test(t)) { i++; continue; }
    break;
  }
  return {
    sub: i < args.length ? stripQuotes(args[i]) : '',
    rest: args.slice(i + 1),
    aliases,
    configs,
    remotePushSpecs,
    opaqueAlias,
    opaqueRemotePush,
    opaqueKeys
  };
}

// Does a wildcard refspec destination match refs/heads/main|master?
// The static prefix before the first '*' must itself be a prefix of a
// protected branch name — 'refs/heads/feature-*' cannot match main,
// but '*', 'refs/heads/*', 'm*' and 'main*' can.
function wildcardReachesProtected(dest) {
  if (!dest.includes('*')) return false;
  const ns = /^refs\/([a-z]+)\//.exec(dest);
  let prefix;
  if (ns) {
    // Static non-heads namespace — refs/tags/* etc. cannot touch branches.
    if (ns[1] !== 'heads') return false;
    prefix = dest.slice(ns[0].length).split('*')[0];
  } else if (dest.startsWith('refs/')) {
    // Un-namespaced refs pattern (refs/*, refs/h*, re*) — compare on
    // the full ref path.
    const p = dest.split('*')[0];
    return 'refs/heads/main'.startsWith(p) || 'refs/heads/master'.startsWith(p);
  } else {
    // Branch-name shorthand: the literal prefix before '*' must itself
    // be a prefix of a protected branch name — 'feature-*' cannot
    // match main, but '*', 'm*' and 'main*' can.
    prefix = dest.split('*')[0];
  }
  return 'main'.startsWith(prefix) || 'master'.startsWith(prefix);
}

// Git config booleans: anything not explicitly false is true-ish —
// '-c remote.x.mirror' (no '=') and '=yes/on/1' all enable it. An
// empty value stays conservative: treated as true.
const GIT_BOOL_FALSE = new Set(['false', 'no', 'off', '0']);
function gitBoolFalse(v) {
  return GIT_BOOL_FALSE.has((v || '').toLowerCase());
}

// Single-refspec danger check — shared by command-line refspecs and
// remote.<name>.push config values (which act as implicit refspecs).
function refspecReason(ref) {
  if (ref.startsWith('+')) {
    return 'push +<refspec> forces the update — equivalent to --force';
  }
  if (ref === ':') {
    return "push ':' pushes every matching branch — including main";
  }
  const dest = ref.includes(':') ? ref.slice(ref.lastIndexOf(':') + 1) : ref;
  if (PROTECTED_DEST.test(dest)) {
    return 'push targets a protected branch (main/master) — open a PR instead';
  }
  if (ref.includes('*') && wildcardReachesProtected(dest)) {
    return 'wildcard refspec can update refs/heads/main|master — push branches one by one';
  }
  return null;
}

function checkGit(args, depth = 0) {
  const {
    sub, rest, aliases, configs, remotePushSpecs,
    opaqueAlias, opaqueRemotePush, opaqueKeys
  } = gitInvocation(args);

  if (opaqueAlias) {
    return 'git --config-env alias.*=… reads the alias body from the environment — cannot verify it, blocked';
  }

  // `git config <key> <value>` (legacy) and `git config set <key>
  // <value>` (modern) both write persistent config — invisible to
  // later literal-text checks, so the write is the only checkpoint.
  // get/unset/list/edit/rename-section/remove-section/comment read or
  // reshape config and smuggle nothing.
  if (sub === 'config') {
    const { positional } = flagInfo(rest);
    const p = positional.map(stripQuotes);
    const READ_SUBS = new Set([
      'get', 'unset', 'list', 'edit', 'rename-section',
      'remove-section', 'comment', 'default'
    ]);
    let key = null;
    let vals = [];
    if (p[0] === 'set') {
      key = p[1] || null;
      vals = p.slice(2);
    } else if (p[0] && !READ_SUBS.has(p[0])) {
      key = p[0];
      vals = p.slice(1);
    }
    if (key && vals.length > 0) {
      if (/^alias\./.test(key)) {
        const bodyToks = tokens(vals.join(' '));
        const f = stripQuotes(bodyToks[0] || '');
        const r = f.startsWith('!')
          ? evaluate(((f === '!' ? '' : f.slice(1)) + ' ' + bodyToks.slice(1).join(' ')).trim(), depth + 1)
          : checkGit(bodyToks, depth + 1);
        if (r) return r;
      }
      if (key === 'push.default' && vals[0] === 'matching') {
        return "git config push.default=matching makes 'git push' update every matching branch — including main";
      }
      if (/^remote\.[^.]+\.push$/.test(key)) {
        const r = refspecReason(vals.join(' '));
        if (r) return `git config ${key} persists a dangerous refspec — ${r}`;
      }
      if (/^remote\.[^.]+\.mirror$/.test(key) && !gitBoolFalse(vals[0])) {
        return 'git config remote.*.mirror=true makes pushes behave as --mirror — never allowed';
      }
    }
  }
  // `git <alias> <args>` expands to `git <alias-body> <args>`; bodies
  // starting with '!' are SHELL commands and go through evaluate().
  // A body that itself carries -c alias.*/--config-env makes git
  // re-parse global options (real git DOES run the nested alias) —
  // fail closed rather than bound recursion.
  const body = sub && aliases[sub];
  if (body && depth < 1) {
    const first = stripQuotes(body[0] || '');
    if (first === '!' || first.startsWith('!')) {
      const shellCmd = (first === '!' ? '' : first.slice(1)) +
        (body.length > 1 ? ' ' + body.slice(1).join(' ') : '');
      const reason = evaluate(shellCmd.trim(), depth + 1);
      if (reason) return reason;
    } else {
      const inv = gitInvocation(body.concat(rest));
      if (inv.opaqueAlias || Object.keys(inv.aliases).length > 0) {
        return 'git alias body redefines aliases — expansion cannot be verified, blocked';
      }
      const reason = checkGit(body.concat(rest), depth + 1);
      if (reason) return reason;
    }
  }

  // `git rm -rf .` deletes worktree copies of tracked files — -f drops
  // uncommitted changes permanently. --cached stays index-only (safe),
  // and a specific pathspec keeps the sweep scoped (allowed).
  if (sub === 'rm') {
    const { shorts, longs, positional } = flagInfo(rest);
    const broad = positional.length === 0 ||
      positional.every((t) => {
        const s = stripQuotes(t);
        return s === '.' || s === '*' || s === '--' || s === '/' ||
          s === '--all' || s === '-A';
      });
    const force = shorts.has('f') || longs.has('--force');
    if (shorts.has('r') && force && !longs.has('--cached') && broad) {
      return 'git rm -rf on the whole tree deletes worktree files and drops uncommitted changes';
    }
  }

  if (sub === 'push') {
    // -c push.default=matching (literal) or --config-env push.default=
    // (env-sourced, unverifiable) can turn a bare push into a
    // publish-everything push.
    if ((configs['push.default'] || '').toLowerCase() === 'matching') {
      return "git -c push.default=matching makes 'git push' update every matching branch — including main";
    }
    if (opaqueKeys.has('push.default')) {
      return 'git --config-env push.default=… hides the push.default value — cannot verify it, blocked';
    }
    // remote.<name>.mirror=true makes the push behave as --mirror
    // regardless of refspecs; the remote name can't be resolved from
    // literal text so any remote.*.mirror counts.
    for (const key of Object.keys(configs)) {
      if (/^remote\.[^.]+\.mirror$/.test(key) && !gitBoolFalse(configs[key])) {
        return 'git -c remote.*.mirror=true makes push behave as --mirror — never allowed';
      }
    }
    if ([...opaqueKeys].some((k) => /^remote\.[^.]+\.mirror$/.test(k))) {
      return 'git --config-env remote.*.mirror=… hides the value — cannot verify it, blocked';
    }
    // Value-taking push options are stripped before positional
    // classification — otherwise a `--repo origin main` misreads
    // 'origin' as the remote and 'main' as a refspec destination.
    // --repo/--repository (and their unambiguous git abbreviations)
    // supply the remote via option, making every positional a refspec.
    let remoteViaOpt = false;
    const filtered = [];
    for (let i = 0; i < rest.length; i++) {
      const t = stripQuotes(rest[i]);
      if (/^--rep\w*(?:=|$)/.test(t)) { // --repo, --repository, --rep…
        if (t.includes('=')) { remoteViaOpt = true; continue; }
        if (i + 1 < rest.length) { remoteViaOpt = true; i++; }
        continue;
      }
      if (/^--rec\w*(?:=|$)/.test(t) || /^--e\w*(?:=|$)/.test(t) ||
          t === '-o' || t === '--push-option') {
        // --receive-pack/--exec consume a value; -o/--push-option too.
        if (t.includes('=')) continue;
        if (i + 1 < rest.length) { i++; continue; }
        continue;
      }
      if (/^-o./.test(t) || /^--push-opt\w*=/.test(t)) {
        continue; // attached-value forms: -ofoo, --push-option=x
      }
      filtered.push(rest[i]);
    }
    const { shorts, longs, positional } = flagInfo(filtered);
    if (longs.has('--force') || longs.has('--force-with-lease') ||
        longs.has('--force-if-includes') || shorts.has('f')) {
      return 'git push --force rewrites remote history — never allowed';
    }
    // Multi-ref pushes publish every matching ref — including
    // refs/heads/main — and --mirror/--prune additionally force-update
    // and delete remote refs.
    if (longs.has('--all') || longs.has('--branches')) {
      return 'git push --all/--branches pushes every local branch — including main';
    }
    if (longs.has('--mirror')) {
      return 'git push --mirror force-updates all refs and deletes missing ones';
    }
    if (longs.has('--prune')) {
      return 'git push --prune deletes remote refs — human-only action';
    }
    // positional[0] is the remote unless --repo supplied it via
    // option — then every positional is a refspec. The destination
    // (after the last ':') decides whether a protected ref is
    // touched — 'main:feature-copy' pushes FROM main and is safe,
    // 'feature/main-fix' never names main at all.
    const refspecs = remoteViaOpt ? positional : positional.slice(1);
    for (const rawRef of refspecs) {
      const reason = refspecReason(stripQuotes(rawRef));
      if (reason) return reason;
    }
    // remote.<name>.push is used as the implicit refspec only when the
    // command line carries none — each configured value (the key is
    // multi-valued, every -c entry applies) goes through the same
    // refspec validator.
    if (refspecs.length === 0) {
      if (opaqueRemotePush) {
        return 'git --config-env remote.*.push=… hides the refspec — cannot verify it, blocked';
      }
      for (const spec of remotePushSpecs) {
        const reason = refspecReason(spec);
        if (reason) return `configured remote.*.push refspec: ${reason}`;
      }
    }
    const implicit = positional.length <= 1 ||
      positional.every((p) => /^(origin|upstream|HEAD|@)$/.test(p));
    if (implicit) {
      const br = currentBranch();
      if (br && PROTECTED_DEST.test(br)) {
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
    if (forceDelete && positional.some((p) => PROTECTED_DEST.test(stripQuotes(p)))) {
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

// First-level repo paths that recursive rm may regenerate — everything
// else inside the project (src, tests, .devin, missions, ...) is
// protected work that a recursive delete could destroy.
const GENERATED_DIRS = new Set([
  'dist', 'build', 'out', 'coverage', 'tmp', 'temp',
  'node_modules', '.vite', '.cache', '.turbo', '.next', '.nuxt',
  'playwright-report', 'test-results', '.firebase'
]);

// Resolve a target to an absolute path (relative → under PROJECT_DIR)
// and classify it: 'git' | 'inside-generated' | 'inside-repo' | 'outside'.
function rmTargetClass(t) {
  const c = stripQuotes(t);
  if (!c || /^-/.test(c)) return 'empty';
  if (EXACT_RM_TARGETS.has(c)) return 'repo';
  if (/^(~|\$\{?HOME\}?|\$\{?DEVIN_PROJECT_DIR\}?)/.test(c)) return 'repo';
  const abs = c.startsWith('/') ? c : resolve(PROJECT_DIR, c);
  if (abs === PROJECT_DIR) return 'repo';
  if (abs.startsWith(PROJECT_DIR + sep)) {
    const first = abs.slice(PROJECT_DIR.length + 1).split(sep)[0];
    if (first === '.git') return 'git';
    return GENERATED_DIRS.has(first) ? 'inside-generated' : 'inside-repo';
  }
  return 'outside';
}

// System roots outside the project (incl. /home) stay off-limits.
const SYSTEM_ROOTS = /^\/(bin|boot|dev|etc|home|lib|lib64|opt|proc|root|run|sbin|snap|srv|sys|usr|var)(\/.*)?$/;

function checkRm(args) {
  const { shorts, longs, positional } = flagInfo(args);
  if (longs.has('--no-preserve-root')) return 'rm --no-preserve-root targets the filesystem root';
  if (positional.some((t) => rmTargetClass(t) === 'git')) {
    return 'rm targeting .git corrupts the repository';
  }
  const recursive = shorts.has('r') || shorts.has('R') || longs.has('--recursive');
  if (!recursive) return null;
  if (positional.length === 0) return 'recursive rm with no resolvable target';
  for (const t of positional) {
    const cls = rmTargetClass(t);
    if (cls === 'repo') return 'recursive rm against a repo/system/root path';
    if (cls === 'inside-repo') {
      return `recursive rm deletes '${stripQuotes(t)}' inside the repo — only generated dirs (dist/, node_modules/, coverage/, ...) may be removed`;
    }
    if (cls === 'outside' && SYSTEM_ROOTS.test(resolve(PROJECT_DIR, stripQuotes(t)))) {
      return 'recursive rm against a repo/system/root path';
    }
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

// Env-assignment forms that smuggle git config in literal text —
// GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pairs can define aliases or
// push.default, and GIT_CONFIG_GLOBAL/SYSTEM point at opaque files.
const GIT_ENV_CFG = /^GIT_CONFIG_(?:KEY|VALUE)_\d+=|^GIT_CONFIG_(?:GLOBAL|SYSTEM)=/;

function scanArgv(argv) {
  const realArgv = unwrap(argv);
  const realHead = realArgv.length ? cmdName(stripQuotes(realArgv[0])) : '';
  const gitEnvCfg = argv.some((t) => GIT_ENV_CFG.test(stripQuotes(t)));
  for (const [cmd, check] of Object.entries(HEAD_RULES)) {
    // Normal position: first real command after wrappers.
    if (realHead === cmd) {
      if (cmd === 'git' && gitEnvCfg) {
        return 'GIT_CONFIG_* environment config can smuggle aliases/defaults — cannot verify, blocked';
      }
      const reason = check(realArgv.slice(1));
      if (reason) return reason;
    }
    // Rescan: git/rm buried behind inert shell syntax
    // ("bash -c 'cmd'" is handled by quoted-token recursion instead).
    for (let i = 0; i < argv.length; i++) {
      if (cmdName(stripQuotes(argv[i])) === cmd && inertPrefix(argv, i)) {
        if (cmd === 'git' && gitEnvCfg) {
          return 'GIT_CONFIG_* environment config can smuggle aliases/defaults — cannot verify, blocked';
        }
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
    let reason = null;
    try {
      reason = evaluate(extractCommand(payload));
    } catch {
      // Guard bugs must not silently become decisions — fail open to
      // the permission layer, same as malformed payloads.
      reason = null;
    }
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
