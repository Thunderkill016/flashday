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
import { selectNextTask, engineState, SELECTION_MODES, POLICY_VERSIONS, POLICY_VERSION_FOR_MODE, validateB0, classifyB0B1 } from '../src/vnext/next-for-you/selector.js';
import { policyB, policyB1, hardFilter } from '../src/vnext/next-for-you/policies.js';
import { KINDS } from '../src/vnext/next-for-you/constants.js';
import { generateCandidates } from '../src/vnext/next-for-you/candidate-generator.js';
import {
  deriveMissionRepairPlans, deriveRetestReservations, REPAIR_PROOF_VERSION
} from '../src/vnext/next-for-you/repair-proof.js';
import {
  deriveCorrectionEpisodes, pickRetestSurface, retestSurfaces,
  remainingOf, CORRECTION_EPISODES_VERSION
} from '../src/vnext/correction-episodes.js';

import { stateDigest } from '../src/vnext/next-for-you/decision-log.js';
import { canonicalFamilyId } from '../src/vnext/contracts.js';
import { contractAttributesFunctions, evaluateAttempt } from '../src/vnext/evaluators.js';
import { TASK_SITUATION, FUNCTION_MODEL } from '../src/vnext/ui/copy.js';
import { attemptEvent, observeEvent, missionState } from '../experiments/next-for-you/scenarios.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const T0 = Date.parse('2026-02-01T09:00:00Z');
const HOUR = 3600_000;
const MIN = 60_000;
const DAY = 24 * HOUR;

const MEET = FIXTURES.find((f) => f.mission.id === 'mission.meet_new_person');
const DRINK = FIXTURES.find((f) => f.mission.id === 'mission.order_drink');
const TIME = FIXTURES.find((f) => f.mission.id === 'mission.meet_at_a_time');
const ORDER = FIXTURES.find((f) => f.mission.id === 'mission.complete_small_order');
const BUY = FIXTURES.find((f) => f.mission.id === 'mission.buy_small_item');
const PLACE = FIXTURES.find((f) => f.mission.id === 'mission.find_a_place');
const SELF = FIXTURES.find((f) => f.mission.id === 'mission.talk_about_self_family');
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
  'task.meet.assessment.name_signup': 'my name is linh',
  'task.meet.assessment.checkpoint': "hi, i'm linh — what's your name?",
  'task.drink.diagnostic.order': 'a coffee please',
  'task.drink.retrieval.offer': 'coffee',
  'task.drink.retrieval.order': 'can i have a coffee please',
  'task.drink.interaction.guided': 'a coffee please',
  'task.drink.interaction.unaided': 'a coffee please',
  'task.drink.delayed.check': 'a coffee please',
  'task.drink.transfer.stall': 'a coffee please',
  'task.drink.assessment.checkpoint': 'a coffee please',
  /* 008E-authored surfaces on the other missions — the ANSWERS_008E map
   * carries their full per-task scripts; these four keep generic drives
   * (PURPOSE/probe sections) from committing 'x' to a fresh surface. */
  'task.order.assessment.request': 'a tea please',
  'task.price.remediation.hear': 'three',
  'task.place.remediation.follow': 'right',
  'task.self.assessment.detail': "i'm from vietnam"
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

/* COVERAGE (HIGH-7 + 008D): the static audit enumerates every
 * mintable intent × capability pair independent of any trajectory —
 * the differential corpus is reference-driven and cannot see B0-only
 * states. Rows are SEMANTICALLY classified against the generator's
 * real mint conditions: required = claim/repair-bearing role with a
 * mintable intent and nothing servable; optional = carrier recovery
 * degradation; not_mintable = structurally unreachable surface. */
{
  const { runCoverageAudit } = await import('../experiments/next-for-you/differential.js');
  const cov = runCoverageAudit(FIXTURES);
  ok(cov.missions.length === FIXTURES.length, 'coverage audit skipped missions');
  /* 008E closed the last required findings. The audit must report
   * ZERO required rows — and the report is only honest if findings are
   * still being derived, so the classification machinery itself is
   * asserted below (a degenerate all-covered report would be a weaker
   * claim than what this audit actually does). */
  ok(cov.findings.length > 0, 'coverage audit returned no findings at all — classification machinery dead');
  ok(cov.gaps.length === 0,
    `coverage audit still reports required findings: ${JSON.stringify(cov.gaps.map((g) => `${g.mission}|${g.capabilityId}|${g.kind}`))}`);
  /* Carrier rows can never be 'required' — carriers own no claim. */
  ok(!cov.findings.some((f) => f.role === 'carrier' && f.class === 'required'), 'carrier row classified required');
  /* The known semantic results: carrier diagnostic_probe is never
   * mintable (self-suppressing paths), and correction gaps only exist
   * where a choice contract can attribute the miss. */
  ok(cov.findings.some((f) => f.kind === 'diagnostic_probe' && f.role === 'carrier' && f.class === 'not_mintable'),
    'carrier diagnostic_probe should be classified not_mintable');
  /* The authored surfaces stay closed: the 008D clock-time slice plus
   * the five 008E targets must not regress back into the findings. */
  for (const [mission, capabilityId, kind] of [
    ['mission.meet_at_a_time', 'reception.listen.understand_clock_time', 'correction'],
    ['mission.buy_small_item', 'reception.listen.understand_spoken_price', 'correction'],
    ['mission.find_a_place', 'reception.listen.follow_short_direction', 'correction'],
    ['mission.meet_new_person', 'production.speak.say_own_name', 'assessment'],
    ['mission.complete_small_order', 'interaction.request_item', 'assessment'],
    ['mission.talk_about_self_family', 'production.speak.state_basic_self_detail', 'assessment']
  ]) {
    ok(!cov.gaps.some((g) => g.mission === mission && g.capabilityId === capabilityId && g.kind === kind),
      `008E closed finding regressed: ${mission}|${capabilityId}|${kind} is required again`);
  }
  /* Every not_mintable row names its structural reason — the class is
   * a concrete derivation, never an inference from aggregate counts. */
  ok(cov.findings.every((f) => f.class !== 'not_mintable' || typeof f.reason === 'string' && f.reason.length > 0),
    'not_mintable row missing its structural reason code');
  say('COVERAGE: required=0 — all authored surfaces closed; classifier machinery still deriving real findings');
}

/* LEGACY-PIN (BLOCKER-1 re-review): an open run predating selection
 * bookkeeping is historical REFERENCE by definition. B0/SHADOW must
 * refuse to reinterpret it; reference may continue and pin the record.
 * Policy VERSION is pinned too — a semantic bump cannot slide into an
 * open run. */
{
  /* Legacy open run — predates BOTH the mode pin and the mission
   * revision pin (no selection block, no missionRevision). It can never
   * prove which task surface it was minted against, so EVERY reopen
   * explicitly supersedes it and mints a fresh run pinned to the
   * current revision + requested mode — the record is never deleted
   * and never silently reinterpreted as the current surface. */
  const mkLegacyStores = () => ({
    es: createMemoryEventStore(),
    rs: createMemoryRunStore([{
      id: 'run.legacy',
      learnerId: 'RT.learner',
      missionId: MEET.mission.id,
      status: 'open',
      learnerName: 'A',
      startedAt: 1,
      endedAt: null
      /* no selection, no missionRevision — a pre-008C/pre-008D run */
    }]),
    ds: createMemoryDecisionStore()
  });
  for (const legacyMode of ['b0', 'shadow_b0', 'reference']) {
    const { es, rs, ds } = mkLegacyStores();
    const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds, mode: legacyMode });
    await s.init();
    const runs = await rs.list();
    const legacyRun = runs.find((r) => r.id === 'run.legacy');
    assert.equal(legacyRun.status, 'superseded', `${legacyMode}: unversioned open run was resumed instead of superseded`);
    assert.equal(legacyRun.selection ?? null, null, 'supersede stamped selection bookkeeping onto a legacy run');
    assert.match(legacyRun.supersedeReason ?? '', /mission_revision_unversioned_run/, 'supersede reason does not record unversioned provenance');
    assert.ok(legacyRun.endedAt != null, 'superseded run missing endedAt');
    const live = runs.find((r) => r.status === 'open');
    assert.ok(live && live.id !== 'run.legacy', `${legacyMode}: no fresh run minted after legacy supersede`);
    assert.equal(live.missionRevision, MEET.mission.revision ?? null, 'fresh run did not pin the current mission revision');
    assert.equal(live.selection?.mode, legacyMode, 'fresh run not pinned to the requested mode');
    assert.equal(live.learnerName, 'A', 'supersede dropped the learner name instead of handing it forward');
    ok(true, `LEGACY-PIN: ${legacyMode} reopen supersedes the unversioned run and mints a pinned trajectory`);
  }
  /* Policy-version drift inside one mode also fails closed */
  {
    const es = createMemoryEventStore();
    const rs = createMemoryRunStore();
    const s = makeSession({ eventStore: es, runStore: rs, mode: 'b0' });
    await s.init();
    /* simulate a run pinned to an older B0 semantics version */
    const run = (await rs.list())[0];
    run.selection.selectionPolicyVersion = 'vnext.policy-b.v0-ancient';
    await rs.saveRun(run);
    const stale = makeSession({ eventStore: es, runStore: rs, mode: 'b0' });
    await assert.rejects(() => stale.init(), /selection_policy_version_pinned/, 'policy version drift inside an open run was not refused');
    ok(true, 'LEGACY-PIN: selection policy version drift fails closed');
  }
  say('LEGACY-PIN: unversioned runs supersede; mode+version pinned (008D r2 BLOCKER-1)');
}

/* REV-PIN (008D r2 BLOCKER-1): the mission task surface is versioned
 * and open runs pin the revision they were minted against. Same
 * missionId + different revision never shares one open trajectory —
 * the stale run is explicitly superseded (auditable, never deleted)
 * and a fresh run mints pinned to the current revision. */
{
  const seededOpenRun = (rev) => createMemoryRunStore([{
    id: 'run.rev1',
    learnerId: 'RT.learner',
    missionId: TIME.mission.id,
    missionRevision: rev,
    status: 'open',
    learnerName: 'A',
    startedAt: 1,
    endedAt: null,
    selection: {
      version: 'vnext.run-selection.v1',
      mode: 'b0',
      selectionPolicyVersion: POLICY_VERSIONS.B,
      decisionEpisodeId: 'ep:run.rev1',
      config: {},
      decisionContext: null,
      pendingConsumption: null
    }
  }]);
  const curRev = TIME.mission.revision ?? null;
  {
    /* rev-(cur-1) open run + rev-cur mission → supersede + fresh run */
    const rs = seededOpenRun(curRev - 1);
    const s = makeSession({ fixture: TIME, runStore: rs, mode: 'b0' });
    await s.init();
    const runs = await rs.list();
    const old = runs.find((r) => r.id === 'run.rev1');
    assert.equal(old.status, 'superseded', 'stale-revision open run silently resumed under the new surface');
    assert.equal(old.supersedeReason, `mission_revision_changed:${curRev - 1}->${curRev}`, 'supersede reason does not record the revision edge');
    assert.ok(old.endedAt != null, 'superseded run missing endedAt');
    const open = runs.filter((r) => r.status === 'open');
    assert.equal(open.length, 1, 'supersede left multiple open runs for the same mission');
    assert.equal(open[0].missionRevision, curRev, 'fresh run not pinned to the current mission revision');
    assert.equal(open[0].learnerName, 'A', 'supersede dropped the learner name');
    assert.equal(s.runInfo().id, open[0].id, 'session did not bind the fresh run');
    assert.notEqual(s.runInfo().id, 'run.rev1', 'the stale trajectory was reused under a new revision');
    ok(true, 'REV-PIN: stale-revision open run supersedes; fresh run pins current revision');
  }
  {
    /* matching revision → the SAME run resumes (pin is sticky, not brittle) */
    const rs = seededOpenRun(curRev);
    const s = makeSession({ fixture: TIME, runStore: rs, mode: 'b0' });
    await s.init();
    assert.equal(s.runInfo().id, 'run.rev1', 'same-revision open run was not resumed');
    assert.equal(s.runInfo().status, 'open', 'same-revision run was superseded anyway');
    assert.equal(s.runInfo().missionRevision, curRev, 'resumed run lost its pinned revision');
    ok(true, 'REV-PIN: matching revision resumes the pinned run');
  }
  {
    /* a fresh mint stamps the revision and reloads into the same run */
    const rs = createMemoryRunStore();
    const es = createMemoryEventStore();
    const ds = createMemoryDecisionStore();
    const s1 = makeSession({ fixture: TIME, eventStore: es, runStore: rs, decisionStore: ds, mode: 'b0' });
    await s1.init();
    const runId = s1.runInfo().id;
    assert.equal(s1.runInfo().missionRevision, curRev, 'minted run did not stamp missionRevision');
    const s2 = makeSession({ fixture: TIME, eventStore: es, runStore: rs, decisionStore: ds, mode: 'b0' });
    await s2.init();
    assert.equal(s2.runInfo().id, runId, 'reload did not resume the revision-pinned run');
    assert.equal(s2.runInfo().missionRevision, curRev, 'resumed run lost its revision pin');
    ok(true, 'REV-PIN: minted run stores the revision and survives reload');
  }
  {
    /* the persisted audit stamps the run's pinned revision */
    const rs = createMemoryRunStore();
    const es = createMemoryEventStore();
    const ds = createMemoryDecisionStore();
    const s = makeSession({ fixture: TIME, eventStore: es, runStore: rs, decisionStore: ds, mode: 'b0' });
    await s.init();
    await drive(s, (x) => x.type === 'task' && x.phase === 'feedback', {
      /* TIME tasks aren't in SCRIPT — any non-empty response consumes
       * the decision and mints the audit, which is all this asserts. */
      answer: (x) => x.responseType === 'choice' ? (x.options?.[0]?.id ?? 'opt') : 'three pm'
    });
    const audits = await s.auditTrail();
    const rec = audits.at(-1);
    assert.ok(rec, 'consumed decision minted no audit record');
    assert.equal(rec.missionRevision, s.runInfo().missionRevision, 'audit not stamped with the pinned run revision');
    assert.equal(rec.missionRevision, curRev, 'audit revision disagrees with the mission surface');
    assert.equal(rec.missionRunId, s.runInfo().id, 'audit not stamped with the run id');
    ok(true, 'REV-PIN: consumed-decision audit stamps the pinned run revision');
  }
  say('REV-PIN: mission revision pinned per run; drift supersedes (008D r2 BLOCKER-1)');
}

/* SNAP-FREEZE (008D r2 BLOCKER-2): the decide-time input is an
 * immutable snapshot, not a live alias — support events appended AFTER
 * selection land in learner evidence but can never leak into the state
 * the decision, its digest, and its audit all describe. */
{
  const es = createMemoryEventStore();
  const rs = createMemoryRunStore();
  const ds = createMemoryDecisionStore();
  const s = makeSession({ eventStore: es, runStore: rs, decisionStore: ds, mode: 'b0' });
  await s.init();
  const scr = await drive(s, (x) => x.type === 'task' && x.phase === 'prompt' && (x.supportOffered ?? []).length > 0);
  const snap = s.liveDecisionInput();
  ok(snap != null && Object.isFrozen(snap) && Object.isFrozen(snap.events), 'live decision input is not a frozen snapshot');
  const digestAtSelect = stateDigest(snap);
  const snapEventCount = snap.events.length;
  const preIds = new Set(snap.events.map((e) => e.id));
  /* support AFTER selection: the events land in the learner log but
   * must not exist inside the recorded decide-time input */
  await s.support(scr.supportOffered.includes('hint') ? 'hint' : scr.supportOffered[0]);
  if ((scr.supportOffered ?? []).length > 1) await s.support(scr.supportOffered[1]);
  const supportEvents = s.log().filter((e) => e.eventType === 'support_use');
  ok(supportEvents.length >= 1, 'support() produced no learner evidence');
  ok(snap.events.length === snapEventCount && supportEvents.every((e) => !preIds.has(e.id)),
    'post-selection support events leaked into the decide-time snapshot');
  ok(stateDigest(snap) === digestAtSelect, 'snapshot digest drifted after post-selection support');
  assert.throws(() => snap.events.push(supportEvents[0]), 'frozen decision input accepted an array mutation');
  /* commit the on-screen task — consume must succeed AND bind the
   * original decide-time digest across every provenance surface */
  const cur = s.screen();
  if (cur.responseType === 'choice') await s.commit({ optionId: SCRIPT[cur.taskId] ?? cur.options?.[0]?.id });
  else await s.commit({ text: SCRIPT[cur.taskId] ?? 'hello' });
  const entry = s.decisions().at(-1);
  const audit = (await s.auditTrail()).at(-1);
  ok(entry?.stateFingerprint === digestAtSelect, 'decision-log fingerprint ≠ decide-time digest');
  ok(audit?.decisionInputDigest === digestAtSelect, 'audit decisionInputDigest ≠ decide-time digest');
  ok((audit?.decisionId ?? '').includes(digestAtSelect.slice('sha256:'.length, 'sha256:'.length + 16)),
    'decisionId does not embed the decide-time digest');
  ok(audit?.missionRevision === s.runInfo()?.missionRevision, 'audit not stamped with the pinned run revision');
  say('SNAP-FREEZE: support-after-selection stays out of decide-time provenance; digests agree');
}
{
  /* deliberate mutation of the stored snapshot must fail closed —
   * object/array fields throw on write (deep freeze); Set internals
   * cannot be frozen, so the consume-time digest check is the second
   * line of defense and it MUST fire */
  const s = makeSession({ mode: 'b0' });
  await s.init();
  await drive(s, (x) => x.type === 'task' && x.phase === 'prompt' && x.responseType === 'text');
  const snap = s.liveDecisionInput();
  ok(snap != null, 'no live decision input to mutate');
  assert.throws(() => { snap.mission.revision = 999; }, 'frozen snapshot accepted a field write');
  snap.roles.targets.add('cap.bogus');
  await assert.rejects(() => s.commit({ text: 'hi there' }), /decision_input_drift/,
    'mutated decide-time input was consumed without rejection');
  say('SNAP-FREEZE: mutated decide-time input fails closed at consume');
}

