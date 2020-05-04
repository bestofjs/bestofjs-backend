const { isEqual } = require("lodash");

const { createTask } = require("../../task-runner");

module.exports = createTask("update-github-heroes", async context => {
  const { processHeroes, getGitHubClient } = context;

  const client = getGitHubClient();

  await processHeroes({
    handler: updateHero({ client }),
    query: {}
  });
});

const updateHero = ({ client }) => async (hero, context) => {
  const { logger, readonly } = context;
  const { github } = hero.toObject(); // convert model instance to a plain object, to be able to use isEqual()
  const { login } = hero.github;
  const githubData = await client.fetchUserInfo(login);
  logger.debug(`GitHub data for ${login}`, githubData);

  const needsUpdate = !isEqual(githubData, github);

  if (needsUpdate) {
    if (readonly) {
      logger.debug(`READ-ONLY mode: no save operation for ${login}`);
    } else {
      hero.github = githubData;
      await hero.save();
      logger.debug(`${login} saved!`);
    }
  } else {
    logger.debug(`No update needed for ${login}`);
  }

  return {
    data: "OK",
    meta: { updated: needsUpdate, popular: hero.github.followers > 1000 }
  };
};
