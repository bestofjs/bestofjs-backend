const got = require("got");
const pTimeout = require("p-timeout");

const timeout = 3000; // prevent API request from taking more than N milliseconds

const { createTask } = require("../../task-runner");

const backendTags = [
  "test",
  "nodejs-framework",
  "cli",
  "ssg",
  "build",
  "auto",
  "express",
  "serverless",
  "nextjs",
  "deno",
  "bun",
  "fullstack",
  "boilerplate",
  "websocket",
  "meteor",
  "mongodb",
  "runtime",
  "module",
  "linter",
  "desktop",
  "scaffolding",
  "microservice",
  "middleware",
  "archive",
  "orm",
  "queue",
  "css-tool",
  "scraping",
  "monorepo",
  "npm-scripts",
  "nvm",
  "package",
  "iot",
  "astro",
  "ecommerce",
  "process",
  "screenshot",
  "css-tool"
];

module.exports = createTask("update-package-data", async context => {
  const { processProjects } = context;

  await processProjects({
    handler: updateBundleSizeData(context),
    query: { deprecated: false, "npm.name": { $ne: "" } },
    concurrency: 1
  });
});

const updateBundleSizeData = context => async project => {
  const { logger } = context;
  if (!canRunInBrowser(project)) {
    return { meta: { updated: false, backendProject: true } };
  }

  if (!needsUpdate(project)) {
    return { meta: { updated: false, updateNotNeeded: true } };
  }

  const bundleData = await fetchBundleData(project.npm.name);
  const bundleDataToBeSaved = {
    gzip: bundleData.size.rawCompressedSize,
    size: bundleData.size.rawUncompressedSize,
    version: extractVersion(bundleData.version)
  };

  logger.debug(project.npm.name, bundleDataToBeSaved);
  project.bundle = bundleDataToBeSaved;
  await project.save();

  return { meta: { updated: true } };
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
    const json = await pTimeout(got(url).json(), timeout);
    return json;
  } catch (error) {
    if (error instanceof pTimeout.TimeoutError) {
      throw error;
    }
    // Internal Server Errors (no valid JSON)
    throw new Error(`Invalid response from ${url}`);
  }
}
