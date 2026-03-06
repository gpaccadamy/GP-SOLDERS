const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
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
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ────────────────────────────────────────────────
// 2. STATIC FILES
// ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ────────────────────────────────────────────────
// 3. MULTER - Excel Upload (Memory Storage)
// ────────────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls)$/)) cb(null, true);
        else cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
});

// ────────────────────────────────────────────────
// 4. MONGODB CONNECTION
// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

// ────────────────────────────────────────────────
// 5. DATABASE MODELS
// ────────────────────────────────────────────────

const Student = mongoose.model('Student', new mongoose.Schema({
    name: { type: String, required: true },
    roll: String,
    mobile: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

const QuestionSchema = new mongoose.Schema({
    questionNumber: Number,
    questionText: { type: String, required: true },
    options: { A: String, B: String, C: String, D: String },
    correctAnswer: { type: String, required: true }
});

const DraftExam = mongoose.model('DraftExam', new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    testNumber: { type: Number, required: true },
    totalQuestions: Number,
    questions: [QuestionSchema],
    createdAt: { type: Date, default: Date.now }
}));

// ScheduledExam: has a fixed startAt and endAt, locked once created
const ScheduledExam = mongoose.model('ScheduledExam', new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    testNumber: { type: Number, required: true },
    totalQuestions: Number,
    durationMinutes: { type: Number, required: true },
    questions: [QuestionSchema],
    // Status: 'scheduled' | 'live' | 'ended'
    status: { type: String, default: 'scheduled' },
    scheduledAt: { type: Date, required: true },  // when exam starts
    expiresAt: { type: Date, required: true },     // when exam ends
    createdAt: { type: Date, default: Date.now }
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
    unanswered: Number,
    score: Number,
    total: Number,
    answers: mongoose.Schema.Types.Mixed,
    submittedAt: { type: Date, default: Date.now }
}));

// ────────────────────────────────────────────────
// 6. AUTH MIDDLEWARE
// ────────────────────────────────────────────────
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Access Denied" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Session Expired" });
    }
};

// ────────────────────────────────────────────────
// 7. STUDENT AUTH ROUTES
// ────────────────────────────────────────────────

app.post('/students', async (req, res) => {
    try {
        const { name, roll, mobile, password } = req.body;
        if (!name || !mobile || !password) return res.status(400).json({ error: "Missing fields" });
        const exists = await Student.findOne({ mobile });
        if (exists) return res.status(409).json({ error: "Mobile number already registered" });
        const hashed = await bcrypt.hash(password, 10);
        await new Student({ name, roll, mobile, password: hashed }).save();
        res.status(201).json({ message: "Registration successful" });
    } catch {
        res.status(500).json({ error: "Registration failed" });
    }
});

app.get('/students', async (req, res) => {
    try {
        res.json(await Student.find().select('-password'));
    } catch {
        res.status(500).json({ error: "Failed to fetch students" });
    }
});

app.delete('/students/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: "Student deleted" });
    } catch {
        res.status(500).json({ error: "Delete failed" });
    }
});

app.post('/student-login', async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const student = await Student.findOne({ mobile });
        if (!student || !(await bcrypt.compare(password, student.password)))
            return res.status(401).json({ error: "Invalid mobile or password" });
        const token = jwt.sign({ mobile: student.mobile, name: student.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, name: student.name, mobile: student.mobile });
    } catch {
        res.status(500).json({ error: "Login failed" });
    }
});

// ────────────────────────────────────────────────
// 8. EXCEL UPLOAD → DRAFT
// ────────────────────────────────────────────────

app.post('/api/upload-exam', upload.single('examFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const { title, subject, testNumber } = req.body;
        if (!title || !subject || !testNumber)
            return res.status(400).json({ error: "Title, subject and test number required" });

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) return res.status(400).json({ error: "Excel file is empty" });

        const questions = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const qText = String(row[1] || '').trim();
            if (!qText) continue;

            const answer = String(row[6] || '').trim().toUpperCase();
            if (!['A', 'B', 'C', 'D'].includes(answer))
                return res.status(400).json({ error: `Row ${i + 1}: Answer must be A/B/C/D. Got: "${row[6]}"` });

            questions.push({
                questionNumber: Number(row[0]) || (questions.length + 1),
                questionText: qText,
                options: {
                    A: String(row[2] || '').trim(),
                    B: String(row[3] || '').trim(),
                    C: String(row[4] || '').trim(),
                    D: String(row[5] || '').trim()
                },
                correctAnswer: answer
            });
        }

        if (questions.length === 0) return res.status(400).json({ error: "No valid questions found" });

        const draft = await new DraftExam({
            title, subject, testNumber: Number(testNumber),
            totalQuestions: questions.length, questions
        }).save();

        console.log(`✅ Draft: "${title}" — ${questions.length} questions`);
        res.json({ success: true, draftId: draft._id, totalQuestions: questions.length, questions });
    } catch (err) {
        console.error("❌ Upload Error:", err);
        res.status(500).json({ error: "Failed to process Excel: " + err.message });
    }
});

