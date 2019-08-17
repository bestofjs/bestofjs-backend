const { omit } = require("lodash");

const { createTask } = require("../../../task-runner");

module.exports = createTask("build-projects-json-files", async context => {
  const { processProjects, starStorage, saveJSON } = context;

  const { data: projects } = await processProjects({
    handler: readProject({ starStorage }),
    query: { deprecated: false, disabled: false } // don't include "disabled" projects in built files
  });

  await buildFullList(projects, context);

  await buildNpmList(projects, context);

  async function buildFullList(allProjects, context) {
    const { logger } = context;

    const tags = await fetchTags(context);

    const projects = allProjects
      .filter(item => !!item) // remove null items that might be created if error occurred
      .filter(project => project.trends.daily !== undefined)
      .filter(project => project.stars >= 50) // show only projects with more than 50 stars
      .map(compactProjectData); // we don't need the `version` in `projects.json`

    logger.debug(`${projects.length} projects to include in the JSON file`);
    const date = new Date();
    await saveJSON({ date, tags, projects }, "projects.json");
  }

  function compactProjectData(project) {
    const compactData = {
      ...omit(project, ["version"]),
      description: project.description.slice(0, 70)
    };
    return compactData;
  }

  async function buildNpmList(allProjects) {
    const projects = allProjects
      .filter(project => !!project.npm)
      .filter(project => project.trends.daily !== undefined);
    const count = projects.length;
    const date = new Date();
    await saveJSON({ date, count, projects }, "npm-projects.json");
  }
});

const readProject = ({ starStorage }) => async project => {
  const trends = await starStorage.getTrends(project._id);

  const data = {
    name: project.name,
    full_name: project.github.full_name,
    description: project.getDescription(),
    stars: project.github.stargazers_count,
    trends,
    tags: project.tags.map(tag => tag.code),
    owner_id: project.github.owner_id,
    contributor_count: project.github.contributor_count,
    commit_count: project.github.commit_count,
    pushed_at: project.github.pushed_at
  };

  const url = getProjectHomepage(project);
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
    data.version = project.npm.version;
  }

  // Project custom icon (will be displayed instead of Github owner's avatar)
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

const getProjectHomepage = project => {
  const {
    github: { homepage },
    url,
    override_url
  } = project;
  if (override_url) return url;
  // npm package page is not a valid homepage!
  const invalidPatterns = [
    "npmjs.com/",
    "npm.im/",
    "npmjs.org/",
    "github.com/",
    "twitter.com/"
  ];
  const isValid = url => !invalidPatterns.some(re => new RegExp(re).test(url));
  return homepage && isValid(homepage) ? homepage : url;
};

function fetchTags({ models: { Tag } }) {
  const fields = {
    code: 1,
    name: 1,
    description: 1,
    _id: 0 // required to omit _id field
  };
  return Tag.find({}, fields).sort({ name: 1 });
}
