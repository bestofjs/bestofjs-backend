const { orderBy } = require("lodash");
const fs = require("fs-extra");
const path = require("path");
const { getMonthlyDelta } = require("@bestofjs/snapshots");

const { createTask } = require("../../task-runner");
const filterProjects = require("./filter-projects");

const CURRENT_YEAR = 2022;

module.exports = createTask("build-rising-stars", async context => {
  const { processProjects, saveJSON, starStorage, logger } = context;

  const categories = await fetchCategories(CURRENT_YEAR);

  const { data: projects } = await processProjects({
    handler: readProject({ starStorage }),
    query: { deprecated: false, disabled: false },
    sort: { createdAt: 1 }
  });

  const sortedProjects = orderBy(projects, "delta", "desc");

  const result = filterProjects(sortedProjects, categories);

  logger.info(`${result.length} projects included in Rising Stars`);

  await saveJSON(
    { date: new Date(), count: result.length, projects: result },
    "rising-stars.json"
  );
});

const readProject = ({ starStorage }) => async project => {
  const snapshots = await starStorage.getAllSnapshots(
    project._id
    // { referenceDate: new Date("2020-01-01T10:10:00.000Z") }
  );

  const stars = project.github.stargazers_count;
  const delta = getYearlyDelta(project, snapshots, CURRENT_YEAR);

  const months = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const monthly = months.map(month =>
    getMonthlyDelta(snapshots, { year: CURRENT_YEAR, month })
  );

  const data = {
    name: project.name,
    full_name: project.github.full_name,
    description: project.getDescription(),
    stars,
    delta,
    monthly,
    tags: project.tags.map(tag => tag.code),
    owner_id: project.github.owner_id,
    created_at: project.github.created_at
  };

  const url = project.getURL();
  if (url) {
    data.url = url;
  }

  if (project.logo) {
    data.icon = project.logo;
  }

  return {
    data,
    meta: {
      success: true
    }
  };
};

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

function getYearlyDelta(project, snapshots, year) {
  const finalSnapshot = getFinalSnapshot(snapshots, year);
  if (!finalSnapshot) return 0;
  const finalValue = finalSnapshot.stars;
  const initialValue = wasCreatedThisYear(project, year)
    ? 0
    : getInitialSnapshot(snapshots, year).stars;
  const delta = finalValue - initialValue;
  return delta;
}

function wasCreatedThisYear(project, year) {
  const { created_at } = project.github;
  const date = new Date(created_at);
  const createdYear = date.getFullYear();
  return createdYear === year;
}

function getInitialSnapshot(snapshots, year) {
  return snapshots.find(snapshot => snapshot.year === year);
}

function getFinalSnapshot(snapshots, year) {
  const reversedSnapshots = snapshots.slice();
  reversedSnapshots.reverse();
  return reversedSnapshots.find(snapshot => snapshot.year === year);
}
