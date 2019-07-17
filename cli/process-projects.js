const pMap = require("p-map");
const prettyMs = require("pretty-ms");
const { isNumber } = require("lodash");

async function processProjects({
  handler,
  query = {},
  sort,
  limit,
  concurrency = 5,
  options = {},
  context
}) {
  const { logger } = context;
  if (options.concurrency) {
    concurrency = options.concurrency; // `--concurrency` CLI option overrides the function argument
  }
  if (options.limit) {
    limit = options.limit;
  }

  const actualQuery = normalizeQuery(getQuery(query, options));

  const projects = await fetchProjects({
    query: actualQuery,
    context,
    sort,
    limit
  });

  const count = projects.length;

  const mapper = async project => {
    logger.verbose(`Processing ${project.toString()}`);
    try {
      const result = await handler(project, context);
      logger.debug(`Processed ${project.toString()}`, result); // only log the result at the "debug" level
      if (!(result && result.meta))
        throw new Error(
          "The project handler should return an object with a key `meta`"
        );
      return result;
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
      logger.error(`Error while processing ${project.toString()}`, {
        error: error.message
      });
      return { meta: { error: true }, data: undefined };
    }
  };

  logger.info(`Processing ${count} projects...`, { concurrency });
  const t0 = new Date();

  const result = await pMap(projects, mapper, { concurrency });

  const aggregatedResult = result.reduce(
    (acc, val) => {
      const meta = Object.entries(val.meta).reduce(sumMetaReducer, acc.meta);
      return {
        ...acc,
        data: acc.data.concat(val.data),
        meta
      };
    },
    { meta: {}, data: [] }
  );
  const duration = new Date() - t0;
  logger.info(
    `${count} projects processed in ${prettyMs(duration)}`,
    aggregatedResult.meta
  );
  return aggregatedResult;
}

const sumMetaReducer = (acc, [key, value]) => {
  const convertResultToNumber = result => {
    if (result === false) return 0;
    if (result === true) return 1;
    if (!isNumber(result))
      throw new Error(`"meta" object should contain only numbers or booleans`);
    return result;
  };
  const number = convertResultToNumber(value);

  return {
    ...acc,
    [key]: acc[key] ? acc[key] + number : number
  };
};

async function fetchProjects({
  query,
  context,
  limit = 0,
  sort = { createdAt: -1 }
}) {
  const {
    models: { Project },
    logger
  } = context;
  logger.verbose("Fetching projects to process", query, { limit });

  return await Project.find(query)
    // .select({
    //   name: 1,
    //   description: 1,
    //   override_description: 1,
    //   url: 1,
    //   override_url: 1,
    //   github: 1,
    //   npm: 1,
    //   icon: 1
    // })
    .populate("tags")
    .sort(sort)
    .limit(limit);
  // .lean(); we use `toString()` Mongoose models
}

function getQuery(query, { id, name, fullName }) {
  if (id) {
    query["_id"] = id;
  }
  if (name) {
    query["github.name"] = name;
  }
  if (fullName) {
    query["github.full_name"] = fullName;
  }
  return query;
}

function normalizeQuery(originalQuery) {
  const query = { ...originalQuery };
  if (query.disabled === false) {
    query.disabled = { $ne: true };
  }
  if (query.deprecated === false) {
    query.deprecated = { $ne: true };
  }
  return query;
}

module.exports = processProjects;
