const got = require("got");
const pTimeout = require("p-timeout");
const debug = require("debug")("package-api");

const timeout = 3000; // prevent API request from taking more than N milliseconds

async function getPackageQualityData(packageName) {
  const { name, scope } = parsePackageName(packageName);
  var url = `http://packagequality.com/package/${name}`;
  if (scope) url = `${url}?scope=${scope}`;
  const { body } = await got(url, { json: true });
  return body;
}

async function getNpmsData(packageName) {
  // Update to npms.io API v2 in Nov, 2016 (see https://github.com/npms-io/npms-api/issues/56)
  // "scope package" name needs to encoded: `@blueprintjs/core` => `%40blueprintjs%2Fcore`
  const url = `https://api.npms.io/v2/package/${encodeURIComponent(
    packageName
  )}`;
  debug("Fetching npms.io data", url);
  try {
    const { body } = await pTimeout(got(url, { json: true }), timeout);
    debug(body.evaluation);
    return body;
  } catch (error) {
    if (error instanceof pTimeout.TimeoutError) {
      throw error;
    }
    throw new Error(`Invalid response from ${url}`);
  }
}

function formatDependencies(dependencies) {
  return dependencies ? Object.keys(dependencies) : [];
}

function parsePackageName(packageName) {
  var name = packageName;
  var scope = "";
  const array = /^(@.+)\/(.+)/.exec(packageName);
  if (array && array.length === 3) {
    // npm "scoped package" case, example: `@cycle/core`
    scope = array[1];
    name = array[2];
  }
  return { name, scope };
}

async function getBundleData(packageName) {
  const url = `https://bundlephobia.com/api/size?package=${encodeURIComponent(
    packageName
  )}`;
  const headers = {
    "x-bundlephobia-user": "bestofjs.com"
  };
  const options = {
    headers,
    json: true
  };
  debug("Fetching", url);
  try {
    const { body } = await pTimeout(got(url, options), timeout);
    return body;
  } catch (error) {
    if (error instanceof pTimeout.TimeoutError) {
      throw error;
    }
    // Internal Server Errors (no valid JSON)
    throw new Error(`Invalid response from ${url}`);
  }
}

async function getPackageSizeData(packageName, version) {
  const url = `https://packagephobia.com/api.json?p=${encodeURIComponent(
    packageName
  )}@${version}`;
  const headers = {
    "x-packagephobia-user": "bestofjs.com"
  };
  const options = {
    headers,
    json: true
  };
  debug("Fetching", url);
  const { body } = await pTimeout(got(url, options), timeout).catch(error => {
    if (error instanceof pTimeout.TimeoutError) {
      throw error;
    }
    // Internal Server Errors (no valid JSON) returned for several projects including `node-sass`
    const message = `Invalid response from ${url} ${error.message ||
      "(no message)"}`;
    return { error: { message } };
  });
  debug("Response from PackagePhobia", body);
  if (!body) throw new Error(`No response from PackagePhobia ${packageName}`);
  return body;
}

module.exports = {
  getPackageQualityData,
  getNpmsData,
  formatDependencies,
  getBundleData,
  getPackageSizeData
};
