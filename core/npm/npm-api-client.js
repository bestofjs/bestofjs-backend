const packageJson = require("package-json");
const scrapeIt = require("scrape-it");
const got = require("got");

const debug = require("debug")("npm-client");

function createNpmClient({ timeout = 1000 } = {}) {
  return {
    async fetchPackageInfo(packageName) {
      debug("Fetching package.json data", packageName);
      return packageJson(packageName).catch(err => {
        const msg = err.message || "";
        throw new Error(
          `Invalid response from npm registry ${packageName} ${msg}`
        );
      });
    },

    async fetchUserInfo(npmUsername) {
      const t = +new Date();
      const url = `https://www.npmjs.com/~${npmUsername}?t=${t}`;
      debug(`Fetch "${npmUsername}" info by scraping`);
      const {
        data: { username, count }
      } = await scrapeIt(url, {
        username: {
          selector: "main h2",
          eq: 0, // First <h2> in the page
          convert: x => (x === "?" ? "" : x)
        },
        count: {
          selector: "#packages",
          convert: getCount
        }
      });
      debug("Found by scraping", { username, count });
      if (npmUsername !== username)
        throw new Error(
          `Unable to scrape ${npmUsername} page correctly ${username}`
        );
      return { username, count };
    },

    async fetchMonthlyDownloadCount(packageName) {
      const url = `https://api.npmjs.org/downloads/point/last-month/${packageName}`;
      const  data = await got(url).json();
      return data.downloads;
    }
  };
}

function getCount(text) {
  const a = /(\d+)/.exec(text);
  if (!a) return 0;
  const count = a[1];
  return parseInt(count, 10);
}

module.exports = createNpmClient;
