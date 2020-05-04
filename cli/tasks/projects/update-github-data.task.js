const { createTask } = require("../../task-runner");

module.exports = createTask("update-github-data", async context => {
  const { getGitHubClient, starStorage, processProjects } = context;
  const client = getGitHubClient();

  await processProjects({
    handler: updateGithubProject({ client, starStorage }),
    query: { deprecated: false }
  });
});

const updateGithubProject = ({ client, starStorage }) => async (
  project,
  { logger, readonly }
) => {
  logger.debug("STEP 1: get project data from Github API");
  const githubData = await client.fetchRepoInfo(project.github.full_name);
  const { full_name, stargazers_count: stars } = githubData;

  logger.debug("STEP 2: Get `contributor_count` by scrapping Github web page");
  const contributor_count = await client.fetchContributorCount(full_name);
  logger.debug("Data from scraping", { contributor_count });

  logger.debug("STEP 3: save a snapshot record for today, if needed.");
  const snapshotAdded = await starStorage.addSnapshot(project._id, stars);

  let updated = false;
  project.github = {
    ...project.github,
    ...githubData,
    updatedAt: new Date()
  };

  // for an unknown reason, we sometimes got an incorrect value of 0 contributors, don't overwrite data when it happens
  if (contributor_count) {
    project.github.contributor_count = contributor_count;
  }

  if (readonly) {
    logger.debug("Readonly mode", githubData);
  } else {
    logger.debug("STEP 4: update project record from Github data", {
      githubData
    });
    try {
      await project.save();
      logger.verbose(
        `Project saved, ${
          snapshotAdded ? `snapshot added (${stars})` : "no snapshot added"
        }`,
        { project: project.toString() }
      );
      updated = true;
    } catch (err) {
      throw new Error(
        `Unable to save project ${project.toString()} ${err.message}`
      );
    }
  }
  return { meta: { updated, snapshotAdded, stars: stars } };
};
