const { createTask } = require("../../task-runner");

module.exports = createTask("log-project", async context => {
  const { processProjects } = context;
  await processProjects({
    handler: logProject(context),
    query: { disabled: false, deprecated: false }
  });
});

const logProject = context => async project => {
  const { logger, starStorage } = context;
  if (project.name === "Angular") throw new Error("Big bug!");
  const trends = await starStorage.getTrends(project._id);
  logger.debug("Trends", trends);
  return {
    data: "OK",
    meta: { success: true, popular: project.github.stargazers_count > 1000 }
  };
};
