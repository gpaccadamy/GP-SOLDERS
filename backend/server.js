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

// Serve static files
const frontendPath = path.join(__dirname, '../frontend');
console.log('🔍 Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Serve uploads
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static('uploads'));

// ────────────────────────────────────────────────
// MongoDB Connection
// ────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in .env");
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB Failed:", err);
    process.exit(1);
  });

// Cloudinary setup
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

const Note = mongoose.model('Note', new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
}));

const ArmyVideo = mongoose.model('ArmyVideo', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

// ────────────────────────────────────────────────
// ROUTES (NO CHANGES HERE)
// ────────────────────────────────────────────────

// Student Login
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
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Student CRUD
app.get('/students', async (req, res) => res.json(await Student.find()));

app.post('/students', async (req, res) => {
  try {
    let { name, roll, mobile, password } = req.body;
    if (!name || !mobile || !password)
      return res.status(400).json({ error: "Missing fields" });

    const existing = await Student.findOne({ mobile });
    if (existing) return res.status(409).json({ error: "Mobile exists" });

    await new Student({ name, roll, mobile, password }).save();
    res.json({ message: "Student added" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/students/:id', async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Student deleted" });
});

//────────────────────────────────────────────
// PART 1 ends here
//────────────────────────────────────────────
// ────────────────────────────────────────────────
// VIDEO ROUTES (ORIGINAL + NEW UPDATE/DELETE)
// ────────────────────────────────────────────────

// Get all videos
app.get('/videos', async (req, res) => {
  res.json(await Video.find());
});

// Add or update video by subject+class
app.post('/videos', async (req, res) => {
  const { subject, class: classNum, videoId, title } = req.body;

  if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
    return res.status(400).json({ error: "Invalid videoId (must be 11 chars)" });
  }

  if (!subject || !classNum) {
    return res.status(400).json({ error: "Subject and class required" });
  }

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
    console.error("Video Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✔ NEW — Delete a video
app.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    res.json({ message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// ✔ NEW — Update video by ID
app.put('/videos/:id', async (req, res) => {
  try {
    const { subject, class: classNum, videoId, title } = req.body;

    const updated = await Video.findByIdAndUpdate(
      req.params.id,
      { subject, class: classNum, videoId, title },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Video not found" });

    res.json({ message: "Video updated successfully", video: updated });

  } catch (err) {
    res.status(500).json({ error: "Failed to update video" });
  }
});


// ────────────────────────────────────────────────
// DRAFT EXAM ROUTES
// ────────────────────────────────────────────────

app.get('/drafts', async (req, res) => {
  res.json(await DraftExam.find().sort({ createdAt: -1 }));
});

app.post('/drafts', async (req, res) => {
  const { title, subject, testNumber, questions } = req.body;

  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: "At least one question required" });
  }

  let draft = await DraftExam.findOne({ title });

  if (draft) {
    draft.subject = subject;
    draft.testNumber = testNumber;
    draft.questions = questions;
    draft.totalQuestions = questions.length;
  } else {
    draft = new DraftExam({
      title,
      subject,
      testNumber,
      questions,
      totalQuestions: questions.length
    });
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

// Submit exam
app.post('/submit-exam', async (req, res) => {
  const { examId, answers, studentMobile, studentName } = req.body;

  if (!examId || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const exam = await Exam.findById(examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  let correct = 0;
  exam.questions.forEach((q, i) => {
    if (q.correctAnswer.toLowerCase() === answers[i]?.toLowerCase()) {
      correct++;
    }
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

app.get('/results', async (req, res) => {
  res.json(await Result.find().sort({ submittedAt: -1 }));
});

// ────────────────────────────────────────────────
// NOTES ROUTES
// ────────────────────────────────────────────────

app.post('/api/save-note', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  await new Note({ title, content }).save();
  res.json({ success: true, message: "Note saved!" });
});

app.get('/api/notes', async (req, res) => {
  res.json(await Note.find().sort({ createdAt: -1 }));
});

// ────────────────────────────────────────────────
// ARMY VIDEO UPLOAD
// ────────────────────────────────────────────────

app.get('/api/army-videos', async (req, res) => {
  res.json(
    await ArmyVideo.find().sort({ uploadedAt: -1 }).select("title url uploadedAt")
  );
});

app.post('/save-army-video', async (req, res) => {
  const { title, url } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: "Title and URL required" });
  }

  const newVideo = new ArmyVideo({ title, url });
  await newVideo.save();

  res.json({ success: true, message: "Army video saved", video: newVideo });
});

// Disk upload (old feature)
const armyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'army-videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random() * 1e9}${path.extname(file.originalname)}`);
  }
});

const uploadArmyVideo = multer({ storage: armyStorage });

app.post('/upload-army-video', uploadArmyVideo.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const title = req.body.title;
  if (!title) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Title required" });
  }

  const newVideo = new ArmyVideo({
    title,
    url: `/uploads/army-videos/${req.file.filename}`
  });

  await newVideo.save();
  res.json({ success: true, message: "Uploaded", video: newVideo });
});

// ────────────────────────────────────────────────
// CATCH ALL ROUTE
// ────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ────────────────────────────────────────────────
// PORT LISTENER (UNCHANGED)
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

