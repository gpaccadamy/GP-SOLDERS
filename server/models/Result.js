const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    studentMobile: { type: String, required: true },
    studentName: { type: String, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, required: true },
    examTitle: String,
    examSubject: String,
    examTestNumber: Number,
    correct: Number,
    wrong: Number,
    unanswered: Number,
    score: Number,
    total: Number,
    answers: { type: Map, of: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", resultSchema);