/* Adversarial suite for the vNext learner model (Mission 007).
 *
 * Each section attacks one semantic claim of the model contract:
 * honesty about contact vs ability, support dependency, function gaps,
 * retention, transfer, assessment, recency, uncertainty, isolation,
 * replay determinism and the memory boundary. The model must tell an
 * honest story — never mint mastery the evidence kernel cannot prove. */
import assert from 'node:assert/strict';
import { bindAttempt, bindObservation } from '../src/vnext/bind.js';
import { buildLearnerModel, explainCapability } from '../src/vnext/learner-model.js';
import { capabilityById } from '../src/vnext/fixtures.js';
import { toEventDoc, fromEventDoc } from '../src/vnext/persist.js';
import { FIXTURES, MISSION_MEET_AT_TIME, TASKS_MEET_AT_TIME } from '../src/vnext/fixtures.js';
import { CAPABILITIES } from '../src/vnext/capabilities.js';

const T0 = Date.parse('2026-03-02T09:00:00Z');
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const LEARNER = 'learner.lm';
const FOREIGN = 'learner.other';

const TASKS = TASKS_MEET_AT_TIME;
const ALL_TASKS = FIXTURES.flatMap((f) => f.tasks);
const taskById = (id) => TASKS.find((t) => t.id === id);

const TARGET = 'reception.listen.understand_clock_time';
const SUPPORT = 'reception.listen.identify_spoken_number';
const SPEAK = 'production.speak.state_clock_time';
const NUM_FN = 'identify_spoken_number';
const CLOCK_FN = 'understand_clock_time';

const roles = {
  targets: new Set(MISSION_MEET_AT_TIME.targetCapabilities),
  supports: new Set(MISSION_MEET_AT_TIME.supportCapabilities),
  prereqs: new Set(MISSION_MEET_AT_TIME.prerequisiteCapabilities ?? [])
};

let seq = 0;
const attempt = (taskId, { at, outcome = 'success', missing, observed = true, support, learnerId = LEARNER, id } = {}) => {
  const t = taskById(taskId);
  return bindAttempt(t, capabilityById(t.capabilityId), {
    id: id ?? `lm.${++seq}`,
    learnerId,
    occurredAt: at,
    attempt: { observed, outcome, response: outcome === 'success' ? 'right' : 'wrong', latencyMs: 1500, attemptId: `a.${seq}` },
    ...(support ? { support } : {}),
    ...(missing ? { evaluation: { missingFunctions: missing } } : {})
  });
};
const observe = (taskId, { at, learnerId = LEARNER } = {}) => {
  const t = taskById(taskId);
  return bindObservation(t, capabilityById(t.capabilityId), {
    id: `lm.${++seq}`, learnerId, occurredAt: at, eventType: 'exposure'
  });
};
const model = (events, opts = {}) =>
  buildLearnerModel({
    learnerId: LEARNER, events, capabilities: CAPABILITIES, tasks: ALL_TASKS,
    now: opts.now ?? T0 + 3 * DAY, roles, ...opts
  });
const cap = (m, id = TARGET) => m.capabilities[id];

let check = 0;
const ok = (name) => { check++; console.log(`  ✓ ${name}`); };

/* ── 1. Fresh learner — everything unknown, honestly ────────── */
{
  const m = model([]);
  assert.equal(m.profile.unknown.length, CAPABILITIES.length);
  assert.equal(m.profile.demonstrated.length, 0);
  assert.equal(m.generatedFrom, 0);
  const v = cap(m);
  assert.equal(v.achievement.state, 'NOT_SEEN');
  assert.deepEqual(v.uncertainty.reasons.map((r) => r.code), ['no_evidence']);
  assert.equal(v.uncertainty.evidenceSufficient, false);
  assert.equal(v.memory, 'NOT_MODELED');
  ok('fresh learner: every capability unknown, no_evidence, memory NOT_MODELED');
}

