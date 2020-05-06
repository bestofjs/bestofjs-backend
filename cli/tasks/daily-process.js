/* eslint-disable no-console */
const { runTasks } = require("../task-runner");

const updateProjects = require("./projects/update-github-data.task");
const buildProjects = require("./projects/build-projects-files.task");
const updateHeroes = require("./hall-of-fame/update-github-heroes.task");
const buildHeroes = require("./hall-of-fame/build-heroes.task");
const notify = require("./notify.task");

const isDeploymentLocked = process.env.LOCK === "1";

if (isDeploymentLocked) {
  console.info(
    `Build process is locked!
     Unlock by updating "LOCK" env. variable from the settings page
    `
  );
  process.exit(1);
} else {
  console.info(`Deployments are unlocked, starting the building process...`);
}

// Compose the tasks that need to be run every day
runTasks([
  // updateProjects,
  buildProjects
  // updateHeroes,
  // buildHeroes,
  //  notify
]);
