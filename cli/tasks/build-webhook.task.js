const got = require("got");

const { createTask } = require("../task-runner");

module.exports = createTask("daily-build-webhook", async context => {
  const { logger } = context;

  const webhookURL = process.env.FRONTEND_BUILD_WEB_HOOK;
  if (!webhookURL)
    throw new Error(`No webhook URL specified (FRONTEND_BUILD_WEB_HOOK)`);

  try {
    const result = await got(webhookURL).json();
    logger.debug(result)
    logger.info("Daily build webhook request sent!");
  } catch (error) {
    throw new Error(`Unable to send daily build webhook ${error.message}`);
  }
});
