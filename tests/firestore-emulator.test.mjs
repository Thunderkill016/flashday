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
  const makeRow = (id) => ({
    deck_id: "deck",
    updated_at: "2026-09-27T00:00:00.000Z",
    payload: {
      lessonEvents: [{ id }],
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
    stored.payload.lessonEvents.map((row) => row.id).sort(),
    ["first", "second"],
  );
  assert.equal(stored.payload.reviewLog.length, 2);
  assert.equal(stored.payload.fsrs, null);
  await writeProgressTransaction(
    first,
    sdk.doc(first.db, path),
    makeRow("first"),
    "alice",
    mergeProgressPayload,
  );
  assert.equal(
    (await sdk.getDoc(sdk.doc(first.db, path))).data().payload.lessonEvents
      .length,
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
  assert.equal(
    (await sdk.getDoc(sdk.doc(first.db, path))).data().payload.transferAttempts
      .length,
    2,
  );
  const bob = environment.authenticatedContext("bob").firestore();
  await assertFails(sdk.getDoc(sdk.doc(bob, path)));
  await assertFails(sdk.setDoc(sdk.doc(bob, path), stored));
  await assertFails(
    sdk.getDoc(sdk.doc(environment.unauthenticatedContext().firestore(), path)),
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
