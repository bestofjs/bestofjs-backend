const { runTasks } = require("../task-runner");

const updatePackageData = require("./projects/package-data/update-package-data.task");

// Compose the tasks that need to be run every day
runTasks([updatePackageData]);
