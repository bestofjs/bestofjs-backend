const mongoose = require("mongoose");
const isAbsoluteURL = require("is-absolute-url");
const isURL = require("validator/lib/isURL");

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
  status: {
    type: String
  },
  github: {
    name: String,
    full_name: String,
    description: String,
    homepage: String,
    stargazers_count: Number,
    pushed_at: Date,
    last_commit: Date,
    branch: String,
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
  downloads: {
    monthly: Number
  },
  bundle: {
    name: String,
    version: String,
    gzip: Number,
    size: Number,
    errorMessage: String,
    updatedAt: Date,
    duration: Number,
  },
  packageSize: {
    name: String,
    installSize: Number,
    publishSize: Number,
    version: String,
    errorMessage: String
  },
  logo: String,
  twitter: String,
  aliases: [String]
};

const schema = new mongoose.Schema(fields, {
  collection: "projects"
});

schema.methods.toString = function() {
  // return `${this.github.full_name} ${this._id}`;
  return `${this.name},${this.npm.name || ""}`;
};

// For some projects, override the description from GitHub that is not really relevant
schema.methods.getDescription = function() {
  const { description: gitHubDescription } = this.github;

  return gitHubDescription && !this.override_description
    ? gitHubDescription
    : this.description;
};

schema.methods.getURL = function() {
  if (this.override_url) return this.url;
  const { homepage } = this.github;

  return homepage && isValidProjectURL(homepage) ? homepage : this.url;
};

// At first projects are created with only a `repository` URL
// The daily script updates the `full_name` property for GitHub,
// which can be different from the one in the repository when projects move to a different org.
schema.methods.getFullName = function() {
  return this.github.full_name || parseGitHubURL(this.repository);
};

const model = mongoose.model("Project", schema);

module.exports = model;

function isValidProjectURL(url) {
  if (!isURL(url)) {
    return false;
  }
  if (!isAbsoluteURL(url)) {
    return false;
  }

  const invalidPatterns = [
    "npmjs.com/", // the package page on NPM site is not a valid homepage!
    "npm.im/",
    "npmjs.org/",
    "/github.com/", // GitHub repo page is not valid but GitHub sub-domains are valid
    "twitter.com/"
  ];

  if (invalidPatterns.some(re => new RegExp(re).test(url))) {
    return false;
  }

  return true;
}

function parseGitHubURL(url) {
  const re = new RegExp(
    "https://github.com/([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"
  );
  const parts = re.exec(url);
  if (!parts) return "";
  if (parts.length < 3) return "";
  const owner = parts[1];
  const name = parts[2];
  return `${owner}/${name}`;
}
