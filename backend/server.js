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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200
}));

app.use(express.json());

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
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

// ────────────────────────────────────────────────
// MODELS
// ────────────────────────────────────────────────
const Student = mongoose.model('Student', new mongoose.Schema({
    name: String,
    roll: String,
    mobile: { type: String, unique: true },
    password: { type: String, required: true }
}));

const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
    title: String,
    subject: String,
    testNumber: Number,
    totalQuestions: Number,
    questions: [{
        imageUrl: String,
        questionText: String,
        options: [String],
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
        questionText: String,
        options: [String],
        correctAnswer: String
    }],
    conductedAt: { type: Date, default: Date.now }
}));

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

const PdfQuestionDraft = mongoose.model('PdfQuestionDraft', new mongoose.Schema({
    title: String,
    subject: String,
    testNumber: Number,
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: { type: String, default: null }
    }],
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
    } catch {
        res.status(401).json({ error: "Session Expired" });
    }
};

// ────────────────────────────────────────────────
// PDF PARSER
// ────────────────────────────────────────────────
function parseQuestionsFromText(rawText) {
    const blocks = rawText.split(/\n\s*\d+[\.\)\-]\s+/).filter(b => b.trim());
    return blocks.map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        const optionRegex = /^[A-D][\.\)\-]\s+/i;
        const questionText = lines.filter(l => !optionRegex.test(l)).join(' ');
        const options = lines.filter(l => optionRegex.test(l));
        return { questionText, options, correctAnswer: null };
    });
}

// ────────────────────────────────────────────────
// STUDENT ROUTES
// ────────────────────────────────────────────────
app.post('/students', async (req, res) => {
    const { name, roll, mobile, password } = req.body;

    if (!name || !mobile || !password)
        return res.status(400).json({ error: "Missing fields" });

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

    const token = jwt.sign(
        { mobile: student.mobile, name: student.name },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({ token, name: student.name, mobile: student.mobile });
});

// ────────────────────────────────────────────────
// PDF FLOW
// ────────────────────────────────────────────────
const pdfUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/exam/pdf-upload', pdfUpload.single('pdf'), async (req, res) => {
    try {

        if (!req.file)
            return res.status(400).json({ error: "PDF required" });

        if (!req.body.title || !req.body.subject || !req.body.testNumber)
            return res.status(400).json({ error: "Missing fields" });

        const pdfData = await pdfParse(req.file.buffer);
        const questions = parseQuestionsFromText(pdfData.text);

        if (!questions.length)
            return res.status(400).json({ error: "No questions found" });

        const draft = new PdfQuestionDraft({
            title: req.body.title,
            subject: req.body.subject,
            testNumber: Number(req.body.testNumber),
            questions
        });

        await draft.save();

        res.json({ message: "PDF Processed", draftId: draft._id });

    } catch (err) {
        res.status(500).json({ error: "PDF Processing Failed" });
    }
});

app.patch('/api/pdf-draft/:id/set-answer', async (req, res) => {
    const { questionIndex, correctAnswer } = req.body;
    const draft = await PdfQuestionDraft.findById(req.params.id);

    if (!draft)
        return res.status(404).json({ error: "Draft not found" });

    if (questionIndex < 0 || questionIndex >= draft.questions.length)
        return res.status(400).json({ error: "Invalid index" });

    draft.questions[questionIndex].correctAnswer = correctAnswer.toUpperCase();
    await draft.save();

    res.json({ success: true });
});

app.post('/api/pdf-draft/:id/finalize', async (req, res) => {
    const pdfDraft = await PdfQuestionDraft.findById(req.params.id);
    if (!pdfDraft)
        return res.status(404).json({ error: "Draft not found" });

    const draft = new DraftExam({
        title: pdfDraft.title,
        subject: pdfDraft.subject,
        testNumber: pdfDraft.testNumber,
        totalQuestions: pdfDraft.questions.length,
        questions: pdfDraft.questions.map(q => ({
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            imageUrl: null
        }))
    });

    await draft.save();
    await PdfQuestionDraft.findByIdAndDelete(req.params.id);

    res.json({ message: "Finalized", draftId: draft._id });
});

// ────────────────────────────────────────────────
// EXAM ROUTES
// ────────────────────────────────────────────────
app.get('/exam/:id', authenticate, async (req, res) => {
    const exam = await Exam.findById(req.params.id)
        .select('-questions.correctAnswer');

    if (!exam)
        return res.status(404).json({ error: "Exam not found" });

    res.json(exam);
});

app.post('/conduct/:draftId', async (req, res) => {
    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft)
        return res.status(404).json({ error: "Draft not found" });

    const exam = new Exam({
        ...draft.toObject(),
        conductedAt: new Date()
    });

    await exam.save();
    await DraftExam.findByIdAndDelete(req.params.draftId);

    res.json({ message: "Live!" });
});

app.post('/submit-exam', authenticate, async (req, res) => {

    const { examId, answers } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam)
        return res.status(404).json({ error: "Exam not found" });

    const already = await Result.findOne({
        studentMobile: req.user.mobile,
        examId
    });

    if (already)
        return res.status(400).json({ error: "Already submitted" });

    let correct = 0;

    exam.questions.forEach((q, i) => {
        if (q.correctAnswer === answers[i]) correct++;
    });

    const wrong = exam.totalQuestions - correct;

    const result = new Result({
        studentMobile: req.user.mobile,
        studentName: req.user.name,
        examId,
        examTitle: exam.title,
        examSubject: exam.subject,
        examTestNumber: exam.testNumber,
        correct,
        wrong,
        score: correct,
        total: exam.totalQuestions,
        answers
    });

    await result.save();

    res.json({ message: "Done", score: correct });
});

// ────────────────────────────────────────────────
// SPA
// ────────────────────────────────────────────────
app.get('*', (req, res) =>
    res.sendFile(path.join(frontendPath, 'index.html'))
);

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () =>
    console.log(`🚀 Full System Ready on ${PORT}`)
);
