const pProps = require("p-props");
const { mapValues } = require("lodash");

const createNpmClient = require("../../../core/npm/npm-api-client");
const npmClient = createNpmClient();

const { createTask } = require("../../task-runner");
const { formatDependencies } = require("./package-data-api");

module.exports = createTask("update-package-data", async context => {
  const { processProjects } = context;

  await processProjects({
    handler: updatePackageData(context),
    query: { deprecated: false, "npm.name": { $ne: "" } },
    concurrency: 1
  });
});

const updatePackageData = context => async project => {
  const { logger, readonly } = context;

  const requests = {
    npm: fetchNpmRegistryData,
    downloads: fetchDownloadData
  };

  const result = await pProps(mapValues(requests), async (fetchFn, key) => {
    try {
      return await fetchFn(context)(project);
    } catch (error) {
      context.logger.debug(`Error fetching "${key}" data: ${error.message}`);
      return null;
    }
  });
  Object.entries(result).forEach(([key, value]) => {
    // ignore `null` values coming from errors
    if (value) {
      project[key] = value;
    }
  });

  logger.debug(readonly ? "Readonly mode" : "Project saved", result);
  if (!readonly) {
    await project.save();
  }
  return { meta: { updated: true, ...mapValues(result, value => !!value) } };
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

const fetchDownloadData = ({ logger }) => async project => {
  const downloadCount = await npmClient.fetchMonthlyDownloadCount(
    project.npm.name
  );
  const downloads = {
    monthly: downloadCount
  };
  return downloads;
};