/* ── 2. Supported-only learner — not independent ────────────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'success', support: { hint: true } })
  ];
  const v = cap(model(events));
  assert.equal(v.achievement.milestones.supported, true);
  assert.equal(v.achievement.milestones.independent, false);
  assert.equal(v.support.everUsed, true);
  assert.equal(v.support.dependent, true);
  assert.ok(v.uncertainty.reasons.some((r) => r.code === 'only_supported_attempts'));
  assert.equal(v.support.demandsIssued, 0, 'success demands nothing');
  ok('supported-only: success-with-hint mints SUPPORTED, not INDEPENDENT; dependency visible');
}

/* ── 3. Clean independent — no fake retention/transfer ──────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR })
  ];
  const v = cap(model(events, { now: T0 + 2 * HOUR }));
  assert.equal(v.achievement.state, 'INDEPENDENT');
  assert.equal(v.achievement.milestones.retained, false);
  assert.equal(v.achievement.milestones.transferred, false);
  assert.equal(v.evidence.independentSuccessCount, 1);
  assert.ok(v.uncertainty.reasons.some((r) => r.code === 'thin_independent_evidence'));
  assert.ok(v.uncertainty.reasons.some((r) => r.code === 'no_delayed_evidence'));
  assert.ok(v.uncertainty.reasons.some((r) => r.code === 'no_transfer_evidence'));
  assert.equal(v.support.dependent, false);
  ok('clean independent: INDEPENDENT with thin/no-delayed/no-transfer reasons — no fake milestones');
}

/* ── 4. Delayed success — retention demonstrated ────────────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
    attempt('task.time.delayed.hear', { at: T0 + HOUR + DAY })
  ];
  const v = cap(model(events));
  assert.equal(v.retention.demonstrated, true);
  assert.equal(v.evidence.delayedSuccessCount, 1);
  assert.equal(v.retention.lastDelayedEvidenceAt, T0 + HOUR + DAY);
  assert.equal(v.achievement.milestones.retained, true);
  ok('delayed success ≥ retention window: retention demonstrated, timestamp recorded');
}

/* ── 5. Fresh transfer — transfer evidence separate ─────────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
    attempt('task.time.delayed.hear', { at: T0 + DAY + HOUR }),
    attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY })
  ];
  const v = cap(model(events));
  assert.equal(v.transfer.demonstrated, true);
  assert.equal(v.evidence.transferSuccessCount, 1);
  assert.ok(v.transfer.promptFamilies.length >= 1);
  assert.equal(v.transfer.lastTransferAt, T0 + 2 * DAY);
  ok('fresh transfer success: transfer demonstrated with family + timestamp');
}

/* ── 6. Assessment pass — separate dimension from transfer ──── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
    attempt('task.time.delayed.hear', { at: T0 + DAY + HOUR }),
    attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY }),
    attempt('task.time.assessment.hear', { at: T0 + 3 * DAY })
  ];
  const m = model(events, { now: T0 + 3 * DAY + HOUR });
  const v = cap(m);
  assert.equal(v.assessment.latestStatus, 'success');
  assert.equal(v.evidence.assessmentCount, 1);
  assert.ok(m.profile.assessed.includes(TARGET));
  assert.ok(!m.profile.assessmentPending.includes(TARGET));
  assert.equal(v.uncertainty.evidenceSufficient, true, 'full chain — no residual uncertainty reasons');
  ok('assessment pass: assessed bucket; the complete chain yields evidenceSufficient');
}

/* ── 7. Support demand + probe — target stays unproven ──────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'fail', missing: [NUM_FN] }),
    attempt('task.time.support.number_probe', { at: T0 + 2 * HOUR })
  ];
  const m = model(events);
  const t = cap(m);
  const s = cap(m, SUPPORT);
  assert.equal(t.achievement.milestones.independent, false);
  assert.equal(t.support.servedEpisodes, 1);
  assert.equal(t.support.dependent, true);
  assert.equal(s.achievement.milestones.supported, false, 'support_attempt never mints a milestone');
  assert.equal(s.achievement.milestones.independent, false);
  assert.ok(t.failures.unresolvedFunctions.includes(NUM_FN), 'gap stays open until demonstrated');
  ok('demand + probe: target unproven & dependent; support cap earns nothing; gap unresolved');
}

/* ── 8. Support then clean target success — episode resolved ── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'fail', missing: [NUM_FN] }),
    attempt('task.time.support.number_probe', { at: T0 + 2 * HOUR }),
    attempt('task.time.retrieval.hear', { at: T0 + 3 * HOUR })
  ];
  const v = cap(model(events));
  assert.equal(v.achievement.milestones.independent, true);
  assert.equal(v.support.servedEpisodes, 1);
  assert.equal(v.support.dependent, false, 'unaided success after support closes dependency');
  assert.ok(v.failures.resolvedFunctions.includes(NUM_FN));
  assert.equal(v.failures.unresolvedFunctions.length, 0);
  ok('support → unaided success: resolvedFunctions records remediation; dependent clears');
}

/* ── 9. Recurring gap — reopened honestly ───────────────────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'fail', missing: [NUM_FN] }),
    attempt('task.time.retrieval.hear', { at: T0 + 2 * HOUR }),
    attempt('task.time.diagnostic.hear', { at: T0 + 3 * HOUR, outcome: 'fail', missing: [NUM_FN] })
  ];
  const v = cap(model(events));
  assert.ok(v.failures.unresolvedFunctions.includes(NUM_FN), 're-missed after demonstration → still unresolved');
  assert.ok(v.failures.recurringFunctions.includes(NUM_FN), 'reopened gap is flagged recurring');
  assert.equal(v.failures.consecutiveFailures, 1);
  ok('recurring gap: miss→demo→miss keeps function unresolved AND marks it recurring');
}

/* ── 10. Old transfer — history kept, recency honest ────────── */
{
  const events = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
    attempt('task.time.delayed.hear', { at: T0 + DAY + HOUR }),
    attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY })
  ];
  const v = cap(model(events, { now: T0 + 40 * DAY }));
  assert.equal(v.transfer.demonstrated, true, 'historical transfer fact survives');
  assert.equal(v.achievement.milestones.retained, true, 'historical retention survives');
  assert.equal(v.retention.sinceLastIndependentMs, 40 * DAY - 2 * DAY);
  assert.ok(v.uncertainty.reasons.some((r) => r.code === 'evidence_older_than_retention_window'),
    'stale evidence is a reason, not a demotion');
  ok('old transfer: milestones immutable; recency surfaces as uncertainty, not demotion');
}

