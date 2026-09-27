import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import * as sdk from "firebase/firestore";
import {
  readFirestorePage,
  writeProgressTransaction,
  PROGRESS_MAX_JSON_BYTES,
} from "../src/auth/cloud-compat.mjs";
import { mergeProgressPayload } from "../src/core/cloud.js";

// Hard stop rather than accidentally test against a real Firebase project.
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error("Firestore emulator is required");
const environment = await initializeTestEnvironment({
  projectId: "demo-flashday-test",
  firestore: {
    rules: await readFile(
      new URL("../firestore.rules", import.meta.url),
      "utf8",
    ),
  },
});
try {
  const first = {
    ...sdk,
    db: environment.authenticatedContext("alice").firestore(),
  };
  const second = {
    ...sdk,
    db: environment.authenticatedContext("alice").firestore(),
  };
  const path = "users/alice/learning_progress/alice";
  // lessonEvents/fsrs are no longer merged into the payload — events have
  // their own collection and fsrs is a rebuilt cache. The merge strips them.
  const makeRow = (id) => ({
    deck_id: "deck",
    updated_at: "2026-09-27T00:00:00.000Z",
    payload: {
      reviewLog: [{ id: `log-${id}` }],
      fsrs: { stale: id },
    },
  });
  await Promise.all([
    writeProgressTransaction(
      first,
      sdk.doc(first.db, path),
      makeRow("first"),
      "alice",
      mergeProgressPayload,
    ),
    writeProgressTransaction(
      second,
      sdk.doc(second.db, path),
      makeRow("second"),
      "alice",
      mergeProgressPayload,
    ),
  ]);
  const stored = (await sdk.getDoc(sdk.doc(first.db, path))).data();
  assert.deepEqual(
    stored.payload.reviewLog.map((row) => row.id).sort(),
    ["log-first", "log-second"],
  );
  assert.equal(stored.payload.lessonEvents, undefined);
  assert.equal(stored.payload.fsrs, undefined);
  await writeProgressTransaction(
    first,
    sdk.doc(first.db, path),
    makeRow("first"),
    "alice",
    mergeProgressPayload,
  );
  assert.equal(
    (await sdk.getDoc(sdk.doc(first.db, path))).data().payload.reviewLog.length,
    2,
  );
  await assert.rejects(
    writeProgressTransaction(
      first,
      sdk.doc(first.db, path),
      {
        ...makeRow("oversized"),
        payload: { large: "x".repeat(PROGRESS_MAX_JSON_BYTES) },
      },
      "alice",
      mergeProgressPayload,
    ),
    /vượt giới hạn/,
  );
  // The rejected oversized write must not have clobbered the stored payload.
  assert.equal(
    (await sdk.getDoc(sdk.doc(first.db, path))).data().payload.reviewLog.length,
    2,
  );
  const bob = environment.authenticatedContext("bob").firestore();
  await assertFails(sdk.getDoc(sdk.doc(bob, path)));
  await assertFails(sdk.setDoc(sdk.doc(bob, path), stored));
  await assertFails(
    sdk.getDoc(sdk.doc(environment.unauthenticatedContext().firestore(), path)),
  );

  // lesson_events: owner may create a valid append-only event; update is
  // denied outright; cross-owner and malformed writes are denied.
  const eventPath = "users/alice/lesson_events/ev-1";
  const validEvent = {
    id: "ev-1",
    owner_id: "alice",
    lesson_id: "a1-s1-l1",
    content_version: 1,
    step: "prepare",
    kind: "drill",
    payload: { correct: 3, total: 4 },
    support: { modelRevealed: false },
    submitted_at: "2026-09-27T00:00:00.000Z",
    created_at: "2026-09-27T00:00:00.000Z",
  };
  await sdk.setDoc(sdk.doc(first.db, eventPath), validEvent);
  assert.equal(
    (await sdk.getDoc(sdk.doc(first.db, eventPath))).data().kind,
    "drill",
  );
  await assertFails(
    sdk.updateDoc(sdk.doc(first.db, eventPath), { kind: "read" }),
  );
  await assertFails(sdk.getDoc(sdk.doc(bob, eventPath)));
  await assertFails(
    sdk.setDoc(sdk.doc(bob, "users/bob/lesson_events/ev-1"), {
      ...validEvent,
      owner_id: "alice", // spoofed owner
    }),
  );
  await assertFails(
    sdk.setDoc(sdk.doc(bob, "users/bob/lesson_events/x"), {
      ...validEvent,
      owner_id: "bob",
      id: "mismatch",
    }),
  );
  await assertFails(
    sdk.setDoc(sdk.doc(bob, "users/bob/lesson_events/ev-bad-kind"), {
      ...validEvent,
      id: "ev-bad-kind",
      owner_id: "bob",
      kind: "teleport",
    }),
  );
  await assertFails(
    sdk.setDoc(sdk.doc(bob, "users/bob/lesson_events/ev-extra"), {
      ...validEvent,
      id: "ev-extra",
      owner_id: "bob",
      sneaky: true,
    }),
  );
  await assertFails(
    sdk.setDoc(sdk.doc(bob, "users/bob/lesson_events/ev-missing"), {
      id: "ev-missing",
      owner_id: "bob",
      lesson_id: "a1-s1-l1",
      content_version: 1,
      step: "read",
      kind: "read",
      payload: {},
      support: {},
      // submitted_at omitted
      created_at: "2026-09-27T00:00:00.000Z",
    }),
  );

  // Fixture documents are synthetic; admin seeding is confined to this emulator.
  const count = 1201;
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batchSize = 400; // below Firestore's 500-write batch ceiling
    for (let start = 0; start < count; start += batchSize) {
      const batch = sdk.writeBatch(db);
      for (let i = start; i < Math.min(start + batchSize, count); i++) {
        const id = String(i).padStart(5, "0");
        batch.set(sdk.doc(db, `users/alice/source_captures/${id}`), {
          id,
          owner_id: "alice",
          deck_id: "deck",
          created_at: "2026-09-27T00:00:00.000Z",
          payload: { synthetic: true },
        });
      }
      await batch.commit();
    }
  });
  const ref = sdk.collection(first.db, "users", "alice", "source_captures");
  let cursor = null;
  const ids = [];
  for (;;) {
    const page = await readFirestorePage(
      first,
      ref,
      [sdk.where("deck_id", "==", "deck")],
      cursor,
      500,
    );
    ids.push(...page.data.map((row) => row.id));
    if (page.data.length < 500) break;
    cursor = page.cursor;
  }
  assert.equal(ids.length, count);
  assert.equal(new Set(ids).size, count);
  assert.deepEqual(ids, [...ids].sort());
  console.log(
    "Firestore emulator PASS: concurrent progress, idempotency, size guard, owner isolation, cursor paging",
  );
} finally {
  await environment.cleanup();
}
