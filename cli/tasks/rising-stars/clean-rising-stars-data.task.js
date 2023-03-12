const { orderBy } = require("lodash");
const fs = require("fs-extra");
const path = require("path");

const { createTask } = require("../../task-runner");
const filterProjects = require("./filter-projects");

module.exports = createTask("clean-rising-stars-data", async context => {
  const {
    models: { Tag },
    logger
  } = context;

  const yearParam = process.argv[3];
  if (!yearParam)
    throw new Error("Specify the year to process as the first parameter");
  const year = parseInt(yearParam);
  if (isNaN(year)) throw new Error("Specify a number for the year");

  const allTags = await fetchTags(Tag);

  const categories = await fetchCategories(year);

  const { projects } = await fetchProjectData(year);

  logger.info(
    `Cleaning Rising Stars ${year} ${projects.length} projects, ${categories.length} categories`
  );

  const sortedProjects = orderBy(projects, "delta", "desc");
  const filteredProjects = filterProjects(sortedProjects, categories);

  const tags = allTags.filter(tag => isTagIncluded(tag.code, filteredProjects));

  logger.info(
    `${filteredProjects.length} projects included in Rising Stars, ${tags.length} tags`
  );

  const data = { projects: filteredProjects, tags };
  const filepath = await saveProjectData(year, data);
  logger.info(`JSON saved: ${filepath}`);
});

async function fetchTags(Tag) {
  const fields = {
    code: 1,
    name: 1,
    _id: 0 // required to omit _id field
  };
  return await Tag.find({}, fields).sort({ name: 1 });
}

async function fetchCategories(year) {
  const filepath = path.resolve(
    process.cwd(),
    "..",
    "javascript-risingstars",
    "data",
    String(year),
    "categories.json"
  );
  return await fs.readJSON(filepath);
}

async function fetchProjectData(year) {
  const filepath = getProjectDataFilepath(year);
  return await fs.readJSON(filepath);
}

async function saveProjectData(year, data) {
  const filepath = getProjectDataFilepath(year);
  await fs.writeJSON(filepath, data, {spaces: 2});
  return filepath;
}

function getProjectDataFilepath(year) {
  const filepath = path.resolve(
    process.cwd(),
    "..",
    "javascript-risingstars",
    "data",
    String(year),
    "projects.json"
  );
  return filepath;
}

function isTagIncluded(tagCode, projects) {
  return !!projects.find(project => project.tags.includes(tagCode));
}
