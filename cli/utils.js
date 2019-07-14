const argv = require("yargs").argv;
const { mapKeys } = require("lodash");

function normalizeOptionKey(key) {
  const optionKeys = {
    loglevel: "logLevel",
    fullname: "fullName",
    db: "dbEnv"
  };
  const foundKey = optionKeys[key];
  return foundKey || key;
}

function parseCommandLineOptions() {
  return mapKeys(argv, (value, key) => normalizeOptionKey(key));
}

module.exports = { parseCommandLineOptions };
