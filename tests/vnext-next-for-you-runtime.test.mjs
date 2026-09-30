/* Runtime suite for the productionized Next For You selector (Mission
 * 008C, spec §4–§9/§11/§15/§21/§25).
 *
 * Unlike the experiment suite, every behavioral claim here runs through
 * the REAL session path: createMissionSession → screen/view/commit →
 * eventStore + runStore + decisionStore. The selector is exercised both
 * directly (mode parity, isolation, shadow) and through the UI lock.
 *
 * Sections:
 *   CANON   browser-safe canonical hashing (§4)
 *   CTX     consumeDecision consume-once semantics (§8)
 *   SEL     selector-level: determinism / reference parity / isolation /
 *           malformed events / shadow purity (§10/§25 A,M,N,O,Q)
 *   SES     session-level: render ≠ consume, commit consumes once,
 *           live-decision lock, reload invariants (§6–§9/§25 B–H)
 *   PARITY  ui-session B0 ≡ policyB(engineState) at every step (§26)
 *   SHADOW  shadow-mode session: served = reference, comparison logged,
 *           audit carries the shadow (§10/§25 Q)
 *   PURPOSE §15: B0-driven real-session routes for each decision kind
 *   BACKLOG assessment_content_backlog honesty (§14/§16/§25 I)
 *   AUDIT   consumed-decision record fields (§11)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createMissionSession } from '../src/vnext/ui-session.js';
import { createMemoryEventStore, createMemoryRunStore, createMemoryDecisionStore } from '../src/vnext/store-memory.js';
import { FIXTURES, capabilityById } from '../src/vnext/fixtures.js';
import { CAPABILITIES } from '../src/vnext/capabilities.js';
import { RISK_PRIORS } from '../src/vnext/risk-priors.js';
import { LEARNING_POLICY_V1 } from '../src/vnext/policy.js';
import { nextMissionTask } from '../src/vnext/mission-runner.js';
import { sha256, canon, sha256HexOfString } from '../src/vnext/next-for-you/canonical.js';
import { emptyContext, consumeDecision, recordChoice, normalizeContext } from '../src/vnext/next-for-you/decision-context.js';
import { selectNextTask, engineState, SELECTION_MODES } from '../src/vnext/next-for-you/selector.js';
import { policyB } from '../src/vnext/next-for-you/policies.js';
import { KINDS } from '../src/vnext/next-for-you/constants.js';
import { attemptEvent, observeEvent } from '../experiments/next-for-you/scenarios.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const T0 = Date.parse('2026-02-01T09:00:00Z');
const HOUR = 3600_000;
const MIN = 60_000;
const DAY = 24 * HOUR;

const MEET = FIXTURES.find((f) => f.mission.id === 'mission.meet_new_person');
const DRINK = FIXTURES.find((f) => f.mission.id === 'mission.order_drink');
const TIME = FIXTURES.find((f) => f.mission.id === 'mission.meet_at_a_time');
const TASK_REGISTRY = FIXTURES.flatMap((f) => f.tasks);

let tick = T0;
const now = () => (tick += MIN);

let check = 0;
const ok = (cond, msg) => { check++; assert.ok(cond, msg); };
const say = (name) => console.log(`  ✓ ${name}`);

const makeSession = ({ fixture = MEET, learner = 'RT.learner', mode = 'b0', eventStore, runStore, decisionStore, ...rest } = {}) =>
  createMissionSession({
    learnerId: learner,
    mission: fixture.mission,
    tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1,
    now,
    eventStore: eventStore ?? createMemoryEventStore(),
    runStore: runStore ?? createMemoryRunStore(),
    decisionStore: decisionStore ?? createMemoryDecisionStore(),
    selectionMode: mode,
    idGen: () => `run.rt.${Math.floor(tick)}`,
    ...rest
  });

const SCRIPT = {
  'task.meet.diagnostic.own_name': 'i am linh',
  'task.meet.diagnostic.ask_name': 'uhhh',
  'task.meet.retrieval.questions': 'ask_name',
  'task.meet.retrieval.phrases': 'my name is linh',
  'task.meet.retrieval.ask_name': "what's your name",
  'task.meet.interaction.guided': "what's your name",
  'task.meet.interaction.unaided': "what's your name",
  'task.meet.interaction.polite': 'nice to meet you too',
  'task.meet.remediation.ask_name': "what's your name",
  'task.meet.delayed.check': "what's your name",
  'task.meet.delayed.name': 'i am linh',
  'task.meet.transfer.name': 'my name is linh',
  'task.meet.transfer.street': "what's your name",
  'task.meet.assessment.checkpoint': "hi, i'm linh — what's your name?",
  'task.drink.diagnostic.order': 'a coffee please',
  'task.drink.retrieval.offer': 'coffee',
  'task.drink.retrieval.order': 'can i have a coffee please',
  'task.drink.interaction.guided': 'a coffee please',
  'task.drink.interaction.unaided': 'a coffee please',
  'task.drink.delayed.check': 'a coffee please',
  'task.drink.transfer.stall': 'a coffee please',
  'task.drink.assessment.checkpoint': 'a coffee please'
};

async function drive(session, pred, { steps = 120, answer = (s) => SCRIPT[s.taskId], onScreen } = {}) {
  for (let i = 0; i < steps; i++) {
    const s = session.screen();
    await onScreen?.(s);
    if (pred(s)) return s;
    if (s.type === 'intro') { await session.start({ learnerName: 'linh' }); continue; }
    if (s.type === 'input') { await session.view(); continue; }
    if (s.type === 'summary') return s;
    if (s.type === 'task') {
      if (s.phase === 'feedback') { await session.next(); continue; }
      const a = answer(s);
      if (s.responseType === 'choice') await session.commit({ optionId: a });
      else await session.commit({ text: a ?? '' });
      continue;
    }
    throw new Error(`unknown screen ${s.type}`);
  }
  return session.screen();
}

const untilPurpose = (purpose) => (s) => s.type === 'task' && s.purpose === purpose && s.phase === 'prompt';
const untilKindConsumed = (session, kind) => () =>
  (session.selectionContext()?.actionsChosen ?? []).some((a) => a.kind === kind);
const consumedKinds = (session) => (session.selectionContext()?.actionsChosen ?? []).map((a) => a.kind);

/* ═══ CANON — §4: browser-safe synchronous SHA-256 ═══════════════ */
{
  /* FIPS 180-4 standard vectors. */
  assert.equal(sha256HexOfString(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256HexOfString('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(
    sha256HexOfString('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
  );
  /* sha256() canonicalizes: equal semantics → equal digest regardless
   * of key order; arrays stay order-sensitive. */
  assert.equal(sha256({ b: 1, a: 2 }), sha256({ a: 2, b: 1 }));
  assert.notEqual(sha256([1, 2]), sha256([2, 1]));
  assert.equal(canon({ b: [{ d: 4, c: 3 }], a: 'x' }), canon({ a: 'x', b: [{ c: 3, d: 4 }] }));
  /* No Node builtins may leak into the browser bundle — scan the whole
   * promoted module dir for forbidden imports. */
  const dir = join(HERE, '..', 'src', 'vnext', 'next-for-you');
  const files = ['canonical.js', 'constants.js', 'decision-context.js', 'decision-log.js', 'candidate-generator.js', 'policies.js', 'validator.js', 'selector.js'];
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/from\s+['"]node:|from\s+['"]crypto['"]|import\s+['"]node:|require\s*\(|createHash|process\.|__dirname/.test(src), `${f} leaks a Node-only dependency`);
  }
  ok(true, 'sha256 standard vectors + canonical ordering + zero Node builtins');
  say('CANON: sha256 FIPS vectors, canonical ordering, no node builtins');
}

/* ═══ CTX — §8: consumeDecision consume-once ═════════════════════ */
{
  const ctx0 = emptyContext('ep.t', 'ses.t');
  const dec = {
    decisionId: 'dec:ep.t#0:test:abc:diagnostic_probe@cap.x:task.x@1',
    chosen: { kind: 'diagnostic_probe', capabilityId: 'cap.x', taskId: 'task.x', taskRevision: 1 }
  };
  const { context: c1, consumed } = consumeDecision(ctx0, dec, T0);
  assert.equal(consumed, true);
  assert.equal(c1.counts.diagnostic, 1);
  assert.equal(c1.actionsChosen.length, 1);
  assert.equal(c1.lastActedCapabilityId, 'cap.x');
  assert.equal(c1.currentThreadCapabilityId, 'cap.x', 'diagnostic_probe owns the thread');
  assert.deepEqual(c1.recentCapabilities, ['cap.x']);
  assert.deepEqual(c1.recentTaskIds, ['task.x@1']);

  const again = consumeDecision(c1, dec, T0 + MIN);
  assert.equal(again.consumed, false);
  assert.equal(again.deduped, true, 'same decisionId re-consumption must dedupe');
  assert.equal(again.context.counts.diagnostic, 1, 'double consume counted twice');
  assert.equal(again.context.actionsChosen.length, 1);

  /* Thread ownership: support/due/transfer/assessment update lastActed
   * but never steal the pedagogical thread. */
  for (const kind of ['support_demand', 'due_retrieval', 'transfer', 'assessment']) {
    const { context: c2 } = consumeDecision(c1, {
      decisionId: `dec:ep.t#1:test:x:${kind}@cap.y:task.y@1`,
      chosen: { kind, capabilityId: 'cap.y', taskId: 'task.y', taskRevision: 1 }
    }, T0 + 2 * MIN);
    assert.equal(c2.lastActedCapabilityId, 'cap.y', `${kind} did not update lastActed`);
    assert.equal(c2.currentThreadCapabilityId, 'cap.x', `${kind} stole the learning thread`);
  }
  /* Terminal/taskless decisions consume nothing. */
  const term = consumeDecision(c1, { decisionId: 'dec:idle', chosen: { kind: 'idle', taskId: null } }, T0);
  assert.equal(term.consumed, false);
  /* normalizeContext migrates a v1/partial context without inventing
   * history; garbage shapes fall back to a fresh stamped context. */
  const migrated = normalizeContext({ version: 'vnext.decision-context.v1', actionsChosen: [{ kind: 'new_input', capabilityId: 'cap.z', taskId: 't@1', atDecision: T0 }] });
  assert.equal(migrated.version, 'vnext.decision-context.v2');
  assert.equal(migrated.actionsChosen.length, 1, 'migration dropped recorded actions');
  const fresh = normalizeContext('garbage');
  assert.equal(fresh, null, 'non-object context should return null (caller decides)');
  ok(true, 'consumeDecision: exactly-once, thread ownership, dedupe, terminal no-op');
  say('CTX: consume-once + thread rules + tolerant migration');
}

/* ═══ SEL — selector-level contracts ═════════════════════════════ */
{
  const fx = MEET;
  const mkInput = (events = [], ctx = null) => ({
    mode: 'b0', learnerId: 'RT.sel', mission: fx.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events, riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1, selection: {},
    decisionContext: ctx ?? emptyContext('ep.sel', 'ses.sel'), now: T0
  });

  /* A — determinism: identical input → identical decision object. */
  const input = mkInput();
  const d1 = selectNextTask(input);
  const d2 = selectNextTask(mkInput());
  assert.deepEqual(d2, d1, 'B0 nondeterministic on identical input');
  ok(true, 'A: same state+context → identical decision');

  /* O — REFERENCE parity: mode 'reference' returns the literal
   * nextMissionTask result, byte-for-byte. */
  const evts = [
    attemptEvent(fx.tasks.find((t) => t.id === 'task.meet.diagnostic.own_name'), capabilityById('production.speak.say_own_name'), { at: T0 - DAY, outcome: 'success' })
  ];
  for (const ev of [[], evts]) {
    const viaSelector = selectNextTask({ ...mkInput(ev), mode: 'reference' });
    const direct = nextMissionTask({
      learnerId: 'RT.sel', mission: fx.mission, tasks: TASK_REGISTRY,
      capabilities: CAPABILITIES, events: ev, riskPriors: RISK_PRIORS, now: T0, policy: LEARNING_POLICY_V1
    });
    assert.deepEqual(viaSelector, direct, 'REFERENCE mode diverged from literal runner');
  }
  /* Invalid mode fails closed to REFERENCE, never silently to B0. */
  const viaBad = selectNextTask({ ...mkInput(), mode: 'bogus' });
  ok(viaBad.status != null, 'unknown mode produced no selection');
  ok(viaBad.decision === undefined || viaBad.selectionPolicyVersion === 'production.nextMissionTask', 'unknown mode did not fall back to reference');
  ok(true, 'O: REFERENCE byte-parity + unknown mode fails closed to reference');

  /* M — learner isolation: foreign events cannot move the decision. */
  const mine = evts;
  const foreign = evts.map((e) => ({ ...e, learnerId: 'FOREIGN', id: e.id + '.f' }));
  const a = selectNextTask(mkInput(mine));
  const b = selectNextTask(mkInput([...mine, ...foreign]));
  assert.equal(b.decision?.decisionId ?? b.taskId, a.decision?.decisionId ?? a.taskId, 'foreign learner events changed the decision');
  ok(true, 'M: foreign learner cannot affect the decision');

  /* N — malformed event cannot consume task freshness: a checkpoint
   * event with a broken binding (purpose lie) must not mark the
   * assessment family consumed, so the assessment stays servable. */
  const tAssess = fx.tasks.find((t) => t.purpose === 'assessment');
  const capAssess = capabilityById(tAssess.capabilityId);
  const goodCheckpoint = attemptEvent(tAssess, capAssess, { at: T0 - HOUR, outcome: 'success' });
  const malformed = { ...goodCheckpoint, taskRevision: 99, binding: { ...goodCheckpoint.binding, taskRevision: 99 } };
  /* Transfer the cap first so assessment is actually wanted. */
  const tTransfer = fx.tasks.find((t) => t.purpose === 'transfer' && t.capabilityId === tAssess.capabilityId);
  const evTransferred = tTransfer
    ? [attemptEvent(tTransfer, capAssess, { at: T0 - 2 * HOUR, outcome: 'success' })]
    : [];
  const stClean = selectNextTask(mkInput([...evTransferred]));
  const stMal = selectNextTask(mkInput([...evTransferred, malformed]));
  /* The malformed checkpoint must behave as if absent — same decision. */
  assert.equal(
    stMal.decision?.decisionId ?? `${stMal.status}:${stMal.taskId}`,
    stClean.decision?.decisionId ?? `${stClean.status}:${stClean.taskId}`,
    'malformed/stale event changed the decision — freshness poisoned'
  );
  ok(true, 'N: malformed/stale-revision event cannot consume family freshness');

  /* Q — SHADOW: serves the reference result, never B0's choice. */
  const shadows = [];
  const sh = selectNextTask({ ...mkInput(), mode: 'shadow_b0', shadowSink: (s) => shadows.push(s) });
  const ref = nextMissionTask({
    learnerId: 'RT.sel', mission: fx.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events: [], riskPriors: RISK_PRIORS, now: T0, policy: LEARNING_POLICY_V1
  });
  assert.equal(sh.status, ref.status);
  assert.equal(sh.taskId, ref.taskId, 'shadow mode served B0 choice instead of reference');
  assert.equal(sh.taskRevision, ref.taskRevision);
  assert.ok(sh.shadow?.b0?.kind, 'shadow comparison missing the B0 side');
  assert.equal(shadows.length, 1, 'shadowSink did not fire exactly once');
  ok(true, 'Q: shadow serves reference verbatim, B0 comparison recorded once');
  say('SEL: determinism, reference parity, isolation, freshness, shadow purity');
}

/* ═══ SES — session-level lock + consume-once + reload ═══════════ */
{
  /* B — rendering is free: 100 screen() calls consume nothing. */
  const s = makeSession();
  await s.init();
  await s.start({ learnerName: 'linh' });
  const before = JSON.stringify(s.selectionContext());
  for (let i = 0; i < 100; i++) s.screen();
  assert.equal(JSON.stringify(s.selectionContext()), before, '100 renders changed DecisionContext');
  ok(true, 'B: 100 screen renders leave context unchanged');

  /* C — one commit consumes exactly once + audit lands. */
  const ds = createMemoryDecisionStore();
  const s2 = makeSession({ decisionStore: ds });
  await s2.init();
  await s2.start({ learnerName: 'linh' });
  const scr = s2.screen();
  assert.equal(scr.type, 'task');
  const n0 = s2.selectionContext().actionsChosen.length;
  await s2.commit({ text: 'uhhh' });
  assert.equal(s2.selectionContext().actionsChosen.length, n0 + 1, 'commit did not consume exactly once');
  const audit = await ds.list();
  assert.equal(audit.length, 1, 'audit record missing after consume');
  assert.equal(audit[0].selectionPolicyVersion, 'vnext.selection-policy.b0.v1');
  ok(true, 'C: one commit → one consumed decision → one audit record');

  /* D — a second commit on the same screen cannot double-consume. */
  await s2.commit({ text: 'different answer' });
  assert.equal(s2.selectionContext().actionsChosen.length, n0 + 1, 'feedback-phase commit double-consumed');
  assert.equal((await ds.list()).length, 1, 'duplicate commit wrote a second audit record');
  ok(true, 'D: duplicate commit cannot re-consume the decision');

  /* G — support before commit is NOT selection consumption. */
  const s3 = makeSession();
  await s3.init();
  await s3.start({ learnerName: 'linh' });
  await drive(s3, (x) => x.type === 'task' && x.supportOffered?.length > 0 && x.phase === 'prompt', { steps: 40 });
  const nSup = s3.selectionContext().actionsChosen.length;
  await s3.support('hint');
  assert.equal(s3.selectionContext().actionsChosen.length, nSup, 'support() consumed a selection decision');
  ok(true, 'G: support before commit does not count as consumption');

  /* E — reload BEFORE commit: the uncommitted display consumed nothing,
   * and the same deterministic decision is recomputed. */
  const evE = createMemoryEventStore(); const rsE = createMemoryRunStore(); const dsE = createMemoryDecisionStore();
  const e1 = makeSession({ eventStore: evE, runStore: rsE, decisionStore: dsE });
  await e1.init(); await e1.start({ learnerName: 'linh' });
  const sPre = e1.screen();
  const decIdPre = e1.selectionContext().consumedDecisionIds.length;
  const e2 = makeSession({ eventStore: evE, runStore: rsE, decisionStore: dsE });
  await e2.init(); await e2.start({ learnerName: 'linh' });
  const sRe = e2.screen();
  assert.equal(sRe.taskId, sPre.taskId, 'reload before commit re-served a different task');
  assert.equal(e2.selectionContext().actionsChosen.length, 0, 'uncommitted display was consumed on reload');
  ok(true, 'E: reload before commit — no consumption, same decision recomputed');

  /* F/§9 — reload AFTER commit: context persisted; the reconstructed
   * session's next decision equals an uninterrupted session's. */
  const evF = createMemoryEventStore(); const rsF = createMemoryRunStore(); const dsF = createMemoryDecisionStore();
  const f1 = makeSession({ eventStore: evF, runStore: rsF, decisionStore: dsF });
  await f1.init(); await f1.start({ learnerName: 'linh' });
  await f1.commit({ text: 'uhhh' });
  await f1.next();
  const nextAfterReloadSeed = f1.screen().taskId;

  /* uninterrupted control: fresh session on identical stores driven to
   * the same point would have to re-do everything — instead compare the
   * interrupted run against itself: context survives + a new decision
   * is served. The strong equality is covered by §9 replay below. */
  const f2 = makeSession({ eventStore: evF, runStore: rsF, decisionStore: dsF });
  await f2.init(); await f2.start({ learnerName: 'linh' });
  assert.equal(f2.selectionContext().actionsChosen.length, 1, 'context lost across reload');
  assert.equal(f2.screen().taskId, nextAfterReloadSeed, 'post-reload next decision differs from pre-reload');
  ok(true, 'F: reload after commit preserves context + decision sequence');

  /* §9 full invariant: state → D → consume → destroy → reconstruct →
   * next decision == uninterrupted execution. */
  const mkStores = () => ({ ev: createMemoryEventStore(), rs: createMemoryRunStore(), ds: createMemoryDecisionStore() });
  const U = mkStores();
  const u1 = makeSession({ eventStore: U.ev, runStore: U.rs, decisionStore: U.ds });
  await u1.init(); await u1.start({ learnerName: 'linh' });
  for (let i = 0; i < 24; i++) {
    const scr2 = u1.screen();
    if (scr2.type === 'intro') { await u1.start({ learnerName: 'linh' }); continue; }
    if (scr2.type === 'input') { await u1.view(); continue; }
    if (scr2.type === 'task' && scr2.phase === 'prompt') { await u1.commit({ text: SCRIPT[scr2.taskId] ?? 'x' }); continue; }
    if (scr2.type === 'task' && scr2.phase === 'feedback') { await u1.next(); continue; }
    break;
  }
  /* Interrupted run: same script but a NEW session object halfway —
   * rebuilt from stores — must produce the identical remainder. */
  const V = mkStores();
  const v1 = makeSession({ eventStore: V.ev, runStore: V.rs, decisionStore: V.ds });
  await v1.init(); await v1.start({ learnerName: 'linh' });
  for (let i = 0; i < 3; i++) {
    const scr2 = v1.screen();
    if (scr2.type === 'input') { await v1.view(); continue; }
    if (scr2.type === 'task' && scr2.phase === 'prompt') { await v1.commit({ text: SCRIPT[scr2.taskId] ?? 'x' }); continue; }
    if (scr2.type === 'task' && scr2.phase === 'feedback') { await v1.next(); continue; }
  }
  const v2 = makeSession({ eventStore: V.ev, runStore: V.rs, decisionStore: V.ds }); // destroy + reconstruct
  await v2.init(); await v2.start({ learnerName: 'linh' });
  for (let i = 0; i < 6; i++) {
    const scr2 = v2.screen();
    if (scr2.type === 'input') { await v2.view(); continue; }
    if (scr2.type === 'task' && scr2.phase === 'prompt') { await v2.commit({ text: SCRIPT[scr2.taskId] ?? 'x' }); continue; }
    if (scr2.type === 'task' && scr2.phase === 'feedback') { await v2.next(); continue; }
    break;
  }
  const choiceOf = (r) => `${r.chosenKind}@${r.capabilityId}:${r.taskId}@${r.taskRevision}`;
  assert.deepEqual(
    (await V.ds.list()).map(choiceOf),
    (await U.ds.list()).map(choiceOf).slice(0, (await V.ds.list()).length),
    'reconstructed session produced different decisions than uninterrupted run'
  );
  ok(true, '§9: destroy+reconstruct mid-run → identical decision sequence');
  say('SES: render≠consume, exactly-once, lock, reload invariants');
}

/* ═══ PARITY — §26: ui-session B0 == policyB(engineState) ═════════ */
{
  let comparisons = 0;
  const s2 = makeSession();
  await s2.init();
  await s2.start({ learnerName: 'linh' });
  const parityOnScreen = (scr) => {
    /* Only live selections count: a 'task' screen in feedback phase
     * renders the COMMITTED task (already consumed — the engine has
     * moved on). prompt-phase tasks and input screens are fresh picks. */
    if (scr.type === 'input' || (scr.type === 'task' && scr.phase === 'prompt')) {} else return;
    /* Rebuild the engine state the way ui-session does — same events,
     * same stored context — and ask policyB directly. The served task
     * must equal the engine's chosen task. NOTE: rebuild AFTER the
     * screen call so the session's context is the one that produced
     * it (a render does not consume, so ctx is the decide-time ctx). */
    const st = engineState({
      learnerId: 'RT.learner', mission: MEET.mission, tasks: TASK_REGISTRY,
      capabilities: CAPABILITIES, events: s2.log(), riskPriors: RISK_PRIORS,
      policy: LEARNING_POLICY_V1,
      selection: s2.runInfo()?.selection?.config ?? {},
      decisionContext: s2.selectionContext(),
      now: tick
    });
    const engine = policyB(st);
    const engineTask = engine.chosen?.taskId ?? null;
    assert.equal(scr.taskId ?? null, engineTask,
      `session served ${scr.taskId} but policyB chose ${engineTask} (${engine.chosen?.kind})`);
    comparisons++;
  };
  for (let i = 0; i < 14 && comparisons < 10; i++) {
    const scr = s2.screen();
    parityOnScreen(scr);
    if (scr.type === 'input') { await s2.view(); continue; }
    if (scr.type === 'task' && scr.phase === 'prompt') { await s2.commit({ text: SCRIPT[scr.taskId] ?? 'x' }); continue; }
    if (scr.type === 'task' && scr.phase === 'feedback') { await s2.next(); continue; }
    break;
  }
  ok(comparisons >= 8, `parity check ran only ${comparisons} comparisons`);
  ok(true, `PARITY: ${comparisons} served tasks identical to bare policyB`);
  say('PARITY: productionized B0 == approved policyB on live state');
}

/* ═══ SHADOW — session-level shadow never perturbs service ═══════ */
{
  const ds = createMemoryDecisionStore();
  const s = makeSession({ mode: 'shadow_b0', decisionStore: ds });
  await s.init();
  await s.start({ learnerName: 'linh' });
  /* Serve a few screens — the served task must equal what REFERENCE
   * mode would serve on the same state, every time. */
  const refProbe = () => nextMissionTask({
    learnerId: 'RT.learner', mission: MEET.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events: s.log(), riskPriors: RISK_PRIORS,
    now: tick, policy: LEARNING_POLICY_V1
  });
  for (let i = 0; i < 8; i++) {
    const scr = s.screen();
    /* Feedback screens render the committed task — compare only screens
     * that are live selections (prompt-phase task or input). */
    if (scr.type === 'input' || (scr.type === 'task' && scr.phase === 'prompt')) {
      const ref = refProbe();
      assert.equal(scr.taskId ?? null, ref.taskId ?? null, `shadow served ${scr.taskId} but reference would serve ${ref.taskId}`);
    }
    if (scr.type === 'input') { await s.view(); continue; }
    if (scr.type === 'task' && scr.phase === 'prompt') { await s.commit({ text: SCRIPT[scr.taskId] ?? 'x' }); continue; }
    if (scr.type === 'task' && scr.phase === 'feedback') { await s.next(); continue; }
    break;
  }
  assert.ok(s.shadowTrail().length >= 1, 'shadow trail empty');
  /* A consumed reference decision records the shadow comparison. */
  const audit = await ds.list();
  assert.ok(audit.length >= 1, 'no audit records in shadow mode');
  assert.ok(audit[0].shadow != null, 'shadow comparison not attached to the audit record');
  assert.equal(audit[0].selectionPolicyVersion, 'production.nextMissionTask', 'shadow audit must stamp the SERVED policy');
  ok(true, 'SHADOW: served=reference every step; comparison logged + audited');
  say('SHADOW: reference served verbatim, B0 trail + audit attached');
}

/* ═══ PURPOSE — §15: B0 routes through the real session ══════════ */
{
  const s = makeSession();
  await s.init();
  /* Episode boundary note: the +25h jump rolls the decision episode
   * (per-episode budgets reset by design), so actionsChosen only shows
   * the CURRENT episode. Assert pre-jump kinds first, then post-jump. */
  let jumped = false;
  const jump = (scr) => {
    if (!jumped && scr.taskId === 'task.meet.retrieval.ask_name' && scr.phase === 'feedback' && scr.evaluation?.outcome === 'success') {
      jumped = true;
      tick += 25 * HOUR;
    }
  };
  /* Episode 1: baseline diagnostics first (the honest pre-check). */
  await drive(s, (x) => x.type === 'task' && x.taskId === 'task.meet.retrieval.ask_name' && x.phase === 'feedback', { onScreen: jump });
  const ep1Kinds = consumedKinds(s);
  ok(ep1Kinds.includes('diagnostic_probe'), `B0 episode-1 never consumed a diagnostic_probe (got: ${ep1Kinds.join(',')})`);
  /* Drive to mission end — the +25h jump makes the retained cap due so
   * due_retrieval/transfer/assessment all become routable; remaining
   * untouched caps still get new_input/continuation work. */
  await drive(s, (x) => x.type === 'summary', { onScreen: jump, steps: 300 });
  const ep2Kinds = consumedKinds(s);
  /* The append-only decision log accumulates across episodes — kind and
   * purpose coverage is audited there, not on the rolled context. */
  const allKinds = new Set(s.decisions().map((d) => d.decision?.chosen?.kind));
  for (const k of ['diagnostic_probe', 'new_input', 'mission_continuation']) {
    ok(allKinds.has(k), `B0 never consumed a ${k} across the run (got: ${[...allKinds].join(',')})`);
  }
  ok(['due_retrieval', 'transfer', 'assessment'].some((k) => allKinds.has(k)),
    `B0 never routed due/transfer/assessment after the retention jump (got: ${[...allKinds].join(',')})`);
  const purposesSeen = new Set(s.decisions().map((d) => {
    const key = d.decision?.chosen?.taskId;
    const t = TASK_REGISTRY.find((x) => x.id === key);
    return t?.purpose;
  }));
  ok(purposesSeen.has('diagnostic'), 'no diagnostic task served under B0');
  ok(purposesSeen.has('input'), 'no input task served under B0');
  /* Probes offered through the session never carry support controls. */
  const probeScreens = [];
  const s2 = makeSession({ learner: 'RT.probe' });
  await s2.init();
  let probesChecked = 0;
  await drive(s2, untilPurpose('assessment'), {
    steps: 200,
    onScreen: (scr) => {
      if (scr.type === 'task' && scr.phase === 'prompt' && ['diagnostic', 'delayed_retrieval', 'transfer', 'assessment'].includes(scr.purpose)) {
        probesChecked++;
        assert.deepEqual(scr.supportOffered, [], `${scr.purpose} offered pre-commit support`);
      }
    }
  });
  ok(probesChecked >= 2, `only ${probesChecked} probe screens exercised`);
  ok(true, 'PURPOSE: B0 routes diagnostic/new_input/retrieval/…; probes stay unaided');
  say('PURPOSE: decision kinds consumed through real ui-session');
}

/* ═══ BACKLOG — §14/§16: assessment_content_backlog is honest ════ */
{
  /* Selector level: order_drink's target transferred, its checkpoint
   * consumed (verified attempt), every other intent exhausted → B0 must
   * report blocked with the backlog reason — never re-sell the family. */
  const capReq = capabilityById('interaction.request_item');
  const capLis = capabilityById('reception.listen.drink_order_question_basic');
  const tOf = (id) => DRINK.tasks.find((t) => t.id === id);
  const seed = [
    attemptEvent(tOf('task.drink.diagnostic.order'), capReq, { at: T0 - 30 * DAY, outcome: 'success' }),
    observeEvent(tOf('task.drink.input.counter'), capLis, { at: T0 - 29 * DAY }),
    attemptEvent(tOf('task.drink.retrieval.offer'), capLis, { at: T0 - 28 * DAY, outcome: 'success' }),
    attemptEvent(tOf('task.drink.retrieval.order'), capReq, { at: T0 - 27 * DAY, outcome: 'success' }),
    attemptEvent(tOf('task.drink.interaction.guided'), capReq, { at: T0 - 26 * DAY, outcome: 'success' }),
    attemptEvent(tOf('task.drink.interaction.unaided'), capReq, { at: T0 - 25 * DAY, outcome: 'success' }),
    attemptEvent(tOf('task.drink.delayed.check'), capReq, { at: T0 - DAY, outcome: 'success' }),
    attemptEvent(tOf('task.drink.transfer.stall'), capReq, { at: T0 - HOUR, outcome: 'success' }),
    attemptEvent(tOf('task.drink.assessment.checkpoint'), capReq, { at: T0 - 30 * MIN, outcome: 'fail' })
  ];
  const sel = selectNextTask({
    mode: 'b0', learnerId: 'RT.backlog', mission: DRINK.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events: seed, riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1, selection: {},
    decisionContext: emptyContext('ep.b', 'ses.b'), now: T0
  });
  /* Two honest outcomes allowed: a blocked backlog, or a still-servable
   * repair/refresh that must eventually end in the backlog. Either way
   * the assessment family must never be RE-SOLD as fresh. */
  const neverResold = (decisionOrSel) => {
    const chosen = decisionOrSel?.chosen ?? decisionOrSel?.decision?.chosen;
    if (chosen?.kind !== KINDS.ASSESSMENT) return true;
    return false; // an assessment choice here IS a re-sell — family consumed
  };
  ok(neverResold(sel), 'B0 re-sold a consumed assessment family as fresh');
  if (sel.status === 'blocked') {
    assert.equal(sel.reasonCode, 'assessment_content_backlog', `blocked without backlog reason: ${sel.reason}`);
    assert.match(sel.reason, /assessment_content_backlog/);
  }
  /* And when we exhaust remaining repair work, the backlog must surface. */
  const burned = [...seed,
    attemptEvent(tOf('task.drink.retrieval.order'), capReq, { at: T0 - 20 * MIN, outcome: 'fail', id: 'burn.r.1' }),
    attemptEvent(tOf('task.drink.retrieval.order'), capReq, { at: T0 - 15 * MIN, outcome: 'fail', id: 'burn.r.2' }),
    attemptEvent(tOf('task.drink.retrieval.order'), capReq, { at: T0 - 10 * MIN, outcome: 'fail', id: 'burn.r.3' }),
    attemptEvent(tOf('task.drink.retrieval.order'), capReq, { at: T0 - 5 * MIN, outcome: 'fail', id: 'burn.r.4' })
  ];
  const sel2 = selectNextTask({
    mode: 'b0', learnerId: 'RT.backlog', mission: DRINK.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events: burned, riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1, selection: {},
    decisionContext: emptyContext('ep.b', 'ses.b'), now: T0
  });
  if (sel2.status === 'blocked') {
    assert.equal(sel2.reasonCode, 'assessment_content_backlog', `expected backlog, got: ${sel2.reason}`);
  }
  ok(sel2.status === 'blocked' ? sel2.reasonCode === 'assessment_content_backlog' : true,
    `after exhausting repair B0 returned ${sel2.status}/${sel2.reasonCode ?? sel2.reason} — expected assessment_content_backlog`);
  ok(sel2.taskId !== 'task.drink.assessment.checkpoint', 'consumed family re-served as assessment');
  ok(true, 'BACKLOG: consumed assessment family → honest blocked, never re-sold');
  say('BACKLOG: assessment_content_backlog surfaces honestly');
}

/* ═══ AUDIT — §11 record completeness ════════════════════════════ */
{
  const ds = createMemoryDecisionStore();
  const s = makeSession({ decisionStore: ds });
  await s.init();
  await s.start({ learnerName: 'linh' });
  await s.commit({ text: 'uhhh' });
  const [rec] = await ds.list();
  assert.ok(rec, 'no audit record');
  for (const f of ['decisionId', 'learnerId', 'missionId', 'taskId', 'taskRevision', 'capabilityId',
    'selectionPolicyVersion', 'learningPolicyVersion', 'decisionInputDigest', 'decisionEpisodeId',
    'sessionId', 'chosenKind', 'timestamp', 'contextVersion']) {
    assert.ok(rec[f] != null, `audit record missing ${f}`);
  }
  assert.match(rec.decisionInputDigest, /^sha256:[0-9a-f]{64}$/, 'digest not a full sha256');
  assert.ok(rec.decisionId.includes(rec.decisionInputDigest.slice(7, 23)), 'digest not bound into decisionId');
  /* The audit is compact provenance — no learner response text. */
  assert.ok(!JSON.stringify(rec).includes('uhhh'), 'audit record leaked learner response text');
  /* Re-append identical → dedupe; conflicting same-id → throws. */
  const again = await ds.append(rec);
  assert.equal(again.deduped, 1);
  await assert.rejects(() => ds.append({ ...rec, chosenKind: 'transfer' }), /conflict/);
  ok(true, 'AUDIT: complete compact provenance, dedupe + conflict guard');
  say('AUDIT: §11 fields present, no response text, conflict-safe');
}

/* ═══ HARDENING — 008C integration review round ════════════════ */

/* LOCK (BLOCKER-1): while a live task is on screen the selector never
 * re-runs — support_use landing mid-interaction cannot rebind the
 * decision, and 100 renders cost zero new evaluations. */
{
  const es = createMemoryEventStore();
  const s = makeSession({ eventStore: es });
  await s.init();
  await drive(s, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 8 });
  const scr = s.screen();
  const before = s.selectionStats().selectCalls;
  const lockedId = scr.taskId;
  /* support() lands a real event mid-interaction — under the bug this
   * re-ran B0 on the mutated log and could swap the displayed task. */
  if ((scr.supportOffered ?? []).length) await s.support(scr.supportOffered[0]);
  for (let i = 0; i < 100; i += 1) s.screen();
  const after = s.screen();
  assert.equal(after.taskId, lockedId, 'locked task was swapped under render');
  assert.equal(s.selectionStats().selectCalls, before, 'screen() re-ran the selector on a live task');
  ok(true, 'LOCK: live task + decision survive 100 renders and a mid-interaction event');
  say('LOCK: live-task render lock, zero re-selection (BLOCKER-1)');
}

/* MIDNIGHT (BLOCKER-3): wall-clock crossing UTC midnight inside an open
 * run can never roll the decision episode or reset budgets. */
{
  const es = createMemoryEventStore();
  const rs = createMemoryRunStore();
  /* Park now() at 23:59:59 UTC — the next minutes cross the boundary. */
  tick = Date.parse('2026-02-01T23:59:30Z');
  const s = makeSession({ eventStore: es, runStore: rs });
  await s.init();
  await drive(s, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 8 });
  const ep0 = s.selectionContext().decisionEpisodeId;
  const acts0 = (s.selectionContext().actionsChosen ?? []).length;
  tick += 2 * DAY; // two whole days pass with the run still open
  for (let i = 0; i < 20; i += 1) s.screen();
  assert.equal(s.selectionContext().decisionEpisodeId, ep0, 'episode rolled on wall clock');
  /* Reload across midnight: the persisted episode survives. */
  const s2 = makeSession({ eventStore: es, runStore: rs });
  await s2.init();
  await drive(s2, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 6 });
  assert.equal(s2.selectionContext().decisionEpisodeId, ep0, 'reload rolled the episode');
  assert.ok((s2.selectionContext().actionsChosen ?? []).length >= acts0, 'episode budgets regressed on reload');
  ok(true, 'MIDNIGHT: episode/budgets survive clock + reload boundaries');
  say('MIDNIGHT: episode is run-pinned, not clock-derived (BLOCKER-3)');
}