/* ── 11. Foreign learner events — zero contamination ────────── */
{
  const events = [
    attempt('task.time.retrieval.hear', { at: T0, learnerId: FOREIGN }),
    attempt('task.time.transfer.clinic', { at: T0 + DAY, learnerId: FOREIGN }),
    attempt('task.time.assessment.hear', { at: T0 + 2 * DAY, learnerId: FOREIGN })
  ];
  const m = model(events);
  assert.equal(m.generatedFrom, 0);
  assert.equal(cap(m).achievement.state, 'NOT_SEEN');
  assert.ok(m.profile.unknown.includes(TARGET));
  ok('foreign learner events ignored completely');
}

/* ── 12. Duplicates + 13. Reordering — identical models ─────── */
{
  const base = [
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'fail', missing: [NUM_FN] }),
    attempt('task.time.support.number_probe', { at: T0 + 2 * HOUR }),
    attempt('task.time.retrieval.hear', { at: T0 + 3 * HOUR }),
    attempt('task.time.delayed.hear', { at: T0 + DAY + 4 * HOUR }),
    attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY })
  ];
  const a = model(base);
  const dup = model([...base, ...base]); // redelivery
  const shuffled = model([...base].reverse());
  const foreignMix = model([...base, attempt('task.time.retrieval.hear', { at: T0 + 5 * HOUR, learnerId: FOREIGN })]);
  /* Firestore-document round-trip: write each event through the doc
   * mapping the cloud layer uses, read it back, rebuild — identical. */
  const roundTripped = model(base.map((e) => fromEventDoc(toEventDoc(e, 'uid.x'))));
  assert.equal(JSON.stringify(dup), JSON.stringify(a), 'duplicate delivery must not inflate');
  assert.equal(JSON.stringify(shuffled), JSON.stringify(a), 'arrival order must not matter');
  assert.equal(JSON.stringify(foreignMix), JSON.stringify(a), 'foreign events must not contaminate');
  assert.equal(JSON.stringify(roundTripped), JSON.stringify(a), 'Firestore doc round-trip must rebuild the identical model');
  assert.equal(JSON.parse(JSON.stringify(a)).capabilities[TARGET].achievement.state, 'TRANSFERRED');
  ok('determinism: duplicates, reordering, foreign mix, Firestore round-trip all produce the identical model');
}

