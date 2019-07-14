const mongoose = require("mongoose");

const fields = {
  name: String,
  code: String,
  description: String,
  createdAt: {
    type: Date
  }
};

const schema = new mongoose.Schema(fields, {
  collection: "tags"
});

const model = mongoose.model("Tag", schema);

module.exports = model;
