const { runTasks } = require("../task-runner");

const updateProjects = require("./projects/github-data/update-github-data.task");
const buildProjects = require("./projects/build/build-projects-files.task");
const updateHeroes = require("./hall-of-fame/update/update-github-heroes.task");
const buildHeroes = require("./hall-of-fame/build/build-heroes.task");

// Compose the tasks that need to be run every day
runTasks([updateProjects, buildProjects, updateHeroes, buildHeroes]);
