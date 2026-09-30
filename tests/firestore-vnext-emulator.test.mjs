/*
 * Firestore rules for the vNext immutable evidence log
 * (issue #53, users/{uid}/vnext_events/{eventId}).
 *
 * On the real backend the rules enforce what the fake cannot:
 * owner isolation, learner_id == uid pinning, create+read only
 * (no update, no delete — not even for the owner), and schema
 * validation on the document. Plus the end-to-end guarantee:
 * persist → reload → replay → identical claim.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as sdk from "firebase/firestore";
import { CAPABILITIES } from "../src/vnext/capabilities.js";
import { projectLearnerState } from "../src/vnext/projection.js";
import { evaluateClaim } from "../src/vnext/pilot-harness.js";
import { bindAttempt, bindObservation } from "../src/vnext/bind.js";
import { appendVnextEvents, loadVnextEvents, toEventDoc, vnextEventPath } from "../src/vnext/persist.js";
import { TASKS_MEET_PERSON } from "../src/vnext/fixtures.js";

if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error("Firestore emulator is required");

const environment = await initializeTestEnvironment({
  projectId: "demo-flashday-test",
  firestore: {
    rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
  },
});

const UID = "alice";
const ASK = "interact.ask_name";
const TASKS = TASKS_MEET_PERSON;
const taskById = (id) => TASKS.find((t) => t.id === id);
const capById = (id) => CAPABILITIES.find((c) => c.id === id);
const T0 = Date.parse("2026-03-02T09:00:00Z");
const HOUR = 3600_000;

/* Real bound events under the alice identity — the rules pin
 * learner_id == uid, so synthetic learner names never reach prod. */
const bound = (taskId, { outcome = "success", at = T0, eventType, support } = {}, n) =>
  bindAttempt(taskById(taskId), capById(taskById(taskId).capabilityId), {
    id: `ev.${n}`, learnerId: UID, occurredAt: at, eventType,
    attempt: { observed: true, outcome, response: "r", latencyMs: 900, attemptId: `a.${n}` },
    support
  });

try {
  const alice = { ...sdk, db: environment.authenticatedContext(UID).firestore() };
  const bob = { ...sdk, db: environment.authenticatedContext("bob").firestore() };
  const anon = { ...sdk, db: environment.unauthenticatedContext().firestore() };

  /* ── owner create + read ── */
  const ev1 = bound("task.meet.diagnostic.ask_name", { outcome: "fail", at: T0 }, 1);
  const docData = { ...toEventDoc(ev1, UID), recorded_at: sdk.serverTimestamp() };
  await assertSucceeds(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, ev1.id)), docData));
  await assertSucceeds(sdk.getDoc(sdk.doc(alice.db, vnextEventPath(UID, ev1.id))));

  /* ── immutable evidence: update AND delete denied, even for owner ── */
  await assertFails(sdk.updateDoc(sdk.doc(alice.db, vnextEventPath(UID, ev1.id)), { attempt: { outcome: "success" } }));
  await assertFails(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, ev1.id)), docData)); // re-set is an update
  await assertFails(sdk.deleteDoc(sdk.doc(alice.db, vnextEventPath(UID, ev1.id))));

  /* ── cross-owner + anonymous denied outright ── */
  await assertFails(sdk.getDoc(sdk.doc(bob.db, vnextEventPath(UID, ev1.id))));
  await assertFails(sdk.setDoc(sdk.doc(bob.db, vnextEventPath(UID, "ev.bob")), { ...docData, id: "ev.bob" }));
  await assertFails(sdk.setDoc(sdk.doc(bob.db, `users/bob/vnext_events/ev.bob`), { ...docData, id: "ev.bob" }));
  await assertFails(sdk.getDoc(sdk.doc(anon.db, vnextEventPath(UID, ev1.id))));

  /* ── learner_id must pin to uid — evidence for another learner is a forgery ── */
  const otherLearner = { ...toEventDoc(ev1, UID), id: "ev.2", learner_id: "mallory", recorded_at: sdk.serverTimestamp() };
  await assertFails(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, "ev.2")), otherLearner));

  /* ── malformed docs denied: schema_version, task_revision, fields ── */
  await assertFails(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, "ev.3")), { ...docData, id: "ev.3", schema_version: 2 }));
  await assertFails(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, "ev.4")), { ...docData, id: "ev.4", task_revision: 0 }));
  const { capability_id, ...noCap } = docData;
  await assertFails(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, "ev.5")), { ...noCap, id: "ev.5" }));
  await assertFails(sdk.setDoc(sdk.doc(alice.db, vnextEventPath(UID, "ev.6")), { ...docData, id: "ev.6", smuggled: true }));

  /* ── end-to-end on the real backend: append → retry → reload → replay ── */
  const events = [
    bound("task.meet.diagnostic.ask_name", { outcome: "fail", at: T0 }, 10),
    bound("task.meet.remediation.ask_name", { outcome: "success", at: T0 + 1000, eventType: "retry" }, 11),
    bound("task.meet.delayed.check", { outcome: "success", at: T0 + 1000 + 25 * HOUR, eventType: "delayed_retrieval" }, 12),
    bound("task.meet.transfer.street", { outcome: "success", at: T0 + 1000 + 26 * HOUR }, 13),
    bindObservation(taskById("task.meet.input.ask_name"), capById(ASK), {
      id: "ev.14", learnerId: UID, occurredAt: T0 + 500, eventType: "exposure"
    })
  ];
  const first = await appendVnextEvents(alice, UID, events, { missionRunId: "run.emu", policyVersion: "vnext.policy.v1" });
  assert.equal(first.appended, events.length);
  const retry = await appendVnextEvents(alice, UID, events, { missionRunId: "run.emu", policyVersion: "vnext.policy.v1" });
  assert.equal(retry.appended, 0, "retried append must dedupe, not double-write");
  assert.equal(retry.deduped, events.length);

  const loaded = await loadVnextEvents(alice, UID);
  assert.equal(loaded.length, 6, "ev.1 + five bound events");
  const before = projectLearnerState(UID, events, CAPABILITIES, TASKS).byCapability.get(ASK);
  const after = projectLearnerState(UID, loaded, CAPABILITIES, TASKS).byCapability.get(ASK);
  assert.deepEqual(
    { state: after.state, milestones: after.milestones },
    { state: before.state, milestones: before.milestones },
    "reloaded log replays into a different projection"
  );
  const claimA = evaluateClaim(UID, events, CAPABILITIES, TASKS, ASK);
  const claimB = evaluateClaim(UID, loaded, CAPABILITIES, TASKS, ASK);
  assert.deepEqual(claimB, claimA, "claim must survive persist → reload → replay");

  console.log("Firestore vNext emulator PASS: immutable evidence, owner+learner pinning, idempotent append, replay parity");
} finally {
  await environment.cleanup();
}
