const {
  createTaskRunner,
  createProjectTaskRunner
} = require("../../task-runner");

const wait = delayMs => new Promise(resolve => setTimeout(resolve, delayMs));

async function main() {
  const taskRunner = createTaskRunner();
  const task = ({ logger }) => logger.info("Hello!");
  await taskRunner.run(task);

  const projectTaskRunner = createProjectTaskRunner();

  const processProject = async (project, { logger }) => {
    logger.info("Processing", project);
    await wait(1000);
    logger.info("Processed", project);
    return {
      data: "OK",
      meta: { success: true }
    };
  };

  await projectTaskRunner.run(processProject);
}

main();
