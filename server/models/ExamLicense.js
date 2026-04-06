const mongoose = require("mongoose");

const examLicenseSchema = new mongoose.Schema(
  {
    totalAllowed: { type: Number, default: 50 },
    totalConducted: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamLicense", examLicenseSchema);