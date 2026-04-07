const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roll: { type: String, default: "" },
  active: { type: Boolean, default: true }, // New field for active/inactive status
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);