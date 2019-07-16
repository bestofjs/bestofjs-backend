const mongoose = require("mongoose");

const fields = {
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  },
  projects: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Project"
    }
  ],
  short_bio: String,
  github: {
    login: String,
    name: String,
    avatar_url: String,
    blog: String,
    bio: String,
    followers: Number
  },
  npm: {
    count: Number,
    username: String,
    updatedAt: Date
  }
};

const schema = new mongoose.Schema(fields, {
  collection: "heroes"
});

schema.methods.toString = function() {
  const npmPart = this.npm.username
    ? `${this.npm.username} (${this.npm.count} packages)`
    : "No packages";
  return `${this.github.login} (${this.github.name}) ${this._id} ${this.github.followers} followers, ${npmPart}`;
};

const model = mongoose.model("Hero", schema);

module.exports = model;
