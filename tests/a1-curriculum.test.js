const assert = require("node:assert/strict");
const L = require("../learning-entry");
const D = require("../flashday-data");
const curriculum = require("../a1-curriculum");
assert.equal(
  L.GUIDED_CLUSTERS.length,
  30,
  "26 teaching lessons and 4 cumulative reviews; editorial scope, not a CEFR threshold",
);
assert.equal(L.GUIDED_CLUSTERS.at(-1).id, "a1-review");
assert.equal(new Set(L.GUIDED_CLUSTERS.map((c) => c.id)).size, 30);
assert.equal(L.A1_STAGES.length, 6);
assert.deepEqual(
  L.A1_STAGES.flatMap((stage) => stage.lessonIds),
  L.GUIDED_CLUSTERS.map((c) => c.id),
);
assert.equal(L.GUIDED_CLUSTERS.filter((c) => c.kind === "review").length, 4);
assert.equal(
  new Set(L.TRANSFER_MISSIONS.map((m) => m.id)).size,
  L.TRANSFER_MISSIONS.length,
);
for (const id of [
  "a1-classroom",
  "a1-possessions",
  "a1-jobs",
  "a1-frequency",
  "a1-abilities",
  "a1-now",
  "a1-weather",
  "a1-dates",
  "a1-plans",
  "a1-quantities",
  "a1-signs",
  "a1-past-places",
  "a1-past-actions",
  "a1-postcard",
]) {
  const cluster = L.clusterById(id);
  assert(cluster?.stage, `missing authored domain: ${id}`);
  const lesson = L.LESSON_DIALOGUES[id];
  assert.notEqual(
    lesson.listening.text,
    lesson.lines.map((line) => line[0]).join(" "),
    "listening must use a different text",
  );
}
// Existing observation identities must survive catalog expansion and reordering.
assert.equal(
  L.LESSON_DIALOGUES["a1-introductions"].sourceId,
  "lesson:a1-introductions:v1",
);
assert(L.missionById("a1-meeting-change-transfer"));
assert(
  L.moduleById("a1-introductions-core").units.some(
    (unit) => unit.id === "a1-introductions-unit-1",
  ),
);
// Frozen editorial facts guard high-risk distractors: updated order, date ambiguity,
// negation and owner/subject distinctions. They are not a CEFR validation score.
for (const [id, question, expected] of [
  ["a1-checkpoint-services", 0, "2"],
  ["a1-checkpoint-services", 1, "Nhỏ"],
  ["a1-checkpoint-services", 2, "4 đô"],
  ["a1-dates", 2, "6 giờ tối"],
  ["a1-signs", 0, "Thứ Hai 10 giờ sáng"],
  ["a1-possessions", 0, "Lan"],
  ["a1-past-places", 2, "Hôm nay"],
  ["a1-plans", 2, "Không, định học ở nhà"],
]) {
  const q = L.LESSON_DIALOGUES[id].scenarioQuiz[question];
  assert.equal(
    q.options[q.answer],
    expected,
    `${id}: authored fact regression`,
  );
}
const db = D.createInitialDb([], 1000);
const profile = JSON.stringify(db.learningProfile);
for (const cluster of L.GUIDED_CLUSTERS) {
  const lesson = L.LESSON_DIALOGUES[cluster.id];
  assert(cluster.preparation.coaching?.mistake);
  assert(cluster.preparation.coaching?.pronunciation);
  assert(cluster.preparation.coaching?.recall);
  assert(cluster.stage);

  assert(lesson?.sourceId && lesson.lines.length >= 1);
  assert(lesson.listening.text && lesson.listening.translation);
  assert.equal(
    cluster.preparation.worked.length,
    3,
    "each lesson has a concrete worked sequence",
  );
  for (const quiz of [
    cluster.preparation.practiceQuiz,
    lesson.scenarioQuiz,
    lesson.listening.questions,
  ]) {
    assert(quiz.length > 0);
    for (const question of quiz) {
      assert(question.hint);
      assert(question.options[question.answer]);
      assert.equal(new Set(question.options).size, question.options.length);
    }
  }
  const result = L.installGuidedCluster(db, cluster.id, D);
  assert(result.state.complete);
  assert.equal(L.installGuidedCluster(db, cluster.id, D).added.length, 0);
  const missions = L.TRANSFER_MISSIONS.filter(
    (m) => m.clusterId === cluster.id,
  );
  assert(
    missions.some(
      (m) => m.skill === "speak" && m.requireSpoken && m.requireWritten,
    ),
  );
  assert(missions.some((m) => m.skill !== "speak"));
  for (const mission of missions) {
    assert(
      mission.setup &&
        mission.instructions &&
        mission.modelAnswer.length &&
        mission.selfCheck.length,
    );
    if (mission.requireWritten)
      assert.throws(
        () =>
          L.submitTransferAttempt(db, { missionId: mission.id, spoke: true }),
        /Cần viết/,
      );
    if (mission.requireSpoken)
      assert.throws(
        () =>
          L.submitTransferAttempt(db, {
            missionId: mission.id,
            responseText: "I am trying.",
          }),
        /thực hành nói/,
      );
  }
}
assert.equal(
  JSON.stringify(db.learningProfile),
  profile,
  "content import cannot raise learner level",
);
assert.equal(L.coursePracticeState(db).basis, "activity-only");
assert.deepEqual(L.coursePracticeState(db).counts, {
  listen: 0,
  speak: 0,
  read: 0,
  write: 0,
});
db.comprehensionChecks = [];
const intro = L.LESSON_DIALOGUES["a1-introductions"];
db.comprehensionChecks.push({
  sourceKey: intro.sourceId + ":preparation",
  correct: 3,
  total: 3,
});
db.comprehensionChecks.push({
  sourceKey: intro.sourceId + ":listening",
  correct: 2,
  total: 2,
  completedPlays: 0,
  transcriptViewed: true,
});
assert.equal(
  L.coursePracticeState(db).counts.listen,
  0,
  "opening a transcript is not listening",
);
assert.equal(
  L.coursePracticeState(db).counts.read,
  0,
  "supported grammar practice is not scenario reading",
);
db.comprehensionChecks.push({
  sourceKey: intro.sourceId + ":listening",
  correct: 0,
  total: 2,
  completedPlays: 1,
});
assert.equal(
  L.coursePracticeState(db).counts.listen,
  1,
  "counter describes attempts, never achievement",
);
const attempt = L.submitTransferAttempt(
  db,
  {
    missionId: "a1-introductions-speaking",
    responseText: "I am An. I practised alone.",
    spoke: true,
    selfReviewed: true,
  },
  2000,
);
assert.equal(attempt.grading, "self-check");
assert.equal(attempt.skill, "speak");
assert.equal(L.coursePracticeState(db).counts.speak, 1);
assert.equal(
  L.coursePracticeState(db).counts.write,
  0,
  "speaking transcript is not a separate writing attempt",
);
assert.equal(JSON.stringify(db.learningProfile), profile);
assert(
  curriculum.LESSONS.find((l) => l.id === "a1-review").writing.includes(
    "Sports club",
  ),
);
console.log(
  "A1 curriculum: content contracts, imports, task gates and honest activity coverage PASS",
);
