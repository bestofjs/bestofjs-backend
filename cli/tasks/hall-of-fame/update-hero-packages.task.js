const { isEqual, omit } = require("lodash");
const { createTask } = require("../../task-runner");

const createNpmClient = require("../../../core/npm/npm-api-client");
const npmClient = createNpmClient();

module.exports = createTask("update-hero-packages", async context => {
  const { processHeroes, logger, readonly } = context;
  await processHeroes({
    concurrency: 1, // the scrapping does not work well if we increase the concurrency!
    limit: 30, // update only 30 heroes, they will be different everyday because of the sort criteria
    sort: { "npm.updatedAt": 1 },
    query: { "npm.username": { $ne: "" } },
    handler: async hero => {
      const npmInfo = await fetchHeroPackageInfo(hero, context);
      let saved = false;
      const hasChanged = !isSameData(npmInfo, hero.toObject().npm); // need to transform the model instance into a plain object to use deep comparisons
      if (!hasChanged) {
        logger.debug(`Nothing to update`, { hero: hero.toString() });
      }
      if (readonly) {
        logger.debug("No save in READONLY mode", {
          hero: hero.toString(),
          npmInfo
        });
      } else {
        hero.npm = {
          ...npmInfo,
          updatedAt: new Date()
        };
        await hero.save();
        saved = true;
        logger.debug("Saved!", { hero: hero.toString() });
      }
      return {
        meta: { saved, changed: hasChanged, processed: true }
      };
    }
  });
});

async function fetchHeroPackageInfo(hero, context) {
  const username = hero.npm.username;
  const npmInfo = await npmClient.fetchUserInfo(username);
  return npmInfo;
}

function isSameData(dataA, dataB) {
  return isEqual(omit(dataA, ["updatedAt"]), omit(dataB, ["updatedAt"]));
}
