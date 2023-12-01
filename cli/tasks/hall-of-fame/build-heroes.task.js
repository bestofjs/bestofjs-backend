const slugify = require("slugify");

const { createTask } = require("../../task-runner");

module.exports = createTask("update-github-heroes", async context => {
  const { processHeroes, saveJSON } = context;

  const { data: heroes } = await processHeroes({
    handler: heroToJSON
  });

  await saveJSON({ date: new Date(), heroes }, "hof.json");
});

function heroToJSON(hero) {
  const data = {
    username: hero.github.login,
    avatar: hero.github.avatar_url,
    followers: hero.github.followers,
    blog: getHeroHomepage(hero),
    name: hero.name || hero.github.name, // the `name` property is used to override the GitHub name (E.g. `mrdoob` => `Ricardo Cabello`)
    projects: hero.projects.map(project =>
      slugify(project.name, { lower: true, remove: /[.']/g })
    ),
    bio: hero.short_bio,
    npm: hero.npm.username,
    modules: hero.npm.count
  };
  return {
    meta: { processed: true },
    data
  };
}

const getHeroHomepage = hero => {
  const {
    github: { blog },
    url,
    override_url
  } = hero;
  if (override_url) return url;
  // npm package page is not a valid homepage!
  const invalidPatterns = [
    "npmjs.com/",
    "npm.im/",
    "npmjs.org/",
    "github.com/"
  ];
  const isValid = url => !invalidPatterns.some(re => new RegExp(re).test(url));
  return blog && isValid(blog) ? blog : url;
};
