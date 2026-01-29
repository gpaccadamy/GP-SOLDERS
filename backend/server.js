const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const app = express();

// ────────────────────────────────────────────────
// CORS CONFIG (SAFE + BEST OPTION)
// ────────────────────────────────────────────────
const allowedOrigins = [
  'https://academy-student-portal.onrender.com',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// ────────────────────────────────────────────────
// STATIC FRONTEND
// ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');
console.log("Serving frontend from:", frontendPath);
app.use(express.static(frontendPath));

// UPLOADS DIRECTORY
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static('uploads'));

// ────────────────────────────────────────────────
// MONGODB CONNECTION
// ────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing in .env");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

// CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ────────────────────────────────────────────────
// MODELS
// ────────────────────────────────────────────────
const Student = mongoose.model('Student', new mongoose.Schema({
  name: String,
  roll: String,
  mobile: { type: String, unique: true },
  password: String
}));

const Video = mongoose.model('Video', new mongoose.Schema({
  subject: String,
  class: Number,
  videoId: String,
  title: String
}));

const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
  title: String,
  subject: String,
  testNumber: Number,
  totalQuestions: Number,
  questions: [{
    imageUrl: String,
    correctAnswer: String
  }],
  createdAt: { type: Date, default: Date.now }
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String,
  subject: String,
  classNum: Number,
  testNumber: Number,
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
  examId: mongoose.Schema.Types.ObjectId,
  examTitle: String,
  examSubject: String,
  examTestNumber: Number,
  correct: Number,
  wrong: Number,
  score: Number,
  total: Number,
  answers: [String],
  submittedAt: { type: Date, default: Date.now }
}));

const Note = mongoose.model('Note', new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
}));

const ArmyVideo = mongoose.model('ArmyVideo', new mongoose.Schema({
  title: String,
  url: String,
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

// ────────────────────────────────────────────────
// STUDENT LOGIN & MANAGEMENT
// ────────────────────────────────────────────────
app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password)
      return res.status(400).json({ error: "Mobile & password required" });
    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ error: "Invalid credentials" });
    if (student.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });
    res.json({ name: student.name, mobile: student.mobile });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/students', async (req, res) => {
  res.json(await Student.find());
});

