const { omit, orderBy } = require("lodash");

const { createTask } = require("../../task-runner");

module.exports = createTask("build-projects-json-files", async context => {
  const { processProjects, starStorage, saveJSON } = context;

  const { data: projects } = await processProjects({
    handler: readProject({ starStorage }),
    query: { deprecated: false, disabled: false } // don't include "disabled" projects in built files
  });

  await buildMainList(projects, context);

  async function buildMainList(allProjects, context) {
    const { logger } = context;

    const allTags = await fetchTags(context);

    const projects = allProjects
      .filter(item => !!item) // remove null items that might be created if error occurred
      .filter(project => project.trends.daily !== undefined)
      // .filter(project => project.stars >= 50) // show only projects with more than 50 stars
      .filter(project =>
        project.trends.yearly !== undefined
          ? project.trends.yearly > 25 || !!project.icon // remove cold projects, except if they are featured
          : true
      )
      .filter(project => !isInactiveProject(project))
      .map(compactProjectData); // we don't need the `version` in `projects.json`

    logger.info(`${projects.length} projects to include in the JSON file`, {
      hot: getDailyHotProjects(projects)
    });
    const date = new Date();

    const tags = allTags.filter(
      ({ code }) => !!findProjectByTagId(projects)(code)
    );
    await saveJSON({ date, tags, projects }, "projects.json");
  }

  function compactProjectData(project) {
    const compactData = {
      ...omit(project, ["added_at"]),
      description: truncate(project.description, 75)
    };
    return compactData;
  }

  function truncate(input, maxLength = 50) {
    const isTruncated = input.length > maxLength;
    return isTruncated ? `${input.slice(0, maxLength)}...` : input;
  }
});

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

  // Project custom icon (will be displayed instead of Github owner's avatar)
  if (project.icon && project.icon.url) {
    data.icon = project.icon.url;
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

const getYearsSinceLastCommit = project => {
  const lastCommit = new Date(project.pushed_at);
  return (today - lastCommit) / 1000 / 3600 / 24 / 365;
};

const today = new Date();

const isInactiveProject = project => {
  const delta = project.trends.yearly;
  if (delta === undefined) return false;
  return Math.floor(getYearsSinceLastCommit(project)) > 0 && delta < 100;
};

function getDailyHotProjects(projects) {
  return orderBy(projects, "trends.daily", "desc")
    .slice(0, 5)
    .map(project => `${project.name} (+${project.trends.daily})`);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