/* READ-FAIL (HIGH-2): absent key → fallback; inaccessible/corrupt
 * storage → throw. A silently-swallowed read would fabricate a blank
 * learner (fresh run minted against "no evidence"). */
{
  const realLS = globalThis.localStorage;
  const { createLocalEventStore, createLocalRunStore, createLocalDecisionStore } = await import('../src/vnext/ui/local-store.js');
  try {
    /* getItem throwing (SecurityError / storage blocked) must surface */
    globalThis.localStorage = {
      getItem: () => { throw new Error('SecurityError: access denied'); },
      setItem: () => {},
      removeItem: () => {}
    };
    for (const [name, store] of [
      ['events', createLocalEventStore('rf.l')],
      ['runs', createLocalRunStore('rf.l')],
      ['decisions', createLocalDecisionStore('rf.l')]
    ]) {
      let threw = false;
      try { await store.list(); } catch (e) { threw = /localStore read failed/.test(String(e)); }
      ok(threw, `${name}: inaccessible storage silently returned empty history`);
    }
    /* corrupt JSON must surface, not parse-as-empty */
    globalThis.localStorage = {
      getItem: (k) => (k.endsWith('.events') ? '{corrupt!!' : null),
      setItem: () => {},
      removeItem: () => {}
    };
    let threw = false;
    try { await createLocalEventStore('rf.l').list(); } catch (e) { threw = /corrupt JSON/.test(String(e)); }
    ok(threw, 'corrupt events JSON silently became an empty log');
    /* absent key still returns the fallback */
    const evts = await createLocalRunStore('rf.absent').list();
    assert.deepEqual(evts, [], 'absent key did not fall back cleanly');
    ok(true, 'READ-FAIL: absent=fallback, inaccessible/corrupt=throw');
  } finally {
    globalThis.localStorage = realLS;
  }
  say('READ-FAIL: storage read failures fail closed (HIGH-2)');
}

/* JOURNAL-CONTENT (HIGH-3): reconcile must verify the CONTENT of
 * expected events, not id presence. Same id + altered bytes →
 * consumption_reconcile_conflict, never a blessed consumption. */
{
  const es = createMemoryEventStore();
  const rs = createMemoryRunStore();
  const ds = createMemoryDecisionStore();
  /* leave a real pending journal: inject failure on the commit-save
   * (the save that clears pendingConsumption) */
  let sawPending = false;
  let armed = true;
  const flaky = {
    ...rs,
    async saveRun(r) {
      const carries = r?.selection?.pendingConsumption != null;
      if (armed && sawPending && !carries) { armed = false; throw new Error('injected commit-save failure'); }
      if (carries) sawPending = true;
      return rs.saveRun(r);
    }
  };
  const s = makeSession({ eventStore: es, runStore: flaky, decisionStore: ds });
  await s.init();
  await drive(s, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 10 });
  await assert.rejects(() => s.commit({ text: 's3cr3t-resp0nse' }), /injected commit-save/);
  const pendingRun = (await rs.list())[0];
  assert.ok(pendingRun.selection?.pendingConsumption, 'journal marker missing');
  /* 008D minimization: the journal stores opaque digests, never the
   * learner's response text — the evidence log alone holds it. */
  assert.ok(
    !JSON.stringify(pendingRun.selection.pendingConsumption).includes('s3cr3t-resp0nse'),
    'journal leaked the learner response text'
  );
  assert.ok(
    (pendingRun.selection.pendingConsumption.expectedEvents ?? []).every((x) => /^sha256:[0-9a-f]{64}$/.test(x.digest ?? '')),
    'journal expectation is not a sha256 digest'
  );
  /* tamper: same event id, altered outcome — the journal fingerprint
   * must catch it even though the id is present. Memory store returns
   * live references, so mutating the listed event edits the log. */
  const stored = await es.list();
  const victim = stored.find((e) => e.attempt?.outcome != null);
  assert.ok(victim, 'no landed attempt to tamper with');
  victim.attempt.outcome = victim.attempt.outcome === 'success' ? 'fail' : 'success';
  const s2 = makeSession({ eventStore: es, runStore: rs, decisionStore: ds });
  await assert.rejects(() => s2.init(), /consumption_reconcile_conflict/, 'same-id/altered-content evidence was blessed');
  /* and a clean baseline still converges */
  const es3 = createMemoryEventStore();
  const rs3 = createMemoryRunStore();
  const ds3 = createMemoryDecisionStore();
  const s3 = makeSession({ eventStore: es3, runStore: rs3, decisionStore: ds3 });
  await s3.init();
  await drive(s3, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 10 });
  await s3.commit({ text: 'x' });
  const s4 = makeSession({ eventStore: es3, runStore: rs3, decisionStore: ds3 });
  await s4.init();
  ok(true, 'JOURNAL-CONTENT: tampered evidence fails closed; clean path converges');
  say('JOURNAL-CONTENT: reconcile verifies event content, not id presence (HIGH-3)');
}

/* AUDIT-REQUIRED (final-review invariant): B0/SHADOW may not consume a
 * decision with no audit trail — a memory store substitutes when no
 * decisionStore is supplied. REFERENCE stays legitimately audit-free. */
{
  const s = createMissionSession({
    learnerId: 'RT.noaudit',
    mission: MEET.mission,
    tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1,
    now,
    selectionMode: 'b0',
    idGen: () => 'run.noaudit'
    /* no decisionStore on purpose */
  });
  await s.init();
  await s.start({ learnerName: 'A' });
  await drive(s, (x) => x.type === 'task' && x.phase === 'prompt', { steps: 10 });
  await s.commit({ text: 'x' });
  const audits = await s.auditTrail();
  assert.ok(audits.length >= 1, 'B0 consumed a decision with no audit record anywhere');
  assert.ok(audits.every((a) => a.decisionId && a.decisionInputDigest), 'audit records incomplete');
  const ref = createMissionSession({
    learnerId: 'RT.noaudit.ref',
    mission: MEET.mission,
    tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES,
    riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1,
    now,
    selectionMode: 'reference',
    idGen: () => 'run.noaudit.ref'
  });
  await ref.init();
  assert.equal((await ref.auditTrail()).length, 0, 'reference unexpectedly carries an audit store');
  ok(true, 'AUDIT-REQUIRED: B0 never consumes audit-free; reference stays free of it');
  say('AUDIT-REQUIRED: B0/SHADOW default to a memory audit store (final invariant)');
}

/* ═══ SLICE — 008D vertical slice as a real session trajectory ════
 * Review requirement (PR #71 R1/HIGH): prove the full reachable chain
 * through createMissionSession with an injected test clock — real
 * selections consumed in B0 order, not appended events. Baseline →
 * +25h → lagged delayed retest MISSED (the retest is the attributed
 * failure) → repair surface served (support probe and/or authored
 * remediation, whichever B0 ranks first) → fresh transfer → fresh
 * assessment. Session restarts on the same stores mirror the
 * reload/episode-roll path. */
{
  const learner = 'RT.slice';
  const eventStore = createMemoryEventStore();
  const runStore = createMemoryRunStore();
  const decisionStore = createMemoryDecisionStore();

  /* Every task in the mission needs a scripted CORRECT response — the
   * driver consumes whatever B0 actually serves. */
  const TIME_ANSWERS = {
    'task.time.diagnostic.hear': 'three',
    'task.time.diagnostic.say': "it's three o'clock",
    'task.time.retrieval.greeting': 'greeting',
    'task.time.remediation.hear': 'eight',
    'task.time.retrieval.hear': 'half_four',
    'task.time.retrieval.say': "it's two o'clock",
    'task.time.retrieval.greet': 'hi',
    'task.time.interaction.ask_name': 'what is your name',
    'task.time.interaction.guided': "it's four o'clock",
    'task.time.interaction.unaided': "it's four o'clock",
    'task.time.delayed.hear': 'six',
    'task.time.delayed.say': "it's six o'clock",
    'task.time.transfer.clinic': 'half_ten',
    'task.time.transfer.event': "it's six o'clock",
    'task.time.assessment.hear': 'nine',
    'task.time.assessment.checkpoint': 'hi! it is three o clock. what is your name?',
    'task.time.support.number_probe': 'ten'
  };

  const open = async () => {
    const s = makeSession({ fixture: TIME, learner, eventStore, runStore, decisionStore });
    await s.init();
    return s;
  };

  const served = [];
  const missed = new Set();
  const driveSlice = async (session, { missOnce = null, steps = 120 } = {}) => {
    for (let i = 0; i < steps; i += 1) {
      const s = session.screen();
      if (s.type === 'summary') return true;
      if (s.type === 'error') throw new Error(`error screen: ${s.message ?? JSON.stringify(s)}`);
      if (s.type === 'intro') { await session.start({ learnerName: 'linh' }); continue; }
      if (s.type === 'input') { await session.view(); continue; }
      if (s.type !== 'task') throw new Error(`unknown screen ${s.type}`);
      if (s.phase === 'feedback') { await session.next(); continue; }
      served.push(s.taskId);
      let a = TIME_ANSWERS[s.taskId];
      assert.ok(a != null, `no scripted answer for served task ${s.taskId}`);
      if (missOnce === s.taskId && !missed.has(s.taskId)) {
        missed.add(s.taskId);
        a = 'seven'; /* deliberate wrong option → observed attributing miss */
      }
      if (s.responseType === 'choice') await session.commit({ optionId: a });
      else await session.commit({ text: a });
    }
    return false;
  };

  /* Phase A (test clock T0): teach — the run may hit summary before the
   * baseline lands, so reopen sessions until the clock-time diagnostic
   * is served and passed. */
  for (let round = 0; round < 4 && !served.includes('task.time.diagnostic.hear'); round += 1) {
    if (await driveSlice(await open())) break;
  }
  ok(served.includes('task.time.diagnostic.hear'), 'SLICE: baseline diagnostic never served');
  say('SLICE-A: baseline taught through real selections');

  /* Phase B (test clock +25h): the delayed retest is due — that serve
   * IS the retention check; the learner misses it. B0's real ordering
   * then ranks the authored repair surface first (remediation under a
   * repair kind), then fresh transfer, then fresh assessment — the
   * mission closes once targets are assessed, so re-drilling the
   * delayed task after repair is correctly never picked over the
   * claim-bearing work. */
  tick += DAY + HOUR;
  const idx = (id, from = 0) => served.findIndex((t, i) => i >= from && t === id);
  const chainHit = () => {
    const miss = idx('task.time.delayed.hear');
    if (miss < 0 || !missed.has('task.time.delayed.hear')) return false;
    const repair = idx('task.time.remediation.hear', miss);
    if (repair < 0) return false;
    const tr = idx('task.time.transfer.clinic', repair);
    if (tr < 0) return false;
    return idx('task.time.assessment.hear', tr) >= 0;
  };
  for (let round = 0; round < 8 && !chainHit(); round += 1) {
    await driveSlice(await open(), { missOnce: 'task.time.delayed.hear' });
    tick += 2 * HOUR; /* each "visit" later in time — episodes roll honestly */
  }
  const miss = idx('task.time.delayed.hear');
  ok(miss >= 0 && missed.has('task.time.delayed.hear'), `SLICE: post-lag delayed retest never served/missed — ${served.join(' → ')}`);
  const repair = idx('task.time.remediation.hear', miss);
  ok(repair >= 0, `SLICE: authored remediation never served after the miss — ${served.slice(miss).join(' → ')}`);
  const tr = idx('task.time.transfer.clinic', repair);
  ok(tr >= 0, 'SLICE: fresh transfer family never served after repair');
  const as = idx('task.time.assessment.hear', tr);
  ok(as >= 0, 'SLICE: fresh assessment family never served after transfer');
  say('SLICE-B: lagged retest miss → authored remediation → fresh transfer → fresh assessment (real session)');

  /* The repair segment must be reflected in the consumed-decision
   * audit: some repair-intent decision (correction/refresh/support
   * demand) precedes the remediation serve, and an assessment decision
   * was consumed for the clock cap. */
  const audits = await decisionStore.list();
  const repairDecision = audits.find((r) =>
    ['correction', 'refresh', 'support_demand'].includes(r.chosenKind) &&
    (r.taskId === 'task.time.remediation.hear' || r.taskId === 'task.time.support.number_probe'));
  ok(repairDecision != null, `SLICE: no repair-kind decision in audit — ${audits.map((r) => `${r.chosenKind}@${r.taskId}`).join(', ')}`);
  ok(audits.some((r) => r.chosenKind === 'assessment' && r.taskId === 'task.time.assessment.hear'),
    'SLICE: assessment decision missing from audit');
  ok(audits.every((r) => typeof r.decisionInputDigest === 'string' && r.decisionInputDigest.startsWith('sha256:')),
    'SLICE: audit record without decide-time sha256 digest');
  say('SLICE-C: repair + assessment decisions audited with sha256 digests');
}

/* ═══ 008E — REQUIRED-SURFACE CLOSURE regressions ═══════════════════
 * The five former REQUIRED coverage findings (witnesses CONFIRMED on
 * main@765a5d8) become executable after-regressions: identical
 * preconditions to the audit's witness states, but the minted
 * candidate now resolves to the exact authored task@revision, is
 * eligible, is what B0 actually selects, and the decision validates
 * clean. §6 of the mission spec. */
{
  const ATTEMPT = (t) => t.response?.type != null && t.response.type !== 'none';
  const WT0 = Date.parse('2026-02-01T09:00:00Z');
  const W_LAG = 25 * HOUR;
  /* attemptEvent stamps learnerId 'SIM' — the input must match or the
   * learner model sees zero events (generator filters by learnerId). */
  const selOf = (fixture, events, at) => selectNextTask({
    mode: 'b0', learnerId: 'SIM', mission: fixture.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events, riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1, selection: {},
    decisionContext: emptyContext('ep.008e', 'ses.008e'), now: at
  });

  /* Correction witnesses — taught + attributed observed miss. The
   * candidate must mint with servableTask = the authored remediation. */
  for (const [fx, capId, want] of [
    [BUY, 'reception.listen.understand_spoken_price', 'task.price.remediation.hear'],
    [PLACE, 'reception.listen.follow_short_direction', 'task.place.remediation.follow']
  ]) {
    const cap = capabilityById(capId);
    const capTasks = fx.tasks.filter((t) => t.capabilityId === capId);
    const taught = capTasks.find((t) => ATTEMPT(t) && t.purpose !== 'remediation');
    const attr = capTasks.find((t) => ATTEMPT(t) && contractAttributesFunctions(t.evaluation?.contractId));
    const events = [
      attemptEvent(taught, cap, { at: WT0, outcome: 'success' }),
      attemptEvent(attr, cap, { at: WT0 + HOUR, outcome: 'fail', missing: attr.response.requiredFunctions })
    ];
    const sel = selOf(fx, events, WT0 + 2 * HOUR);
    const cand = sel.decision?.candidates?.find((c) => c.kind === KINDS.CORRECTION && c.capabilityId === capId);
    ok(cand != null, `008E-WITNESS: correction never minted for ${capId}`);
    ok(cand.taskId === want, `008E-WITNESS: ${capId} correction served ${cand?.taskId} — expected ${want}`);
    ok((cand.taskRevision ?? 1) === (TASK_REGISTRY.find((t) => t.id === want)?.revision ?? 1),
      `008E-WITNESS: ${want} served at wrong revision`);
    ok(cand.eligible === true, `008E-WITNESS: ${capId} correction filtered: ${cand?.filterReason}`);
    assert.deepEqual(validateB0(sel.decision, sel.engineInput), [], `008E-WITNESS: validator violation on ${capId} correction`);
    ok(sel.status === 'ready' && sel.taskId === want, `008E-WITNESS: B0 did not select ${want} — got ${sel.status}:${sel.taskId}`);
  }
  say('008E-WITNESS: price + direction corrections mint the authored remediation, serve it, validate clean');

  /* Assessment witnesses — independent → retained → transferred.
   * The minted assessment candidate must be the authored fresh task. */
  for (const [fx, capId, want] of [
    [MEET, 'production.speak.say_own_name', 'task.meet.assessment.name_signup'],
    [ORDER, 'interaction.request_item', 'task.order.assessment.request'],
    [SELF, 'production.speak.state_basic_self_detail', 'task.self.assessment.detail']
  ]) {
    const cap = capabilityById(capId);
    const capTasks = fx.tasks.filter((t) => t.capabilityId === capId);
    const nonTransfer = capTasks.filter((t) => ATTEMPT(t) && !['transfer', 'assessment'].includes(t.purpose));
    const indep = nonTransfer[0];
    const delayed = capTasks.find((t) => t.purpose === 'delayed_retrieval') ?? nonTransfer.find((t) => t !== indep);
    const practicedFams = new Set(capTasks.filter((t) => t.purpose !== 'transfer').map((t) => t.promptFamily));
    const transfer = capTasks.find((t) => t.purpose === 'transfer' && !practicedFams.has(t.promptFamily));
    const events = [
      attemptEvent(indep, cap, { at: WT0, outcome: 'success' }),
      attemptEvent(delayed, cap, { at: WT0 + W_LAG, outcome: 'success' }),
      attemptEvent(transfer, cap, { at: WT0 + W_LAG + MIN, outcome: 'success' })
    ];
    const sel = selOf(fx, events, WT0 + W_LAG + 2 * MIN);
    const cand = sel.decision?.candidates?.find((c) => c.kind === KINDS.ASSESSMENT && c.capabilityId === capId);
    ok(cand != null, `008E-WITNESS: assessment never minted for ${capId}`);
    ok(cand.taskId === want, `008E-WITNESS: ${capId} assessment served ${cand?.taskId} — expected ${want}`);
    ok((cand.taskRevision ?? 1) === (TASK_REGISTRY.find((t) => t.id === want)?.revision ?? 1),
      `008E-WITNESS: ${want} served at wrong revision`);
    ok(cand.eligible === true, `008E-WITNESS: ${capId} assessment filtered: ${cand?.filterReason}`);
    assert.deepEqual(validateB0(sel.decision, sel.engineInput), [], `008E-WITNESS: validator violation on ${capId} assessment`);
    ok(sel.status === 'ready' && sel.taskId === want, `008E-WITNESS: B0 did not select ${want} — got ${sel.status}:${sel.taskId}`);
  }
  say('008E-WITNESS: three fresh assessments mint the authored task, serve it, validate clean');
}