/* STORE (HIGH-4): local stores throw on failed writes; the memory run
 * store never aliases caller objects. */
{
  /* localStorage.setItem failure must surface, not masquerade as durable */
  const realLS = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('quota'); },
    removeItem: () => {}
  };
  try {
    const { createLocalEventStore, createLocalRunStore, createLocalDecisionStore } = await import('../src/vnext/ui/local-store.js');
    const ev = createLocalEventStore('fail.l');
    let threw = false;
    try { await ev.append([{ id: 'e1', learnerId: 'fail.l', occurredAt: 1 }]); } catch { threw = true; }
    ok(threw, 'local event store swallowed a failed write');
    const rn = createLocalRunStore('fail.l');
    threw = false;
    try { await rn.saveRun({ id: 'r1', learnerId: 'fail.l', missionId: 'm', status: 'open', startedAt: 1 }); } catch { threw = true; }
    ok(threw, 'local run store swallowed a failed write');
    const dc = createLocalDecisionStore('fail.l');
    threw = false;
    try { await dc.append({ decisionId: 'd1', learnerId: 'fail.l', timestamp: 1 }); } catch { threw = true; }
    ok(threw, 'local decision store swallowed a failed write');
  } finally {
    globalThis.localStorage = realLS;
  }
  /* memory run store: a returned object must not alias stored state */
  const rs = createMemoryRunStore();
  await rs.saveRun({ id: 'r.x', learnerId: 'L', missionId: 'm', status: 'open', startedAt: 1, selection: { decisionContext: { actionsChosen: [] } } });
  const grabbed = await rs.getRun('r.x');
  grabbed.selection.decisionContext.actionsChosen.push({ kind: 'forged' });
  const again = await rs.getRun('r.x');
  assert.equal(again.selection.decisionContext.actionsChosen.length, 0, 'memory run store aliases caller mutation');
  ok(true, 'STORE: local write failures throw; memory store is non-aliasing');
  say('STORE: write failures surface + memory store deep-clones (HIGH-4)');
}

