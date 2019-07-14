const { createTask } = require("../../../task-runner");

module.exports = createTask("log-hero", async context => {
  const { processHeroes } = context;
  await processHeroes({
    handler: logHero,
    query: {}
  });
});

const logHero = async (hero /*, context*/) => {
  return {
    data: "OK",
    meta: { success: true, popular: hero.github.followers > 1000 }
  };
};