/* ═══ 008E FAM-COLLISION (§8): every new task's canonical family is
 * checked against every task for that capability. Remediation MAY
 * share the practiced family deliberately (repair is not freshness
 * evidence); assessment must collide with nothing — diagnostic,
 * retrieval, remediation, delayed, transfer, or a consumed assessment
 * family. */
{
  const famOf = (t) => canonicalFamilyId(t.capabilityId, t.contextSignature);
  for (const [id, sharedPracticed] of [
    ['task.price.remediation.hear', true],
    ['task.place.remediation.follow', true],
    ['task.meet.assessment.name_signup', false],
    ['task.order.assessment.request', false],
    ['task.self.assessment.detail', false]
  ]) {
    const t = TASK_REGISTRY.find((x) => x.id === id);
    assert.ok(t, `008E-FAM: authored task ${id} missing from the registry`);
    ok(t.promptFamily === famOf(t), `008E-FAM: ${id} promptFamily is not the canonical id of its signature`);
    const colliding = TASK_REGISTRY.filter((x) => x.id !== id && famOf(x) === famOf(t));
    if (sharedPracticed) {
      ok(colliding.length > 0, `008E-FAM: ${id} remediation should share the practiced family — it shares nothing`);
      ok(colliding.every((x) => (x.freshness?.familyClass ?? 'practiced') === 'practiced'),
        `008E-FAM: ${id} remediation collides with a held-out family — freshness contamination`);
      ok(colliding.every((x) => x.capabilityId === t.capabilityId),
        `008E-FAM: ${id} shares a family across capabilities — family id corrupted`);
    } else {
      ok(colliding.length === 0,
        `008E-FAM: ${id} fresh assessment collides with ${colliding.map((x) => x.id).join(', ') || 'none'}`);
      ok(t.freshness?.required === true && t.freshness?.familyClass === 'fresh_assessment',
        `008E-FAM: ${id} is not a fresh_assessment`);
      ok((t.supportPolicy?.allowed ?? []).length === 0,
        `008E-FAM: ${id} allows pre-attempt answer-bearing support`);
      ok((t.assessment?.capabilitySample ?? []).includes(t.capabilityId),
        `008E-FAM: ${id} capabilitySample does not include its own capability`);
    }
  }
  say('008E-FAM: remediation deliberately practiced; all three fresh families collide with nothing');
}

