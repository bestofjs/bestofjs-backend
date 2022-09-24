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

const model = mongoose.model("Snapshot", schema);

module.exports = model;
