const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads folder if not exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/ /g, '_'));
  }
});
const upload = multer({ storage });

// === CHANGE THIS TO YOUR MONGODB ATLAS CONNECTION STRING ===
const MONGO_URI = "mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxxxx.mongodb.net/eduapp?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ==================== MODELS ====================

// Student Model
const Student = mongoose.model('Student', new mongoose.Schema({
  name: String,
  roll: String,
  mobile: String,
  password: String
}));

// Video Lesson Model
const Video = mongoose.model('Video', new mongoose.Schema({
  subject: String,
  class: Number,
  videoId: String,
  title: String
}));

// Draft Exam Model
const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
  title: String,
  subject: String,
  class: Number,
  totalQuestions: { type: Number, default: 0 },
  questions: [{
    questionImage: String,
    optionsImage: String,
    correctAnswer: String  // "a", "b", "c", "d"
  }],
  createdAt: { type: Date, default: Date.now }
}));

// Final Conducted Exam Model
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

// --- Students ---
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
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Videos ---
app.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/videos', async (req, res) => {
  try {
    const { subject, classNum, youtubeUrl, title } = req.body;

    // Extract YouTube ID
    const match = youtubeUrl.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11})/);
    if (!match) return res.status(400).json({ error: "Invalid YouTube URL" });
    const videoId = match[1];

    const existing = await Video.findOne({ subject, class: classNum });
    if (existing) {
      existing.videoId = videoId;
      existing.title = title || "Lesson Video";
      await existing.save();
      return res.json({ message: "Video updated" });
    }

    const video = new Video({ subject, class: classNum, videoId, title: title || "Lesson Video" });
    await video.save();
    res.json({ message: "Video saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Draft Exams ---
app.get('/drafts', async (req, res) => {
  try {
    const drafts = await DraftExam.find().sort({ createdAt: -1 });
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/drafts', async (req, res) => {
  try {
    const { title, subject, classNum, questions } = req.body;
    if (!title || !questions) return res.status(400).json({ error: "Missing data" });

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
    res.json({ message: "Draft saved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Conduct Exam (Move draft to final exams) ---
app.post('/conduct/:draftId', async (req, res) => {
  try {
    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    const alreadyConducted = await Exam.findOne({ title: draft.title });
    if (alreadyConducted) return res.status(400).json({ error: "Exam already conducted" });

    const exam = new Exam({
      title: draft.title,
      subject: draft.subject,
      class: draft.class,
      totalQuestions: draft.totalQuestions,
      questions: draft.questions
    });
    await exam.save();
    await DraftExam.findByIdAndDelete(req.params.draftId);

    res.json({ message: "Exam conducted and published!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get Final Exams (for students) ---
app.get('/exams', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ conductedAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Image Upload ---
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

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📂 Uploads folder: ${path.resolve(uploadDir)}`);
});
