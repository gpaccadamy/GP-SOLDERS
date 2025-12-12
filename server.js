// server.js – FULLY WORKING FOR RENDER.COM (2025)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: "*", // Allow all (Render static sites + admin + student portal)
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Create uploads folder if not exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({ dest: 'uploads/' });

// ==================== CLOUDINARY CONFIG ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==================== MONGODB CONNECTION ====================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Error:', err));

// ==================== SCHEMAS & MODELS ====================

// Student Schema
const studentSchema = new mongoose.Schema({
  name: String,
  rollNo: { type: String, unique: true, required: true },
  phone: { type: String, unique: true },
  password: String,
  class: String,
  completedExams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }]
});
const Student = mongoose.model('Student', studentSchema);

// Video Schema
const videoSchema = new mongoose.Schema({
  subject: String,
  classNum: String,
  embedUrl: String
}, { timestamps: true });
videoSchema.index({ subject: 1, classNum: 1 }, { unique: true });
const Video = mongoose.model('Video', videoSchema);

// Question Schema
const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  questionText: String,
  questionImage: String,
  options: [String],
  optionsType: [{ type: String, enum: ['text', 'image'] }],
  optionsImages: [String],
  correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'] }
});

// Exam Schema
const examSchema = new mongoose.Schema({
  title: String,
  subject: String,
  classNum: String,
  duration: Number,
  questions: [questionSchema]
}, { timestamps: true });
const Exam = mongoose.model('Exam', examSchema);

// ==================== ROUTES ====================

// Test Route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is LIVE on Render!' });
});

// === STUDENTS ===
app.post('/api/students', async (req, res) => {
  try {
    const { name, rollNo, phone, password, class: studentClass } = req.body;
    const exists = await Student.findOne({ $or: [{ rollNo }, { phone }] });
    if (exists) return res.status(400).json({ message: 'Roll No or Phone already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const student = await Student.create({
      name, rollNo, phone, password: hashed, class: studentClass
    });
    res.json({ message: 'Student added successfully!' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/students', async (req, res) => {
  const students = await Student.find().select('-password').sort('rollNo');
  res.json({ students });
});

// Student Login
app.post('/api/students/login', async (req, res) => {
  try {
    const { rollNo, password } = req.body;
    const student = await Student.findOne({ rollNo });
    if (!student || !await bcrypt.compare(password, student.password)) {
      return res.status(400).json({ message: 'Invalid Roll No or Password' });
    }
    const { password: _, ...safeStudent } = student._doc;
    res.json({ student: { ...safeStudent, completedExams: student.completedExams || [] } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// === VIDEOS ===
app.post('/api/videos', async (req, res) => {
  try {
    const { subject, classNum, embedUrl } = req.body;
    const exists = await Video.findOne({ subject, classNum });
    if (exists) return res.status(400).json({ message: `${subject} Class ${classNum} already exists` });

    await Video.create({ subject, classNum, embedUrl });
    res.json({ message: 'Video added successfully!' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get('/api/videos', async (req, res) => {
  const videos = await Video.find().sort({ subject: 1, classNum: 1 });
  res.json({ videos });
});

// === EXAMS ===

// Create Exam (with image upload)
app.post('/api/exams', upload.array('images', 100), async (req, res) => {
  try {
    let { title, subject, classNum, duration, questions } = req.body;
    questions = JSON.parse(questions);

    let fileIndex = 0;

    for (let q of questions) {
      // Question Image
      if (q.type === 'image' && req.files[fileIndex]) {
        const result = await cloudinary.uploader.upload(req.files[fileIndex].path);
        q.questionImage = result.secure_url;
        fs.unlinkSync(req.files[fileIndex].path);
        fileIndex++;
      } else {
        q.questionImage = '';
      }

      // Option Images
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

    await Exam.create({
      title,
      subject,
      classNum,
      duration: Number(duration),
      questions
    });

    res.json({ message: 'Exam created successfully!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// Get All Exams (Admin)
app.get('/api/exams', async (req, res) => {
  const exams = await Exam.find();
  res.json({ exams });
});

// Get Exams by Class (Student)
app.get('/api/exams/available/:classNum', async (req, res) => {
  const exams = await Exam.find({ classNum: req.params.classNum });
  res.json(exams);
});

// Submit Exam
app.post('/api/exams/submit', async (req, res) => {
  try {
    const { studentId, examId, answers } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    let score = 0;
    exam.questions.forEach((q, i) => {
      if (answers[i] && answers[i] === q.correctAnswer) score++;
    });

    const percentage = (score / exam.questions.length) * 100;

    // Mark as completed
    await Student.updateOne(
      { _id: studentId },
      { $addToSet: { completedExams: examId } }
    );

    res.json({
      score,
      totalQuestions: exam.questions.length,
      percentage: percentage.toFixed(2)
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ==================== SERVE STATIC FILES (Optional for Render) ====================
// Uncomment if you want to serve student portal from backend
/*
app.use(express.Static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
*/

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: https://academy-student-portal.onrender.com/api`);
  console.log(`Admin Panel: https://academy-student-portal.onrender.com/admin.html`);
  console.log(`Student Exam: https://academy-student-portal.onrender.com/exams.html`);
});
