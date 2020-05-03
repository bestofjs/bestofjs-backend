const { runTasks } = require("../task-runner");

const updateProjects = require("./projects/update-github-data.task");
const buildProjects = require("./projects/build-projects-files.task");
const updateHeroes = require("./hall-of-fame/update-github-heroes.task");
const buildHeroes = require("./hall-of-fame/build-heroes.task");
const notify = require("./notify.task");

// Compose the tasks that need to be run every day
runTasks([updateProjects, buildProjects, updateHeroes, buildHeroes, notify]);
