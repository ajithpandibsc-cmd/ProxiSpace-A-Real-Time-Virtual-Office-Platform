const mongoose = require("mongoose");

const OfficeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    width: { type: Number, default: 1200 },
    height: { type: Number, default: 800 },
    layout: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Office", OfficeSchema);
