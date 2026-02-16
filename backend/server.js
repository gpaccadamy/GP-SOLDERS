const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_2026';

// ────────────────────────────────────────────────
// CORS CONFIG
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' })); // Higher limit for bulk text paste

// ────────────────────────────────────────────────
// STATIC FRONTEND + UPLOADS
// ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static('uploads'));

// ────────────────────────────────────────────────
// MONGODB
// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected with Bulk Logic"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

// ────────────────────────────────────────────────
// MODELS
// ────────────────────────────────────────────────
const Student = mongoose.model('Student', new mongoose.Schema({
    name: String, roll: String, mobile: { type: String, unique: true },
    password: { type: String, required: true }
}));

const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
    title: String, subject: String, testNumber: Number, totalQuestions: Number,
    questions: [{ imageUrl: String, questionText: String, options: [String], correctAnswer: String }],
    createdAt: { type: Date, default: Date.now }
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
    title: String, subject: String, classNum: Number, testNumber: Number, totalQuestions: Number,
    questions: [{ imageUrl: String, questionText: String, options: [String], correctAnswer: String }],
    conductedAt: { type: Date, default: Date.now }
}));

const Result = mongoose.model('Result', new mongoose.Schema({
    studentMobile: String, studentName: String, examId: mongoose.Schema.Types.ObjectId,
    examTitle: String, examSubject: String, examTestNumber: Number,
    correct: Number, wrong: Number, score: Number, total: Number,
    answers: [String], submittedAt: { type: Date, default: Date.now }
}));

const PdfQuestionDraft = mongoose.model('PdfQuestionDraft', new mongoose.Schema({
    title: String, subject: String, testNumber: Number,
    questions: [{ questionText: String, options: [String], correctAnswer: { type: String, default: null } }],
    createdAt: { type: Date, default: Date.now }
}));

// ────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ────────────────────────────────────────────────
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Access Denied" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch { res.status(401).json({ error: "Session Expired" }); }
};

// ────────────────────────────────────────────────
// NEW: BULK SAVE ROUTE (FOR COPY-PASTE)
// ────────────────────────────────────────────────
app.post('/api/save-bulk-exam', async (req, res) => {
    try {
        const { title, subject, testNumber, questions } = req.body;
        
        // Save directly to DraftExam so admin can review it in the main dashboard
        const draft = new DraftExam({
            title,
            subject,
            testNumber: Number(testNumber),
            totalQuestions: questions.length,
            questions: questions.map(q => ({
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                imageUrl: null
            }))
        });

        await draft.save();
        res.json({ success: true, message: "Bulk exam saved to drafts" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save bulk exam" });
    }
});

// ────────────────────────────────────────────────
// STUDENT ROUTES (Keep your original logic)
// ────────────────────────────────────────────────
app.post('/students', async (req, res) => {
    const { name, roll, mobile, password } = req.body;
    if (!name || !mobile || !password) return res.status(400).json({ error: "Missing fields" });
    const exists = await Student.findOne({ mobile });
    if (exists) return res.status(409).json({ error: "Mobile exists" });
    const hashed = await bcrypt.hash(password, 10);
    await new Student({ name, roll, mobile, password: hashed }).save();
    res.json({ message: "Student added" });
});

app.post('/student-login', async (req, res) => {
    const { mobile, password } = req.body;
    const student = await Student.findOne({ mobile });
    if (!student || !(await bcrypt.compare(password, student.password)))
        return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ mobile: student.mobile, name: student.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: student.name, mobile: student.mobile });
});

// ────────────────────────────────────────────────
// EXAM ROUTES (Keep your original logic)
// ────────────────────────────────────────────────
app.get('/exam/:id', authenticate, async (req, res) => {
    const exam = await Exam.findById(req.params.id).select('-questions.correctAnswer');
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(exam);
});

app.post('/conduct/:draftId', async (req, res) => {
    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    const exam = new Exam({ ...draft.toObject(), conductedAt: new Date() });
    await exam.save();
    await DraftExam.findByIdAndDelete(req.params.draftId);
    res.json({ message: "Live!" });
});

app.post('/submit-exam', authenticate, async (req, res) => {
    const { examId, answers } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const already = await Result.findOne({ studentMobile: req.user.mobile, examId });
    if (already) return res.status(400).json({ error: "Already submitted" });

    let correct = 0;
    exam.questions.forEach((q, i) => { if (q.correctAnswer === answers[i]) correct++; });
    const result = new Result({
        studentMobile: req.user.mobile, studentName: req.user.name,
        examId, examTitle: exam.title, examSubject: exam.subject, examTestNumber: exam.testNumber,
        correct, wrong: exam.totalQuestions - correct, score: correct, total: exam.totalQuestions, answers
    });
    await result.save();
    res.json({ message: "Done", score: correct });
});

app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Full System Ready on ${PORT}`));
