const { createTask } = require("../../task-runner");

module.exports = createTask("ensure-indexes", async context => {
  await ensureProjectIndexes(context);
});

async function ensureProjectIndexes(context) {
  const {
    models: { Project, Snapshot }
  } = context;

  await ensureIndex(Project.collection, { name: 1 }, { unique: true });
  await ensureIndex(Project.collection, { repository: 1 }, { unique: true });

  await ensureIndex(
    Snapshot.collection,
    { project: 1, year: 1 },
    { unique: true }
  );
}

async function ensureIndex(collection, fields, options) {
  const indexes = await collection.getIndexes();
  const indexName = getIndexName(fields);
  if (indexes[indexName]) {
    console.log("Deleting", indexName);
    await collection.dropIndex(indexName);
  }

  console.log("Creating", fields, options);
  await collection.createIndex(fields, options);
  
}

function getIndexName(fields) {
  return Object.entries(fields)
    .map(([key, value]) => {
      return key + "_" + value;
    })
    .join("_");
}
