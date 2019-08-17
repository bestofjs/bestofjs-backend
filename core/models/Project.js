const mongoose = require("mongoose");

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
    dependencies: [String],
    deprecated: Boolean
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

// For some projects, override the description rom GitHub that is not really relevant
schema.methods.getDescription = function() {
  const { description: gitHubDescription } = this.github;

  return gitHubDescription && !this.override_description
    ? gitHubDescription
    : this.description;
};

const model = mongoose.model("Project", schema);

module.exports = model;
