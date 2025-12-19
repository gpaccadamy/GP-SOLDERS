const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Optional: Local uploads (safe to keep for old images)
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set");
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// === MODELS ===
// Student (added unique index on mobile)
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roll: { type: String },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const Student = mongoose.model('Student', StudentSchema);

// Video Lesson
const Video = mongoose.model('Video', new mongoose.Schema({
  subject: String,
  class: Number,
  videoId: String,
  title: String
}));

// Draft Exam
const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
  title: String,
  subject: String,
  classNum: Number,
  totalQuestions: { type: Number, default: 0 },
  questions: [{
    imageUrl: { type: String, required: true }, // Cloudinary URL
    correctAnswer: { type: String, required: true } // "a", "b", "c", "d"
  }],
  createdAt: { type: Date, default: Date.now }
}));

// Conducted Exam
const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String,
  subject: String,
  classNum: Number,
  totalQuestions: Number,
  questions: [{
    imageUrl: String,
    correctAnswer: String
  }],
  conductedAt: { type: Date, default: Date.now }
}));

// Exam Result
const Result = mongoose.model('Result', new mongoose.Schema({
  studentMobile: String,
  studentName: String,
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  examTitle: String,
  score: Number,
  total: Number,
  correct: Number,
  wrong: Number,
  answers: [String],
  submittedAt: { type: Date, default: Date.now }
}));

// === ROUTES ===
// Student Login (NEW)
app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ error: "Mobile and password required" });
    }
    const student = await Student.findOne({ mobile });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    // Plain text comparison (upgrade to bcrypt later)
    if (student.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }
    // Return minimal data
    res.json({ name: student.name, mobile: student.mobile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Students (Admin CRUD)
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/students', async (req, res) => {
  try {
    let { name, roll, mobile, password } = req.body;
    name = name?.trim();
    mobile = mobile?.trim();
    roll = roll?.trim() || null;
    password = password?.trim();
    if (!name || !mobile || !password) {
      return res.status(400).json({ error: "Name, mobile, and password are required" });
    }
    const existing = await Student.findOne({ mobile });
    if (existing) {
      return res.status(409).json({ error: "Mobile number already registered" });
    }
    const student = new Student({ name, roll, mobile, password });
    await student.save();
    res.json({ message: "Student added successfully" });
  } catch (err) {
    console.error('Student add error:', err);
    if (err.code === 11000) { // Duplicate key error
      return res.status(409).json({ error: "Mobile number already registered" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Videos (unchanged)
app.get('/videos', async (req, res) => {
  try {
    res.json(await Video.find());
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/videos', async (req, res) => {
  try {
    const { subject, classNum, youtubeUrl, title } = req.body;
    const match = youtubeUrl.match(/(?:v=|\/embed\/|youtu\.be\/|watch\?v=)([^#\&\?]{11})/);
    if (!match) return res.status(400).json({ error: "Invalid YouTube URL" });
    const videoId = match[1];
    const existing = await Video.findOne({ subject, class: classNum });
    if (existing) {
      existing.videoId = videoId;
      existing.title = title || "Lesson";
      await existing.save();
      return res.json({ message: "Video updated" });
    }
    await new Video({ subject, class: classNum, videoId, title: title || "Lesson" }).save();
    res.json({ message: "Video saved" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Drafts (unchanged)
app.get('/drafts', async (req, res) => {
  try {
    const drafts = await DraftExam.find().sort({ createdAt: -1 });
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/drafts', async (req, res) => {
  try {
    const { title, subject, classNum, questions } = req.body;
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: "At least one question required" });
    }
    let draft = await DraftExam.findOne({ title });
    if (draft) {
      draft.subject = subject;
      draft.classNum = classNum;
      draft.questions = questions;
      draft.totalQuestions = questions.length;
    } else {
      draft = new DraftExam({ title, subject, classNum, questions, totalQuestions: questions.length });
    }
    await draft.save();
    res.json({ message: "Draft saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Conduct Exam (unchanged)
app.post('/conduct/:draftId', async (req, res) => {
  try {
    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    const existing = await Exam.findOne({ title: draft.title });
    if (existing) return res.status(400).json({ error: "Exam already conducted" });
    const exam = new Exam({
      title: draft.title,
      subject: draft.subject,
      classNum: draft.classNum,
      totalQuestions: draft.totalQuestions,
      questions: draft.questions
    });
    await exam.save();
    await DraftExam.findByIdAndDelete(req.params.draftId);
    res.json({ message: "Exam conducted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// === STUDENT EXAM ROUTES ===
app.get('/active-exams', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ conductedAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/exam/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/submit-exam', async (req, res) => {
  try {
    const { examId, studentMobile, studentName, answers } = req.body;
    if (!examId || !studentMobile || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid data" });
    }
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const student = await Student.findOne({ mobile: studentMobile });
    if (!student) return res.status(404).json({ error: "Student not registered" });

    let correctCount = 0;
    exam.questions.forEach((q, i) => {
      if (q.correctAnswer.toLowerCase() === answers[i]?.toLowerCase()) {
        correctCount++;
      }
    });
    const wrongCount = exam.totalQuestions - correctCount;

    await new Result({
      studentMobile: student.mobile,
      studentName: studentName || student.name,
      examId,
      examTitle: exam.title,
      score: correctCount,
      total: exam.totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      answers
    }).save();

    res.json({ message: "Exam submitted successfully!" });
  } catch (err) {
    console.error('Submit exam error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/exam/:id/results', async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.id });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Old upload route (can be removed)
app.post('/upload', (req, res) => {
  res.status(410).json({ message: "Local upload disabled. Use Cloudinary." });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Student Exam URL: https://academy-backend-e02j.onrender.com/exams.html`); // Update if needed
});
