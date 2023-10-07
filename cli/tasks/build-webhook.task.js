const got = require("got");

const { createTask } = require("../task-runner");

module.exports = createTask("daily-build-webhook", async context => {
  await invalidateWebAppCacheByTag(context, 'all-projects');
  await invalidateWebAppCacheByTag(context, 'project-details');
  await invalidateWebAppCacheByTag(context, 'package-downloads');
  await triggerWebAppBuild(context);
});

async function invalidateWebAppCacheByTag(context, tag) {
  const { logger } = context;
  const rootURL = "https://bestofjs.org"; // TODO: use env variable?
  const invalidateCacheURL = `${rootURL}/api/revalidate?tag=${tag}`;
  try {
    const result = await got(invalidateCacheURL).json();
    logger.debug(result);
    logger.info(`Invalid cache request for "${tag}" tag sent!`);
  } catch (error) {
    throw new Error(`Unable to invalid the cache for "${tag}" tag ${error.message}`);
  }
}

async function triggerWebAppBuild(context) {
  const { logger } = context;
  const webhookURL = process.env.FRONTEND_BUILD_WEB_HOOK;
  if (!webhookURL)
    throw new Error(`No webhook URL specified (FRONTEND_BUILD_WEB_HOOK)`);
  try {
    const result = await got(webhookURL).json();
    logger.debug(result);
    logger.info("Daily build webhook request sent!");
  } catch (error) {
    throw new Error(`Unable to send daily build webhook ${error.message}`);
  }
}
