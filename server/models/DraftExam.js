const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionNumber: Number,
  questionText: String,
  options: { A: String, B: String, C: String, D: String },
  correctAnswer: String,
});

const draftExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    testNumber: { type: Number, required: true },
    totalQuestions: { type: Number, default: 0 },
    questions: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("DraftExam", draftExamSchema);