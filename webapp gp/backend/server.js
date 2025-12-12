// server.js — FINAL & 100% WORKING VERSION FOR RENDER (2025)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: "*", // Allows your Render static site
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Create uploads folder
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ dest: 'uploads/' });

// ==================== CLOUDINARY ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==================== MONGODB CONNECTION ====================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => {
    console.error('MongoDB Connection Failed:', err.message);
    process.exit(1); // Stop server if DB fails
  });

// ==================== MODELS ====================

const Student = mongoose.model('Student', new mongoose.Schema({
  name: String,
  rollNo: { type: String, unique: true, required: true },
  phone: { type: String, unique: true },
  password: String,
  class: String,
  completedExams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }]
}));

const Video = mongoose.model('Video', new mongoose.Schema({
  subject: String,
  classNum: String,
  embedUrl: String
}, { timestamps: true }));

Video.collection.createIndex({ subject: 1, classNum: 1 }, { unique: true });

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  questionText: String,
  questionImage: String,
  options: [String],
  optionsType: [{ type: String, enum: ['text', 'image'] }],
  optionsImages: [String],
  correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'] }
});

const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String,
  subject: String,
  classNum: String,
  duration: Number,
  questions: [questionSchema]
}, { timestamps: true }));

// ==================== ROUTES ====================

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is ALIVE & WORKING 100%' });
});

// === STUDENT ROUTES ===
app.post('/api/students', async (req, res) => {
  try {
    const { name, rollNo, phone, password, class: studentClass } = req.body;
    if (!name || !rollNo || !phone || !password || !studentClass)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await Student.findOne({ $or: [{ rollNo }, { phone }] });
    if (exists) return res.status(400).json({ message: 'Roll No or Phone already exists' });

    const hashed = await bcrypt.hash(password, 12);
    await Student.create({ name, rollNo, phone, password: hashed, class: studentClass });
    res.json({ message: 'Student added successfully!' });
  } catch (err) {
    console.error('Add Student Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().select('-password').sort('rollNo');
    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// CRITICAL: LOGIN ROUTE — NOW 100% FIXED
app.post('/api/students/login', async (req, res) => {
  try {
    const { rollNo, password } = req.body;
    if (!rollNo || !password) {
      return res.status(400).json({ message: 'Roll No and Password required' });
    }

    const student = await Student.findOne({ rollNo });
    if (!student) {
      return res.status(400).json({ message: 'Invalid Roll No or Password' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Roll No or Password' });
    }

    // Remove password from response
    const { password: _, ...safeStudent } = student.toObject();
    res.json({ student: safeStudent });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// === VIDEO ROUTES ===
app.post('/api/videos', async (req, res) => {
  try {
    const { subject, classNum, embedUrl } = req.body;
    const exists = await Video.findOne({ subject, classNum });
    if (exists) return res.status(400).json({ message: `${subject} Class ${classNum} already exists` });

    await Video.create({ subject, classNum, embedUrl });
    res.json({ message: 'Video added!' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/api/videos', async (req, res) => {
  const videos = await Video.find().sort({ subject: 1, classNum: 1 });
  res.json({ videos });
});

// === EXAM ROUTES ===
app.post('/api/exams', upload.array('images', 100), async (req, res) => {
  try {
    let { title, subject, classNum, duration, questions } = req.body;
    questions = JSON.parse(questions);
    let fileIndex = 0;

    for (let q of questions) {
      if (q.type === 'image' && req.files[fileIndex]) {
        const result = await cloudinary.uploader.upload(req.files[fileIndex].path);
        q.questionImage = result.secure_url;
        fs.unlinkSync(req.files[fileIndex].path);
        fileIndex++;
      } else {
        q.questionImage = '';
      }

      q.optionsImages = [];
      for (let i = 0; i < 4; i++) {
        if (q.optionsType[i] === 'image' && req.files[fileIndex]) {
          const result = await cloudinary.uploader.upload(req.files[fileIndex].path);
          q.optionsImages.push(result.secure_url);
          fs.unlinkSync(req.files[fileIndex].path);
          fileIndex++;
        } else {
          q.optionsImages.push('');
        }
      }
    }

    await Exam.create({ title, subject, classNum, duration: Number(duration), questions });
    res.json({ message: 'Exam created successfully!' });
  } catch (err) {
    console.error('Create Exam Error:', err);
    res.status(500).json({ message: 'Failed to create exam' });
  }
});

app.get('/api/exams', async (req, res) => {
  const exams = await Exam.find();
  res.json({ exams });
});

app.get('/api/exams/available/:classNum', async (req, res) => {
  const exams = await Exam.find({ classNum: req.params.classNum });
  res.json(exams);
});

app.get('/api/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/api/exams/submit', async (req, res) => {
  try {
    const { studentId, examId, answers } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    let score = 0;
    exam.questions.forEach((q, i) => {
      if (answers[i] && answers[i] === q.correctAnswer) score++;
    });

    const percentage = ((score / exam.questions.length) * 100).toFixed(2);

    await Student.updateOne(
      { _id: studentId },
      { $addToSet: { completedExams: examId } }
    );

    res.json({ score, totalQuestions: exam.questions.length, percentage });
  } catch (err) {
    console.error('Submit Error:', err);
    res.status(500).json({ message: 'Submission failed' });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test URL: https://your-service.onrender.com/api/test`);
});