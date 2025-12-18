const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Allow frontend from different domain
app.use(cors());
app.use(express.json());

// Create uploads folder
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/ /g, '_'))
});
const upload = multer({ storage });

// MongoDB Connection (from Render environment variable)
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in environment variables");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// Models
const Student = mongoose.model('Student', new mongoose.Schema({
  name: String,
  roll: String,
  mobile: String,
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
  class: Number,
  totalQuestions: { type: Number, default: 0 },
  questions: [{
    questionImage: String,
    optionsImage: String,
    correctAnswer: String
  }],
  createdAt: { type: Date, default: Date.now }
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String,
  subject: String,
  class: Number,
  totalQuestions: Number,
  questions: [{
    questionImage: String,
    optionsImage: String,
    correctAnswer: String
  }],
  conductedAt: { type: Date, default: Date.now }
}));

// Routes
app.get('/students', async (req, res) => res.json(await Student.find()));

app.post('/students', async (req, res) => {
  const { name, roll, mobile, password } = req.body;
  if (await Student.findOne({ $or: [{ roll }, { mobile }] })) return res.status(400).json({ error: "Already exists" });
  await new Student({ name, roll, mobile, password }).save();
  res.json({ message: "Student added" });
});

app.delete('/students/:id', async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.get('/videos', async (req, res) => res.json(await Video.find()));

app.post('/videos', async (req, res) => {
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
});

app.get('/drafts', async (req, res) => res.json(await DraftExam.find().sort({ createdAt: -1 })));

app.post('/drafts', async (req, res) => {
  const { title, subject, classNum, questions } = req.body;
  let draft = await DraftExam.findOne({ title });
  if (draft) {
    draft.subject = subject;
    draft.class = classNum;
    draft.questions = questions;
    draft.totalQuestions = questions.length;
  } else {
    draft = new DraftExam({ title, subject, class: classNum, questions, totalQuestions: questions.length });
  }
  await draft.save();
  res.json({ message: "Draft saved" });
});

app.post('/conduct/:draftId', async (req, res) => {
  const draft = await DraftExam.findById(req.params.draftId);
  if (!draft) return res.status(404).json({ error: "Draft not found" });
  if (await Exam.findOne({ title: draft.title })) return res.status(400).json({ error: "Already conducted" });
  await new Exam(draft.toObject()).save();
  await DraftExam.findByIdAndDelete(req.params.draftId);
  res.json({ message: "Exam conducted!" });
});

app.get('/exams', async (req, res) => res.json(await Exam.find().sort({ conductedAt: -1 })));

app.post('/upload', upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'optionsImage', maxCount: 1 }
]), (req, res) => {
  const files = req.files;
  res.json({
    questionImage: files.questionImage ? files.questionImage[0].filename : null,
    optionsImage: files.optionsImage ? files.optionsImage[0].filename : null
  });
});

app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend live at https://academy-backend-e02j.onrender.com`);
});
