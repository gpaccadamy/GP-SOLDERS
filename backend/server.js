const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const app = express();

// CORS
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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Frontend folder
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
app.use('/uploads', express.static('uploads'));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MODELS
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
  questions: [],
  createdAt: { type: Date, default: Date.now }
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String,
  subject: String,
  testNumber: Number,
  totalQuestions: Number,
  questions: [],
  conductedAt: { type: Date, default: Date.now }
}));

const Result = mongoose.model('Result', new mongoose.Schema({
  studentName: String,
  studentMobile: String,
  studentRoll: String,
  examTitle: String,
  examSubject: String,
  examTestNumber: Number,
  correct: Number,
  wrong: Number,
  total: Number,
  answers: [],
  submittedAt: { type: Date, default: Date.now }
}));

const Note = mongoose.model('Note', new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
}));
//--------------------------------------
// STUDENT ROUTES
//--------------------------------------

app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ error: "Invalid credentials" });

    if (student.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });

    res.json({ name: student.name, mobile: student.mobile });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/students', async (req, res) => {
  res.json(await Student.find());
});

app.post('/students', async (req, res) => {
  try {
    let { name, roll, mobile, password } = req.body;

    if (!name || !mobile || !password)
      return res.status(400).json({ error: "Name, mobile & password required" });

    const exists = await Student.findOne({ mobile });
    if (exists) return res.status(409).json({ error: "Mobile already registered" });

    await new Student({ name, roll, mobile, password }).save();
    res.json({ message: "Student added" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/students/:id', async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ message: "Student deleted" });
});


//--------------------------------------
// VIDEO ROUTES (FULL CRUD)
//--------------------------------------

// GET videos
app.get('/videos', async (req, res) => {
  const videos = await Video.find();
  res.json(videos);
});

// CREATE video
app.post('/videos', async (req, res) => {
  try {
    const { subject, class: classNum, videoId, title } = req.body;

    if (!videoId || videoId.length !== 11)
      return res.status(400).json({ error: "Invalid YouTube video ID" });

    let video = await Video.findOne({ subject, class: classNum });

    if (video) {
      video.videoId = videoId;
      video.title = title;
      await video.save();
      return res.json({ message: "Video updated" });
    }

    await new Video({ subject, class: classNum, videoId, title }).save();
    res.json({ message: "Video added" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE video
app.put('/videos/:id', async (req, res) => {
  try {
    const { subject, class: classNum, videoId, title } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    if (subject) video.subject = subject;
    if (classNum) video.class = classNum;
    if (videoId) video.videoId = videoId;
    if (title) video.title = title;

    await video.save();
    res.json({ message: "Video updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE video
app.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    res.json({ message: "Video deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});


//--------------------------------------
// DRAFT EXAM ROUTES
//--------------------------------------

app.get('/drafts', async (req, res) => {
  const drafts = await DraftExam.find().sort({ createdAt: -1 });
  res.json(drafts);
});

app.post('/drafts', async (req, res) => {
  try {
    const { title, subject, testNumber, questions } = req.body;

    if (!questions || questions.length === 0)
      return res.status(400).json({ error: "At least 1 question required" });

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

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
//--------------------------------------
// STUDENT ROUTES
//--------------------------------------

app.post('/student-login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const student = await Student.findOne({ mobile });
    if (!student) return res.status(404).json({ error: "Invalid credentials" });

    if (student.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });

    res.json({ name: student.name, mobile: student.mobile });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/students', async (req, res) => {
  res.json(await Student.find());
});

app.post('/students', async (req, res) => {
  try {
    let { name, roll, mobile, password } = req.body;

    if (!name || !mobile || !password)
      return res.status(400).json({ error: "Name, mobile & password required" });

    const exists = await Student.findOne({ mobile });
    if (exists) return res.status(409).json({ error: "Mobile already registered" });

    await new Student({ name, roll, mobile, password }).save();
    res.json({ message: "Student added" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/students/:id', async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ message: "Student deleted" });
});


//--------------------------------------
// VIDEO ROUTES (FULL CRUD)
//--------------------------------------

// GET videos
app.get('/videos', async (req, res) => {
  const videos = await Video.find();
  res.json(videos);
});

// CREATE video
app.post('/videos', async (req, res) => {
  try {
    const { subject, class: classNum, videoId, title } = req.body;

    if (!videoId || videoId.length !== 11)
      return res.status(400).json({ error: "Invalid YouTube video ID" });

    let video = await Video.findOne({ subject, class: classNum });

    if (video) {
      video.videoId = videoId;
      video.title = title;
      await video.save();
      return res.json({ message: "Video updated" });
    }

    await new Video({ subject, class: classNum, videoId, title }).save();
    res.json({ message: "Video added" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE video
app.put('/videos/:id', async (req, res) => {
  try {
    const { subject, class: classNum, videoId, title } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    if (subject) video.subject = subject;
    if (classNum) video.class = classNum;
    if (videoId) video.videoId = videoId;
    if (title) video.title = title;

    await video.save();
    res.json({ message: "Video updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE video
app.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    res.json({ message: "Video deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});


//--------------------------------------
// DRAFT EXAM ROUTES
//--------------------------------------

app.get('/drafts', async (req, res) => {
  const drafts = await DraftExam.find().sort({ createdAt: -1 });
  res.json(drafts);
});

app.post('/drafts', async (req, res) => {
  try {
    const { title, subject, testNumber, questions } = req.body;

    if (!questions || questions.length === 0)
      return res.status(400).json({ error: "At least 1 question required" });

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

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
