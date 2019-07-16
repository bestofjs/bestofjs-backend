const pMap = require("p-map");
const prettyMs = require("pretty-ms");

async function processHeroes({
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

  const actualQuery = getQuery(query, options);

  const heroes = await fetchHeroes({
    query: actualQuery,
    sort,
    limit,
    context
  });

  const count = heroes.length;

  const mapper = async hero => {
    logger.verbose(`Processing ${hero.toString()}`);
    try {
      const result = await handler(hero, context);
      logger.debug(`Processed ${hero.toString()}`, result); // only log the result at the "verbose" level
      if (!(result && result.meta))
        throw new Error(
          "The hero handler should return an object with a key `meta`"
        );
      return result;
    } catch (error) {
      logger.error(`Error while processing ${hero.toString()}`, {
        error: error.message
      });
      return { meta: { error: true, data: undefined } };
    }
  };

  logger.info(`Processing ${count} heroes...`, { concurrency });
  const t0 = new Date();

  const result = await pMap(heroes, mapper, { concurrency });

  const aggregatedResult = result.reduce(
    (acc, val) => {
      const meta = Object.keys(val.meta)
        .filter(key => !!val.meta[key])
        .reduce(metaReducer, acc.meta);
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
    `${count} heroes processed in ${prettyMs(duration)}`,
    aggregatedResult.meta
  );
  return aggregatedResult;
}

const metaReducer = (acc, val) => ({
  ...acc,
  [val]: acc[val] ? acc[val] + 1 : 1
});

async function fetchHeroes({
  query,
  limit = 0,
  sort = { "github.followers": -1 },
  context
}) {
  const {
    models: { Hero },
    logger
  } = context;
  logger.verbose("Fetching Hall of Fame members", { query, limit, sort });

  return await Hero.find(query)
    .populate({ path: "projects", select: "name" })
    .sort(sort)
    .limit(limit);
}

function getQuery(query, { id, login }) {
  if (id) {
    query["_id"] = id;
  }
  if (login) {
    query["github.login"] = login;
  }
  return query;
}

module.exports = processHeroes;
