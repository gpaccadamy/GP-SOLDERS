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
// IMPROVED CORS CONFIGURATION (this fixes your CORS error)
// Placed early in the middleware stack
// ────────────────────────────────────────────────
const allowedOrigins = [
  'https://academy-student-portal.onrender.com',   // Your actual frontend URL on Render
  'http://localhost:3000',                         // For local development/testing
  // You can add more domains later if needed
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, Postman) or matching allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Explicitly allow these methods
  allowedHeaders: ['Content-Type', 'Authorization'],     // Allow JSON content type + future auth headers
  credentials: false,                                    // Change to true only if using cookies/sessions later
  optionsSuccessStatus: 200                              // Some older browsers require 200 for OPTIONS
}));

// Standard JSON parsing middleware
app.use(express.json());

// Serve static files from the sibling 'frontend' folder
const frontendPath = path.join(__dirname, '../frontend');
console.log('🔍 Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Serve uploaded files
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static('uploads'));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in .env file");
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ────────────────────────────────────────────────
// MODELS
// ────────────────────────────────────────────────
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

const ArmyVideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });
const ArmyVideo = mongoose.model('ArmyVideo', ArmyVideoSchema);

// ────────────────────────────────────────────────
// ROUTES
// ────────────────────────────────────────────────

// Student login
app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: "Mobile and password required" });
    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ error: "Invalid credentials" });
    if (student.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ name: student.name, mobile: student.mobile });
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

// ────────────────────────────────────────────────
// UPDATED /videos route - now expects videoId (11 chars) directly
// Matches what frontend sends after extracting ID from URL
// ────────────────────────────────────────────────
app.get('/videos', async (req, res) => res.json(await Video.find()));

app.post('/videos', async (req, res) => {
  const { subject, class: classNum, videoId, title } = req.body;

  // Basic validation for videoId
  if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
    return res.status(400).json({ error: "Invalid videoId - must be exactly 11 characters" });
  }

  if (!subject || !classNum) {
    return res.status(400).json({ error: "Subject and class are required" });
  }

  try {
    let video = await Video.findOne({ subject, class: classNum });

    if (video) {
      // Update existing video
      video.videoId = videoId;
      video.title = title || "Lesson";
      await video.save();
      return res.json({ message: "Video updated" });
    }

    // Create new video
    await new Video({
      subject,
      class: classNum,
      videoId,
      title: title || "Lesson"
    }).save();

    res.json({ message: "Video saved" });
  } catch (err) {
    console.error("Error saving video:", err);
    res.status(500).json({ error: "Server error while saving video" });
  }
});

// Draft exams
app.get('/drafts', async (req, res) => res.json(await DraftExam.find().sort({ createdAt: -1 })));

app.post('/drafts', async (req, res) => {
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

app.post('/conduct/:draftId', async (req, res) => {
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

app.post('/submit-exam', async (req, res) => {
  const { examId, answers, studentMobile, studentName } = req.body;
  if (!examId || !Array.isArray(answers)) return res.status(400).json({ error: "Invalid data" });
  const exam = await Exam.findById(examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  let correctCount = 0;
  exam.questions.forEach((q, i) => {
    if (q.correctAnswer.toLowerCase() === answers[i]?.toLowerCase()) correctCount++;
  });
  const wrongCount = exam.totalQuestions - correctCount;
  await new Result({
    studentMobile,
    studentName,
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

app.get('/results', async (req, res) => {
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

// Army video routes
app.get('/api/army-videos', async (req, res) => {
  try {
    const videos = await ArmyVideo.find()
      .sort({ uploadedAt: -1 })
      .select('title url uploadedAt');
    res.json(videos);
  } catch (err) {
    console.error('Error fetching army videos:', err);
    res.status(500).json({ error: 'Failed to load videos' });
  }
});

app.post('/save-army-video', async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and Cloudinary URL required' });
    }
    const newVideo = new ArmyVideo({
      title: title.trim(),
      url
    });
    await newVideo.save();
    res.json({
      success: true,
      message: 'Army video metadata saved',
      video: newVideo
    });
  } catch (err) {
    console.error('Save army video error:', err);
    res.status(500).json({ error: 'Failed to save video metadata' });
  }
});

// Old disk storage route for army videos (kept as is)
const armyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const armyDir = path.join(__dirname, 'uploads', 'army-videos');
    if (!fs.existsSync(armyDir)) {
      fs.mkdirSync(armyDir, { recursive: true });
    }
    cb(null, armyDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadArmyVideo = multer({
  storage: armyStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files allowed'));
    }
  }
});

app.post('/upload-army-video', uploadArmyVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    const title = req.body.title?.trim();
    if (!title) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Video title is required' });
    }
    const videoUrl = `/uploads/army-videos/${req.file.filename}`;
    const newVideo = new ArmyVideo({
      title,
      url: videoUrl
    });
    await newVideo.save();
    res.json({
      success: true,
      message: 'Army training video uploaded successfully',
      video: {
        title: newVideo.title,
        url: videoUrl,
        uploadedAt: newVideo.uploadedAt
      }
    });
  } catch (err) {
    console.error('Army video upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Catch-all route for SPA (serves index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎖️ GP Soldiers Academy - Army Video Upload Feature Active!`);
});