/* ── 14. Stale task revision — cannot strengthen ────────────── */
{
  const good = attempt('task.time.retrieval.hear', { at: T0 });
  const stale = { ...good, id: 'lm.stale', taskRevision: 999 };
  const v = cap(model([stale]));
  assert.equal(v.achievement.milestones.independent, false);
  assert.equal(v.evidence.unverifiableEventCount, 1);
  assert.equal(v.evidence.verifiedAttemptCount, 0);
  ok('stale revision: unresolvable task contract → counted unverifiable, no claim');
}

/* ── 15. Unverified / weak-authority events cannot strengthen ─ */
{
  const forged = attempt('task.time.retrieval.hear', { at: T0 });
  forged.evaluation = { ...forged.evaluation, authority: 'self_report' };
  const unobserved = attempt('task.time.retrieval.hear', { at: T0 + HOUR, observed: false });
  const v = cap(model([forged, unobserved]));
  assert.equal(v.achievement.milestones.independent, false, 'self-report authority + unobserved cannot mint INDEPENDENT');
  assert.equal(v.achievement.milestones.supported, true, 'they do land as supported context');
  assert.equal(v.evidence.independentSuccessCount, 0);
  ok('weak authority/unobserved: SUPPORTED context at best, never INDEPENDENT');
}

/* ── 16. support_attempt cannot mint support-cap mastery ────── */
{
  const events = [
    attempt('task.time.support.number_probe', { at: T0 }),
    attempt('task.time.support.number_probe', { at: T0 + HOUR }),
    attempt('task.time.support.number_probe', { at: T0 + 2 * HOUR })
  ];
  const s = cap(model(events), SUPPORT);
  assert.equal(s.achievement.milestones.supported, false);
  assert.equal(s.achievement.milestones.independent, false);
  assert.equal(s.achievement.state, 'EXPOSED', 'probes only ever record exposure');
  assert.equal(s.evidence.attemptCount, 0, 'support_attempt is not an ability attempt');
  ok('support_attempt: never ability evidence — support cap stays EXPOSED only');
}

/* ── 17. Baseline vs in-program origin ──────────────────────── */
{
  const baseline = cap(model([
    attempt('task.time.diagnostic.hear', { at: T0 })
  ]));
  assert.equal(baseline.evidence.origin, 'baseline', 'first verified event is a baseline probe');
  const learned = cap(model([
    observe('task.time.input.clock', { at: T0 }),
    attempt('task.time.retrieval.hear', { at: T0 + HOUR })
  ]));
  assert.equal(learned.evidence.origin, 'in_program');
  assert.equal(learned.achievement.milestones.independent, true);
  ok('origin: diagnostic-first → baseline; input-first → in_program');
}

