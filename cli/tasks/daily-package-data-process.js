const { runTasks } = require("../task-runner");

const updatePackageData = require("./projects/update-package-data.task");

// Compose the tasks that need to be run every day
runTasks([updatePackageData]);