app.post('/students', async (req, res) => {
  try {
    const { name, roll, mobile, password } = req.body;
    if (!name || !mobile || !password)
      return res.status(400).json({ error: "Missing fields" });
    const exists = await Student.findOne({ mobile });
    if (exists) return res.status(409).json({ error: "Mobile already registered" });
    await new Student({ name, roll, mobile, password }).save();
    res.json({ message: "Student added" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/students/:id', async (req, res) => {
  const deleted = await Student.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Student not found" });
  res.json({ message: "Deleted" });
});

// ────────────────────────────────────────────────
// VIDEO ROUTES
// ────────────────────────────────────────────────
app.get('/videos', async (req, res) => {
  res.json(await Video.find());
});

app.post('/videos', async (req, res) => {
  const { subject, class: classNum, videoId, title } = req.body;
  if (!videoId || videoId.length !== 11)
    return res.status(400).json({ error: "Invalid videoId (must be 11 chars)" });
  if (!subject || !classNum)
    return res.status(400).json({ error: "Subject and class required" });
  try {
    let video = await Video.findOne({ subject, class: classNum });
    if (video) {
      video.videoId = videoId;
      video.title = title || "Lesson";
      await video.save();
      return res.json({ message: "Video updated" });
    }
    await new Video({
      subject,
      class: classNum,
      videoId,
      title: title || "Lesson"
    }).save();
    res.json({ message: "Video saved" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json({ message: "Video deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.put('/videos/:id', async (req, res) => {
  try {
    const updated = await Video.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Video not found" });
    res.json({ message: "Video updated", video: updated });
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

// ────────────────────────────────────────────────
// DRAFT EXAM ROUTES (FIXED: separate create & update)
// ────────────────────────────────────────────────
app.get('/drafts', async (req, res) => {
  res.json(await DraftExam.find().sort({ createdAt: -1 }));
});

// CREATE new draft
app.post('/drafts', async (req, res) => {
  const { title, subject, testNumber, questions } = req.body;
  if (!questions || questions.length === 0)
    return res.status(400).json({ error: "At least one question required" });

  try {
    const draft = new DraftExam({
      title,
      subject,
      testNumber,
      questions,
      totalQuestions: questions.length
    });
    await draft.save();
    res.json({ message: "Draft created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create draft" });
  }
});

// UPDATE existing draft by ID
app.put('/drafts/:id', async (req, res) => {
  const { title, subject, testNumber, questions } = req.body;
  if (!questions || questions.length === 0)
    return res.status(400).json({ error: "At least one question required" });

  try {
    const draft = await DraftExam.findByIdAndUpdate(
      req.params.id,
      {
        title,
        subject,
        testNumber,
        questions,
        totalQuestions: questions.length
      },
      { new: true, runValidators: true }
    );

    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json({ message: "Draft updated", draft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

// Conduct exam (delete draft after moving to Exam)
app.post('/conduct/:draftId', async (req, res) => {
  try {
    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    const exists = await Exam.findOne({ title: draft.title });
    if (exists) return res.status(400).json({ error: "Already conducted" });

    const exam = new Exam({
      title: draft.title,
      subject: draft.subject,
      classNum: draft.classNum || null, // if you add class later
      testNumber: draft.testNumber,
      totalQuestions: draft.totalQuestions,
      questions: draft.questions
    });

    await exam.save();
    await DraftExam.findByIdAndDelete(req.params.draftId);

    res.json({ message: "Exam conducted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Conduct failed" });
  }
});

// ────────────────────────────────────────────────
// ACTIVE / EXAM ROUTES
// ────────────────────────────────────────────────
app.get('/active-exams', async (req, res) => {
  res.json(await Exam.find().sort({ conductedAt: -1 }));
});

app.get('/exam/:id', async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  res.json(exam);
});

app.post('/submit-exam', async (req, res) => {
  const { examId, answers, studentMobile, studentName } = req.body;
  const exam = await Exam.findById(examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  let correct = 0;
  exam.questions.forEach((q, i) => {
    if (q.correctAnswer.toLowerCase() === answers[i]?.toLowerCase()) correct++;
  });

  const wrong = exam.totalQuestions - correct;

  await new Result({
    studentMobile,
    studentName,
    examId,
    examTitle: exam.title,
    examSubject: exam.subject,
    examTestNumber: exam.testNumber,
    correct,
    wrong,
    score: correct,
    total: exam.totalQuestions,
    answers
  }).save();

  res.json({ message: "Exam submitted successfully!" });
});

// ────────────────────────────────────────────────
// NOTES ROUTES
// ────────────────────────────────────────────────
app.post('/api/save-note', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ success: false, message: "Missing fields" });
  await new Note({ title, content }).save();
  res.json({ success: true, message: "Note saved!" });
});

app.get('/api/notes', async (req, res) => {
  res.json(await Note.find().sort({ createdAt: -1 }));
});

// ────────────────────────────────────────────────
// ARMY VIDEO ROUTES
// ────────────────────────────────────────────────
app.get('/api/army-videos', async (req, res) => {
  res.json(await ArmyVideo.find().sort({ uploadedAt: -1 }));
});

app.post('/save-army-video', async (req, res) => {
  const { title, url } = req.body;
  if (!title || !url)
    return res.status(400).json({ error: "Missing data" });
  const video = new ArmyVideo({ title, url });
  await video.save();
  res.json({ success: true, message: "Army video saved" });
});

// Local disk upload for army videos
const armyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads/army-videos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random() * 100000}${path.extname(file.originalname)}`);
  }
});

const uploadArmyVideo = multer({ storage: armyStorage });

app.post('/upload-army-video', uploadArmyVideo.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video file" });
  const title = req.body.title;
  if (!title) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Title missing" });
  }
  const video = new ArmyVideo({
    title,
    url: `/uploads/army-videos/${req.file.filename}`
  });
  await video.save();
  res.json({ success: true, message: "Uploaded", video });
});

// ────────────────────────────────────────────────
// CATCH-ALL ROUTE (SPA support)
// ────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ────────────────────────────────────────────────
// SERVER START
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