/* ── 18. Missing evidence — explicit categorical uncertainty ── */
{
  const v = cap(model([observe('task.time.input.clock', { at: T0 })]));
  assert.equal(v.achievement.state, 'EXPOSED');
  assert.equal(v.uncertainty.evidenceSufficient, false);
  assert.deepEqual(v.uncertainty.reasons.map((r) => r.code), ['no_attempts']);
  const why = explainCapability(model([observe('task.time.input.clock', { at: T0 })]), TARGET);
  assert.ok(why.some((line) => line.includes('no_attempts')));
  ok('exposed-only: EXPOSED with explicit no_attempts reason; explainCapability renders it');
}

/* ── 19. Capability-modality isolation inside the model ─────── */
{
  const e = attempt('task.time.retrieval.hear', { at: T0 });
  const crossModality = { ...e, id: 'lm.xmod', modality: 'read' };
  const v = cap(model([e, crossModality]));
  assert.equal(v.evidence.attemptCount, 1, 'cross-modality record cannot count toward a listening capability');
  ok('modality mismatch: event ignored for the listening capability');
}

/* ── Long-horizon simulations — six archetypes ──────────────── */
/* A snapshot at time T means "the model over the evidence that existed
 * at T" — truncate the log; `now` alone is only the recency clock, the
 * model correctly never hides evidence that arrived. */
const story = (name, events, times, assertions) => {
  for (const at of times) {
    assertions(model(events.filter((e) => e.occurredAt <= at), { now: at }), at);
  }
  ok(`long-horizon: ${name}`);
};

/* A. Fast learner — clean chain, sufficiency reached at the end. */
story('fast learner', [
  observe('task.time.input.clock', { at: T0 }),
  attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
  attempt('task.time.retrieval.hear', { at: T0 + 2 * HOUR }),
  attempt('task.time.delayed.hear', { at: T0 + DAY + HOUR }),
  attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY }),
  attempt('task.time.assessment.hear', { at: T0 + 3 * DAY })
], [T0 + 30 * 60_000, T0 + DAY, T0 + 3 * DAY + HOUR], (m, at) => {
  const v = cap(m);
  if (at === T0 + 30 * 60_000) {
    assert.equal(v.achievement.state, 'EXPOSED', 'input-only snapshot: contact, not ability');
    assert.deepEqual(v.uncertainty.reasons.map((r) => r.code), ['no_attempts']);
  } else if (at === T0 + DAY) {
    assert.ok(v.achievement.milestones.independent);
    assert.equal(v.retention.demonstrated, false, 'retention cannot be claimed before delayed evidence');
    assert.ok(v.uncertainty.reasons.some((r) => r.code === 'no_delayed_evidence'));
    assert.ok(v.uncertainty.reasons.some((r) => r.code === 'no_transfer_evidence'));
  } else {
    assert.equal(v.retention.demonstrated, true);
    assert.equal(v.transfer.demonstrated, true);
    assert.equal(v.assessment.latestStatus, 'success');
    assert.equal(v.uncertainty.evidenceSufficient, true);
  }
});

/* B. Support-dependent learner — miss, probe, aided-only wins. */
story('support-dependent learner', [
  observe('task.time.input.clock', { at: T0 }),
  attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'fail', missing: [NUM_FN] }),
  attempt('task.time.support.number_probe', { at: T0 + 2 * HOUR }),
  attempt('task.time.retrieval.hear', { at: T0 + 3 * HOUR, outcome: 'success', support: { hint: true } })
], [T0 + 90 * 60_000, T0 + 5 * DAY, T0 + 30 * DAY], (m, at) => {
  const v = cap(m);
  assert.equal(v.support.dependent, true, 'never demonstrated unaided after support');
  assert.equal(v.achievement.milestones.independent, false);
  if (at === T0 + 90 * 60_000) {
    assert.ok(v.support.pendingFunctions.includes(NUM_FN), 'demand still outstanding at this snapshot');
  } else {
    assert.ok(v.failures.unresolvedFunctions.includes(NUM_FN));
  }
});

