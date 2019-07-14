const { GraphQLClient } = require("graphql-request");
const githubRequest = require("gh-got");
const scrapeIt = require("scrape-it");
const debug = require("debug")("github-client");
const { get } = require("lodash");

const { queryRepoInfo, extractRepoInfo } = require("./repo-info-query");
const { queryUserInfo, extractUserInfo } = require("./user-info-query");

function createClient(accessToken) {
  const graphQLClient = new GraphQLClient("https://api.github.com/graphql", {
    headers: {
      authorization: `bearer ${accessToken}`
    }
  });

  const fetchRepoInfoMain = fullName => {
    const [owner, name] = fullName.split("/");
    debug("Fetch repo info from GitHub GraphQL", owner, name);
    return graphQLClient
      .request(queryRepoInfo, { owner, name })
      .then(extractRepoInfo);
  };

  const fetchRepoInfoFallback = async fullName => {
    debug("Fetch repo info using the REST API", fullName);
    const { body: repoInfo } = await githubRequest(`repos/${fullName}`, {
      accessToken
    });
    const { name, full_name, description, stargazers_count, owner } = repoInfo;
    return {
      name,
      full_name,
      description,
      stargazers_count,
      owner_id: owner.id
    };
  };

  const fetchRepoInfoSafe = async fullName => {
    try {
      const repoInfo = await fetchRepoInfoMain(fullName);
      return repoInfo;
    } catch (error) {
      if (isErrorNotFound(error)) {
        debug(`The repo "${fullName}" was mot found, try the fallback method!`);
        const { full_name: updatedFullName } = await fetchRepoInfoFallback(
          fullName
        );
        const repoInfo = await fetchRepoInfoMain(updatedFullName);
        return repoInfo;
      } else {
        throw error;
      }
    }
  };

  const isErrorNotFound = error => {
    const errorType = get(error, "response.errors[0].type");
    return errorType === "NOT_FOUND";
  };

  // === Public API for the GitHub client ===

  return {
    fetchRepoInfo: fetchRepoInfoSafe,

    fetchRepoInfoFallback,

    async fetchContributorCount(fullName) {
      debug(`Fetching the number of contributors by scraping`, fullName);
      const url = `https://github.com/${fullName}/contributors_size`;
      const {
        data: { contributor_count }
      } = await scrapeIt(url, {
        contributor_count: {
          selector: ".num.text-emphasized",
          convert: toInteger
        }
      });
      return contributor_count;
    },

    async fetchUserInfo(login) {
      debug("Fetch user info from GitHub GraphQL", login);
      return graphQLClient
        .request(queryUserInfo, { login })
        .then(extractUserInfo);
    }
  };
}

// Convert a String from the web page E.g. `1,300` into an Integer
const toInteger = source => {
  const onlyNumbers = source.replace(/[^\d]/, "");
  return !onlyNumbers || isNaN(onlyNumbers) ? 0 : parseInt(onlyNumbers, 10);
};

module.exports = createClient;
