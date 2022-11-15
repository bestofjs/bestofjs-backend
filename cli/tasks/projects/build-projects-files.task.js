const { omit, orderBy } = require("lodash");
const { default: slugify } = require("slugify");

const { createTask } = require("../../task-runner");

module.exports = createTask("build-projects-json-files", async context => {
  const { processProjects, starStorage } = context;

  const { data: projects } = await processProjects({
    handler: readProject({ starStorage }),
    query: { deprecated: false, disabled: false } // don't include "disabled" projects in built files
  });

  await buildMainList(projects, context);
  await buildFullList(projects, context);
});

async function buildMainList(allProjects, context) {
  const { logger, saveJSON } = context;

  const allTags = await fetchTags(context);

  const projects = allProjects
    .filter(item => !!item) // remove null items that might be created if error occurred
    .filter(project => project.trends.daily !== undefined) // new projects need to include at least the daily trend
    .filter(project => isFeaturedProject(project) || !isColdProject(project))
    .filter(
      project => isFeaturedProject(project) || !isInactiveProject(project)
    )
    .map(compactProjectData); // we don't need the `version` in `projects.json`

  logger.info(`${projects.length} projects to include in the main JSON file`, {
    hot: getDailyHotProjects(projects)
  });
  const date = new Date();

  const tags = allTags.filter(
    ({ code }) => !!findProjectByTagId(projects)(code)
  );
  await saveJSON({ date, tags, projects }, "projects.json");
}

async function buildFullList(allProjects, context) {
  const { logger, saveJSON } = context;

  const projects = allProjects
    .filter(item => !!item) // remove null items that might be created if error occurred
    .map(getFullProjectData);

  logger.info(`${projects.length} projects to include in the full list`);
  const date = new Date();

  await saveJSON(
    { date, count: projects.length, projects },
    "projects-full.json"
  );
}

function compactProjectData(project) {
  const compactData = {
    slug: slugify(project.name, { lower: true, remove: /[.']/g }),
    ...omit(project, ["added_at"]),
    description: truncate(project.description, 75)
  };
  return compactData;
}

function getFullProjectData(project) {
  const fullData = {
    slug: slugify(project.name, { lower: true, remove: /[.']/g }),
    ...project,
    description: truncate(project.description, 150)
  };
  return fullData;
}

function truncate(input, maxLength = 50) {
  const isTruncated = input.length > maxLength;
  return isTruncated ? `${input.slice(0, maxLength)}...` : input;
}

const readProject = ({ starStorage }) => async project => {
  const trends = await starStorage.getTrends(project._id);

  const data = {
    name: project.name,
    full_name: project.github.full_name,
    description: project.getDescription(),
    stars: project.github.stargazers_count,
    trends: omit(trends, "quarterly"),
    tags: project.tags.map(tag => tag.code),
    contributor_count: project.github.contributor_count,
    pushed_at: formatDate(project.github.last_commit),
    owner_id: project.github.owner_id,
    created_at: formatDate(project.github.created_at),
    added_at: project.createdAt
  };

  const url = project.getURL();
  if (url) {
    data.url = url;
  }

  // Add Github default branch only if it's different from `master`
  const branch = project.github.branch;
  if (branch && branch !== "master") {
    data.branch = branch;
  }

  // Add npm data if available
  if (project.npm && project.npm.name) {
    data.npm = project.npm.name;
    if (project.downloads) {
      data.downloads = project.downloads.monthly;
    }
  }

  // Project custom logo (will be displayed instead of Github owner's avatar)
  if (project.logo) {
    data.icon = project.logo;
  }

  if (project.aliases.length > 0) {
    data.aliases = project.aliases;
  }

  return {
    data,
    meta: {
      success: true
    }
  };
};

function fetchTags({ models: { Tag } }) {
  const fields = {
    code: 1,
    name: 1,
    _id: 0 // required to omit _id field
  };
  return Tag.find({}, fields).sort({ name: 1 });
}

const findProjectByTagId = projects => tagId =>
  projects.find(({ tags }) => tags.includes(tagId));

function isColdProject(project) {
  const delta = project.trends.yearly;
  const monthlyDownloads = project.downloads;
  if (delta === undefined) return false; // only consider projects with data covering 1 year
  if (monthlyDownloads > 100000) return false; // exclude projects with a lots of downloads (E.g. `Testem`)
  return delta < 50;
}

function isInactiveProject(project) {
  const delta = project.trends.yearly;
  if (delta === undefined) return false; // only consider projects with data covering 1 year
  return Math.floor(getYearsSinceLastCommit(project)) > 0 && delta < 100;
}

// a project is considered as "Featured" if it has a specific logo
// we want to show them in the UI even if they are cold or inactive
function isFeaturedProject(project) {
  return !!project.logo;
}

function getDailyHotProjects(projects) {
  return orderBy(projects, "trends.daily", "desc")
    .slice(0, 5)
    .map(project => `${project.name} (+${project.trends.daily})`);
}

function getYearsSinceLastCommit(project) {
  const today = new Date();
  const lastCommit = new Date(project.pushed_at);
  return (today - lastCommit) / 1000 / 3600 / 24 / 365;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
