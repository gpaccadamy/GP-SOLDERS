// server.js - Complete with Notes Feature (All Original Code + New Additions)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Local uploads folder (optional)
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

// MODELS
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roll: { type: String },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true } // Plain text (as original)
});
const Student = mongoose.model('Student', StudentSchema);

const Video = mongoose.model('Video', new mongoose.Schema({
  subject: String,
  class: Number,
  videoId: String,
  title: String
}));

const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
  title: String,
  subject: String,
  classNum: Number,
  totalQuestions: { type: Number, default: 0 },
  questions: [{
    imageUrl: { type: String, required: true },
    correctAnswer: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
}));

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

const Result = mongoose.model('Result', new mongoose.Schema({
  studentMobile: String,
  studentName: String,
  studentRoll: String,
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  examTitle: String,
  score: Number,
  total: Number,
  correct: Number,
  wrong: Number,
  answers: [String],
  submittedAt: { type: Date, default: Date.now }
}));

// NEW: Note Model
const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', NoteSchema);

// ROUTES (All Original Routes Preserved)

// Student Login
app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: "Mobile and password required" });
    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ error: "Student not found" });
    if (student.password !== password) return res.status(401).json({ error: "Invalid password" });
    res.json({ name: student.name, mobile: student.mobile });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Students CRUD
app.get('/students', async (req, res) => res.json(await Student.find()));

app.post('/students', async (req, res) => {
  try {
    let { name, roll, mobile, password } = req.body;
    name = name?.trim();
    mobile = mobile?.trim();
    roll = roll?.trim() || null;
    password = password?.trim();
    if (!name || !mobile || !password) return res.status(400).json({ error: "Name, mobile, password required" });
    const existing = await Student.findOne({ mobile });
    if (existing) return res.status(409).json({ error: "Mobile already registered" });
    const student = new Student({ name, roll, mobile, password });
    await student.save();
    res.json({ message: "Student added" });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Mobile already registered" });
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/students/:id', async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ message: "Student deleted" });
});

// Videos
app.get('/videos', async (req, res) => res.json(await Video.find()));

app.post('/videos', async (req, res) => {
  const { subject, classNum, youtubeUrl, title } = req.body;
  const match = youtubeUrl.match(/(?:v=|\/embed\/|youtu\.be\/|watch\?v=)([^#\&\?]{11})/);
  if (!match) return res.status(400).json({ error: "Invalid YouTube URL" });
  const videoId = match[1];
  let video = await Video.findOne({ subject, class: classNum });
  if (video) {
    video.videoId = videoId;
    video.title = title || "Lesson";
    await video.save();
    return res.json({ message: "Video updated" });
  }
  await new Video({ subject, class: classNum, videoId, title: title || "Lesson" }).save();
  res.json({ message: "Video saved" });
});

app.get('/drafts', async (req, res) => res.json(await DraftExam.find().sort({ createdAt: -1 })));

app.post('/drafts', async (req, res) => {
  const { title, subject, classNum, questions } = req.body;
  if (!questions || questions.length === 0) return res.status(400).json({ error: "At least one question required" });
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
  res.json({ message: "Draft saved" });
});

app.post('/conduct/:draftId', async (req, res) => {
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
});

app.get('/active-exams', async (req, res) => res.json(await Exam.find().sort({ conductedAt: -1 })));

app.get('/exam/:id', async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  res.json(exam);
});

app.post('/submit-exam', async (req, res) => {
  const { examId, studentMobile, studentName, answers } = req.body;
  if (!examId || !studentMobile || !Array.isArray(answers)) return res.status(400).json({ error: "Invalid data" });
  const exam = await Exam.findById(examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  const student = await Student.findOne({ mobile: studentMobile });
  if (!student) return res.status(404).json({ error: "Student not registered" });
  let correctCount = 0;
  exam.questions.forEach((q, i) => {
    if (q.correctAnswer.toLowerCase() === answers[i]?.toLowerCase()) correctCount++;
  });
  const wrongCount = exam.totalQuestions - correctCount;
  await new Result({
    studentMobile: student.mobile,
    studentName: studentName || student.name,
    studentRoll: student.roll || '',
    examId,
    examTitle: exam.title,
    score: correctCount,
    total: exam.totalQuestions,
    correct: correctCount,
    wrong: wrongCount,
    answers
  }).save();
  res.json({ message: "Exam submitted successfully!" });
});

app.get('/exam/:id/results', async (req, res) => {
  res.json(await Result.find({ examId: req.params.id }));
});

app.get('/results', async (req, res) => {
  try {
    const results = await Result.find().sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// NEW: Notes Routes
app.post('/api/save-note', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    const newNote = new Note({ title: title.trim(), content: content.trim() });
    await newNote.save();
    res.json({ success: true, message: 'Note saved successfully!' });
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ success: false, message: 'Failed to save note' });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