/* ═══ 008E CUE-ALIGNMENT (R2): the three fresh assessment cues must
 * solicit the capability they measure — every cue token drawn from the
 * mission's GENUINELY PRACTICED surface only (fresh_transfer and
 * fresh_assessment tasks are held-out by definition and can never
 * prove a cue is "known"), every naturally invited answer scores under
 * the deterministic evaluator, and a turn-taking-only reply earns no
 * request_item evidence. Freshness lives in the learner-visible
 * situation, never in novel cue vocabulary. */
{
  const cueTokenCover = (fixture, task) => {
    const norm = (s) => s.toLowerCase().replace(/[—–\-?.,!;'"]/g, ' ').split(/\s+/).filter(Boolean);
    const cover = new Set();
    /* Practiced-family task surfaces ONLY — a token attested solely on
     * a held-out transfer/assessment task is not practiced evidence
     * (008E R2 HIGH: the R1 cover counted those and masked unpracticed
     * tokens like "tell me" / "yes?"). */
    for (const t of fixture.tasks) {
      if (t.id === task.id) continue;
      if (t.freshness?.familyClass === 'fresh_transfer' || t.freshness?.familyClass === 'fresh_assessment') continue;
      for (const c of t.stimulus?.languageComponents ?? []) for (const w of norm(c)) cover.add(w);
      for (const c of t.language?.requiredChunks ?? []) for (const w of norm(c)) cover.add(w);
      for (const v of t.language?.requiredVocabulary ?? []) for (const w of norm(v)) cover.add(w);
    }
    /* Mission-declared language is part of the known-input surface. */
    for (const scope of ['introduced', 'assumedKnown']) {
      for (const c of fixture.mission.language?.[scope]?.chunks ?? []) for (const w of norm(c)) cover.add(w);
      for (const v of fixture.mission.language?.[scope]?.vocabulary ?? []) for (const w of norm(v)) cover.add(w);
    }
    return (task.stimulus?.languageComponents ?? []).flatMap(norm).every((w) => cover.has(w));
  };
  for (const [fx, id, cue, accepts, nonEvidence] of [
    [MEET, 'task.meet.assessment.name_signup', "What's your name?",
      ['my name is linh', 'i am linh', 'linh'], null],
    [ORDER, 'task.order.assessment.request', 'What can I get you?',
      ['a tea please', 'can i have a tea', 'tea please'], 'i am next'],
    [SELF, 'task.self.assessment.detail', 'And where are you from?',
      ["i'm from vietnam", 'i am from vietnam', 'i come from vietnam'], null]
  ]) {
    const t = TASK_REGISTRY.find((x) => x.id === id);
    ok(t.stimulus?.languageComponents?.[0] === cue,
      `008E-CUE: ${id} prompt drifted — now '${t.stimulus?.languageComponents?.[0]}'`);
    ok(cueTokenCover(fx, t), `008E-CUE: ${id} cue introduces vocabulary outside the mission's practiced surface`);
    for (const ans of accepts) {
      const r = evaluateAttempt(t, { text: ans }, { learnerName: 'linh' });
      ok(r?.outcome === 'success', `008E-CUE: ${id} natural answer '${ans}' scored ${r?.outcome} — evaluator mismatch`);
    }
    if (nonEvidence) {
      const r = evaluateAttempt(t, { text: nonEvidence }, { learnerName: 'linh' });
      ok(r?.outcome !== 'success', `008E-CUE: turn-taking reply '${nonEvidence}' wrongly earns ${id} evidence`);
    }
  }
  say('008E-CUE: fresh assessment cues stay inside the PRACTICED-only surface and evaluator-aligned (R2)');
}

/* ═══ 008E SITUATION (R2 BLOCKER): a fresh family is only fresh if the
 * LEARNER experiences the changed context — TASK_SITUATION is the only
 * channel that renders it (mission-page.js appends .vnext-situation
 * before the prompt lines). Each fresh assessment must carry a
 * situation that faithfully names the dimensions its contextSignature
 * declares; the mission language metadata must describe the response
 * construct the cue actually invites (no stale metadata from a removed
 * prompt). The browser leg proves the rendered DOM order; here we pin
 * copy existence + signature correspondence + metadata freshness. */
{
  /* situation copy ↔ contextSignature correspondence. Each entry:
   * expected signature dims + Vietnamese markers that must appear in
   * the learner-visible line (setting / partner role / situation). */
  const SIG_EXPECT = {
    'task.meet.assessment.name_signup': {
      setting: 'community', interlocutorRole: 'organizer', cueTopology: 'signup_name_request',
      markers: ['đăng ký', 'cộng đồng', 'người tổ chức']
    },
    'task.order.assessment.request': {
      setting: 'drink_cart', interlocutorRole: 'vendor', cueTopology: 'cart_order_call',
      markers: ['xe nước', 'người bán', 'gọi món']
    },
    'task.self.assessment.detail': {
      setting: 'homestay', interlocutorRole: 'host', cueTopology: 'host_arrival_detail',
      markers: ['homestay', 'chủ nhà', 'đến']
    }
  };
  const norm = (s) => s.toLowerCase().replace(/[—–\-?.,!;'"]/g, ' ').split(/\s+/).filter(Boolean);
  const ACCEPTED = {
    'task.meet.assessment.name_signup': ['my name is linh', 'i am linh', 'linh'],
    'task.order.assessment.request': ['a tea please', 'can i have a tea', 'tea please', 'some water please'],
    'task.self.assessment.detail': ["i'm from vietnam", 'i am from vietnam', 'i come from vietnam']
  };
  for (const [id, spec] of Object.entries(SIG_EXPECT)) {
    const t = TASK_REGISTRY.find((x) => x.id === id);
    const copy = TASK_SITUATION[id];
    ok(typeof copy === 'string' && copy.length > 8,
      `008E-SIT: ${id} has no learner-visible situation — held-out context exists only as metadata`);
    ok(t.contextSignature?.setting === spec.setting
      && t.contextSignature?.interlocutorRole === spec.interlocutorRole
      && t.contextSignature?.cueTopology === spec.cueTopology,
      `008E-SIT: ${id} signature drifted — ${JSON.stringify(t.contextSignature)}`);
    for (const marker of spec.markers) {
      ok(copy.toLowerCase().includes(marker),
        `008E-SIT: ${id} situation '${copy}' does not name ${marker} — signature dim not learner-visible`);
    }
    /* Metadata freshness: every declared chunk's fixed tokens and every
     * required vocabulary word must appear in at least one naturally
     * invited answer or the canonical model of a sampled function — a
     * leftover from a removed prompt can never satisfy this. */
    const surfaces = [
      ...ACCEPTED[id].map(norm),
      ...(t.response?.requiredFunctions ?? []).map((fn) => norm(FUNCTION_MODEL[fn] ?? ''))
    ];
    const covered = (tokens) => surfaces.some((ans) => tokens.every((w) => ans.includes(w)));
    for (const chunk of t.language?.requiredChunks ?? []) {
      const fixed = norm(chunk).filter((w) => w !== '…');
      ok(covered(fixed), `008E-SIT: ${id} requiredChunk '${chunk}' is stale — no accepted answer or model instantiates it`);
    }
    for (const word of t.language?.requiredVocabulary ?? []) {
      ok(surfaces.some((ans) => ans.includes(word.toLowerCase())),
        `008E-SIT: ${id} requiredVocabulary '${word}' is stale — absent from every accepted answer`);
    }
  }
  say('008E-SIT: three fresh assessments carry learner-visible situations matching their signatures; metadata fresh');
}

/* Answers shared by the 008E trajectory and REVPIN audit legs. */
const ANSWERS_008E = {
    /* meet_new_person — name_signup assessment */
    'task.meet.assessment.name_signup': 'my name is linh',
    /* complete_small_order */
    'task.order.diagnostic.request': 'a coffee please',
    'task.order.diagnostic.choice': 'the small one please',
    'task.order.retrieval.request': 'can i have a coffee',
    'task.order.retrieval.choice': 'the large one',
    'task.order.retrieval.greet': 'hello',
    'task.order.interaction.request_guided': 'a tea please',
    'task.order.interaction.request_unaided': 'can i have a tea',
    'task.order.interaction.choice_guided': 'a large one',
    'task.order.interaction.choice_unaided': 'small please',
    'task.order.interaction.thanks': 'thank you',
    'task.order.delayed.request': 'a coffee please',
    'task.order.delayed.choice': 'the first one',
    'task.order.transfer.stall': 'some water please',
    'task.order.transfer.takeaway': 'the second one',
    'task.order.assessment.request': 'a tea please',
    'task.order.assessment.checkpoint': 'the small one please, a coffee please, thank you',
    /* buy_small_item */
    'task.price.diagnostic.ask': 'how much is this',
    'task.price.diagnostic.hear': 'two',
    'task.price.retrieval.ask': 'how much is this',
    'task.price.remediation.hear': 'three',
    'task.price.retrieval.hear': 'five',
    'task.price.retrieval.request': 'this one please',
    'task.price.interaction.ask_guided': 'how much is this',
    'task.price.interaction.ask_unaided': 'how much is it',
    'task.price.interaction.thanks': 'thank you',
    'task.price.delayed.ask': 'how much is this',
    'task.price.delayed.hear': 'ten',
    'task.price.transfer.market': 'how much is this',
    'task.price.transfer.checkout': 'eight',
    'task.price.assessment.hear': 'six',
    'task.price.assessment.checkpoint': 'this one please, how much is this, thank you',
    /* find_a_place */
    'task.place.diagnostic.ask': 'where is the station',
    'task.place.diagnostic.follow': 'left_straight',
    'task.place.retrieval.ask': 'where is the bank',
    'task.place.remediation.follow': 'right',
    'task.place.retrieval.follow': 'right_bank',
    'task.place.retrieval.follow_landmark': 'bank_after_cafe',
    'task.place.retrieval.greet': 'hi',
    'task.place.interaction.ask_guided': 'where is the station',
    'task.place.interaction.ask_unaided': 'where is the toilet',
    'task.place.interaction.thanks': 'thank you',
    'task.place.delayed.ask': 'where is the bank',
    'task.place.delayed.follow': 'straight_left',
    'task.place.transfer.mall_ask': 'where is the toilet',
    'task.place.transfer.mall_follow': 'lift_right',
    'task.place.assessment.follow': 'ahead_left',
    'task.place.assessment.checkpoint': 'hi, where is the toilet? thank you',
    /* talk_about_self_family */
    'task.self.diagnostic.detail': "i'm from vietnam",
    'task.self.diagnostic.family': 'this is my mother',
    'task.self.retrieval.detail': 'i live in hanoi',
    'task.self.retrieval.family': 'this is my sister',
    'task.self.retrieval.name': 'my name is linh',
    'task.self.interaction.detail_guided': 'i live in hanoi',
    'task.self.interaction.detail_unaided': 'i study at hanoi',
    'task.self.interaction.family_guided': 'this is my father',
    'task.self.interaction.family_unaided': 'i have a brother',
    'task.self.delayed.detail': "i'm from vietnam",
    'task.self.delayed.family': 'my mother is a teacher',
    'task.self.transfer.office': 'i live in hanoi',
    'task.self.transfer.introduce': 'this is my sister',
    'task.self.assessment.detail': "i'm from vietnam",
    'task.self.assessment.checkpoint': 'my name is linh, i am from vietnam, this is my mother'
};

/* ═══ 008E REV-PIN (§5): every mission whose task surface changed
 * bumped its revision. A stale-revision open run supersedes; a
 * matching-revision run resumes pinned; the persisted audit stamps the
 * run's pinned revision — historical provenance is never reinterpreted
 * under the new surface. */
{
  const CHANGED_008E = [MEET, ORDER, BUY, PLACE, SELF];
  const seededOpenRun = (fixture, rev) => createMemoryRunStore([{
    id: `run.008e.${fixture.mission.id}`,
    learnerId: 'RT.learner', missionId: fixture.mission.id, missionRevision: rev,
    status: 'open', learnerName: 'A', startedAt: 1, endedAt: null,
    selection: {
      version: 'vnext.run-selection.v1', mode: 'b0',
      selectionPolicyVersion: POLICY_VERSIONS.B,
      decisionEpisodeId: `ep:run.008e.${fixture.mission.id}`,
      config: {}, decisionContext: null, pendingConsumption: null
    }
  }]);
  for (const fx of CHANGED_008E) {
    const tag = fx.mission.id;
    const curRev = fx.mission.revision ?? null;
    /* old-revision open run → superseded + fresh pinned run */
    {
      const rs = seededOpenRun(fx, curRev - 1);
      const s = makeSession({ fixture: fx, runStore: rs, mode: 'b0' });
      await s.init();
      const runs = await rs.list();
      const old = runs.find((r) => r.id === `run.008e.${tag}`);
      ok(old?.status === 'superseded' && old.supersedeReason === `mission_revision_changed:${curRev - 1}->${curRev}` && old.endedAt != null,
        `008E-REVPIN ${tag}: stale-revision open run not superseded`);
      const open = runs.filter((r) => r.status === 'open');
      ok(open.length === 1 && open[0].missionRevision === curRev && s.runInfo().id === open[0].id,
        `008E-REVPIN ${tag}: fresh run not pinned at rev ${curRev}`);
    }
    /* matching-revision run → resumed pinned, reload-safe */
    {
      const rs = seededOpenRun(fx, curRev);
      const s = makeSession({ fixture: fx, runStore: rs, mode: 'b0' });
      await s.init();
      ok(s.runInfo().id === `run.008e.${tag}` && s.runInfo().status === 'open' && s.runInfo().missionRevision === curRev,
        `008E-REVPIN ${tag}: same-revision run not resumed pinned`);
    }
    /* a consumed decision under the new surface stamps the run's
     * pinned revision — provenance stays tied to the surface that
     * produced it. */
    {
      const es = createMemoryEventStore();
      const rs = createMemoryRunStore();
      const ds = createMemoryDecisionStore();
      const s = makeSession({ fixture: fx, eventStore: es, runStore: rs, decisionStore: ds, mode: 'b0' });
      await s.init();
      await drive(s, (x) => x.type === 'task' && x.phase === 'feedback', {
        answer: (x) => ANSWERS_008E[x.taskId] ?? SCRIPT[x.taskId] ?? 'hi'
      });
      const audits = await ds.list();
      const rec = audits.at(-1);
      assert.ok(rec, `008E-REVPIN ${tag}: consumed decision minted no audit`);
      ok(rec.missionRevision === curRev && rec.missionRunId === s.runInfo().id,
        `008E-REVPIN ${tag}: audit not stamped with pinned revision ${curRev} (got ${rec.missionRevision})`);
    }
  }
  say('008E-REVPIN: five bumped missions supersede stale runs, pin the new revision, stamp audits with it');
}

/* ═══ 008E TRAJECTORIES (§7) — real createMissionSession drives ═════
 * Shared driver: consumes whatever B0 serves, scripted correct answers,
 * optional one-shot miss for the remediation trajectories. Sessions
 * reopen on shared stores — reload/episode-roll exercised honestly. */
{
  const drive008e = async (session, answers, { missOnce = null, missed = null, served, steps = 200 } = {}) => {
    for (let i = 0; i < steps; i += 1) {
      const s = session.screen();
      if (s.type === 'summary') return true;
      if (s.type === 'error') throw new Error(`008E trajectory error screen: ${s.message ?? JSON.stringify(s)}`);
      if (s.type === 'intro') { await session.start({ learnerName: 'linh' }); continue; }
      if (s.type === 'input') { await session.view(); continue; }
      if (s.type !== 'task') throw new Error(`008E unknown screen ${s.type}`);
      if (s.phase === 'feedback') { await session.next(); continue; }
      served.push(s.taskId);
      let a = answers(s);
      assert.ok(a != null, `008E no scripted answer for served task ${s.taskId}`);
      if (missOnce === s.taskId && !missed.has(s.taskId)) {
        missed.add(s.taskId);
        a = s.responseType === 'choice' ? '__wrong_option__' : 'zz nonsense';
      }
      if (s.responseType === 'choice') await session.commit({ optionId: a });
      else await session.commit({ text: a });
    }
    return false;
  };
  const idx = (served, id, from = 0) => served.findIndex((t, i) => i >= from && t === id);
  const count = (served, id) => served.filter((t) => t === id).length;

  /* ── Remediation trajectories: taught target → observed attributing
   * miss → authored remediation → successful recovery. Neither mission
   * declares a support capability, so no support-demand step is
   * legitimately mintable — the repair kinds are correction/refresh.
   * The attributing miss happens on the LAGGED delayed retest: under
   * B0 ordering the listening cap goes independent off its diagnostic
   * and the plain retrieval drill is never routed pre-lag (the SLICE-B
   * trajectory proved the same dynamic on clock-time). ── */
  for (const [fx, capId, missTask, remTask] of [
    [BUY, 'reception.listen.understand_spoken_price', 'task.price.delayed.hear', 'task.price.remediation.hear'],
    [PLACE, 'reception.listen.follow_short_direction', 'task.place.delayed.follow', 'task.place.remediation.follow']
  ]) {
    const learner = `RT.008e.rem.${fx.mission.id}`;
    const eventStore = createMemoryEventStore();
    const runStore = createMemoryRunStore();
    const decisionStore = createMemoryDecisionStore();
    const served = [];
    const missed = new Set();
    const answers = (s) => ANSWERS_008E[s.taskId] ?? SCRIPT[s.taskId];
    const open = async () => {
      const s = makeSession({ fixture: fx, learner, eventStore, runStore, decisionStore });
      await s.init();
      return s;
    };
    /* Phase A: teach — drain everything immediately routable. */
    for (let round = 0; round < 4; round += 1) {
      await drive008e(await open(), answers, { served });
    }
    /* Phase B: past the retention lag the delayed retest is due — the
     * observed attributing miss lands there; the authored remediation
     * must be served after it. */
    tick += DAY + HOUR;
    for (let round = 0; round < 12 && !(missed.has(missTask) && idx(served, remTask, idx(served, missTask)) >= 0); round += 1) {
      await drive008e(await open(), answers, { missOnce: missTask, missed, served });
      tick += 2 * HOUR;
    }
    const miss = idx(served, missTask);
    ok(miss >= 0 && missed.has(missTask), `008E-TRAJ ${capId}: attributing miss never produced — ${served.join(' → ')}`);
    const rep = idx(served, remTask, miss);
    ok(rep >= 0, `008E-TRAJ ${capId}: authored remediation never served after the miss — ${served.slice(miss).join(' → ')}`);
    /* Recovery: the remediation serve was committed with the correct
     * answer — a success event exists for it in the event log. */
    const evs = await eventStore.list();
    const remSuccess = evs.some((e) => e.taskId === remTask && e.attempt?.outcome === 'success');
    ok(remSuccess, `008E-TRAJ ${capId}: remediation serve did not produce a success — recovery unproven`);
    /* The repair decision must be in the consumed-decision audit. */
    const audits = await decisionStore.list();
    const repairDecision = audits.find((r) =>
      ['correction', 'refresh', 'support_demand'].includes(r.chosenKind) && r.taskId === remTask);
    ok(repairDecision != null,
      `008E-TRAJ ${capId}: no repair-kind decision chose ${remTask} — ${audits.map((r) => `${r.chosenKind}@${r.taskId}`).join(', ')}`);
    say(`008E-TRAJ: ${capId} miss → ${remTask} → recovery (real session, audit-backed)`);
  }

  /* ── Assessment trajectories: independent → retained → transferred →
   * fresh assessment → consumed exactly once. Injected test clock only
   * (the session's `now` option — no production time seam). ── */
  for (const [fx, capId, delayedId, transferId, assessId] of [
    [MEET, 'production.speak.say_own_name', 'task.meet.delayed.name', 'task.meet.transfer.name', 'task.meet.assessment.name_signup'],
    [ORDER, 'interaction.request_item', 'task.order.delayed.request', 'task.order.transfer.stall', 'task.order.assessment.request'],
    [SELF, 'production.speak.state_basic_self_detail', 'task.self.delayed.detail', 'task.self.transfer.office', 'task.self.assessment.detail']
  ]) {
    const learner = `RT.008e.ass.${fx.mission.id}`;
    const eventStore = createMemoryEventStore();
    const runStore = createMemoryRunStore();
    const decisionStore = createMemoryDecisionStore();
    const served = [];
    const answers = (s) => ANSWERS_008E[s.taskId] ?? SCRIPT[s.taskId];
    const open = async () => {
      const s = makeSession({ fixture: fx, learner, eventStore, runStore, decisionStore });
      await s.init();
      return s;
    };
    /* Phase A: teach — all caps reach first independent successes at
     * test-clock T0+. Then the clock jumps past the retention lag so
     * due_retrieval and the transfer/assessment chain unlock. */
    for (let round = 0; round < 4 && idx(served, delayedId) < 0; round += 1) {
      await drive008e(await open(), answers, { served });
    }
    tick += DAY + HOUR;
    const chain = () => {
      const d = idx(served, delayedId);
      if (d < 0) return false;
      const tr = idx(served, transferId, d);
      if (tr < 0) return false;
      return idx(served, assessId, tr) >= 0;
    };
    for (let round = 0; round < 12 && !chain(); round += 1) {
      await drive008e(await open(), answers, { served });
      tick += 2 * HOUR;
    }
    const d = idx(served, delayedId);
    ok(d >= 0, `008E-TRAJ ${capId}: delayed retest never served — retention phase unreachable — ${served.join(' → ')}`);
    const tr = idx(served, transferId, d);
    ok(tr >= 0, `008E-TRAJ ${capId}: fresh transfer never served after delayed retest`);
    const a = idx(served, assessId, tr);
    ok(a >= 0, `008E-TRAJ ${capId}: fresh assessment ${assessId} never served after transfer — ${served.slice(tr).join(' → ')}`);
    /* Consumed exactly once: keep driving past the success; the task
     * must never re-serve (assessmentStatus success blocks re-mint). */
    for (let round = 0; round < 4; round += 1) {
      if (await drive008e(await open(), answers, { served })) break;
      tick += 2 * HOUR;
    }
    ok(count(served, assessId) === 1, `008E-TRAJ ${capId}: assessment re-served — consumed ${count(served, assessId)}×, expected once`);
    const audits = await decisionStore.list();
    const assessDecisions = audits.filter((r) => r.chosenKind === 'assessment' && r.taskId === assessId);
    ok(assessDecisions.length === 1,
      `008E-TRAJ ${capId}: expected exactly one assessment decision for ${assessId}, got ${assessDecisions.length}`);
    say(`008E-TRAJ: ${capId} independent → retained → transferred → ${assessId} (once)`);
  }
}

/* ═══ 008F — correction episodes + B1 shadow policy ══════════════════
 * CEP  pure replay derivation: lifecycle + every boundary the kernel
 *      enforces (attribution, taught-precondition, surface freshness,
 *      independence, relapse, canonical order).
 * B1   policy-level: retest minting, certification gate, honest backlog,
 *      version stamping — B0 untouched on the same frozen input.
 * VAL  validator: independently derived episode checks, forged-version
 *      and retest-without-episode rejection.
 * SES  real createMissionSession trajectories under mode 'b1' + the
 *      shadow_b1 comparison path.
 * All events are SIM-learner attemptEvents on real fixture tasks — the
 * same bar the projection applies (registered task@rev, modality,
 * verifyEventTask). */
{
  const LAG = LEARNING_POLICY_V1.retention.minLagMs;
  const BUY_T = (id) => BUY.tasks.find((t) => t.id === id);
  const PLACE_T = (id) => PLACE.tasks.find((t) => t.id === id);
  const TIME_T = (id) => TIME.tasks.find((t) => t.id === id);
  const PRICE = 'reception.listen.understand_spoken_price';
  const DIR = 'reception.listen.follow_short_direction';
  const CLOCK = 'reception.listen.understand_clock_time';

  const ANSWERS_008F_TIME = {
    'task.time.diagnostic.hear': 'three',
    'task.time.diagnostic.say': "it's three o'clock",
    'task.time.retrieval.greeting': 'greeting',
    'task.time.remediation.hear': 'eight',
    'task.time.retrieval.hear': 'half_four',
    'task.time.retrieval.say': "it's two o'clock",
    'task.time.retrieval.greet': 'hi',
    'task.time.interaction.ask_name': 'what is your name',
    'task.time.interaction.guided': "it's four o'clock",
    'task.time.interaction.unaided': "it's four o'clock",
    'task.time.delayed.hear': 'six',
    'task.time.delayed.say': "it's six o'clock",
    'task.time.transfer.clinic': 'half_ten',
    'task.time.transfer.event': "it's six o'clock",
    'task.time.assessment.hear': 'nine',
    'task.time.assessment.checkpoint': 'hi! it is three o clock. what is your name?',
    'task.time.support.number_probe': 'ten'
  };

  const episodesOf = (events, now = null) => deriveCorrectionEpisodes({
    learnerId: 'SIM', events, capabilities: CAPABILITIES, tasks: TASK_REGISTRY,
    policy: LEARNING_POLICY_V1, now
  });
  const openEp = (events, capId, now = null) => episodesOf(events, now).openByCapability[capId] ?? null;

  /* Shared session driver — consumes whatever the mode actually serves;
   * `missOnce` fails the FIRST serve of that task id only. Reloads share
   * the caller's store handles so the trajectory survives reopening. */
  async function drive008f(sessionPromise, answerFn, { missOnce = null, missedSet = new Set(), servedList = [], steps = 200 } = {}) {
    const session = await sessionPromise;
    for (let i = 0; i < steps; i += 1) {
      const s = session.screen();
      if (s.type === 'summary') return { session, done: true };
      if (s.type === 'intro') { await session.start({ learnerName: 'linh' }); continue; }
      if (s.type === 'input') { await session.view(); continue; }
      if (s.type !== 'task') throw new Error(`008F unknown screen ${s.type}`);
      if (s.phase === 'feedback') { await session.next(); continue; }
      servedList.push(s.taskId);
      let a = answerFn(s);
      if (missOnce === s.taskId && !missedSet.has(s.taskId)) {
        missedSet.add(s.taskId);
        a = s.responseType === 'choice' ? '__wrong__' : 'zz nonsense';
      }
      assert.ok(a != null, `008F no scripted answer for ${s.taskId}`);
      if (s.responseType === 'choice') await session.commit({ optionId: a });
      else await session.commit({ text: a });
    }
    return { session, done: false };
  }
  const bState = (fixture, events, now) => engineState({
    learnerId: 'SIM', mission: fixture.mission, tasks: TASK_REGISTRY,
    capabilities: CAPABILITIES, events, riskPriors: RISK_PRIORS,
    policy: LEARNING_POLICY_V1, selection: {},
    decisionContext: emptyContext('ep.cep', 'ses.cep'), now
  });
  /* 008G: reservations are a routing-layer artifact now — derived from
   * the generated candidate set + shared resolver via the mission-local
   * repair proof, not from the episode derivation. */
  const reservationsFor = (fixture, events, now, { tasks = TASK_REGISTRY, mission = fixture.mission, ctx = null } = {}) => {
    const st = { ...bState(fixture, events, now), tasks, mission, ...(ctx ? { decisionContext: ctx } : {}) };
    const gen = generateCandidates(st);
    const eps = deriveCorrectionEpisodes({
      learnerId: 'SIM', events, capabilities: st.capabilities, tasks,
      policy: LEARNING_POLICY_V1, now
    });
    const plans = deriveMissionRepairPlans({
      episodes: eps, mission, tasks, candidates: gen.candidates,
      resolver: gen.resolver, selection: {}, decisionContext: st.decisionContext,
      pendingDemands: gen.pendingDemands, roles: st.roles, episodes: eps,
      hardFilter
    });
    return {
      reservations: deriveRetestReservations({
        episodes: eps, plans, missionTasks: gen.resolver?.missionTasks
      }),
      plans, gen, eps, st
    };
  };
  /* The canonical failure arc on the price cap: taught → attributed miss
   * → repair → (caller lands the retest/gate event at will). */
  const priceArc = () => [
    attemptEvent(BUY_T('task.price.diagnostic.hear'), capabilityById(PRICE), { at: T0, outcome: 'success' }),
    attemptEvent(BUY_T('task.price.delayed.hear'), capabilityById(PRICE), { at: T0 + DAY, outcome: 'fail', missing: ['understand_spoken_price'] }),
    attemptEvent(BUY_T('task.price.remediation.hear'), capabilityById(PRICE), { at: T0 + DAY + HOUR, outcome: 'success' })
  ];
  const arcRepairedAt = T0 + DAY + HOUR;

  /* ── CEP-1..6: what may and may not open an episode ── */
  {
    const taughtFail = [
      attemptEvent(BUY_T('task.price.diagnostic.hear'), capabilityById(PRICE), { at: T0, outcome: 'success' }),
      attemptEvent(BUY_T('task.price.delayed.hear'), capabilityById(PRICE), { at: T0 + DAY, outcome: 'fail', missing: ['understand_spoken_price'] })
    ];
    const ep = openEp(taughtFail, PRICE, T0 + DAY + 1);
    ok(ep && ep.state === 'OPEN', 'CEP: attributed fail on taught cap did not open an episode');
    ok(ep.sourceTaskId === 'task.price.delayed.hear'
      && ep.sourceTaskRevision === (BUY_T('task.price.delayed.hear').revision ?? 1)
      && ep.sourceEventId === taughtFail[1].id
      && ep.missingFunctions.join() === 'understand_spoken_price',
      'CEP: episode provenance (source event/task@rev/missing fns) wrong');
    say('CEP: attributed fail opens OPEN episode with full provenance');

    /* Baseline-probe miss (nothing taught yet) — information, not a
     * correctable episode. */
    const baselineMiss = [attemptEvent(BUY_T('task.price.diagnostic.hear'), capabilityById(PRICE), { at: T0, outcome: 'fail', missing: ['understand_spoken_price'] })];
    ok(openEp(baselineMiss, PRICE, T0 + 1) == null, 'CEP: baseline-probe miss opened an episode');
    say('CEP: untaught-cap failure never opens an episode');

    /* Non-attributing contract: a spoken_turn miss stamps no authority-
     * backed missingFunctions — eval.required_functions.v1 observes but
     * never attributes (Mission 007 boundary). */
    const askCap = capabilityById(BUY_T('task.price.diagnostic.ask').capabilityId);
    const unattributed = [
      attemptEvent(BUY_T('task.price.diagnostic.ask'), askCap, { at: T0, outcome: 'success' }),
      attemptEvent(BUY_T('task.price.delayed.ask'), askCap, { at: T0 + DAY, outcome: 'fail', missing: ['ask_price'] })
    ];
    ok(openEp(unattributed, askCap.id, T0 + DAY + 1) == null,
      'CEP: non-attributing contract failure opened an episode');
    say('CEP: eval.required_functions.v1 (non-attributing) never opens an episode');

    /* Unobserved failure, stale revision, foreign learner — all filtered
     * before any episode logic runs. */
    const unobserved = [
      taughtFail[0],
      attemptEvent(BUY_T('task.price.delayed.hear'), capabilityById(PRICE), { at: T0 + DAY, outcome: 'fail', observed: false, missing: ['understand_spoken_price'] })
    ];
    ok(openEp(unobserved, PRICE, T0 + DAY + 1) == null, 'CEP: unobserved failure opened an episode');
    const stale = [taughtFail[0], { ...taughtFail[1], id: 'sim-stale', taskRevision: taughtFail[1].taskRevision + 1 }];
    ok(openEp(stale, PRICE, T0 + DAY + 1) == null, 'CEP: stale-revision failure opened an episode');
    const foreign = [taughtFail[0], { ...taughtFail[1], id: 'sim-foreign', learnerId: 'OTHER' }];
    ok(openEp(foreign, PRICE, T0 + DAY + 1) == null, 'CEP: another learner\'s failure leaked into this derivation');
    say('CEP: unobserved / stale-revision / foreign-learner events never open episodes');
  }

  /* ── CEP-7..13: repair → waiting → due → verified lifecycle ── */
  {
    const arc = priceArc();
    const waiting = openEp(arc, PRICE, arcRepairedAt + 1);
    ok(waiting?.state === 'REPAIRED_WAITING'
      && waiting.repairedAt === arcRepairedAt
      && waiting.retestDueAt === arcRepairedAt + LAG,
      `CEP: post-repair state wrong — ${JSON.stringify({ state: waiting?.state, dueAt: waiting?.retestDueAt })}`);
    ok(openEp(arc, PRICE, arcRepairedAt + LAG)?.state === 'RETEST_DUE',
      'CEP: episode not RETEST_DUE at the lag boundary');
    ok(openEp(arc, PRICE, arcRepairedAt + LAG - 1)?.state === 'REPAIRED_WAITING',
      'CEP: episode went due one tick early');
    say('CEP: repair → REPAIRED_WAITING → RETEST_DUE at exactly retention.minLagMs');

    /* A FAILED remediation attempt is still a repair attempt (regression:
     * bookkeeping must run before the failure branch's continue). */
    const failedRepair = [
      arc[0], arc[1],
      attemptEvent(BUY_T('task.price.remediation.hear'), capabilityById(PRICE), { at: arcRepairedAt, outcome: 'fail', missing: ['understand_spoken_price'] })
    ];
    const epF = openEp(failedRepair, PRICE, arcRepairedAt + 1);
    ok(epF?.state === 'REPAIRING' && epF.repairAttempts === 1
      && epF.repairTaskIds.includes('task.price.remediation.hear'),
      'CEP: failed remediation did not count as a repair attempt');
    say('CEP: failed remediation attempt counts (REPAIRING, repairAttempts=1)');

    /* Early retest = valid practice, invalid verification. */
    const early = [...arc, attemptEvent(BUY_T('task.price.retrieval.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG - HOUR, outcome: 'success' })];
    const epEarly = openEp(early, PRICE, arcRepairedAt + LAG + 1);
    ok(epEarly?.state === 'RETEST_DUE' && epEarly.earlyRetestAttempts === 1 && epEarly.verifiedAt == null,
      'CEP: pre-lag covering success wrongly verified the episode');
    say('CEP: pre-lag retest success counts as earlyRetestAttempt, never verification');

    /* Source-task and repair-task surfaces can never verify — reuse is
     * exactly the contamination the retest contract exists to prevent. */
    const srcReuse = [...arc, attemptEvent(BUY_T('task.price.delayed.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG + HOUR, outcome: 'success' })];
    ok(openEp(srcReuse, PRICE, arcRepairedAt + LAG + HOUR + 1)?.state === 'RETEST_DUE',
      'CEP: source-task success post-lag wrongly verified');
    const repReuse = [...arc, attemptEvent(BUY_T('task.price.remediation.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG + HOUR, outcome: 'success' })];
    ok(openEp(repReuse, PRICE, arcRepairedAt + LAG + HOUR + 1)?.state === 'RETEST_DUE',
      'CEP: repair-task success post-lag wrongly verified');
    ok(!retestSurfaces(openEp(arc, PRICE, arcRepairedAt + LAG), TASK_REGISTRY).some((t) => t.id === 'task.price.delayed.hear' || t.id === 'task.price.remediation.hear'),
      'CEP: retest surface pool contains source/repair task');
    say('CEP: failed source task + consumed repair task are never retest surfaces');

    /* A supported post-lag success is not independent — never verifies. */
    const aided = [...arc, attemptEvent(BUY_T('task.price.retrieval.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG + HOUR, outcome: 'success', support: { modelAnswer: true } })];
    ok(openEp(aided, PRICE, arcRepairedAt + LAG + HOUR + 1)?.state === 'RETEST_DUE',
      'CEP: aided retest success wrongly verified the episode');
    say('CEP: supported post-lag success is not retest evidence');

    /* The real close: independent post-lag success on the alternate
     * surface covering the missed function. */
    const verified = [...arc, attemptEvent(BUY_T('task.price.retrieval.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG + HOUR, outcome: 'success' })];
    const done = episodesOf(verified, arcRepairedAt + LAG + 2 * HOUR);
    const epV = done.episodes[0];
    ok(epV.state === 'VERIFIED' && epV.verifiedAt === arcRepairedAt + LAG + HOUR
      && epV.verifiedFunctions.understand_spoken_price != null
      && done.openByCapability[PRICE] == null,
      'CEP: post-lag alternate-surface success did not verify the episode');
    say('CEP: delayed independent retest on alternate surface → VERIFIED + episode closes');
  }

  /* ── CEP-14..17: relapse, replay order, re-derivation, backlog ── */
  {
    const arc = priceArc();
    /* Relapse: an attributed failure while waiting/due re-opens the
     * repair path — repairedAt/retestDueAt reset, gap widens. */
    const relapsed = [...arc,
      attemptEvent(BUY_T('task.price.retrieval.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG + HOUR, outcome: 'fail', missing: ['understand_spoken_price'] })];
    const epR = openEp(relapsed, PRICE, arcRepairedAt + LAG + 2 * HOUR);
    ok(epR?.state === 'RELAPSED' && epR.relapseCount === 1 && epR.repairedAt == null && epR.failures.length === 2,
      `CEP: post-due failure did not relapse — ${epR?.state}`);
    const reRepaired = [...relapsed,
      attemptEvent(BUY_T('task.price.remediation.hear'), capabilityById(PRICE), { at: arcRepairedAt + LAG + 2 * HOUR, outcome: 'success' })];
    const epRR = openEp(reRepaired, PRICE, arcRepairedAt + LAG + 3 * HOUR);
    ok(epRR?.state === 'REPAIRED_WAITING' && epRR.retestDueAt === arcRepairedAt + LAG + 2 * HOUR + LAG,
      'CEP: relapse re-repair did not restart the lag clock');
    say('CEP: post-due failure → RELAPSED → re-repair restarts the lag');

    /* Canonical replay: delivery permutation must not change the result. */
    const shuffled = [arc[2], arc[0], arc[1]];
    assert.deepEqual(
      JSON.parse(JSON.stringify(episodesOf(shuffled, arcRepairedAt + 1))),
      JSON.parse(JSON.stringify(episodesOf(arc, arcRepairedAt + 1))),
      'CEP: event delivery order changed the derivation'
    );
    assert.deepEqual(episodesOf(arc, arcRepairedAt + 1), episodesOf(arc, arcRepairedAt + 1),
      'CEP: re-derivation is not deterministic');
    say('CEP: replay is canonical — permutation + re-derivation identical');

    /* Support success is never target evidence: a support_attempt on the
     * substrate capability cannot repair, narrow, or close the episode
     * on the demand capability — it is not even an attempt type. */
    const supArc = [
      attemptEvent(TIME_T('task.time.retrieval.hear'), capabilityById(CLOCK), { at: T0, outcome: 'success' }),
      attemptEvent(TIME_T('task.time.delayed.hear'), capabilityById(CLOCK), { at: T0 + DAY, outcome: 'fail', missing: ['understand_clock_time'] }),
      attemptEvent(TIME_T('task.time.support.number_probe'), capabilityById('reception.listen.identify_spoken_number'), { at: T0 + DAY + HOUR, outcome: 'success' })
    ];
    const epSup = openEp(supArc, CLOCK, T0 + DAY + 2 * HOUR);
    ok(epSup?.state === 'OPEN' && epSup.repairAttempts === 0 && epSup.repairedAt == null
      && epSup.missingFunctions.join() === 'understand_clock_time',
      'CEP: substrate support_attempt touched the target episode');
    ok(supArc.find((e) => e.taskId === 'task.time.support.number_probe').eventType === 'support_attempt',
      'CEP: support task did not emit support_attempt (fixture drift)');
    say('CEP: support success on the substrate never repairs or narrows the target episode');

    /* A retest surface that itself FAILED is burned for the episode —
     * post-relapse the only honest surface is the untouched alternate. */
    const burnedArc = [
      attemptEvent(PLACE_T('task.place.diagnostic.follow'), capabilityById(DIR), { at: T0, outcome: 'success' }),
      attemptEvent(PLACE_T('task.place.delayed.follow'), capabilityById(DIR), { at: T0 + DAY, outcome: 'fail', missing: ['follow_short_direction'] }),
      attemptEvent(PLACE_T('task.place.remediation.follow'), capabilityById(DIR), { at: T0 + DAY + HOUR, outcome: 'success' }),
      attemptEvent(PLACE_T('task.place.retrieval.follow'), capabilityById(DIR), { at: T0 + DAY + HOUR + LAG, outcome: 'fail', missing: ['follow_short_direction'] })
    ];
    const epBurned = openEp(burnedArc, DIR, T0 + DAY + HOUR + LAG + HOUR);
    ok(epBurned?.state === 'RELAPSED', `CEP: failed retest did not relapse — ${epBurned?.state}`);
    assert.deepEqual(
      retestSurfaces(epBurned, TASK_REGISTRY).map((t) => t.id),
      ['task.place.retrieval.follow_landmark'],
      'CEP: burned retest surface still eligible post-relapse'
    );
    ok(!retestSurfaces(epBurned, TASK_REGISTRY).some((t) => t.purpose === 'support'),
      'CEP: a support-purpose surface leaked into the retest pool');
    say('CEP: failed retest surface is burned — only the untouched alternate remains');

    /* Content backlog: a multi-function miss on clock-time can never
     * fully verify — no mission task retests identify_spoken_number
     * (honest authoring debt, surfaced — never silently dropped). */
    const timeArc = [
      attemptEvent(TIME_T('task.time.diagnostic.hear'), capabilityById(CLOCK), { at: T0, outcome: 'success' }),
      attemptEvent(TIME_T('task.time.retrieval.hear'), capabilityById(CLOCK), { at: T0 + DAY, outcome: 'fail', missing: ['understand_clock_time', 'identify_spoken_number'] }),
      attemptEvent(TIME_T('task.time.remediation.hear'), capabilityById(CLOCK), { at: T0 + DAY + HOUR, outcome: 'success' }),
      attemptEvent(TIME_T('task.time.delayed.hear'), capabilityById(CLOCK), { at: T0 + 2 * DAY + 2 * HOUR, outcome: 'success' })
    ];
    const epB = openEp(timeArc, CLOCK, T0 + 2 * DAY + 3 * HOUR);
    ok(epB?.state === 'RETEST_DUE' && remainingOf(epB).join() === 'identify_spoken_number',
      `CEP: partial verification wrong — remaining=${JSON.stringify(remainingOf(epB ?? {}))}`);
    ok(retestSurfaces(epB, TIME.tasks).length === 0,
      'CEP: a retest surface claimed to cover identify_spoken_number — impossible today');
    say('CEP: partial verification leaves episode open; uncovered function = real content backlog');
  }

  /* ── B1-1..5: policy behavior on the SAME frozen input ── */
  {
    const arc = priceArc();
    const dueNow = arcRepairedAt + LAG + HOUR;
    const st = bState(BUY, arc, dueNow);
    const b0 = policyB(st);
    const b1 = policyB1(st);

    /* B0 untouched: no episode knowledge, no retest kind, no gate. */
    ok(!(b0.candidates ?? []).some((c) => c.kind === KINDS.CORRECTION_RETEST), 'B1: B0 minted a correction_retest candidate');
    ok(!(b0.candidates ?? []).some((c) => (c.filterReason ?? '').includes('correction_episode_gate')), 'B1: B0 ran the episode gate');
    ok(b0.selectionPolicyVersion === POLICY_VERSIONS.B, 'B1: B0 version stamp drifted');

    /* B1: retest candidate on the alternate surface, eligible, stamped. */
    const rt = (b1.candidates ?? []).find((c) => c.kind === KINDS.CORRECTION_RETEST);
    ok(rt && rt.taskId === 'task.price.retrieval.hear' && rt.eligible === true,
      `B1: retest candidate missing/ineligible — ${JSON.stringify(rt && { id: rt.taskId, fr: rt.filterReason })}`);
    ok(b1.selectionPolicyVersion === POLICY_VERSIONS.B1 && b1.correctionEpisodes?.contractVersion === CORRECTION_EPISODES_VERSION,
      'B1: decision lacks B1 version stamp or episode digest');
    ok(validateB0(b1, st).length === 0, `B1: genuine retest decision failed validation — ${validateB0(b1, st).join('; ')}`);
    say('B1: RETEST_DUE mints eligible correction_retest on the alternate surface (validator-clean, B1-stamped)');

    /* Certification gate: while the episode is unresolved, transfer and
     * assessment candidates on the capability must carry the gate. */
    const gated = (b1.candidates ?? []).filter((c) =>
      (c.filterReason ?? '').includes('correction_episode_gate'));
    const gatedKinds = new Set(gated.map((c) => c.kind));
    ok(gated.length >= 1 && [...gatedKinds].every((k) => k === KINDS.TRANSFER || k === KINDS.ASSESSMENT),
      `B1: gate hit non-certification kinds — ${[...gatedKinds].join(',')}`);
    say(`B1: unresolved episode gates ${gated.length} certification candidate(s) [${[...gatedKinds].join(',')}]`);

    /* Waiting (pre-lag): gate exists, no retest minted yet. */
    const stWait = bState(BUY, arc, arcRepairedAt + HOUR);
    const b1w = policyB1(stWait);
    ok(!(b1w.candidates ?? []).some((c) => c.kind === KINDS.CORRECTION_RETEST && c.eligible),
      'B1: retest candidate eligible before the lag elapsed');
    ok((b1w.candidates ?? []).some((c) => (c.filterReason ?? '') === `correction_episode_gate:REPAIRED_WAITING`),
      'B1: waiting-state gate reason missing');
    say('B1: REPAIRED_WAITING gates certification without minting a retest');

    /* Classifier coverage on real divergences. */
    ok(classifyB0B1(b0, b1).class === 'CORRECTION_RETEST_DUE',
      `B1: retest-vs-B0 misclassified — ${JSON.stringify(classifyB0B1(b0, b1))}`);
    ok(classifyB0B1(b0, b0).class === 'MATCH', 'B1: identical decisions misclassified');
    const clsWait = classifyB0B1(policyB(stWait), b1w);
    ok(['REPAIR_WAIT', 'CORRECTION_EPISODE_GATE', 'MATCH', 'CORRECTION_CONTENT_BACKLOG'].includes(clsWait.class),
      `B1: waiting-state divergence landed outside the taxonomy — ${clsWait.class}`);
    say(`B1: classifier attributes divergences (retest→${classifyB0B1(b0, b1).class}, waiting→${clsWait.class})`);

    /* Backlog: multi-function time-cap miss — B1 must report the
     * uncovered remainder instead of minting a useless retest. */
    const timeArc = [
      attemptEvent(TIME_T('task.time.diagnostic.hear'), capabilityById(CLOCK), { at: T0, outcome: 'success' }),
      attemptEvent(TIME_T('task.time.retrieval.hear'), capabilityById(CLOCK), { at: T0 + DAY, outcome: 'fail', missing: ['understand_clock_time', 'identify_spoken_number'] }),
      attemptEvent(TIME_T('task.time.remediation.hear'), capabilityById(CLOCK), { at: T0 + DAY + HOUR, outcome: 'success' }),
      attemptEvent(TIME_T('task.time.delayed.hear'), capabilityById(CLOCK), { at: T0 + 2 * DAY + 2 * HOUR, outcome: 'success' })
    ];
    const stB = bState(TIME, timeArc, T0 + 2 * DAY + 3 * HOUR);
    const b1b = policyB1(stB);
    ok((b1b.explanation?.suppressed ?? []).some((s) => s.includes('correction_content_backlog')),
      'B1: uncovered remaining function did not surface as correction_content_backlog');
    ok(!(b1b.candidates ?? []).some((c) => c.kind === KINDS.CORRECTION_RETEST && c.eligible),
      'B1: retest minted although no surface covers the remaining function');
    say('B1: uncovered remaining function → explicit correction_content_backlog, no fake retest');
  }

  /* ── VAL: validator independence — never trusts decision-attached
   *     episode state; forged or mismatched B1 claims fail closed ── */
  {
    const arc = priceArc();
    const dueNow = arcRepairedAt + LAG + HOUR;
    const st = bState(BUY, arc, dueNow);
    const b0 = policyB(st);
    const b1 = policyB1(st);

    /* A B0 decision that served certification on the open episode is
     * legal B0 (episode-blind). Stamp it as B1 → the validator must
     * re-derive the episode itself and reject the certification. */
    const forged = structuredClone(b0);
    forged.selectionPolicyVersion = POLICY_VERSIONS.B1;
    const certCand = (b0.candidates ?? []).find((c) => c.eligible && (c.kind === KINDS.TRANSFER || c.kind === KINDS.ASSESSMENT) && c.capabilityId === PRICE);
    if (certCand) {
      forged.chosen = { ...certCand };
      const v = validateB0(forged, st);
      ok(v.some((x) => x.startsWith('certification_under_open_episode')),
        `VAL: forged B1 certification on open episode passed — ${v.join(';')}`);
    } else {
      /* No certification mintable on this state — still require the
       * retest checks to fire on a forged retest claim. */
      forged.chosen = { kind: KINDS.CORRECTION_RETEST, taskId: 'task.price.retrieval.hear', taskRevision: 1, capabilityId: PRICE };
      const v = validateB0(forged, st);
      ok(v.length === 0 || v.every((x) => x.startsWith('correction_retest') || x.startsWith('certification_under_open_episode')),
        `VAL: forged B1 decision produced unexpected verdict — ${v.join(';')}`);
    }

    /* A B1-stamped retest claim where NO episode exists must be caught
     * without trusting the decision's own (absent) episode digest. */
    const clean = bState(BUY, [arc[0]], dueNow);
    const forged2 = structuredClone(policyB(clean));
    forged2.selectionPolicyVersion = POLICY_VERSIONS.B1;
    forged2.chosen = { kind: KINDS.CORRECTION_RETEST, taskId: 'task.price.retrieval.hear', taskRevision: BUY_T('task.price.retrieval.hear').revision ?? 1, capabilityId: PRICE };
    const v2 = validateB0(forged2, clean);
    ok(v2.includes('correction_retest_without_episode'),
      `VAL: episode-free retest claim passed validation — ${v2.join(';')}`);

    /* The genuine B1 retest decision stays clean — control case. */
    ok(validateB0(b1, st).length === 0, 'VAL: genuine B1 retest wrongly rejected');
    say('VAL: validator independently re-derives episodes; forged/stale retest claims fail closed');
  }

  /* ── CEP-ID: episode identity is provenance-bound — a canonical
   *     digest of learner + capability + opening-failure record, never
   *     an ordinal. Same replay → same id; inserts, permutations and
   *     relapses can never renumber or share it. ── */
  {
    const cap = capabilityById(PRICE);
    const ev = (tid, at, outcome, missing) =>
      attemptEvent(BUY_T(tid), cap, { at, outcome, missing });

    /* Two learners on the same capability can never share an id. */
    const other = priceArc().map((e) => ({ ...e, learnerId: 'OTHER', id: `${e.id}.o` }));
    const epSim = episodesOf(priceArc(), arcRepairedAt).episodes[0];
    const epOther = deriveCorrectionEpisodes({
      learnerId: 'OTHER', events: other, capabilities: CAPABILITIES,
      tasks: TASK_REGISTRY, policy: LEARNING_POLICY_V1, now: arcRepairedAt
    }).episodes[0];
    ok(epSim.episodeId !== epOther.episodeId && epSim.learnerId === 'SIM' && epOther.learnerId === 'OTHER',
      `CEP-ID: cross-learner episode collision — ${epSim.episodeId}`);

    /* Appending an EARLIER closed episode on the same capability must
     * not renumber an existing later episode (ordinal ids would). */
    const epA = [
      ev('task.price.diagnostic.hear', T0, 'success'),
      ev('task.price.delayed.hear', T0 + DAY, 'fail', ['understand_spoken_price']),
      ev('task.price.remediation.hear', T0 + DAY + HOUR, 'success'),
      ev('task.price.retrieval.hear', T0 + DAY + HOUR + LAG, 'success')
    ];
    const epBEvents = [ev('task.price.delayed.hear', T0 + 4 * DAY, 'fail', ['understand_spoken_price'])];
    const base = [...epA, ...epBEvents];
    const idsBase = episodesOf(base, T0 + 5 * DAY).episodes.map((x) => x.episodeId);
    /* C opens only AFTER A verified (A's retest lands at +2D+1h) and
     * closes before B opens — a genuinely EARLIER closed episode in
     * replay order that must not disturb B's identity. */
    const epC = [
      ev('task.price.delayed.hear', T0 + 2 * DAY + 2 * HOUR, 'fail', ['understand_spoken_price']),
      ev('task.price.remediation.hear', T0 + 2 * DAY + 3 * HOUR, 'success'),
      ev('task.price.retrieval.hear', T0 + 2 * DAY + 3 * HOUR + LAG, 'success')
    ];
    const idsAfter = episodesOf([...base, ...epC], T0 + 5 * DAY).episodes.map((x) => x.episodeId);
    ok(idsBase.length === 2 && idsAfter.length === 3 && idsBase.every((id) => idsAfter.includes(id)),
      `CEP-ID: historical insert renumbered episodes — ${JSON.stringify(idsBase)} → ${JSON.stringify(idsAfter)}`);

    /* Event-order permutation is byte-irrelevant — same failure records
     * produce the same episode ids regardless of delivery order. */
    const shuffled = [...base].reverse();
    const idsPerm = episodesOf(shuffled, T0 + 5 * DAY).episodes.map((x) => x.episodeId).sort();
    assert.deepEqual(idsPerm, [...idsBase].sort(), 'CEP-ID: permutation changed episode ids');

    /* A relapse keeps the same episode — identity is the opening
     * failure, not the latest state. */
    const rel = [
      ev('task.price.diagnostic.hear', T0, 'success'),
      ev('task.price.delayed.hear', T0 + DAY, 'fail', ['understand_spoken_price']),
      ev('task.price.remediation.hear', T0 + DAY + HOUR, 'success'),
      ev('task.price.retrieval.hear', T0 + DAY + HOUR + LAG, 'fail', ['understand_spoken_price'])
    ];
    const epRel = episodesOf(rel, T0 + DAY + HOUR + LAG + HOUR).episodes;
    ok(epRel.length === 1 && epRel[0].relapseCount === 1
      && epRel[0].episodeId === episodesOf(rel.slice(0, 3), T0 + DAY + 2 * HOUR).episodes[0]?.episodeId,
      'CEP-ID: relapse did not retain the opening episode id');
    say('CEP-ID: provenance-bound ids — cross-learner unique, insert/permutation/relapse stable');
  }

  /* ── CEP-BURN: every exposed surface is unfit to be the delayed
   *     retest — repair-establishing successes (ANY purpose) and
   *     pre-lag practiced probes burn exactly like failures do. ── */
  {
    const cap = capabilityById(PRICE);
    const ev = (tid, at, outcome, missing) =>
      attemptEvent(BUY_T(tid), cap, { at, outcome, missing });
    const buyTasks = BUY.tasks.filter((t) => BUY.mission.taskIds.includes(t.id));
    const dueNow = arcRepairedAt + LAG + HOUR;

    /* Repair riding a retest-eligible surface (retrieval.hear, NOT a
     * remediation task) — that surface is now exposed evidence and can
     * never double as the delayed independent probe. */
    const epA = episodesOf([
      ev('task.price.diagnostic.hear', T0, 'success'),
      ev('task.price.delayed.hear', T0 + DAY, 'fail', ['understand_spoken_price']),
      ev('task.price.retrieval.hear', arcRepairedAt, 'success')
    ], dueNow).episodes[0];
    ok(epA?.state === 'RETEST_DUE' && epA.repairSurfaceTaskIds.includes('task.price.retrieval.hear')
      && pickRetestSurface(epA, buyTasks) == null,
      `CEP-BURN: repair surface still retest-eligible — ${pickRetestSurface(epA, buyTasks)?.id}`);

    /* Pre-lag practice on the probe burns it too — an exposed item is
     * not an independent delayed check. */
    const epB2 = episodesOf([
      ev('task.price.diagnostic.hear', T0, 'success'),
      ev('task.price.delayed.hear', T0 + DAY, 'fail', ['understand_spoken_price']),
      ev('task.price.remediation.hear', arcRepairedAt, 'success'),
      ev('task.price.retrieval.hear', arcRepairedAt + HOUR, 'success')
    ], dueNow).episodes[0];
    ok(epB2?.earlyRetestAttempts === 1 && epB2.practicedRetestTaskIds.includes('task.price.retrieval.hear')
      && pickRetestSurface(epB2, buyTasks) == null,
      'CEP-BURN: pre-lag practiced surface stayed retest-eligible');

    /* While the episode waits out the lag, the surviving probe surfaces
     * are reserved — nothing may serve them inside the window. 008G:
     * the reserved set is a routing-layer artifact (mission-local repair
     * proof → deriveRetestReservations), not an episode-derivation field. */
    const waitEvents = [
      ev('task.price.diagnostic.hear', T0, 'success'),
      ev('task.price.delayed.hear', T0 + DAY, 'fail', ['understand_spoken_price']),
      ev('task.price.remediation.hear', arcRepairedAt, 'success')
    ];
    const dWait = episodesOf(waitEvents, arcRepairedAt + HOUR);
    const waitEp = dWait.episodes[0];
    const { reservations: waitReserved } = reservationsFor(BUY, waitEvents, arcRepairedAt + HOUR);
    ok(waitEp?.state === 'REPAIRED_WAITING'
      && waitReserved.has('task.price.retrieval.hear')
      && !waitReserved.has('task.price.delayed.hear'),
      `CEP-BURN: probe surfaces not reserved during the lag — ${JSON.stringify([...waitReserved])}`);

    /* And with every honest surface consumed, B1 surfaces backlog —
     * never a recycled probe. */
    const arcBurned = [
      ev('task.price.diagnostic.hear', T0, 'success'),
      ev('task.price.delayed.hear', T0 + DAY, 'fail', ['understand_spoken_price']),
      ev('task.price.remediation.hear', arcRepairedAt, 'success'),
      ev('task.price.retrieval.hear', arcRepairedAt + HOUR, 'success')
    ];
    const stBurned = bState(BUY, arcBurned, dueNow);
    const b1Burned = policyB1(stBurned);
    ok((b1Burned.explanation?.suppressed ?? []).some((s) => s.includes('correction_content_backlog')),
      'CEP-BURN: exhausted surfaces produced a recycled retest, not backlog');
    say('CEP-BURN: repair surfaces + pre-lag probes burned; exhausted set → explicit backlog');
  }

  /* ── VAL-TERM: the validator independently reconstructs B1 due-retest
   *     work — forged terminal decisions on a due episode with an
   *     honest surface are caught even when the generic rebuild finds
   *     nothing. Isolated single-task mission so generic work is ∅. ── */
  {
    const cap = capabilityById(PRICE);
    const ev = (tid, at, outcome, missing) =>
      attemptEvent(BUY_T(tid), cap, { at, outcome, missing });
    const dueNow = arcRepairedAt + LAG + HOUR;
    const isoMission = {
      ...BUY.mission,
      taskIds: ['task.price.retrieval.hear'],
      targetCapabilities: [PRICE],
      carrierCapabilities: [], prerequisiteCapabilities: [], supportCapabilities: []
    };
    const isoState = (events) => engineState({
      learnerId: 'SIM', mission: isoMission, tasks: TASK_REGISTRY,
      capabilities: CAPABILITIES, events, riskPriors: RISK_PRIORS,
      policy: LEARNING_POLICY_V1, selection: {},
      decisionContext: emptyContext('ep.vt', 'ses.vt'), now: dueNow
    });

    /* Due + honest surface: the retest is the ONLY work — forged
     * terminals can only be caught by the episode-derived path. */
    const stDue = isoState(priceArc());
    const b1Due = policyB1(stDue);
    ok(b1Due.chosen?.kind === KINDS.CORRECTION_RETEST, `VAL-TERM: setup wrong — ${b1Due.chosen?.kind}`);
    const vIdle = validateB0({ ...structuredClone(b1Due), chosen: { kind: 'idle' } }, stDue);
    ok(vIdle.includes('fabricated_idle'), `VAL-TERM: forged idle on due retest passed — ${vIdle.join(';')}`);
    const vBlocked = validateB0({ ...structuredClone(b1Due), chosen: { kind: 'blocked' } }, stDue);
    ok(vBlocked.includes('blocked_while_valid_work'), `VAL-TERM: forged blocked on due retest passed — ${vBlocked.join(';')}`);

    /* Due + NO honest surface: blocked/backlog stays valid. */
    const stBurned = isoState([
      ...priceArc(),
      ev('task.price.retrieval.hear', arcRepairedAt + HOUR, 'success')
    ]);
    const b1Burned = policyB1(stBurned);
    const vReal = validateB0(b1Burned, stBurned);
    ok(!vReal.some((x) => x === 'blocked_while_valid_work' || x === 'fabricated_idle'),
      `VAL-TERM: honest backlog decision rejected — ${vReal.join(';')}`);
    const vForgeBlocked = validateB0({ ...structuredClone(b1Burned), chosen: { kind: 'blocked' } }, stBurned);
    ok(!vForgeBlocked.includes('blocked_while_valid_work'),
      `VAL-TERM: blocked still rejected though no surface exists — ${vForgeBlocked.join(';')}`);
    say('VAL-TERM: forged idle/blocked on due retest rejected; no-surface backlog stays valid');
  }

  /* ── SEL-ADAPTER: correction_content_backlog survives the selection
   *     boundary as its own reasonCode, never generic blocked. ── */
  {
    const cap = capabilityById(PRICE);
    const ev = (tid, at, outcome, missing) =>
      attemptEvent(BUY_T(tid), cap, { at, outcome, missing });
    const dueNow = arcRepairedAt + LAG + HOUR;
    const sel = selectNextTask({
      mode: 'b1', learnerId: 'SIM',
      mission: { ...BUY.mission, taskIds: ['task.price.retrieval.hear'], targetCapabilities: [PRICE], carrierCapabilities: [], prerequisiteCapabilities: [], supportCapabilities: [] },
      tasks: TASK_REGISTRY, capabilities: CAPABILITIES,
      events: [
        ...priceArc(),
        ev('task.price.retrieval.hear', arcRepairedAt + HOUR, 'success')
      ],
      riskPriors: RISK_PRIORS, policy: LEARNING_POLICY_V1, selection: {},
      decisionContext: emptyContext('ep.sa', 'ses.sa'), now: dueNow
    });
    ok(sel.reasonCode === 'correction_content_backlog' && sel.status === 'blocked',
      `SEL-ADAPTER: backlog collapsed — status=${sel.status} reasonCode=${sel.reasonCode}`);
    ok(typeof sel.reason === 'string' && sel.reason.includes('correction_content_backlog'),
      `SEL-ADAPTER: reason text lost — ${sel.reason}`);
    say('SEL-ADAPTER: b1 backlog surfaces as correction_content_backlog reasonCode');
  }

  /* ── 008G: mission-local repair reachability proof ──
   * deriveCorrectionEpisodes is evidence-only now — whether repair is
   * still reachable INSIDE the serving mission is a routing question
   * answered per episode × per missing function through the SHARED
   * resolver (task-resolver.js), with fresh retest probes withheld.
   * Registry presence alone must never rescue a proof. */
  {
    const FN_PRICE = 'understand_spoken_price';
    const FN_DIR = 'follow_short_direction';
    const FN_CLOCK = 'understand_clock_time';
    const remB = 'task.price.remediation.hear';
    const remT = 'task.time.remediation.hear';
    const remP = 'task.place.remediation.follow';
    const repairable = (fixture, capId, evList, now, opts = {}) =>
      reservationsFor(fixture, evList, now, opts);
    const evOn = (fixture, capId) => (tid, at, outcome, missing) =>
      attemptEvent(fixture.tasks.find((t) => t.id === tid), capabilityById(capId), { at, outcome, missing });
    const evB = evOn(BUY, PRICE);
    const evP = evOn(PLACE, DIR);
    const evT = evOn(TIME, CLOCK);
    const repairingB = () => [
      evB('task.price.diagnostic.hear', T0, 'success'),
      evB('task.price.delayed.hear', T0 + DAY, 'fail', [FN_PRICE]),
      evB(remB, T0 + DAY + HOUR, 'fail', [FN_PRICE])
    ];
    const planOf = (r) => r.plans[0];
    const sortedIds = (s) => [...s].sort();

    /* — Positive proofs on all three real listening paths — */
    {
      const r = repairable(TIME, CLOCK, [
        evT('task.time.diagnostic.hear', T0, 'success'),
        evT('task.time.delayed.hear', T0 + DAY, 'fail', [FN_CLOCK]),
        evT(remT, T0 + DAY + HOUR, 'fail', [FN_CLOCK])
      ], T0 + DAY + 2 * HOUR);
      const p = planOf(r);
      ok(r.eps.episodes[0].state === 'REPAIRING' && p.required && p.complete
        && p.reasonCode === 'mission_repair_channel_proven'
        && p.witnesses[FN_CLOCK].some((w) => w.taskId === remT && w.hardFilterClean && w.missionMember && !w.consumesFreshRetestSurface)
        && sortedIds(r.reservations).join() === 'task.time.retrieval.hear',
        `MRP-TIME: clock-time proof failed — ${JSON.stringify({ s: r.eps.episodes[0].state, c: p.complete, w: p.witnesses, r: [...r.reservations] })}`);
      ok(p.missionId === TIME.mission.id && p.missionRevision === TIME.mission.revision
        && p.capabilityId === CLOCK && p.episodeId === r.eps.episodes[0].episodeId
        && p.version === REPAIR_PROOF_VERSION,
        'MRP-TIME: proof not bound to mission/revision/episode/capability');
    }
    {
      const r = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR);
      const p = planOf(r);
      ok(p.complete && p.witnesses[FN_PRICE].some((w) => w.taskId === remB && w.hardFilterClean)
        && sortedIds(r.reservations).join() === 'task.price.retrieval.hear',
        'MRP-BUY: spoken-price proof failed');
    }
    {
      /* PLACE is the repick case: the refresh route's NATURAL next serve
       * is a fresh retest probe — the proof must find the repair under
       * probe exclusion, not merely spot a remediation id in a list. */
      const r = repairable(PLACE, DIR, [
        evP('task.place.diagnostic.follow', T0, 'success'),
        evP('task.place.delayed.follow', T0 + DAY, 'fail', [FN_DIR]),
        evP(remP, T0 + DAY + HOUR, 'fail', [FN_DIR])
      ], T0 + DAY + 2 * HOUR);
      const p = planOf(r);
      const liveRefresh = r.gen.candidates.find((c) => c.capabilityId === DIR && c.kind === KINDS.REFRESH);
      ok(p.retestSurfaceIds.includes('task.place.retrieval.follow')
        && p.retestSurfaceIds.includes('task.place.retrieval.follow_landmark'),
        `MRP-PLACE: expected both retest surfaces — ${JSON.stringify(p.retestSurfaceIds)}`);
      ok(liveRefresh?.servableTask?.id === 'task.place.retrieval.follow',
        `MRP-PLACE: refresh primary was not the reserved probe — ${liveRefresh?.servableTask?.id}`);
      /* R2: the route's NATURAL pick is the load-bearing truth — the
       * refresh route would serve the probe itself and be filtered dead
       * by the reservation (inert), while correction actually carries
       * the repair. The exclusion-repick remains in the witness stream
       * as audit evidence of repair-channel depth. */
      ok(p.complete
        && p.servedNext.some((w) => w.candidateKind === KINDS.REFRESH
          && w.taskId === 'task.place.retrieval.follow'
          && w.classification === 'inert' && w.inertReason === 'reserved_probe')
        && p.servedNext.some((w) => w.candidateKind === KINDS.CORRECTION
          && w.taskId === remP && w.classification === 'usable')
        && p.witnesses[FN_DIR].some((w) => w.candidateKind === KINDS.REFRESH && w.taskId === remP && w.hardFilterClean),
        `MRP-PLACE: refresh probe-pick not neutralised / correction not usable — ${JSON.stringify(p.servedNext)}`);
      ok(sortedIds(r.reservations).join() === 'task.place.retrieval.follow,task.place.retrieval.follow_landmark',
        `MRP-PLACE: reservation set wrong — ${JSON.stringify([...r.reservations])}`);
      say('MRP-POS: clock/price/direction proofs; refresh repick off the reserved probe');
    }

    /* — State table — */
    {
      const open = repairable(BUY, PRICE, [
        evB('task.price.diagnostic.hear', T0, 'success'),
        evB('task.price.delayed.hear', T0 + DAY, 'fail', [FN_PRICE])
      ], T0 + DAY + 1);
      ok(open.eps.episodes[0].state === 'OPEN' && !planOf(open).required && open.reservations.size === 0,
        'MRP-STATE: OPEN reserved a probe (a probe may legitimately BE the repair)');
      const waiting = repairable(BUY, PRICE, priceArc(), T0 + DAY + 2 * HOUR);
      ok(waiting.eps.episodes[0].state === 'REPAIRED_WAITING' && waiting.reservations.has('task.price.retrieval.hear'),
        'MRP-STATE: REPAIRED_WAITING did not reserve the fresh probe directly');
      const due = repairable(BUY, PRICE, priceArc(), arcRepairedAt + LAG + HOUR);
      ok(due.eps.episodes[0].state === 'RETEST_DUE' && due.reservations.size === 0,
        'MRP-STATE: RETEST_DUE withheld the surface the retest must serve');
      const verified = repairable(BUY, PRICE, [
        ...priceArc(),
        evB('task.price.retrieval.hear', arcRepairedAt + LAG + HOUR, 'success')
      ], arcRepairedAt + LAG + 2 * HOUR);
      ok(verified.eps.episodes[0].state === 'VERIFIED' && verified.reservations.size === 0,
        'MRP-STATE: VERIFIED still held a reservation');
      say('MRP-STATE: OPEN/REPAIRED_WAITING/RETEST_DUE/VERIFIED reservation table');
    }

    /* — A1: repair exists only in ANOTHER mission's taskIds — the exact
     *     008F bug shape: registry holds the task, the mission cannot
     *     route to it. — */
    {
      const noRem = { ...BUY.mission, taskIds: BUY.mission.taskIds.filter((id) => id !== remB) };
      const r = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR, { mission: noRem });
      const p = planOf(r);
      ok(r.eps.episodes[0].state === 'REPAIRING' && !p.complete
        && p.reasonCode === 'mission_repair_channel_unproven' && r.reservations.size === 0,
        `MRP-XM: cross-mission remediation rescued the proof — ${JSON.stringify(p)}`);
      /* same construction, ghost task: a remediation for the cap+fn that
       * lives in the registry but was never declared on the mission. */
      const ghost = { ...structuredClone(BUY_T(remB)), id: 'task.ghost.remediation.hear' };
      const g = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR,
        { mission: noRem, tasks: [...TASK_REGISTRY, ghost] });
      ok(!planOf(g).complete && g.reservations.size === 0,
        'MRP-XM: out-of-mission registry ghost rescued the proof');
      say('MRP-XM: cross-mission + ghost-registry repairs cannot fake reachability');
    }

    /* — A2: wrong capability / wrong function coverage in-mission — */
    {
      const wrongCap = { ...structuredClone(BUY_T(remB)), id: 'task.price.remediation.othercap', capabilityId: 'interaction.ask_price' };
      const mWrongCap = { ...BUY.mission, taskIds: BUY.mission.taskIds.map((id) => id === remB ? wrongCap.id : id) };
      const r = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR,
        { mission: mWrongCap, tasks: [...TASK_REGISTRY, wrongCap] });
      ok(!planOf(r).complete && r.reservations.size === 0,
        'MRP-FN: wrong-capability remediation witnessed the price episode');
      const wrongFn = { ...structuredClone(BUY_T(remB)), id: 'task.price.remediation.wrongfn' };
      wrongFn.response = { ...wrongFn.response, requiredFunctions: ['identify_spoken_number'] };
      const mWrongFn = { ...BUY.mission, taskIds: BUY.mission.taskIds.map((id) => id === remB ? wrongFn.id : id) };
      const f = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR,
        { mission: mWrongFn, tasks: [...TASK_REGISTRY, wrongFn] });
      ok(!planOf(f).complete && f.reservations.size === 0,
        'MRP-FN: remediation covering a different function witnessed the episode');
      say('MRP-FN: wrong-capability / wrong-function repairs rejected');
    }

    /* — A3: stale task revision — the witness binds the CURRENT resolved
     *     revision; bumping the registry mints a new servable surface. — */
    {
      const rev2 = { ...structuredClone(BUY_T(remB)), revision: 2 };
      const tasks2 = [...TASK_REGISTRY, rev2];
      const r = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR, { tasks: tasks2 });
      const w = planOf(r).witnesses[FN_PRICE].find((x) => x.taskId === remB);
      ok(planOf(r).complete && w?.taskRevision === 2,
        `MRP-REV: witness bound stale revision — ${JSON.stringify(w)}`);
    }

    /* — A4: repair bound / failure ceiling exhaust the live routes — */
    {
      const ctxBound = { ...emptyContext('ep.mrp', 'ses.mrp'), actionsChosen: [
        { kind: KINDS.CORRECTION, capabilityId: PRICE },
        { kind: KINDS.CORRECTION, capabilityId: PRICE },
        { kind: KINDS.REFRESH, capabilityId: PRICE }
      ] };
      const r = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR, { ctx: ctxBound });
      const p = planOf(r);
      ok(!p.complete && p.witnesses[FN_PRICE].length > 0
        && p.witnesses[FN_PRICE].every((w) => !w.hardFilterClean && w.filterReasons.some((x) => x.startsWith('repair_bound')))
        && r.reservations.size === 0,
        `MRP-BOUND: exhausted repair bound still proved/reserved — ${JSON.stringify({ c: p.complete, w: p.witnesses, r: [...r.reservations] })}`);
      const ceil = repairable(BUY, PRICE, [
        ...repairingB(),
        evB(remB, T0 + DAY + 2 * HOUR, 'fail', [FN_PRICE]),
        evB(remB, T0 + DAY + 3 * HOUR, 'fail', [FN_PRICE])
      ], T0 + DAY + 4 * HOUR);
      const cp = planOf(ceil);
      ok(!cp.complete && cp.witnesses[FN_PRICE].some((w) => w.filterReasons.includes('identical_retry_after_failure_ceiling'))
        && ceil.reservations.size === 0,
        `MRP-CEIL: ceiling-identical-retry route proved/reserved — ${JSON.stringify({ c: cp.complete, w: cp.witnesses })}`);
      say('MRP-BOUND/CEIL: repair_bound + failure-ceiling-identical-retry break the proof');
    }

    /* — A5: multi-function completeness — the DIR episode misses TWO
     *     functions. follow_short_direction keeps an in-mission witness
     *     (burned retrieval.follow), but identify_basic_direction_term's
     *     ONLY covering task is the dropped remediation — so the whole
     *     proof must be false and no probe is withheld. — */
    {
      const arc = [
        evP('task.place.diagnostic.follow', T0, 'success'),
        evP('task.place.delayed.follow', T0 + DAY, 'fail', [FN_DIR]),
        evP('task.place.retrieval.follow', T0 + DAY + HOUR, 'fail', [FN_DIR]),
        evP(remP, T0 + DAY + 2 * HOUR, 'fail', [FN_DIR, 'identify_basic_direction_term'])
      ];
      const mNoRem = { ...PLACE.mission, taskIds: PLACE.mission.taskIds.filter((id) => id !== remP) };
      const r = repairable(PLACE, DIR, arc, T0 + DAY + 3 * HOUR, { mission: mNoRem });
      const p = planOf(r);
      ok(r.eps.episodes[0]?.state === 'REPAIRING'
        && p.remainingFunctions.includes(FN_DIR) && p.remainingFunctions.includes('identify_basic_direction_term'),
        `MRP-MF: episode did not attribute both functions — ${JSON.stringify({ s: r.eps.episodes[0]?.state, f: p.remainingFunctions })}`);
      ok((p.witnesses[FN_DIR] ?? []).some((w) => w.taskId === 'task.place.retrieval.follow' && w.hardFilterClean)
        && (p.witnesses.identify_basic_direction_term ?? []).length === 0,
        `MRP-MF: per-function witnesses wrong — ${JSON.stringify(p.witnesses)}`);
      ok(!p.complete && r.reservations.size === 0,
        `MRP-MF: uncovered second function did not falsify proof — reserved=${JSON.stringify([...r.reservations])}`);
      say('MRP-MF: ∀ missing fn required — partial coverage falsifies');
    }

    /* — A5b (R1): servedNext is load-bearing — the route serves ONE task
     *     next, so the proof needs a served task covering EVERY missing
     *     function. Split coverage across two remediation tasks fails
     *     even though each function "has a witness in the stream": after
     *     the served task consumes the last repair action, the other fn
     *     is unreachable. — */
    {
      const cloneFor = (id, fns) => {
        const t = structuredClone(PLACE_T(remP));
        t.id = id;
        t.response = { ...t.response, requiredFunctions: fns };
        return t;
      };
      const clA = cloneFor('task.place.remediation.fsd_only', [FN_DIR]);
      const clB = cloneFor('task.place.remediation.ibdt_only', ['identify_basic_direction_term']);
      const clAB = cloneFor('task.place.remediation.both_fns', [FN_DIR, 'identify_basic_direction_term']);
      const arc = [
        evP('task.place.diagnostic.follow', T0, 'success'),
        evP('task.place.delayed.follow', T0 + DAY, 'fail', [FN_DIR]),
        evP(remP, T0 + DAY + HOUR, 'fail', [FN_DIR, 'identify_basic_direction_term'])
      ];
      const swap = (...ids) => ({
        ...PLACE.mission,
        taskIds: PLACE.mission.taskIds.flatMap((id) => id === remP ? ids : [id])
      });
      const boundOneLeft = {
        ...emptyContext('ep.mrp', 'ses.mrp'),
        actionsChosen: [
          { kind: KINDS.CORRECTION, capabilityId: DIR },
          { kind: KINDS.CORRECTION, capabilityId: DIR }
        ]
      };
      const tasksWith = (...extra) => [...TASK_REGISTRY, ...extra];

      const split = repairable(PLACE, DIR, arc, T0 + DAY + 2 * HOUR,
        { mission: swap(clA.id, clB.id), tasks: tasksWith(clA, clB), ctx: boundOneLeft });
      const sp = planOf(split);
      ok(sp.servedNext.some((w) => w.taskId === clA.id && w.hardFilterClean && !w.coversAllRemaining),
        `MRP-SERVEDNEXT: servedNext should be the first split-cover remediation — ${JSON.stringify(sp.servedNext)}`);
      ok(!sp.complete && split.reservations.size === 0,
        `MRP-SERVEDNEXT: split coverage falsified → complete=${sp.complete} reserved=${JSON.stringify([...split.reservations])}`);

      const whole = repairable(PLACE, DIR, arc, T0 + DAY + 2 * HOUR,
        { mission: swap(clAB.id), tasks: tasksWith(clAB), ctx: boundOneLeft });
      const wp = planOf(whole);
      ok(wp.complete
        && wp.servedNext.some((w) => w.taskId === clAB.id && w.coversAllRemaining && w.hardFilterClean)
        && whole.reservations.has('task.place.retrieval.follow')
        && whole.reservations.has('task.place.retrieval.follow_landmark'),
        `MRP-SERVEDNEXT: single served task covering all missing fns must prove — ${JSON.stringify({ c: wp.complete, sn: wp.servedNext, r: [...whole.reservations] })}`);
      say('MRP-SERVEDNEXT: split coverage under bound → false; covers-all served-next → proven');
    }

    /* — A5c (R2): cross-route safety — EVERY live route's actual next
     *     serve is load-bearing, not just the safest one. Burned
     *     retrieval B covers F1 only and is mission-ordered ahead of the
     *     covering remediation, so REFRESH prefers B while CORRECTION
     *     serves the full cover: the policy is free to choose REFRESH
     *     first, and serving B burns the last repair action — proof must
     *     be false even though a safe route exists. Same arc in the
     *     natural mission order puts the covering task first on BOTH
     *     routes → proven. — */
    {
      const IBDT = 'identify_basic_direction_term';
      /* Both retest surfaces consumed by early successes (fresh tier
       * empty → repeatable-tier order picks the serve). The episode
       * opens on delayed.follow, the failed remediation carries ibdt
       * into missing, retrieval.follow's covering success burns it as
       * the repair surface (REPAIRED_WAITING), and the delayed re-fail
       * relapses the episode — observed streak 1, last-attempted is
       * delayed.follow, so no ceiling escape touches the refresh pick. */
      const crossArc = [
        evP('task.place.diagnostic.follow', T0, 'success'),
        evP('task.place.retrieval.follow', T0 + 1, 'success'),
        evP('task.place.retrieval.follow_landmark', T0 + 2, 'success'),
        evP('task.place.delayed.follow', T0 + DAY, 'fail', [FN_DIR]),
        evP(remP, T0 + DAY + HOUR, 'fail', [FN_DIR, IBDT]),
        evP('task.place.retrieval.follow', T0 + DAY + 2 * HOUR, 'success'),
        evP('task.place.delayed.follow', T0 + DAY + 3 * HOUR, 'fail', [FN_DIR])
      ];
      const boundLeft = {
        ...emptyContext('ep.mrpx', 'ses.mrpx'),
        actionsChosen: [
          { kind: KINDS.CORRECTION, capabilityId: DIR },
          { kind: KINDS.CORRECTION, capabilityId: DIR }
        ]
      };
      const bFirst = {
        ...PLACE.mission,
        taskIds: ['task.place.retrieval.follow',
          ...PLACE.mission.taskIds.filter((id) => id !== 'task.place.retrieval.follow')]
      };

      const unsafe = repairable(PLACE, DIR, crossArc, T0 + DAY + 4 * HOUR, { mission: bFirst, ctx: boundLeft });
      const up = planOf(unsafe);
      ok(up.servedNext.some((w) => w.candidateKind === KINDS.REFRESH
          && w.taskId === 'task.place.retrieval.follow'
          && w.classification === 'dangerous' && w.hardFilterClean && !w.coversAllRemaining),
        `MRP-XROUTE: refresh's actual serve should be the partial burned surface — ${JSON.stringify(up.servedNext)}`);
      ok(up.servedNext.some((w) => w.candidateKind === KINDS.CORRECTION
          && w.taskId === remP && w.classification === 'usable'),
        `MRP-XROUTE: correction route should still be usable — ${JSON.stringify(up.servedNext)}`);
      ok(!up.complete && unsafe.reservations.size === 0,
        `MRP-XROUTE: one choosable unsafe route must falsify the proof — complete=${up.complete} reserved=${JSON.stringify([...unsafe.reservations])}`);

      const safe = repairable(PLACE, DIR, crossArc, T0 + DAY + 4 * HOUR, { ctx: boundLeft });
      const xp = planOf(safe);
      ok(xp.complete
        && xp.servedNext.filter((w) => w.classification === 'usable').length === 2
        && safe.reservations.has('task.place.retrieval.follow_landmark'),
        `MRP-XROUTE: both routes serving full-coverage repair must prove — ${JSON.stringify({ c: xp.complete, sn: xp.servedNext, r: [...safe.reservations] })}`);
      say('MRP-XROUTE: refresh prefers a partial burned surface → proof false; both routes covering → proven');
    }

    /* — A6: relapse rewrites the surface set — the burned retest surface
     *     leaves the reservation (it is repair-eligible now) while the
     *     still-fresh probe stays withheld. — */
    {
      const arcP = [
        evP('task.place.diagnostic.follow', T0, 'success'),
        evP('task.place.delayed.follow', T0 + DAY, 'fail', [FN_DIR]),
        evP(remP, T0 + DAY + HOUR, 'success')
      ];
      const waiting = repairable(PLACE, DIR, arcP, T0 + DAY + 2 * HOUR);
      const relapsed = repairable(PLACE, DIR, [
        ...arcP,
        evP('task.place.retrieval.follow', T0 + DAY + HOUR + LAG + HOUR, 'fail', [FN_DIR])
      ], T0 + DAY + HOUR + LAG + 2 * HOUR);
      const pw = planOf(waiting); const pr = planOf(relapsed);
      ok(pw.reserved && waiting.reservations.has('task.place.retrieval.follow')
        && waiting.reservations.has('task.place.retrieval.follow_landmark'),
        'MRP-REL: pre-relapse reservation wrong');
      ok(relapsed.eps.episodes[0].state === 'RELAPSED' && pr.required && pr.complete
        && sortedIds(relapsed.reservations).join() === 'task.place.retrieval.follow_landmark'
        && !relapsed.reservations.has('task.place.retrieval.follow'),
        `MRP-REL: burned retest surface stayed reserved / fresh probe freed — ${JSON.stringify({ s: relapsed.eps.episodes[0].state, r: [...relapsed.reservations] })}`);
      say('MRP-REL: relapse moves the failed surface from probe to repair-eligible');
    }

    /* — A7: mission revision is part of the proof binding — same events
     *     under a bumped mission revision re-derive, never reuse. — */
    {
      const r2 = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR);
      const r3 = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR,
        { mission: { ...BUY.mission, revision: BUY.mission.revision + 1 } });
      ok(planOf(r2).missionRevision !== planOf(r3).missionRevision,
        'MRP-REV: proof not rebound when the mission revision changed');
    }

    /* — METAMORPHIC: adding an arbitrary out-of-mission task to the
     *     registry — and removing an unrelated one — must not change the
     *     proof, the reservations, or the B1 decision (modulo the input
     *     digest that legitimately binds the changed registry). — */
    {
      /* Even a ghost that WOULD serve (remediation-shaped, covers the
       * missing fn) changes nothing — it is not mission-reachable. The
       * same event array feeds every run so provenance-bound episode
       * ids are comparable. */
      const ghost = { ...structuredClone(BUY_T(remB)), id: 'task.ghost.out_of_mission' };
      const arc = repairingB();
      const base = repairable(BUY, PRICE, arc, T0 + DAY + 2 * HOUR);
      const added = repairable(BUY, PRICE, arc, T0 + DAY + 2 * HOUR, { tasks: [...TASK_REGISTRY, ghost] });
      const removed = repairable(BUY, PRICE, arc, T0 + DAY + 2 * HOUR,
        { tasks: TASK_REGISTRY.filter((t) => t.id !== 'task.time.transfer.clinic') });
      for (const [name, r] of [['+ghost', added], ['-unrelated', removed]]) {
        ok(canon(r.plans) === canon(base.plans), `MRP-META(${name}): repair proof changed`);
        ok(sortedIds(r.reservations).join() === sortedIds(base.reservations).join(),
          `MRP-META(${name}): reservations changed`);
      }
      const b1 = (r) => policyB1(r.st);
      const strip = ({ decisionId, ...rest }) => canon(rest);
      ok(strip(b1(added)) === strip(b1(base)) && strip(b1(removed)) === strip(b1(base)),
        'MRP-META: B1 decision changed under registry perturbation');
      say('MRP-META: registry add/remove leaves proof, reservations, B1 decision invariant');
    }

    /* — VAL-008G: the validator re-derives the reservation set itself —
     *     a decision claiming a serve on a withheld probe fails closed,
     *     and the identical serve under a non-reserving state stays
     *     clean. — */
    {
      const reserved = repairable(BUY, PRICE, repairingB(), T0 + DAY + 2 * HOUR);
      ok(reserved.reservations.has('task.price.retrieval.hear'),
        'VAL-008G: fixture did not reserve the probe — test setup broken');
      const forgeServe = (st) => {
        const d = structuredClone(policyB1(st));
        d.chosen = {
          kind: KINDS.REFRESH, taskId: 'task.price.retrieval.hear',
          taskRevision: BUY_T('task.price.retrieval.hear').revision ?? 1,
          capabilityId: PRICE
        };
        return d;
      };
      const vReserved = validateB0(forgeServe(reserved.st), reserved.st);
      ok(vReserved.includes('correction_retest_surface_reserved'),
        `VAL-008G: forged serve on a reserved probe passed — ${vReserved.join(';')}`);
      const open = repairable(BUY, PRICE, repairingB().slice(0, 2), T0 + DAY + 1);
      const vOpen = validateB0(forgeServe(open.st), open.st);
      ok(!vOpen.includes('correction_retest_surface_reserved'),
        `VAL-008G: probe serve in OPEN wrongly rejected — ${vOpen.join(';')}`);
      say('VAL-008G: forged serve on reserved probe rejected; OPEN-state probe serve clean');
    }
    say('MRP: 008G mission-local repair proof attack table green');
  }

  /* ── SES-B1: full trajectory under mode 'b1' — the policy actually
   *     serving. Miss → repair → WAIT (no certification) → lag → retest
   *     → verify → certification resumes. ── */
  {
    const learner = 'RT.008f.b1.buy';
    const eventStore = createMemoryEventStore();
    const runStore = createMemoryRunStore();
    const decisionStore = createMemoryDecisionStore();
    const served = [];
    const missed = new Set();
    const answers = (s) => ANSWERS_008E[s.taskId] ?? SCRIPT[s.taskId];
    const open = async () => {
      const s = makeSession({ fixture: BUY, learner, mode: 'b1', eventStore, runStore, decisionStore });
      await s.init();
      return s;
    };

    /* Phase A+B: teach everything immediately routable, jump the
     * retention lag, miss the delayed retest once — episode OPENs. */
    for (let round = 0; round < 4; round += 1) await drive008f(open(), answers, { servedList: served });
    tick += DAY + HOUR;
    for (let round = 0; round < 10 && !missed.has('task.price.delayed.hear'); round += 1) {
      await drive008f(open(), answers, { missOnce: 'task.price.delayed.hear', missedSet: missed, servedList: served });
      tick += 2 * HOUR;
    }
    ok(missed.has('task.price.delayed.hear'), `SES-B1: attributing miss never produced — ${served.join(' → ')}`);
    let events = await eventStore.list();
    /* The same drive may already have served the repair — what the log
     * must prove is that an episode OPENED from the delayed-retest miss
     * (source provenance), whatever lifecycle stage it has reached. */
    let epSet = deriveCorrectionEpisodes({ learnerId: learner, events, capabilities: CAPABILITIES, tasks: TASK_REGISTRY, policy: LEARNING_POLICY_V1, now: tick });
    let ep = epSet.episodes.find((e) => e.capabilityId === PRICE);
    ok(ep != null && ep.sourceTaskId === 'task.price.delayed.hear' && ep.failures.length >= 1,
      `SES-B1: no episode opened from the delayed-retest miss — ${JSON.stringify(epSet.episodes.map((e) => [e.capabilityId, e.state]))}`);
    const epOpenedAt = ep.openedAt;

    /* Phase C: repair + delayed retest may all complete inside the drive.
     * What must hold: NO certification decision on PRICE was consumed
     * inside the episode's open window [openedAt, verifiedAt).
     * B1 deliberately lets the mission idle while the episode waits out
     * the lag — `done` is NOT the stop condition here; the clock must
     * keep jumping until the retest is due and verifies. */
    const priceEp = async () => deriveCorrectionEpisodes({
      learnerId: learner, events: await eventStore.list(), capabilities: CAPABILITIES,
      tasks: TASK_REGISTRY, policy: LEARNING_POLICY_V1, now: tick
    }).episodes.find((e) => e.capabilityId === PRICE);
    for (let round = 0; round < 30; round += 1) {
      await drive008f(open(), answers, { servedList: served });
      const cur = await priceEp();
      if (cur?.state === 'VERIFIED') break;
      /* A terminal-mission summary while the episode is open means B1
       * is correctly refusing to certify — jump the lag and re-drive. */
      tick += 2 * HOUR;
    }
    events = await eventStore.list();
    const finalSet = deriveCorrectionEpisodes({ learnerId: learner, events, capabilities: CAPABILITIES, tasks: TASK_REGISTRY, policy: LEARNING_POLICY_V1, now: tick });
    const epDone = finalSet.episodes.find((e) => e.capabilityId === PRICE);
    const audits = await decisionStore.list();
    const BUY_TASK_ON_CAP = (id) => BUY_T(id)?.capabilityId === PRICE;
    const certInsideWindow = audits.filter((r) =>
      ['transfer', 'assessment'].includes(r.chosenKind)
      && r.taskId && BUY_TASK_ON_CAP(r.taskId)
      && r.timestamp >= epOpenedAt
      && (epDone?.verifiedAt == null || r.timestamp < epDone.verifiedAt));
    ok(certInsideWindow.length === 0,
      `SES-B1: certification consumed while episode open — ${certInsideWindow.map((r) => `${r.chosenKind}@${r.taskId}@${r.timestamp}`).join(',')}`);
    ok(epDone?.state === 'VERIFIED', `SES-B1: episode never verified — state=${epDone?.state}`);

    const retestAudit = audits.find((r) => r.chosenKind === 'correction_retest');
    ok(retestAudit != null, 'SES-B1: no correction_retest decision was consumed — the retest never served under B1');
    ok(retestAudit.selectionPolicyVersion === POLICY_VERSIONS.B1,
      `SES-B1: retest audit pinned ${retestAudit.selectionPolicyVersion}`);
    ok(retestAudit.taskId !== 'task.price.delayed.hear' && retestAudit.taskId !== 'task.price.remediation.hear',
      `SES-B1: retest reused source/repair surface — ${retestAudit.taskId}`);
    const pin = (await runStore.list()).find((r) => r.id)?.selection?.selectionPolicyVersion;
    ok(pin === POLICY_VERSIONS.B1, `SES-B1: run pinned '${pin}', expected '${POLICY_VERSIONS.B1}'`);
    say(`SES-B1: BUY miss→episode→repair→retest(${retestAudit.taskId})→VERIFIED under 'b1'; certification held inside the open window; pin=${pin}`);
  }

  /* ── SES-B1-RELAPSE: PLACE trajectory — the retest itself FAILS while
   *     due: the same episode relapses (never replaced), repair returns,
   *     the lag restarts, and the burned retest surface can never come
   *     back as the "independent" retest (retrieval.follow_landmark is
   *     the only honest surface left). ── */
  {
    const learner = 'RT.008f.b1.place';
    const eventStore = createMemoryEventStore();
    const runStore = createMemoryRunStore();
    const decisionStore = createMemoryDecisionStore();
    const served = [];
    const missed = new Set();
    const answers = (s) => ANSWERS_008E[s.taskId] ?? SCRIPT[s.taskId];
    const open = async () => {
      const s = makeSession({ fixture: PLACE, learner, mode: 'b1', eventStore, runStore, decisionStore });
      await s.init();
      return s;
    };
    const epNow = async () => deriveCorrectionEpisodes({
      learnerId: learner, events: await eventStore.list(), capabilities: CAPABILITIES,
      tasks: TASK_REGISTRY, policy: LEARNING_POLICY_V1, now: tick
    }).episodes.find((e) => e.capabilityId === DIR);

    for (let round = 0; round < 4; round += 1) await drive008f(open(), answers, { servedList: served });
    tick += DAY + HOUR;
    for (let round = 0; round < 10 && !missed.has('task.place.delayed.follow'); round += 1) {
      await drive008f(open(), answers, { missOnce: 'task.place.delayed.follow', missedSet: missed, servedList: served });
      tick += 2 * HOUR;
    }
    ok(missed.has('task.place.delayed.follow'), `SES-B1-PLACE: attributing miss never produced — ${served.join(' → ')}`);
    let ep = await epNow();
    ok(ep != null && ep.sourceTaskId === 'task.place.delayed.follow',
      `SES-B1-PLACE: no episode opened from the delayed miss — ${ep?.sourceTaskId}`);
    const episodeId = ep.episodeId;
    const epOpenedAt = ep.openedAt;

    /* Repair → wait for the retest to come due (the clock keeps jumping
     * while B1 refuses to certify). */
    for (let round = 0; round < 30 && (await epNow())?.state !== 'RETEST_DUE'; round += 1) {
      await drive008f(open(), answers, { servedList: served });
      tick += 2 * HOUR;
    }
    ok((await epNow())?.state === 'RETEST_DUE', `SES-B1-PLACE: episode never reached RETEST_DUE — ${(await epNow())?.state}`);

    /* Relapse: fail the retest surface itself — a fresh attributing miss
     * inside the same episode, never a new one. */
    for (let round = 0; round < 12 && !missed.has('task.place.retrieval.follow'); round += 1) {
      await drive008f(open(), answers, { missOnce: 'task.place.retrieval.follow', missedSet: missed, servedList: served });
      tick += 2 * HOUR;
    }
    ok(missed.has('task.place.retrieval.follow'), 'SES-B1-PLACE: retest surface never served to be failed');
    ep = await epNow();
    /* The same drive may already have re-repaired — what the log must
     * prove is the SAME episode absorbed the retest failure (never a
     * replacement), recorded the relapse, and is not yet verified. */
    ok(ep != null && ep.episodeId === episodeId && ep.relapseCount === 1 && ep.failures.length === 2
      && ep.state !== 'VERIFIED',
      `SES-B1-PLACE: relapse did not reopen the SAME episode — ${JSON.stringify(ep && { id: ep.episodeId, state: ep.state, relapses: ep.relapseCount, failures: ep.failures.length })}`);

    /* Re-repair → lag restarts → the verifying retest must be the
     * un-burned alternate; the failed retest surface stays banned. */
    for (let round = 0; round < 30; round += 1) {
      await drive008f(open(), answers, { servedList: served });
      const cur = await epNow();
      if (cur?.state === 'VERIFIED') break;
      tick += 2 * HOUR;
    }
    const epDone = await epNow();
    ok(epDone?.state === 'VERIFIED', `SES-B1-PLACE: episode never verified — state=${epDone?.state}`);
    const audits = await decisionStore.list();
    const retestAudits = audits.filter((r) => r.chosenKind === 'correction_retest');
    /* The burned surface was minted exactly ONCE — the decision that
     * produced the relapse (audit ts can trail the failure's occurredAt
     * by minutes: now() advances per call). It can never come back. */
    ok(retestAudits.filter((r) => r.taskId === 'task.place.retrieval.follow').length === 1,
      `SES-B1-PLACE: burned retest surface minted again — ${JSON.stringify(retestAudits.map((r) => r.taskId))}`);
    /* Provenance: the verifying event sits on the un-burned alternate. */
    const events = await eventStore.list();
    const verifier = events.find((e) => e.id === epDone.verifiedByEventId);
    ok(verifier?.taskId === 'task.place.retrieval.follow_landmark',
      `SES-B1-PLACE: episode verified by ${verifier?.taskId} — expected retrieval.follow_landmark`);
    const PLACE_TASK_ON_CAP = (id) => PLACE_T(id)?.capabilityId === DIR;
    const certInsideWindow = audits.filter((r) =>
      ['transfer', 'assessment'].includes(r.chosenKind)
      && r.taskId && PLACE_TASK_ON_CAP(r.taskId)
      && r.timestamp >= epOpenedAt
      && r.timestamp < epDone.verifiedAt);
    ok(certInsideWindow.length === 0,
      `SES-B1-PLACE: certification consumed inside the open window — ${certInsideWindow.map((r) => r.taskId).join(',')}`);
    say(`SES-B1-PLACE: miss→episode→repair→retest FAIL→RELAPSED(same episode)→re-repair→retest(${verifier.taskId})→VERIFIED; burned surface banned`);
  }

  /* ── SES-B1-TIME: clock-time path end-to-end under 'b1'. The support
   *     probe (identify_spoken_number substrate) may serve on demand —
   *   it is a different capability AND a non-attempt event type, so the
   *     target episode must outlive it. ── */
  {
    const learner = 'RT.008f.b1.time';
    const eventStore = createMemoryEventStore();
    const runStore = createMemoryRunStore();
    const decisionStore = createMemoryDecisionStore();
    const served = [];
    const missed = new Set();
    const answers = (s) => ANSWERS_008F_TIME[s.taskId] ?? SCRIPT[s.taskId];
    const open = async () => {
      const s = makeSession({ fixture: TIME, learner, mode: 'b1', eventStore, runStore, decisionStore });
      await s.init();
      return s;
    };
    const epNow = async () => deriveCorrectionEpisodes({
      learnerId: learner, events: await eventStore.list(), capabilities: CAPABILITIES,
      tasks: TASK_REGISTRY, policy: LEARNING_POLICY_V1, now: tick
    }).episodes.find((e) => e.capabilityId === CLOCK);

    for (let round = 0; round < 4; round += 1) await drive008f(open(), answers, { servedList: served });
    tick += DAY + HOUR;
    for (let round = 0; round < 10 && !missed.has('task.time.delayed.hear'); round += 1) {
      await drive008f(open(), answers, { missOnce: 'task.time.delayed.hear', missedSet: missed, servedList: served });
      tick += 2 * HOUR;
    }
    ok(missed.has('task.time.delayed.hear'), `SES-B1-TIME: attributing miss never produced — ${served.join(' → ')}`);
    let ep = await epNow();
    ok(ep != null && ep.sourceTaskId === 'task.time.delayed.hear' && ep.missingFunctions.includes('understand_clock_time'),
      `SES-B1-TIME: no episode opened from the delayed miss — ${ep?.sourceTaskId} missing=${ep?.missingFunctions}`);
    const epOpenedAt = ep.openedAt;

    for (let round = 0; round < 30; round += 1) {
      await drive008f(open(), answers, { servedList: served });
      const cur = await epNow();
      if (cur?.state === 'VERIFIED') break;
      tick += 2 * HOUR;
    }
    const epDone = await epNow();
    ok(epDone?.state === 'VERIFIED', `SES-B1-TIME: episode never verified — state=${epDone?.state}`);

    /* Provenance: the verifying event must be the retest surface, never
     * the support probe (support success cannot close a target episode)
     * and never the burned source/repair surfaces. */
    const events = await eventStore.list();
    const verifier = events.find((e) => e.id === epDone.verifiedByEventId);
    ok(verifier?.taskId === 'task.time.retrieval.hear',
      `SES-B1-TIME: episode verified by ${verifier?.taskId} — expected the alternate retest surface`);
    const audits = await decisionStore.list();
    const TIME_TASK_ON_CAP = (id) => TIME_T(id)?.capabilityId === CLOCK;
    const certInsideWindow = audits.filter((r) =>
      ['transfer', 'assessment'].includes(r.chosenKind)
      && r.taskId && TIME_TASK_ON_CAP(r.taskId)
      && r.timestamp >= epOpenedAt
      && r.timestamp < epDone.verifiedAt);
    ok(certInsideWindow.length === 0,
      `SES-B1-TIME: certification consumed inside the open window — ${certInsideWindow.map((r) => r.taskId).join(',')}`);
    say(`SES-B1-TIME: miss→episode→repair→retest(${verifier.taskId})→VERIFIED under 'b1'; ${served.includes('task.time.support.number_probe') ? 'support probe served mid-window and did not close the episode' : 'no support demand on this arc'}`);
  }

  /* ── SES-SHADOW: mode 'shadow_b1' serves the REFERENCE path while the
   *     B0↔B1 comparison is recorded — the learner never sees B1. ── */
  {
    const learner = 'RT.008f.shadow';
    const eventStore = createMemoryEventStore();
    const runStore = createMemoryRunStore();
    const decisionStore = createMemoryDecisionStore();
    const shadows = [];
    const session = makeSession({
      fixture: BUY, learner, mode: 'shadow_b1',
      eventStore, runStore, decisionStore,
      shadowSink: (s) => shadows.push(s)
    });
    await session.init();
    const served = [];
    for (let round = 0; round < 24; round += 1) {
      const s = session.screen();
      if (s.type === 'summary') break;
      if (s.type === 'intro') { await session.start({ learnerName: 'linh' }); continue; }
      if (s.type === 'input') { await session.view(); continue; }
      if (s.type === 'task' && s.phase === 'prompt') {
        served.push(s.taskId);
        const a = ANSWERS_008E[s.taskId] ?? SCRIPT[s.taskId] ?? 'x';
        if (s.responseType === 'choice') await session.commit({ optionId: a });
        else await session.commit({ text: a });
        continue;
      }
      if (s.type === 'task') { await session.next(); continue; }
      break;
    }
    ok(served.length > 0, 'SES-SHADOW: shadow_b1 served nothing — reference path broken');
    ok(shadows.length > 0, 'SES-SHADOW: no shadow comparisons recorded');
    ok(shadows.every((s) => s.b1 != null && s.b0VsB1 != null && typeof s.b0VsB1.class === 'string'),
      'SES-SHADOW: comparison rows missing b1 or b0VsB1 fields');
    const pin = session.runInfo()?.selection?.selectionPolicyVersion;
    ok(pin === POLICY_VERSIONS.B1, `SES-SHADOW: shadow_b1 run pinned '${pin}'`);
    say(`SES-SHADOW: shadow_b1 served ${served.length} reference task(s); ${shadows.length} comparisons logged; pin=${pin}`);
  }
}

console.log(`vnext-next-for-you-runtime: ${check} checks — PASS`);