/* C. Forgetful learner — demonstrated once, long silence. */
story('forgetful learner', [
  observe('task.time.input.clock', { at: T0 }),
  attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
  attempt('task.time.delayed.hear', { at: T0 + DAY + HOUR }),
  attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY }),
  attempt('task.time.assessment.hear', { at: T0 + 3 * DAY })
], [T0 + 4 * DAY, T0 + 90 * DAY], (m, at) => {
  const v = cap(m);
  assert.equal(v.transfer.demonstrated, true, 'history is permanent');
  if (at === T0 + 90 * DAY) {
    assert.ok(v.uncertainty.reasons.some((r) => r.code === 'evidence_older_than_retention_window'));
    assert.ok(m.profile.fragile.includes(TARGET), 'staleness puts a demonstrated cap in fragile');
  }
});

/* D. Recurring substrate-gap learner. */
story('recurring substrate-gap learner', [
  observe('task.time.input.clock', { at: T0 }),
  attempt('task.time.retrieval.hear', { at: T0 + HOUR, outcome: 'fail', missing: [NUM_FN] }),
  attempt('task.time.support.number_probe', { at: T0 + 2 * HOUR }),
  attempt('task.time.retrieval.hear', { at: T0 + 3 * HOUR }),
  attempt('task.time.diagnostic.hear', { at: T0 + 30 * DAY, outcome: 'fail', missing: [NUM_FN] })
], [T0 + 5 * HOUR, T0 + 31 * DAY], (m, at) => {
  const v = cap(m);
  if (at === T0 + 31 * DAY) {
    assert.ok(v.failures.unresolvedFunctions.includes(NUM_FN));
    assert.ok(v.failures.recurringFunctions.includes(NUM_FN), 'reopened gap is flagged');
    assert.ok(m.profile.unresolvedGaps.includes(TARGET));
    assert.ok(m.profile.supportDependent.includes(TARGET), 'new pending demand reasserts dependency');
  }
});

/* E. Transfer-blocked learner — retained, transfer keeps failing. */
story('transfer-blocked learner', [
  observe('task.time.input.clock', { at: T0 }),
  attempt('task.time.retrieval.hear', { at: T0 + HOUR }),
  attempt('task.time.retrieval.hear', { at: T0 + 2 * HOUR }),
  attempt('task.time.delayed.hear', { at: T0 + DAY + HOUR }),
  attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY, outcome: 'fail' }),
  attempt('task.time.transfer.clinic', { at: T0 + 3 * DAY, outcome: 'fail' })
], [T0 + 4 * DAY], (m) => {
  const v = cap(m);
  assert.equal(v.retention.demonstrated, true);
  assert.equal(v.transfer.demonstrated, false);
  assert.equal(v.evidence.transferAttemptCount, 2);
  assert.equal(v.evidence.transferSuccessCount, 0);
  assert.ok(v.uncertainty.reasons.some((r) => r.code === 'no_transfer_evidence'));
  assert.ok(m.profile.assessmentPending.length === 0, 'not pending — transfer itself is missing');
});

/* F. Baseline-mastered learner — first contact is a correct probe. */
story('baseline-mastered learner', [
  attempt('task.time.diagnostic.hear', { at: T0 }),
  attempt('task.time.delayed.hear', { at: T0 + DAY }),
  attempt('task.time.transfer.clinic', { at: T0 + 2 * DAY }),
  attempt('task.time.assessment.hear', { at: T0 + 3 * DAY })
], [T0 + 3 * DAY + HOUR], (m) => {
  const v = cap(m);
  assert.equal(v.evidence.origin, 'baseline');
  assert.equal(v.retention.demonstrated, true);
  assert.equal(v.transfer.demonstrated, true);
  assert.equal(v.uncertainty.evidenceSufficient, true);
  assert.ok(m.profile.demonstrated.includes(TARGET));
});

console.log(`\nvnext-learner-model: ${check} checks pass`);
