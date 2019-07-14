const { runTask } = require("../../task-runner");
const assert = require("assert");
const { takeRight } = require("lodash");

const {
  createStarStorage,
  normalizeDate
} = require("../../../core/star-storage/star-storage");

runTask(async ({ processProjects, getGitHubClient, context }) => {
  const client = getGitHubClient();
  const starCollection = context.models.Snapshot.collection;
  const storage = createStarStorage(starCollection);

  await processProjects({
    handler: testStarStorage({ client, storage }),
    query: { deprecated: false }
  });
});

const testStarStorage = ({ storage }) => async project => {
  const snapshots = await storage.getAllSnapshots(project._id);
  console.log(
    `Found ${snapshots.length} snapshots`,
    "from",
    snapshots[0],
    "to",
    snapshots[snapshots.length - 1]
  );
  const trends = await storage.getTrends(project._id);
  console.log(trends);

  const dailyTrends = await storage.getDailyTrends(project._id);
  console.log(takeRight(dailyTrends, 10));

  // // await storage.addSnapshot(project._id, 1000);
  // await storage.addSnapshot(project._id, 2000, {
  //   year: 2020,
  //   month: 1,
  //   day: 1
  // });

  return { meta: { success: true } };
};

const { year, month, day } = normalizeDate(
  new Date("2019-07-31T23:00:00.000Z")
);
assert.equal(year, 2019);
assert.equal(month, 8);
assert.equal(day, 1);
