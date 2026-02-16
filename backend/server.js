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
// CORS & MIDDLEWARE
// ────────────────────────────────────────────────
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

// ────────────────────────────────────────────────
// STATIC PATHS & UPLOADS
// ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const uploadDir = './uploads/army-videos';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
app.use('/uploads', express.static('uploads'));

// ────────────────────────────────────────────────
// DATABASE & CLOUDINARY
// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ────────────────────────────────────────────────
// MODELS (ALL ORIGINAL + NEW)
// ────────────────────────────────────────────────
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
}, { timestamps: true }));

// ────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ────────────────────────────────────────────────
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) { res.status(401).json({ error: "Invalid Session" }); }
};

// ────────────────────────────────────────────────
// KANNADA-SUPPORTED PDF PARSER
// ────────────────────────────────────────────────
function parseQuestionsFromText(rawText) {
    // Regex identifies numbers followed by . or ) including Kannada characters
    const blocks = rawText.split(/\n\s*(\d+)[\.\)\-]\s+/).filter(b => b.trim().length > 5);
    let questions = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (!isNaN(block)) { // This is the question number
            const content = blocks[i+1] ? blocks[i+1].split('\n') : [];
            const questionText = content[0].trim();
            // Looks for A) B) C) D) or common OCR misreads like ໖)
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
// ROUTES: AUTH & STUDENTS
// ────────────────────────────────────────────────
app.post('/student-login', async (req, res) => {
    const { mobile, password } = req.body;
    const student = await Student.findOne({ mobile });
    if (!student || !(await bcrypt.compare(password, student.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ mobile: student.mobile, name: student.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: student.name, mobile: student.mobile });
});

app.post('/students', async (req, res) => {
    try {
        const { name, roll, mobile, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await new Student({ name, roll, mobile, password: hashedPassword }).save();
        res.json({ message: "Student Registered" });
    } catch (err) { res.status(400).json({ error: "Mobile number exists" }); }
});

app.get('/students', async (req, res) => res.json(await Student.find()));

// ────────────────────────────────────────────────
// ROUTES: PDF TO EXAM (THE NEW LOGIC)
// ────────────────────────────────────────────────
const pdfUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/exam/pdf-upload', pdfUpload.single('pdf'), async (req, res) => {
    try {
        const pdfData = await pdfParse(req.file.buffer);
        const questions = parseQuestionsFromText(pdfData.text);
        if (questions.length === 0) return res.status(400).json({ error: "Could not find questions" });

        const draft = new PdfQuestionDraft({
            title: req.body.title, subject: req.body.subject,
            testNumber: Number(req.body.testNumber), questions
        });
        await draft.save();
        res.json({ draftId: draft._id, count: questions.length });
    } catch (err) { res.status(500).json({ error: "Processing failed" }); }
});

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
    res.json({ message: "Exam Ready in Drafts", draftId: mainDraft._id });
});

// ────────────────────────────────────────────────
// ROUTES: ARMY VIDEOS & NOTES (OLD LOGIC)
// ────────────────────────────────────────────────
const armyStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const uploadArmy = multer({ storage: armyStorage });

app.post('/upload-army-video', uploadArmy.single("video"), async (req, res) => {
    const video = new ArmyVideo({ title: req.body.title, url: `/uploads/army-videos/${req.file.filename}` });
    await video.save();
    res.json({ success: true, video });
});

app.get('/api/army-videos', async (req, res) => res.json(await ArmyVideo.find().sort({ uploadedAt: -1 })));

app.post('/api/save-note', async (req, res) => {
    await new Note(req.body).save();
    res.json({ success: true });
});

app.get('/api/notes', async (req, res) => res.json(await Note.find().sort({ createdAt: -1 })));

// ────────────────────────────────────────────────
// ROUTES: EXAMS & RESULTS
// ────────────────────────────────────────────────
app.get('/active-exams', async (req, res) => res.json(await Exam.find().sort({ conductedAt: -1 })));

app.get('/exam/:id', authenticate, async (req, res) => {
    const exam = await Exam.findById(req.params.id).select('-questions.correctAnswer');
    res.json(exam);
});

app.post('/submit-exam', authenticate, async (req, res) => {
    const { examId, answers } = req.body;
    const exam = await Exam.findById(examId);
    let correct = 0;
    exam.questions.forEach((q, i) => { if (q.correctAnswer === answers[i]) correct++; });
    const result = new Result({
        studentMobile: req.user.mobile, studentName: req.user.name,
        examId, examTitle: exam.title, examSubject: exam.subject, examTestNumber: exam.testNumber,
        correct, total: exam.totalQuestions, score: correct, answers
    });
    await result.save();
    res.json({ score: correct });
});

app.get('/results/exam', async (req, res) => {
    const { subject, testNumber } = req.query;
    res.json(await Result.find({ examSubject: subject, examTestNumber: Number(testNumber) }).sort({ score: -1 }));
});

// ────────────────────────────────────────────────
// VIDEOS & CATCH-ALL
// ────────────────────────────────────────────────
app.get('/videos', async (req, res) => res.json(await Video.find()));
app.post('/videos', async (req, res) => {
    const { subject, class: c, videoId, title } = req.body;
    await Video.findOneAndUpdate({ subject, class: c }, { videoId, title }, { upsert: true });
    res.json({ message: "Video Saved" });
});

app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 System Online on Port ${PORT}`));
