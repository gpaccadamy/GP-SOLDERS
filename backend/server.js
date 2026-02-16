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

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_2026';

// ────────────────────────────────────────────────
// CORS CONFIG (Updated)
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
// MODELS (Kept as per your original)
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
// PDF PARSER (FIXED FOR KANNADA)
// ────────────────────────────────────────────────
function parseQuestionsFromText(rawText) {
    // Regex identifies numbers followed by . or ) including Kannada Unicode ranges
    const blocks = rawText.split(/\n\s*(\d+)[\.\)\-]\s+/).filter(b => b.trim().length > 5);
    let questions = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (!isNaN(block)) { // Question number identified
            const content = blocks[i+1] ? blocks[i+1].split('\n') : [];
            const questionText = content[0].trim();
            // Handle Kannada OCR variants for A) B) C) D)
            const optionRegex = /^[A-D\u0CB0-\u0CB9\u0CDE-\u0CDF][\.\)\-]\s*/i; 
            const options = content.filter(line => optionRegex.test(line.trim()));

            questions.push({
                questionText,
                options: options.length > 0 ? options : ["A) ", "B) ", "C) ", "D) "],
                correctAnswer: null
            });
            i++; 
        }
    }
    return questions;
}

// ────────────────────────────────────────────────
// STUDENT ROUTES
// ────────────────────────────────────────────────
app.post('/students', async (req, res) => {
    try {
        const { name, roll, mobile, password } = req.body;
        const exists = await Student.findOne({ mobile });
        if (exists) return res.status(409).json({ error: "Mobile exists" });
        const hashed = await bcrypt.hash(password, 10);
        await new Student({ name, roll, mobile, password: hashed }).save();
        res.json({ message: "Student added" });
    } catch (e) { res.status(500).json({ error: "Signup Failed" }); }
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
// PDF FLOW (FIXED JSON CRASH ERROR)
// ────────────────────────────────────────────────
const pdfUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/exam/pdf-upload', pdfUpload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "PDF required" });
        
        console.log("Processing PDF for:", req.body.title);

        // Memory Safe Parsing
        let pdfData;
        try {
            pdfData = await pdfParse(req.file.buffer);
        } catch (parseErr) {
            return res.status(500).json({ error: "PDF library crashed. File too complex." });
        }

        const questions = parseQuestionsFromText(pdfData.text);

        if (!questions.length)
            return res.status(422).json({ error: "No Kannada questions found in PDF" });

        const draft = new PdfQuestionDraft({
            title: req.body.title,
            subject: req.body.subject,
            testNumber: Number(req.body.testNumber),
            questions
        });

        await draft.save();
        // Return valid JSON to prevent "Unexpected end of JSON"
        res.status(200).json({ message: "PDF Processed", draftId: draft._id, count: questions.length });

    } catch (err) {
        console.error("Critical PDF Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

// GET DRAFT DATA
app.get('/api/pdf-draft/:id', async (req, res) => {
    try {
        const draft = await PdfQuestionDraft.findById(req.params.id);
        res.json(draft);
    } catch (e) { res.status(404).json({ error: "Not found" }); }
});

app.patch('/api/pdf-draft/:id/set-answer', async (req, res) => {
    const { questionIndex, correctAnswer } = req.body;
    const draft = await PdfQuestionDraft.findById(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    
    draft.questions[questionIndex].correctAnswer = correctAnswer.toUpperCase();
    await draft.save();
    res.json({ success: true });
});

app.post('/api/pdf-draft/:id/finalize', async (req, res) => {
    const pdfDraft = await PdfQuestionDraft.findById(req.params.id);
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
app.get('/active-exams', async (req, res) => res.json(await Exam.find().sort({ conductedAt: -1 })));

app.get('/exam/:id', authenticate, async (req, res) => {
    const exam = await Exam.findById(req.params.id).select('-questions.correctAnswer');
    res.json(exam);
});

app.post('/conduct/:draftId', async (req, res) => {
    const draft = await DraftExam.findById(req.params.draftId);
    const exam = new Exam({ ...draft.toObject(), conductedAt: new Date() });
    await exam.save();
    await DraftExam.findByIdAndDelete(req.params.draftId);
    res.json({ message: "Live!" });
});

app.post('/submit-exam', authenticate, async (req, res) => {
    const { examId, answers } = req.body;
    const exam = await Exam.findById(examId);
    let correct = 0;
    exam.questions.forEach((q, i) => { if (q.correctAnswer === answers[i]) correct++; });
    
    const result = new Result({
        studentMobile: req.user.mobile,
        studentName: req.user.name,
        examId,
        examTitle: exam.title,
        examSubject: exam.subject,
        examTestNumber: exam.testNumber,
        correct,
        total: exam.totalQuestions,
        answers
    });
    await result.save();
    res.json({ score: correct });
});

app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 System Online on ${PORT}`));
