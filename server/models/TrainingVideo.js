const mongoose = require("mongoose");

const trainingVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    youtubeUrl: { type: String, required: true, trim: true },
    youtubeId: { type: String, required: true, trim: true },
    category: { 
      type: String, 
      enum: ["Training", "Weekly Test", "Functions", "Others"], 
      default: "Training" 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrainingVideo", trainingVideoSchema);