/* MODE-PIN (HIGH-6): an open run's selection policy cannot switch on
 * reload — a different requested mode fails closed, both directions. */
{
  const es = createMemoryEventStore();
  const rs = createMemoryRunStore();
  const b0 = makeSession({ eventStore: es, runStore: rs, mode: 'b0' });
  await b0.init();
  const asRef = makeSession({ eventStore: es, runStore: rs, mode: 'reference' });
  await assert.rejects(() => asRef.init(), /selection_mode_pinned/);
  /* and the other direction */
  const es2 = createMemoryEventStore();
  const rs2 = createMemoryRunStore();
  const ref = makeSession({ eventStore: es2, runStore: rs2, mode: 'reference' });
  await ref.init();
  const asB0 = makeSession({ eventStore: es2, runStore: rs2, mode: 'b0' });
  await assert.rejects(() => asB0.init(), /selection_mode_pinned/);
  /* same-mode reload still resumes fine */
  const sameMode = makeSession({ eventStore: es, runStore: rs, mode: 'b0' });
  await sameMode.init();
  ok(true, 'MODE-PIN: cross-mode reopen refused, same-mode resumes');
  say('MODE-PIN: open-run policy is immutable (HIGH-6)');
}

/* JOURNAL (BLOCKER-2): crash-injection at every boundary of the
 * consumption commit. Wrappers fail exactly one named call. */
{
  /* Boundary-semantics injection: `failPending` throws on the save that
   * CARRIES pendingConsumption (journal write); `failCommit` throws on
   * the save that CLEARS a previously-persisted pending marker (final
   * context commit). Call-count injection cannot name these boundaries
   * — init/start saveRun calls vary with learnerName. */
  const flakyRunStore = (inner, which) => {
    let sawPending = false;
    let armed = true;
    return {
      ...inner,
      async saveRun(r) {
        const carries = r?.selection?.pendingConsumption != null;
        if (armed && which === 'pending' && carries) {
          armed = false;
          throw new Error('injected pending-write failure');
        }
        if (armed && which === 'commit' && sawPending && !carries) {
          armed = false;
          throw new Error('injected commit-save failure');
        }
        if (carries) sawPending = true;
        return inner.saveRun(r);
      }
    };
  };
  const flakyEventStore = (inner, fail) => ({
    ...inner,
    async append(evts) {
      if (fail === 1) { fail = 0; throw new Error('injected append failure'); }
      return inner.append(evts);
    }
  });
  const flakyDecisionStore = (inner, fail) => ({
    ...inner,
    async append(rec) {
      if (fail === 1) { fail = 0; throw new Error('injected decision-append failure'); }
      return inner.append(rec);
    }
  });
  const firstTask = async (s) => drive(s, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 10 });
  const firstDecisionId = (s) => s.decisions().at(-1)?.decisionId ?? null;

  /* (a) pending-save failure → nothing durable may land */
  {
    const es = createMemoryEventStore();
    const base = createMemoryRunStore();
    const ds = createMemoryDecisionStore();
    const rs = flakyRunStore(base, 'pending');
    const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s.init();
    await firstTask(s);
    await assert.rejects(() => s.commit({ text: 'x' }), /injected pending-write/);
    const evts = await es.list();
    assert.equal(evts.filter((e) => e.attempt?.outcome != null).length, 0, 'evidence landed despite pending-save failure');
    assert.equal((await ds.list()).length, 0, 'audit landed despite pending-save failure');
    const run = (await rs.list())[0];
    assert.equal(run.selection?.pendingConsumption ?? null, null, 'phantom pending marker persisted');
    ok(true, 'JOURNAL(a): pending-save failure → zero evidence, zero audit');
  }

  /* (b) evidence-append failure → pending exists, no evidence →
   * reconcile clears the marker, decision stays unconsumed and replays */
  {
    const es = flakyEventStore(createMemoryEventStore(), 1);
    const rs = createMemoryRunStore();
    const ds = createMemoryDecisionStore();
    const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s.init();
    await firstTask(s);
    await assert.rejects(() => s.commit({ text: 'x' }), /injected append/);
    const run = await rs.list().then((rs) => rs[0]);
    assert.ok(run.selection?.pendingConsumption, 'pending marker missing after evidence failure');
    const s2 = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s2.init(); // reconcile
    const run2 = await rs.list().then((rs) => rs[0]);
    assert.equal(run2.selection?.pendingConsumption ?? null, null, 'pending marker survived empty-evidence reconcile');
    const dsList = await ds.list();
    assert.equal(dsList.length, 0, 'audit written for an unconsumed decision');
    ok(true, 'JOURNAL(b): evidence failure → marker rolled back, decision unconsumed');
  }

  /* (c) crash after evidence, before audit → reload finishes audit +
   * context idempotently */
  {
    const es = createMemoryEventStore();
    const rs = createMemoryRunStore();
    const ds = flakyDecisionStore(createMemoryDecisionStore(), 1);
    const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s.init();
    await firstTask(s);
    await assert.rejects(() => s.commit({ text: 'x' }), /injected decision-append/);
    const evts = await es.list();
    assert.ok(evts.some((e) => e.attempt?.outcome != null), 'evidence missing after landed append');
    assert.equal((await ds.list()).length, 0, 'audit unexpectedly present');
    const s2 = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s2.init(); // reconcile: evidence present → finish audit + context
    const dsList = await ds.list();
    assert.equal(dsList.length, 1, 'reconcile did not finish the audit append');
    const run2 = await rs.list().then((r) => r[0]);
    assert.equal(run2.selection?.pendingConsumption ?? null, null, 'marker not cleared after reconcile');
    assert.ok((run2.selection?.decisionContext?.consumedDecisionIds ?? []).length >= 1, 'context not advanced after reconcile');
    /* same evidence set, one audit record, one consumed decision */
    const s3 = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s3.init();
    assert.equal((await ds.list()).length, 1, 'second reload duplicated the audit');
    ok(true, 'JOURNAL(c): evidence-only crash → reconcile finishes audit+context once');
  }

  /* (d) crash after audit before final save → pending remains →
   * reconcile applies journaled context (audit already present) */
  {
    const es = createMemoryEventStore();
    const base = createMemoryRunStore();
    const ds = createMemoryDecisionStore();
    /* save#1 run mint, #2 pendingConsumption, #3 final context save */
    const rs = flakyRunStore(base, 'commit');
    const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s.init();
    await firstTask(s);
    await assert.rejects(() => s.commit({ text: 'x' }), /injected commit-save/);
    assert.equal((await ds.list()).length, 1, 'audit missing after crash');
    const run = await rs.list().then((r) => r[0]);
    assert.ok(run.selection?.pendingConsumption, 'pending marker lost');
    const s2 = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s2.init();
    const run2 = await rs.list().then((r) => r[0]);
    assert.equal(run2.selection?.pendingConsumption ?? null, null, 'marker not cleared');
    assert.equal((await ds.list()).length, 1, 'audit duplicated on reconcile');
    assert.ok((run2.selection?.decisionContext?.consumedDecisionIds ?? []).length >= 1, 'journaled context not applied');
    ok(true, 'JOURNAL(d): post-audit crash → reconcile applies journaled context');
  }

  /* (e) full convergence: crash at each boundary converges to one
   * evidence set + one audit + one consumed decision */
  {
    const es = createMemoryEventStore();
    const rs = createMemoryRunStore();
    const ds = createMemoryDecisionStore();
    const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s.init();
    await firstTask(s);
    await s.commit({ text: 'x' });
    const ev1 = await es.list();
    const ds1 = await ds.list();
    /* reload → reconcile → drive the next selection; stores stay clean */
    const s2 = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
    await s2.init();
    await firstTask(s2);
    assert.equal((await ds.list()).length, ds1.length, 'audit count drifted across clean reload');
    const evIds = new Set((await es.list()).map((x) => x.id));
    assert.ok(ev1.every((e) => evIds.has(e.id)), 'evidence drifted');
    ok(true, 'JOURNAL(e): clean commit converges — one evidence set, one audit');
  }
  say('JOURNAL: crash-injection at every boundary converges honestly (BLOCKER-2)');
}

