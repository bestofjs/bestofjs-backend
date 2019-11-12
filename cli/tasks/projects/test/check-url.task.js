const got = require("got");
const prettyBytes = require("pretty-bytes");

const { createTask } = require("../../../task-runner");

module.exports = createTask("check-url", async context => {
  const { processProjects } = context;
  await processProjects({
    handler: checkProjectURL(context),
    query: { disabled: false, deprecated: false }
  });
});

const checkProjectURL = context => async project => {
  const { logger, readonly } = context;

  const url = project.getURL();
  if (!url) {
    return { meta: { ignored: true } };
  }
  const isAvailable = await isSiteAvailable(url, logger);

  if (!isAvailable) {
    if (readonly) {
      logger.debug(`No write operation in "readonly" mode`);
    } else {
      logger.debug(`Fixing project URL ${url}`);
      await fixProjectURL(project);
    }
  }

  return {
    data: "OK",
    meta: { success: true, invalid: !isAvailable }
  };
};

async function isSiteAvailable(url, logger) {
  try {
    const { body } = await got(url);
    logger.debug(`Response from ${url}`, { size: prettyBytes(body.length) });
    return true;
  } catch (error) {
    return false;
    // throw new Error(`Invalid URL ${url}: ${error.message} `);
  }
}

async function fixProjectURL(project) {
  project.override_url = true;
  project.url = "";
  await project.save();
}
