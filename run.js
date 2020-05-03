/*
To be run from the command line, passing a task file as the first argument
E.g.
node run cli/tasks/projects/test/log-project.task.js --limit 1
*/
const path = require("path");

const { parseCommandLineOptions } = require("./cli/utils");
const { runTasks } = require("./cli/task-runner");

const options = parseCommandLineOptions();

const firstArgument = options._[0];

const taskFilePath = path.resolve("./", firstArgument);

const task = require(taskFilePath);

console.log(`Running "${task.name}" task`, options); // eslint-disable-line no-console

runTasks(task);
