const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static('uploads'));

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

const JWT_SECRET = process.env.JWT_SECRET || 'gp-soldiers-jwt-secret-2025';

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roll: { type: String },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true }
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
  testNumber: { type: Number, required: true },
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
  testNumber: { type: Number, required: true },
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
  examSubject: String,
  examTestNumber: Number,
  score: Number,
  total: Number,
  correct: Number,
  wrong: Number,
  answers: [String],
  submittedAt: { type: Date, default: Date.now }
}));

const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', NoteSchema);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: "Mobile and password required" });
    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ error: "Invalid credentials" });
    if (student.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: student._id, name: student.name, mobile: student.mobile },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, name: student.name, mobile: student.mobile });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

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

app.get('/drafts', authenticateToken, async (req, res) => res.json(await DraftExam.find().sort({ createdAt: -1 })));

app.post('/drafts', authenticateToken, async (req, res) => {
  const { title, subject, testNumber, questions } = req.body;
  if (!questions || questions.length === 0) return res.status(400).json({ error: "At least one question required" });
  let draft = await DraftExam.findOne({ title });
  if (draft) {
    draft.subject = subject;
    draft.testNumber = testNumber;
    draft.questions = questions;
    draft.totalQuestions = questions.length;
  } else {
    draft = new DraftExam({ title, subject, testNumber, questions, totalQuestions: questions.length });
  }
  await draft.save();
  res.json({ message: "Draft saved" });
});

app.post('/conduct/:draftId', authenticateToken, async (req, res) => {
  const draft = await DraftExam.findById(req.params.draftId);
  if (!draft) return res.status(404).json({ error: "Draft not found" });
  const existing = await Exam.findOne({ title: draft.title });
  if (existing) return res.status(400).json({ error: "Exam already conducted" });
  const exam = new Exam({
    title: draft.title,
    subject: draft.subject,
    classNum: draft.classNum,
    testNumber: draft.testNumber,
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

app.post('/submit-exam', authenticateToken, async (req, res) => {
  const { examId, answers } = req.body;
  if (!examId || !Array.isArray(answers)) return res.status(400).json({ error: "Invalid data" });
  const exam = await Exam.findById(examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  let correctCount = 0;
  exam.questions.forEach((q, i) => {
    if (q.correctAnswer.toLowerCase() === answers[i]?.toLowerCase()) correctCount++;
  });
  const wrongCount = exam.totalQuestions - correctCount;
  await new Result({
    studentMobile: req.user.mobile,
    studentName: req.user.name,
    studentRoll: '',
    examId,
    examTitle: exam.title,
    examSubject: exam.subject,
    examTestNumber: exam.testNumber,
    score: correctCount,
    total: exam.totalQuestions,
    correct: correctCount,
    wrong: wrongCount,
    answers
  }).save();
  res.json({ message: "Exam submitted successfully!" });
});

app.get('/results', authenticateToken, async (req, res) => {
  try {
    const results = await Result.find().sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/api/save-note', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content required' });
    const newNote = new Note({ title: title.trim(), content: content.trim() });
    await newNote.save();
    res.json({ success: true, message: 'Note saved!' });
  } catch (error) {
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
