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

// 1. CORS & MIDDLEWARE
const allowedOrigins = [
    'https://academy-student-portal.onrender.com',
    'http://localhost:3000',
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));
app.use(express.json());

// 2. STATIC PATHS
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
const armyDir = './uploads/army-videos';
if (!fs.existsSync(armyDir)) { fs.mkdirSync(armyDir, { recursive: true }); }
app.use('/uploads', express.static('uploads'));

// 3. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

// 4. MODELS
const Student = mongoose.model('Student', new mongoose.Schema({
    name: String, roll: String, mobile: { type: String, unique: true },
    password: { type: String, required: true }
}));

const Video = mongoose.model('Video', new mongoose.Schema({
    subject: String, class: Number, videoId: String, title: String
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
    title: String, subject: String, classNum: Number, testNumber: Number,
    totalQuestions: Number,
    questions: [{ imageUrl: String, questionText: String, options: [String], correctAnswer: String }],
    conductedAt: { type: Date, default: Date.now }
}));

const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
    title: String, subject: String, testNumber: Number, totalQuestions: Number,
    questions: [{ imageUrl: String, questionText: String, options: [String], correctAnswer: String }]
}));

const PdfQuestionDraft = mongoose.model('PdfQuestionDraft', new mongoose.Schema({
    title: String, subject: String, testNumber: Number,
    questions: [{ questionText: String, options: [String], correctAnswer: { type: String, default: null } }],
    createdAt: { type: Date, default: Date.now }
}));

const Result = mongoose.model('Result', new mongoose.Schema({
    studentMobile: String, studentName: String, examId: mongoose.Schema.Types.ObjectId,
    examTitle: String, examSubject: String, examTestNumber: Number,
    correct: Number, total: Number, score: Number, answers: [String], submittedAt: { type: Date, default: Date.now }
}));

const Note = mongoose.model('Note', new mongoose.Schema({
    title: String, content: String, createdAt: { type: Date, default: Date.now }
}));

const ArmyVideo = mongoose.model('ArmyVideo', new mongoose.Schema({
    title: String, url: String, uploadedAt: { type: Date, default: Date.now }
}));

// 5. AUTH MIDDLEWARE
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) { res.status(401).json({ error: "Invalid Session" }); }
};

// 6. IMPROVED KANNADA PDF PARSER
function parseQuestionsFromText(rawText) {
    // Splits by numbers like 1. or 2.
    const blocks = rawText.split(/\n\s*(\d+)[\.\)\-]\s+/).filter(b => b.trim().length > 5);
    let questions = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (!isNaN(block)) { // Found a Question Number
            const content = blocks[i+1] ? blocks[i+1].split('\n') : [];
            const questionText = content[0].trim();
            
            // Regex for options A, B, C, D including Kannada Unicode variants like ໖)
            const optionRegex = /^[A-D\u0CB0-\u0CB9\u0CDE-\u0CDF][\.\)\-]\s*/i; 
            const options = content.filter(line => optionRegex.test(line.trim()));

            questions.push({
                questionText,
                options: options.length > 2 ? options : ["A) ", "B) ", "C) ", "D) "],
                correctAnswer: null
            });
            i++; 
        }
    }
    return questions;
}

// 7. ROUTES - PDF UPLOAD (FIXED FOR JSON ERROR)
const pdfUpload = multer({ storage: multer.memoryStorage() });
app.post('/api/exam/pdf-upload', pdfUpload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // Heavy task in try-catch to prevent server crash
        let pdfData;
        try {
            pdfData = await pdfParse(req.file.buffer);
        } catch (e) {
            return res.status(500).json({ error: "PDF too heavy or corrupted" });
        }

        const questions = parseQuestionsFromText(pdfData.text);
        if (questions.length === 0) return res.status(400).json({ error: "No questions found in PDF" });

        const draft = new PdfQuestionDraft({
            title: req.body.title, subject: req.body.subject,
            testNumber: Number(req.body.testNumber), questions
        });
        await draft.save();
        res.status(200).json({ draftId: draft._id, count: questions.length });

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: "Server Error" });
    }
});

// 8. OTHER ROUTES
app.get('/api/pdf-draft/:id', async (req, res) => res.json(await PdfQuestionDraft.findById(req.params.id)));

app.patch('/api/pdf-draft/:id/set-answer', async (req, res) => {
    const { questionIndex, correctAnswer } = req.body;
    const draft = await PdfQuestionDraft.findById(req.params.id);
    draft.questions[questionIndex].correctAnswer = correctAnswer.toUpperCase();
    await draft.save();
    res.json({ success: true });
});

app.post('/api/pdf-draft/:id/finalize', async (req, res) => {
    const pdfDraft = await PdfQuestionDraft.findById(req.params.id);
    const mainDraft = new DraftExam({
        title: pdfDraft.title, subject: pdfDraft.subject, testNumber: pdfDraft.testNumber,
        totalQuestions: pdfDraft.questions.length,
        questions: pdfDraft.questions.map(q => ({
            questionText: q.questionText, options: q.options, correctAnswer: q.correctAnswer
        }))
    });
    await mainDraft.save();
    await PdfQuestionDraft.findByIdAndDelete(req.params.id);
    res.json({ message: "Finalized" });
});

app.post('/student-login', async (req, res) => {
    const { mobile, password } = req.body;
    const student = await Student.findOne({ mobile });
    if (!student || !(await bcrypt.compare(password, student.password))) return res.status(401).json({ error: "Invalid login" });
    const token = jwt.sign({ mobile: student.mobile, name: student.name }, JWT_SECRET);
    res.json({ token, name: student.name, mobile: student.mobile });
});

app.post('/students', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await new Student({ ...req.body, password: hashedPassword }).save();
    res.json({ success: true });
});

app.get('/active-exams', async (req, res) => res.json(await Exam.find().sort({ conductedAt: -1 })));

app.post('/submit-exam', authenticate, async (req, res) => {
    const { examId, answers } = req.body;
    const exam = await Exam.findById(examId);
    let correct = 0;
    exam.questions.forEach((q, i) => { if (q.correctAnswer === answers[i]) correct++; });
    await new Result({
        studentMobile: req.user.mobile, studentName: req.user.name,
        examId, examTitle: exam.title, correct, total: exam.totalQuestions, score: correct
    }).save();
    res.json({ score: correct });
});

// Army, Notes, Videos
app.get('/api/army-videos', async (req, res) => res.json(await ArmyVideo.find()));
app.get('/api/notes', async (req, res) => res.json(await Note.find()));
app.get('/videos', async (req, res) => res.json(await Video.find()));

app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
