const mongoose = require("mongoose");

const fields = {
  year: Number,
  project: {
    type: mongoose.Schema.ObjectId,
    ref: "Project"
  },
  createdAt: {
    type: Date
  },
  insertedAt: {
    type: Date
  }
};

const schema = new mongoose.Schema(fields, {
  collection: "snapshots"
});

schema.index({ project: 1, year: 1 });
schema.index({ fullName: 1 });

const model = mongoose.model("Snapshot", schema);

module.exports = model;
