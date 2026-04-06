const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionNumber: Number,
  questionText: String,
  options: { A: String, B: String, C: String, D: String },
  correctAnswer: String,
});

const scheduledExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    testNumber: { type: Number, required: true },
    totalQuestions: { type: Number, default: 0 },
    durationMinutes: { type: Number, required: true },
    questions: [questionSchema],
    status: { type: String, enum: ["scheduled", "live", "ended"], default: "scheduled" },
    scheduledAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    questionsDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScheduledExam", scheduledExamSchema);