app.get('/api/drafts', async (req, res) => {
    try { res.json(await DraftExam.find().select('-questions').sort({ createdAt: -1 })); }
    catch { res.status(500).json({ error: "Failed to fetch drafts" }); }
});

app.get('/api/drafts/:id', async (req, res) => {
    try {
        const draft = await DraftExam.findById(req.params.id);
        if (!draft) return res.status(404).json({ error: "Draft not found" });
        res.json(draft);
    } catch { res.status(500).json({ error: "Failed to fetch draft" }); }
});

app.put('/api/drafts/:id', async (req, res) => {
    try {
        const { title, subject, testNumber, questions } = req.body;
        const draft = await DraftExam.findByIdAndUpdate(
            req.params.id,
            { title, subject, testNumber, questions, totalQuestions: questions.length },
            { new: true }
        );
        if (!draft) return res.status(404).json({ error: "Draft not found" });
        res.json({ success: true, message: "Draft updated" });
    } catch { res.status(500).json({ error: "Failed to update draft" }); }
});

app.delete('/api/drafts/:id', async (req, res) => {
    try {
        await DraftExam.findByIdAndDelete(req.params.id);
        res.json({ message: "Draft deleted" });
    } catch { res.status(500).json({ error: "Delete failed" }); }
});

// ────────────────────────────────────────────────
// 9. SCHEDULE EXAM (locked once set)
// ────────────────────────────────────────────────

app.post('/api/schedule/:draftId', async (req, res) => {
    try {
        const { scheduledAt, durationMinutes } = req.body;

        if (!scheduledAt || !durationMinutes)
            return res.status(400).json({ error: "scheduledAt and durationMinutes are required" });

        const startTime = new Date(scheduledAt);
        if (isNaN(startTime.getTime()))
            return res.status(400).json({ error: "Invalid scheduledAt date" });

        if (startTime <= new Date())
            return res.status(400).json({ error: "Scheduled time must be in the future" });

        const draft = await DraftExam.findById(req.params.draftId);
        if (!draft) return res.status(404).json({ error: "Draft not found" });

        const expiresAt = new Date(startTime.getTime() + Number(durationMinutes) * 60 * 1000);

        // Cancel any existing scheduled/live exam
        await ScheduledExam.updateMany(
            { status: { $in: ['scheduled', 'live'] } },
            { status: 'ended' }
        );

        const scheduled = await new ScheduledExam({
            title: draft.title,
            subject: draft.subject,
            testNumber: draft.testNumber,
            totalQuestions: draft.totalQuestions,
            durationMinutes: Number(durationMinutes),
            questions: draft.questions,
            status: 'scheduled',
            scheduledAt: startTime,
            expiresAt
        }).save();

        // Delete draft after scheduling
        await DraftExam.findByIdAndDelete(req.params.draftId);

        console.log(`📅 Exam scheduled: "${draft.title}" at ${startTime} for ${durationMinutes} mins`);
        res.json({
            success: true,
            message: `Exam scheduled for ${startTime.toLocaleString()}`,
            examId: scheduled._id,
            scheduledAt: startTime,
            expiresAt
        });

    } catch (err) {
        console.error("❌ Schedule Error:", err);
        res.status(500).json({ error: "Failed to schedule exam: " + err.message });
    }
});

// Admin: cancel a scheduled exam
app.post('/api/cancel-exam/:id', async (req, res) => {
    try {
        const exam = await ScheduledExam.findByIdAndUpdate(req.params.id, { status: 'ended' }, { new: true });
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        res.json({ success: true, message: "Exam cancelled" });
    } catch {
        res.status(500).json({ error: "Failed to cancel exam" });
    }
});

