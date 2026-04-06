const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    videoNumber: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    youtubeUrl: { type: String, required: true, trim: true },
    youtubeId: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);