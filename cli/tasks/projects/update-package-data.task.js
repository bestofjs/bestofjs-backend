const pProps = require("p-props");
const { mapValues, get } = require("lodash");

const createNpmClient = require("../../../core/npm/npm-api-client");
const npmClient = createNpmClient();

const { createTask } = require("../../task-runner");
const {
  getNpmsData,
  getBundleData,
  getPackageSizeData,
  formatDependencies
} = require("./package-data-api");

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
    npms: fetchNpmsData,
    bundle: fetchBundleData,
    packageSize: fetchPackageSizeData,
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

const fetchNpmsData = ({ logger }) => async project => {
  logger.debug("Fetch score from npms.io API");
  const {
    score: { detail, final }
  } = await getNpmsData(project.npm.name);
  const score = {
    detail: mapValues(detail, formatScore),
    final: formatScore(final)
  };
  logger.debug("Score from npms.io", score);
  return { score };
};

const fetchBundleData = ({ logger }) => async project => {
  if (!isBundleUpdateNeeded(project)) {
    logger.debug(`Bundle size data already up-to-date for ${project.name}`);
    return null;
  }
  logger.debug("Fetch data about the bundle size", {
    project: project.name,
    version: get(project, "npm.version"),
    previousVersion: get(project, "bundle.version") || "(nothing)"
  });

  try {
    const bundleData = await getBundleData(project.npm.name);
    const bundle = {
      name: bundleData.name,
      dependencyCount: bundleData.dependencyCount,
      gzip: bundleData.gzip,
      size: bundleData.size,
      version: bundleData.version
    };
    logger.debug("Bundle data to be saved", bundle);
    return { ...bundle, updatedAt: new Date() };
  } catch (error) {
    return {
      errorMessage: error.message || "Unexpected error",
      updatedAt: new Date()
    };
  }
};

const isBundleUpdateNeeded = project => {
  // const isError = !!get(project.toObject(), "bundle.errorMessage");
  // if (isError) return false; // don't try to fetch data if there was a build error previously
  const projectJson = project.toObject();
  const npmVersion = get(projectJson, "npm.version");
  const npmName = get(projectJson, "npm.name");
  const bundleVersion = get(projectJson, "bundle.version");
  const bundleName = get(projectJson, "bundle.name");
  return npmVersion !== bundleVersion || bundleName !== npmName;
};

const fetchPackageSizeData = ({ logger }) => async project => {
  const version = get(project, "npm.version");
  if (!isPackageSizeUpdateNeeded({ project, logger })) {
    logger.debug(`Package size data already up-to-date for ${project.name}`);
    return null;
  }
  logger.debug("Fetch data about the package size", {
    project: project.name,
    version,
    previousVersion: get(project, "packageSize.version") || "(nothing)"
  });

  try {
    const packageSizeData = await getPackageSizeData(project.npm.name, version);
    const isError = !!packageSizeData.error;
    const packageSize = isError
      ? { errorMessage: packageSizeData.error.message }
      : {
          publishSize: packageSizeData.publishSize,
          installSize: packageSizeData.installSize,
          version
        };
    logger.debug("Package size data to be saved", packageSize);
    return Object.assign({}, packageSize, { updatedAt: new Date() });
  } catch (error) {
    logger.error(
      `Unable to get package size data for ${project.toString()} ${
        error.message
      }`
    );
    return { errorMessage: error.message || "Error!" };
  }
};

function isPackageSizeUpdateNeeded({ project, logger }) {
  // const isError = !!get(project.toObject(), "packageSize.errorMessage");
  // if (isError) {
  //   logger.debug(
  //     `Don't fetch package size data because of the previous error ${project.name}`
  //   );
  //   return false; // don't try to fetch data if there was a build error previously
  // }
  const projectJson = project.toObject();
  const npmVersion = get(projectJson, "npm.version");
  const projectSizeVersion = get(projectJson, "packageSize.version");
  return npmVersion !== projectSizeVersion;
}

// Format score numbers from packagequality.com and npms.im into percents, with no decimals
// We may have no score to format (`ngx-datatable` cannot be found on packagequality.com)
const formatScore = score => (score ? Math.round(score * 100) : 0);

const fetchDownloadData = ({ logger }) => async project => {
  const downloadCount = await npmClient.fetchMonthlyDownloadCount(
    project.npm.name
  );
  const downloads = {
    monthly: downloadCount
  };
  return downloads;
};
