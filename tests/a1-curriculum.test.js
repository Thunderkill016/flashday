const assert = require("node:assert/strict");
const L = require("../learning-entry");
const D = require("../flashday-data");
const curriculum = require("../a1-curriculum");
assert.equal(
  L.GUIDED_CLUSTERS.length,
  13,
  "12 topic lessons plus a review; editorial scope, not a CEFR threshold",
);
assert.equal(L.GUIDED_CLUSTERS.at(-1).id, "a1-review");
assert.equal(new Set(L.GUIDED_CLUSTERS.map((c) => c.id)).size, 13);
const db = D.createInitialDb([], 1000);
const profile = JSON.stringify(db.learningProfile);
for (const cluster of L.GUIDED_CLUSTERS) {
  const lesson = L.LESSON_DIALOGUES[cluster.id];
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
