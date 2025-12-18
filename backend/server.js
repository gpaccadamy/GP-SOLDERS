const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // For environment variables

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads folder (local fallback)
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer for local image upload (fallback)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/ /g, '_'))
});
const upload = multer({ storage });

// ==================== MONGO DB CONNECTION ====================
// Use STANDARD string for Render (fixes ENOTFOUND error)
const MONGO_URI = process.env.MONGO_URI || "mongodb://gp:GP0204@cluster0-shard-00-00.ozw4wgd.mongodb.net:27017,cluster0-shard-00-01.ozw4wgd.mongodb.net:27017,cluster0-shard-00-02.ozw4wgd.mongodb.net:27017/academy?ssl=true&replicaSet=atlas-XXXXXX-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB successfully"))
.catch(err => console.error("❌ MongoDB connection failed:", err));

// ==================== MODELS ====================
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

// ==================== ROUTES ====================

// Students
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/students', async (req, res) => {
  try {
    const { name, roll, mobile, password } = req.body;
    const existing = await Student.findOne({ $or: [{ roll }, { mobile }] });
    if (existing) return res.status(400).json({ error: "Roll or mobile already exists" });
    const student = new Student({ name, roll, mobile, password });
    await student.save();
    res.json({ message: "Student added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Videos
app.get('/videos', async (req, res) => res.json(await Video.find()));

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
      return res.json({ message: "Updated" });
    }
    await new Video({ subject, class: classNum, videoId, title: title || "Lesson" }).save();
    res.json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Drafts
app.get('/drafts', async (req, res) => res.json(await DraftExam.find().sort({ createdAt: -1 })));

app.post('/drafts', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conduct Exam
app.post('/conduct/:draftId', async (req, res) => {
  try {
    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    if (await Exam.findOne({ title: draft.title })) return res.status(400).json({ error: "Already conducted" });
    await new Exam(draft.toObject()).save();
    await DraftExam.findByIdAndDelete(req.params.draftId);
    res.json({ message: "Exam conducted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exams for students
app.get('/exams', async (req, res) => res.json(await Exam.find().sort({ conductedAt: -1 })));

// Image Upload
app.post('/upload', upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'optionsImage', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files;
    res.json({
      questionImage: files.questionImage ? files.questionImage[0].filename : null,
      optionsImage: files.optionsImage ? files.optionsImage[0].filename : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/uploads', express.static('uploads'));

// Start server
const PORT = process.env.PORT || 10000; // Render uses dynamic port
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📂 Uploads folder: ${path.resolve(uploadDir)}`);
});
