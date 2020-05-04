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

const collection = model.collection;
collection.createIndex({ project: 1, year: 1 });
collection.createIndex({ fullName: 1 });

module.exports = model;
