const { createLogger, format, transports } = require("winston");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const path = require("path");
const prettyBytes = require("pretty-bytes");
const prettyMs = require("pretty-ms");
const { last } = require("lodash");
require("dotenv").config();

const models = require("../core/models");
const createClient = require("../core/github/github-api-client");
const { createStarStorage } = require("../core/star-storage/star-storage");

const { parseCommandLineOptions } = require("./utils");
const processProjects = require("./process-projects");
const processHeroes = require("./process-heroes");

/*
Run the given tasks `{name, handler}` in series
the whole process stops if one of the tasks fail.
*/
async function runTasks(tasks) {
  tasks = Array.isArray(tasks) ? tasks : [tasks];
  const options = parseCommandLineOptions();
  const runner = createTaskRunner(options);
  const logger = runner.getContext().logger;

  await runner.start();
  let index = 1;
  const t0 = new Date();

  try {
    for (const { name, handler } of tasks) {
      logger.info(
        `TASK ${index} of ${tasks.length}: "${name}" ${
          options.readonly ? " [READONLY mode]" : ""
        }`
      );
      await runTask({ name, handler });
      index = index + 1;
    }
  } catch (error) {
    console.error(error); // eslint-disable-line
    logger.error("Unexpected error", { error: error.message });
  } finally {
    await runner.finish();
    logger.info("THE END", { duration: getDuration(t0) });
  }

  async function runTask({ name, handler }) {
    const t0 = new Date();
    await runner.run(handler, options);
    logger.info(`End of "${name}"`, { duration: getDuration(t0) });
  }
}

function createTask(name, handler) {
  if (typeof name !== "string")
    throw new Error("A name should the first argument of `createTask`");
  if (typeof handler !== "function") {
    throw new Error(`The task handler should be a function`);
  }
  return { name, handler };
}

function createTaskRunner(options = {}) {
  let { dbEnv = "production", logLevel, readonly, limit } = options;

  const getLogger = () => {
    const env = process.env.NODE_ENV;
    const defaultLogLevel = env === "production" ? "info" : "verbose";
    if (!logLevel) {
      logLevel = limit === 1 ? "debug" : defaultLogLevel;
    }

    const logger = createLogger({
      level: logLevel,
      format: format.combine(format.colorize(), format.simple()),
      transports: [new transports.Console()]
    });
    return logger;
  };

  const logger = getLogger();

  const getGitHubClient = () => {
    const accessToken = process.env.GITHUB_ACCESS_TOKEN;
    const client = createClient(accessToken);
    return client;
  };

  const saveJSON = async (json, fileName) => {
    logger.info(`Saving ${fileName}`, {
      size: prettyBytes(JSON.stringify(json).length)
    });
    const filePath = path.join(process.cwd(), "build", fileName);
    await fs.outputJson(filePath, json); // does not return anything
    logger.info("JSON file saved!", { fileName, filePath });
  };

  const start = async () => {
    const mongo_key = "MONGO_URI_" + dbEnv.toUpperCase();
    const mongo_uri = process.env[mongo_key];
    if (!mongo_uri) throw new Error(`"${mongo_key}" env. variable is empty!`);
    logger.verbose(`Connecting to the database "${mongo_key}"...`);
    await mongoose.connect(mongo_uri, {
      useNewUrlParser: true,
      useCreateIndex: true
    });
    const dbName = last(mongo_uri.split("/"));
    logger.info(`Connected to the database "${mongo_key}" ${dbName}`);
  };

  const finish = () => {
    mongoose.disconnect();
    logger.info("Database disconnected");
  };

  const starCollection = models.Snapshot.collection;
  const starStorage = createStarStorage(starCollection);

  const context = {
    logger,
    models,
    readonly,
    starStorage
  };

  return {
    getContext() {
      return context;
    },

    start,
    finish,

    run: async (task, options) => {
      if (typeof task !== "function")
        throw new Error("Task runner needs a function!");

      await task(
        {
          ...context,
          // inject the `context` in `processProjects` provided to the customer
          processProjects: params =>
            processProjects({ ...params, context, options }),
          processHeroes: params =>
            processHeroes({ ...params, context, options }),
          getGitHubClient,
          saveJSON,
          options
        },
        options
      );
    }
  };
}

function getDuration(t0) {
  const duration = new Date() - t0;
  return prettyMs(duration);
}

module.exports = {
  createTask,
  createTaskRunner,
  runTasks
};
