require("dotenv").config();
const createClient = require("./github-api-client");
const debug = require("debug")("*");
const assert = require("assert");

const accessToken = process.env.GITHUB_ACCESS_TOKEN;
const client = createClient(accessToken);

const fullName = "expressjs/express";

async function main() {
  debug("Testing the GitHub API client");

  // await testRepoInfo();

  // await testRepoInfoFallback();

  await testMovedRepo();

  // await testContributorCount();

  // await testUserInfo();
}

async function testMovedRepo() {
  const repoInfo = await client.fetchRepoInfo("foreverjs/forever");
  assert.equal(repoInfo.full_name, "foreversd/forever");
}

async function testRepoInfo() {
  const repoInfo = await client.fetchRepoInfo(fullName);
  debug(repoInfo);
  assert.ok(Array.isArray(repoInfo.topics));
}

async function testRepoInfoFallback() {
  const repoInfo = await client.fetchRepoInfoFallback("foreverjs/forever");
  debug(repoInfo);
  assert.equal(repoInfo.full_name, "foreversd/forever");
}

async function testContributorCount() {
  const contributorCount = await client.fetchContributorCount(fullName);
  debug({ contributorCount });
  assert.ok(contributorCount > 200);
}

async function testUserInfo() {
  const userInfo = await client.fetchUserInfo("sindresorhus");
  debug(userInfo);
  assert.ok(userInfo.followers > 30000);
}

main();