// Admin: get all scheduled exams
app.get('/api/scheduled-exams', async (req, res) => {
    try {
        res.json(await ScheduledExam.find().select('-questions').sort({ scheduledAt: -1 }));
    } catch {
        res.status(500).json({ error: "Failed to fetch scheduled exams" });
    }
});

// ────────────────────────────────────────────────
// 10. STUDENT EXAM ROUTE
// Returns: upcoming (scheduled), live, or null
// ────────────────────────────────────────────────

app.get('/active-exam', async (req, res) => {
    try {
        const now = new Date();

        // Auto-expire ended exams
        await ScheduledExam.updateMany(
            { status: 'live', expiresAt: { $lt: now } },
            { status: 'ended' }
        );

        // Auto-activate scheduled exams whose time has come
        await ScheduledExam.updateMany(
            { status: 'scheduled', scheduledAt: { $lte: now }, expiresAt: { $gt: now } },
            { status: 'live' }
        );

        // First check for a live exam
        let exam = await ScheduledExam.findOne({ status: 'live' });

        if (exam) {
            // Return live exam (no correct answers)
            return res.json({
                state: 'live',
                exam: {
                    _id: exam._id,
                    title: exam.title,
                    subject: exam.subject,
                    testNumber: exam.testNumber,
                    totalQuestions: exam.totalQuestions,
                    durationMinutes: exam.durationMinutes,
                    scheduledAt: exam.scheduledAt,
                    expiresAt: exam.expiresAt,
                    questions: exam.questions.map(q => ({
                        _id: q._id,
                        questionNumber: q.questionNumber,
                        questionText: q.questionText,
                        options: q.options
                        // correctAnswer excluded
                    }))
                }
            });
        }

        // Check for upcoming scheduled exam
        const upcoming = await ScheduledExam.findOne({ status: 'scheduled' }).sort({ scheduledAt: 1 });
        if (upcoming) {
            return res.json({
                state: 'upcoming',
                exam: {
                    _id: upcoming._id,
                    title: upcoming.title,
                    subject: upcoming.subject,
                    testNumber: upcoming.testNumber,
                    totalQuestions: upcoming.totalQuestions,
                    durationMinutes: upcoming.durationMinutes,
                    scheduledAt: upcoming.scheduledAt,
                    expiresAt: upcoming.expiresAt
                    // No questions sent until live
                }
            });
        }

        // Nothing available
        return res.json({ state: 'none', exam: null });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch exam" });
    }
});

// ────────────────────────────────────────────────
// 11. SUBMIT EXAM
// ────────────────────────────────────────────────

app.post('/submit-exam', authenticate, async (req, res) => {
    try {
        const { examId, answers } = req.body;
        const exam = await ScheduledExam.findById(examId);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        const already = await Result.findOne({ studentMobile: req.user.mobile, examId });
        if (already) return res.status(400).json({ error: "Already submitted" });

        let correct = 0, wrong = 0, unanswered = 0;
        exam.questions.forEach(q => {
            const ans = answers[q._id.toString()];
            if (!ans) unanswered++;
            else if (ans === q.correctAnswer) correct++;
            else wrong++;
        });

        await new Result({
            studentMobile: req.user.mobile, studentName: req.user.name,
            examId, examTitle: exam.title, examSubject: exam.subject,
            examTestNumber: exam.testNumber, correct, wrong, unanswered,
            score: correct, total: exam.totalQuestions, answers
        }).save();

        res.json({ message: "Submitted!", correct, wrong, unanswered, total: exam.totalQuestions });
    } catch {
        res.status(500).json({ error: "Submission failed" });
    }
});

app.get('/my-results', authenticate, async (req, res) => {
    try { res.json(await Result.find({ studentMobile: req.user.mobile }).sort({ submittedAt: -1 })); }
    catch { res.status(500).json({ error: "Failed to fetch results" }); }
});

app.get('/api/all-results', async (req, res) => {
    try { res.json(await Result.find().sort({ submittedAt: -1 })); }
    catch { res.status(500).json({ error: "Failed to fetch results" }); }
});

// ────────────────────────────────────────────────
// 12. SPA FALLBACK & START
// ────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 SERVER ON PORT ${PORT}`));
