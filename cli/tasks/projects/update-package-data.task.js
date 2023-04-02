const createNpmClient = require("../../../core/npm/npm-api-client");
const { createTask } = require("../../task-runner");
const { formatDependencies } = require("./package-data-api");

const npmClient = createNpmClient();

module.exports = createTask("update-package-data", async context => {
  const { processProjects } = context;

  await processProjects({
    handler: updatePackageData(context),
    query: { deprecated: false, "npm.name": { $exists: true, $ne: "" } },
    concurrency: 1
  });
});

const updatePackageData = context => async project => {
  const { logger, readonly } = context;

  const previousVersion = project.npm.version;

  const npmData = await fetchNpmRegistryData(context)(project)
  const downloadData = await fetchDownloadData(context)(project)

  project.npm = npmData
  project.downloads = downloadData

  logger.debug(readonly ? "Readonly mode" : "Saving...", {npmData, downloadData});
  if (!readonly) {
    await project.save();
  }
  const meta = {
    updated: true,
    deprecated: npmData.deprecated,
    versionHasChanged:
      !!previousVersion && npmData.version !== previousVersion
  };

  return { meta };
};

const fetchNpmRegistryData = ({ logger }) => async project => {
  logger.debug("Fetch data from NPM registry");
  const packageName = project.npm.name;

  const {
    version,
    dependencies,
    deprecated: deprecatedMessage
  } = await npmClient.fetchPackageInfo(packageName);

  const npmData = {
    name: packageName, // don't use result.name here, we don't want to override name because of scoped packages!
    version,
    dependencies: formatDependencies(dependencies),
    deprecated: !!deprecatedMessage
  };

  logger.debug("NPM data", npmData);
  return npmData;
};

const fetchDownloadData = () => async project => {
  const downloadCount = await npmClient.fetchMonthlyDownloadCount(
    project.npm.name
  );
  const downloads = {
    monthly: downloadCount
  };
  return downloads;
};
