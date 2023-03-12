const slugify = require("slugify");

// Given an array of projects sorted by the star added over one year,
// and an array of categories defined in Rising Stars
// Return the projects to be loaded by Rising Stars app
function filterProjects(projects, categories) {
  const set = new Set();
  addProjectsFromOverallCategory();
  addProjectsFromCategories();
  return getFilteredProjects();

  function addProjectsFromOverallCategory() {
    const excludedTag = ["learning", "meta"];
    const category = categories.find(category => category.key === "all");
    const count = category.count;
    const selectedProjects = projects
      .filter(project => !excludedTag.some(tag => project.tags.includes(tag)))
      .slice(0, count);
    selectedProjects.forEach(project => set.add(project.full_name));
  }

  function addProjectsFromCategories() {
    const subCategories = categories
      .filter(category => category.key !== "all")
      .filter(category => category.disabled !== true);
    subCategories.forEach(category => {
      const selectedProjects = projects
        .filter(project =>
          hasOneOfTags(project, category.tags || [category.key])
        )
        .filter(project =>
          filterExcludeProjectBySlug(project, category.excluded)
        )
        .slice(0, category.count);
      selectedProjects.forEach(project => {
        set.add(project.full_name);
      });
    });
  }

  function getFilteredProjects() {
    const selectedProjects = projects.filter(project =>
      set.has(project.full_name)
    );
    return selectedProjects;
  }
}

module.exports = filterProjects;

function hasOneOfTags(project, tags) {
  if (!tags) return false;
  return project.tags.some(tag => tags.includes(tag));
}

function filterExcludeProjectBySlug(project, slugs) {
  if (!slugs) return true;
  const slug = slugify(project.name, { lower: true, remove: /[.']/g });
  return !slugs.includes(slug);
}
