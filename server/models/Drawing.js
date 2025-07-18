const mongoose = require("mongoose");

const drawingSchema = new mongoose.Schema({
  x0: Number,
  y0: Number,
  x1: Number,
  y1: Number,
  color: String,
});

module.exports = mongoose.model("Drawing", drawingSchema);
