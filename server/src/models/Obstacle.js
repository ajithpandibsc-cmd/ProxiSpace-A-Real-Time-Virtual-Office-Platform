const mongoose = require("mongoose");

const ObstacleSchema = new mongoose.Schema({
  officeId: { type: String, required: true, index: true },
  name: { type: String, default: "Obstacle" },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  blocksSound: { type: Boolean, default: false },
});

module.exports = mongoose.model("Obstacle", ObstacleSchema);
