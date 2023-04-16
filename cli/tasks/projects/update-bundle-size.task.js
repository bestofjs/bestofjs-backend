const got = require("got");
const pTimeout = require("p-timeout");

const timeout = 100e3; // prevent API request from taking more than N milliseconds

const { createTask } = require("../../task-runner");

const backendTags = [
  "archive",
  "astro",
  "auto",
  "boilerplate",
  "build",
  "bun",
  "cli",
  "cron",
  "css-tool",
  "deno",
  "dependency",
  "desktop",
  "ecommerce",
  "express",
  "fullstack",
  "iot",
  "lint",
  "meteor",
  "microservice",
  "middleware",
  "module",
  "mongodb",
  "monorepo",
  "nextjs",
  "nodejs-framework",
  "npm-scripts",
  "nvm",
  "orm",
  "package",
  "process",
  "queue",
  "runtime",
  "scaffolding",
  "scraping",
  "screenshot",
  "security",
  "serverless",
  "ssg",
  "test",
  "websocket"
];

module.exports = createTask("update-package-data", async context => {
  const { processProjects } = context;

  await processProjects({
    handler: updateBundleSizeData(context),
    query: { deprecated: false, "npm.name": { $exists: true, $ne: "" } },
    concurrency: 5
  });
});

const updateBundleSizeData = context => async project => {
  const { logger, readonly } = context;
  if (!canRunInBrowser(project)) {
    return { meta: { updated: false, backendProject: true } };
  }

  if (!needsUpdate(project)) {
    return { meta: { updated: false, updateNotNeeded: true } };
  }

  const packageName = project.npm.name;
  const { data, duration, error, hasTimedOut } = await fetchBundleData(
    project.npm.name
  );
  const bundleDataToBeSaved = data
    ? {
        name: packageName,
        version: extractVersion(data.version),
        gzip: data.size.rawCompressedSize,
        size: data.size.rawUncompressedSize,
        updatedAt: Date.now(),
        duration
      }
    : { errorMessage: hasTimedOut ? "timeout" : error };

  project.bundle = bundleDataToBeSaved;
  logger.debug(readonly ? "Readonly mode" : "Saving...", bundleDataToBeSaved);
  if (!readonly) {
    await project.save();
  }

  return {
    meta: {
      updated: Boolean(data),
      error: Boolean(error),
      hasTimedOut: Boolean(hasTimedOut)
    }
  };
};

function needsUpdate(project) {
  if (!project.bundle) return true;
  const { errorMessage, version } = project.bundle;
  if (errorMessage) return true;
  const packageCurrentVersion = project.npm.version;
  if (packageCurrentVersion === version) return false;
  return true;
}

function extractVersion(input) {
  const parts = input.split("@");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function canRunInBrowser(project) {
  if (isBackendProject(project)) return false;
  return true;
}

function isBackendProject(project) {
  const projectTags = project.tags.map(tag => tag.code);
  return projectTags.some(tagName => backendTags.includes(tagName));
}

async function fetchBundleData(packageName) {
  const url = `https://deno.bundlejs.com/?q=${encodeURIComponent(packageName)}`;
  try {
    const start = Date.now();
    const data = await pTimeout(got(url).json(), timeout);
    const duration = Date.now() - start;
    return { data, duration };
  } catch (error) {
    if (error instanceof pTimeout.TimeoutError) {
      return { hasTimedOut: timeout };
    }
    return { error: error.message };
  }
}
