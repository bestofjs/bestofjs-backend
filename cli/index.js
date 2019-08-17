const { parseCommandLineOptions } = require("./utils");

const options = parseCommandLineOptions();
console.log(options);

const taskFilePath = options._[0];

const task = require(taskFilePath);

console.log(task);
