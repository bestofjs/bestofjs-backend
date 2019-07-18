const mongoose = require("mongoose");
const emojiRegex = require("emoji-regex");

const fields = {
  name: String,
  url: String,
  override_url: Boolean,
  description: String,
  override_description: Boolean,
  repository: String,
  tags: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Tag"
    }
  ],
  createdAt: {
    type: Date
  },
  disabled: {
    type: Boolean
  },
  deprecated: {
    type: Boolean
  },
  github: {
    name: String,
    full_name: String,
    description: String,
    homepage: String,
    stargazers_count: Number,
    pushed_at: Date,
    branch: String,
    packageJson: Boolean,
    owner_id: Number,
    topics: Array,
    commit_count: Number,
    contributor_count: Number,
    created_at: Date,
    archived: Boolean,
    updatedAt: Date
  },
  npm: {
    name: String,
    version: String,
    dependencies: [String]
  },
  bundle: {
    name: String,
    dependencyCount: Number,
    gzip: Number,
    size: Number,
    version: String,
    errorMessage: String
  },
  packageSize: {
    name: String,
    installSize: Number,
    publishSize: Number,
    version: String,
    errorMessage: String
  },
  packagequality: {
    quality: Number
  },
  npms: {
    score: {
      detail: {
        maintenance: Number,
        popularity: Number,
        quality: Number
      },
      final: Number
    }
  },
  icon: {
    url: String
  },
  colors: {
    vibrant: String
  },
  trends: Object,
  twitter: String
};

const schema = new mongoose.Schema(fields, {
  collection: "projects"
});

schema.methods.toString = function() {
  return `Project ${this.github.full_name} ${this._id}`;
};

/*
Return project description, overriding the one provided by GitHub if necessary
For some projects (Wee, Ve Element Admin...) the GitHub description that is not really relevant
*/
schema.methods.getDescription = function() {
  const { description: githubDescription } = this.github;

  const overrideGithubDescription =
    this.override_description || !githubDescription;

  return overrideGithubDescription
    ? this.description
    : removeEmojis(githubDescription);
};

function removeEmojis(text) {
  let result = text;

  // STEP 1: detect emojis using `emoji-regexep` package
  result = result.replace(emojiRegex(), "").trim();

  // STEP 2: remove GitHub specific emojis (see Node.js repo: `Node.js JavaScript runtime :sparkles::turtle::rocket::sparkles:`)
  result = result.replace(/(:([a-z_\d]+):)/g, "").trim();

  return result;
}

const model = mongoose.model("Project", schema);

module.exports = model;
