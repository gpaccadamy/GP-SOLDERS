const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_2026';

// ────────────────────────────────────────────────
// 1. MIDDLEWARES & CORS
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
    credentials: false
}));

// Set limit to 50mb so you can paste huge question papers without errors
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ────────────────────────────────────────────────
// 2. STATIC FILES & PATHS
// ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ────────────────────────────────────────────────
// 3. MONGODB CONNECTION
// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected: Full Logic Active"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

// ────────────────────────────────────────────────
// 4. DATABASE MODELS (All Collections)
// ────────────────────────────────────────────────

// Student Profile
const Student = mongoose.model('Student', new mongoose.Schema({
    name: String,
    roll: String,
    mobile: { type: String, unique: true },
    password: { type: String, required: true }
}));

// Draft Exams (Questions waiting to be made Live)
const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
    title: String,
    subject: String,
    testNumber: Number,
    totalQuestions: Number,
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: String,
        imageUrl: { type: String, default: null }
    }],
    createdAt: { type: Date, default: Date.now }
}));

// Live Exams (Visible to Students)
const Exam = mongoose.model('Exam', new mongoose.Schema({
    title: String,
    subject: String,
    classNum: Number,
    testNumber: Number,
    totalQuestions: Number,
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: String,
        imageUrl: { type: String, default: null }
    }],
    conductedAt: { type: Date, default: Date.now }
}));

// Student Results
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

// ────────────────────────────────────────────────
// 5. AUTHENTICATION MIDDLEWARE
// ────────────────────────────────────────────────
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Access Denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: "Session Expired" });
    }
};

// ────────────────────────────────────────────────
// 6. STUDENT ROUTES (Login/Register)
// ────────────────────────────────────────────────
app.post('/students', async (req, res) => {
    try {
        const { name, roll, mobile, password } = req.body;
        if (!name || !mobile || !password) return res.status(400).json({ error: "Missing fields" });

        const exists = await Student.findOne({ mobile });
        if (exists) return res.status(409).json({ error: "Mobile number already exists" });

        const hashed = await bcrypt.hash(password, 10);
        const newStudent = new Student({ name, roll, mobile, password: hashed });
        await newStudent.save();

        res.json({ message: "Student registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

app.post('/student-login', async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const student = await Student.findOne({ mobile });

        if (!student || !(await bcrypt.compare(password, student.password))) {
            return res.status(401).json({ error: "Invalid mobile or password" });
        }

        const token = jwt.sign(
            { mobile: student.mobile, name: student.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, name: student.name, mobile: student.mobile });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// ────────────────────────────────────────────────
// 7. NEW BULK PASTE EXAM ROUTE
// ────────────────────────────────────────────────
app.post('/api/save-bulk-exam', async (req, res) => {
    try {
        const { title, subject, testNumber, questions } = req.body;

        if (!questions || questions.length === 0) 
            return res.status(400).json({ error: "No questions to save" });

        const draft = new DraftExam({
            title,
            subject,
            testNumber: Number(testNumber),
            totalQuestions: questions.length,
            questions: questions.map(q => ({
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer
            }))
        });

        await draft.save();
        res.status(200).json({ success: true, message: "Exam saved to Drafts!", draftId: draft._id });
    } catch (err) {
        console.error("Bulk Save Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ────────────────────────────────────────────────
// 8. EXAM MANAGEMENT (Live & Submit)
// ────────────────────────────────────────────────

// Get active exams for students
app.get('/active-exams', async (req, res) => {
    const exams = await Exam.find().sort({ conductedAt: -1 });
    res.json(exams);
});

// Get a specific exam's questions (Hiding answers)
app.get('/exam/:id', authenticate, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).select('-questions.correctAnswer');
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        res.json(exam);
    } catch (err) {
        res.status(500).json({ error: "Failed to load exam" });
    }
});

// Admin: Make a Draft Live
app.post('/conduct/:draftId', async (req, res) => {
    try {
        const draft = await DraftExam.findById(req.params.draftId);
        if (!draft) return res.status(404).json({ error: "Draft not found" });

        const exam = new Exam({
            ...draft.toObject(),
            conductedAt: new Date()
        });

        await exam.save();
        await DraftExam.findByIdAndDelete(req.params.draftId);
        res.json({ message: "Exam is now Live for students!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to conduct exam" });
    }
});

// Student: Submit Answers
app.post('/submit-exam', authenticate, async (req, res) => {
    try {
        const { examId, answers } = req.body;

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        const already = await Result.findOne({ studentMobile: req.user.mobile, examId });
        if (already) return res.status(400).json({ error: "You have already submitted this exam" });

        let correct = 0;
        exam.questions.forEach((q, i) => {
            if (q.correctAnswer === answers[i]) correct++;
        });

        const result = new Result({
            studentMobile: req.user.mobile,
            studentName: req.user.name,
            examId,
            examTitle: exam.title,
            examSubject: exam.subject,
            examTestNumber: exam.testNumber,
            correct,
            wrong: exam.totalQuestions - correct,
            score: correct,
            total: exam.totalQuestions,
            answers
        });

        await result.save();
        res.json({ message: "Exam submitted successfully", score: correct, total: exam.totalQuestions });
    } catch (err) {
        res.status(500).json({ error: "Submission failed" });
    }
});

// ────────────────────────────────────────────────
// 9. RESULTS ROUTE
// ────────────────────────────────────────────────
app.get('/my-results', authenticate, async (req, res) => {
    const results = await Result.find({ studentMobile: req.user.mobile }).sort({ submittedAt: -1 });
    res.json(results);
});

// ────────────────────────────────────────────────
// 10. SPA ROUTING & PORT
// ────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 FULL SERVER RUNNING
    -----------------------
    Port: ${PORT}
    Logic: Student Auth, Bulk Paste, Results, Drafts
    -----------------------
    `);
});
