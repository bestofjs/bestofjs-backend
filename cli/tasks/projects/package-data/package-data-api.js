const got = require("got");
const debug = require("debug")("package-api");

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
  const { body } = await got(url, { json: true }).catch(() => {
    throw new Error(`Invalid response from ${url}`);
  });
  // debug(omit(body, ["collected.metadata.readme"]));
  debug(body.evaluation);
  return body;
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
  const { body } = await got(url, options).catch(() => {
    // Internal Server Errors (no valid JSON)
    throw new Error(`Invalid response from ${url}`);
  });
  return body;
}

async function getPackageSizeData(packageName, version) {
  const url = `https://packagephobia.now.sh/api.json?p=${encodeURIComponent(
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
  const { body } = await got(url, options).catch(e => {
    // Internal Server Errors (no valid JSON) returned for several projects including `node-sass`
    const message = `Invalid response from ${url} ${e.message ||
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
