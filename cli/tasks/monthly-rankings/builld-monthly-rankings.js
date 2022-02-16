const { orderBy, round } = require("lodash");
const { getMonthlyDelta } = require("@bestofjs/snapshots");

const { createTask } = require("../../task-runner");

module.exports = createTask("build-monthly-rankings", async context => {
  const { processProjects, saveJSON, starStorage, logger } = context;
  const { year, month, latest, first } = context.options;

  if (!year) throw new Error(`"year" parameter is required`);
  if (!month) throw new Error(`"month" parameter is required`);

  const { data: projects } = await processProjects({
    handler: readProject({ starStorage, year, month }),
    query: { deprecated: false, disabled: false }
    // sort: { createdAt: 1 }
  });

  const validProjects = projects
    .filter(
      ({ delta, relativeGrowth }) =>
        delta !== undefined && relativeGrowth !== undefined
    )
    .filter(
      ({ tags }) => !tags.some(tag => ["learning", "meta"].includes(tag))
    );

  const trending = orderBy(validProjects, "delta", "desc").slice(0, 100);
  const byRelativeGrowth = orderBy(
    validProjects,
    "relativeGrowth",
    "desc"
  ).slice(0, 100);
  const output = {
    year,
    month,
    isFirst: Boolean(first),
    isLatest: Boolean(latest),
    trending,
    byRelativeGrowth
  };

  logger.info("Rankings", {
    trending: trending.map(project => project.name),
    relative: byRelativeGrowth.map(project => project.name)
  });
  await saveJSON(output, `monthly/${year}/${formatDate({ year, month })}.json`);
});

const readProject = ({ starStorage, year, month }) => async project => {
  const snapshots = await starStorage.getAllSnapshots(project._id);

  const stars = project.github.stargazers_count;
  const delta = getMonthlyDelta(snapshots, { year, month });
  const relativeGrowth = delta ? delta / (stars - delta) : undefined;

  const data = {
    name: project.name,
    full_name: project.github.full_name,
    description: project.getDescription(),
    stars,
    delta,
    relativeGrowth: round(relativeGrowth, 4),
    tags: project.tags.map(tag => tag.code),
    owner_id: project.github.owner_id,
    created_at: project.github.created_at
  };

  const url = project.getURL();
  if (url) {
    data.url = url;
  }

  if (project.icon && project.icon.url) {
    data.icon = project.icon.url;
  }

  return {
    data,
    meta: {
      success: true
    }
  };
};

function formatDate({ year, month }) {
  return `${year}-${month.toString().padStart(2, "0")}`;
}