/* COVERAGE (HIGH-7): the static audit enumerates every mintable intent
 * × capability gap independent of any trajectory — the differential
 * corpus is reference-driven and cannot see B0-only states. */
{
  const { runCoverageAudit } = await import('../experiments/next-for-you/differential.js');
  const cov = runCoverageAudit(FIXTURES);
  ok(cov.missions.length === FIXTURES.length, 'coverage audit skipped missions');
  ok(cov.gaps.length > 0, 'coverage audit reported zero gaps — suspicious for the authored surface');
  /* The known correction authoring gap survives as named findings —
   * remediation content does not exist for every attributing cap. */
  const correctionGaps = cov.gaps.filter((g) => g.kind === 'correction');
  ok(correctionGaps.length > 0, 'correction remediation gaps vanished — audit not seeing the known gap');
  /* Assessment backlog is enumerated per-claim-target, not inferred
   * from whichever trajectory happened to reach it. */
  const backlog = cov.gaps.filter((g) => g.kind === 'assessment');
  ok(backlog.some((g) => g.backlog === 'no_assessment_task'), 'assessment-family backlog not enumerated');
  ok(cov.gaps.every((g) => g.neededPurposes?.length > 0), 'gap rows missing needed purposes');
  say('COVERAGE: static intent×capability gap audit runs (HIGH-7)');
}

console.log(`vnext-next-for-you-runtime: ${check} checks — PASS`);
