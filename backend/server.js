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
const COMPANY_PASSWORD = process.env.COMPANY_PASSWORD || 'gpsoldiers@company2026';

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
// 3. MULTER
// ────────────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls)$/)) cb(null, true);
        else cb(new Error('Only Excel files allowed'));
    }
});

// ────────────────────────────────────────────────
// 4. MONGODB
// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

// ────────────────────────────────────────────────
// 5. MODELS
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

// ScheduledExam: questions auto-deleted after exam ends
const ScheduledExam = mongoose.model('ScheduledExam', new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    testNumber: { type: Number, required: true },
    totalQuestions: Number,
    durationMinutes: { type: Number, required: true },
    questions: [QuestionSchema],           // auto-cleared after exam ends
    questionsDeleted: { type: Boolean, default: false },
    status: { type: String, default: 'scheduled' }, // scheduled | live | ended
    scheduledAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
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

// ExamLicense: company controls total allowed exams
const ExamLicense = mongoose.model('ExamLicense', new mongoose.Schema({
    totalAllowed: { type: Number, default: 50 },
    totalConducted: { type: Number, default: 0 },
    lastUpdatedBy: { type: String, default: 'company' },
    updatedAt: { type: Date, default: Date.now }
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
// 7. LICENSE HELPER
// ────────────────────────────────────────────────
async function getLicense() {
    let license = await ExamLicense.findOne();
    if (!license) {
        license = await new ExamLicense({ totalAllowed: 50, totalConducted: 0 }).save();
    }
    return license;
}

// ────────────────────────────────────────────────
// 8. STUDENT AUTH
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
    } catch { res.status(500).json({ error: "Registration failed" }); }
});

app.get('/students', async (req, res) => {
    try { res.json(await Student.find().select('-password')); }
    catch { res.status(500).json({ error: "Failed to fetch students" }); }
});

app.delete('/students/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: "Student deleted" });
    } catch { res.status(500).json({ error: "Delete failed" }); }
});

app.post('/student-login', async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const student = await Student.findOne({ mobile });
        if (!student || !(await bcrypt.compare(password, student.password)))
            return res.status(401).json({ error: "Invalid mobile or password" });
        const token = jwt.sign({ mobile: student.mobile, name: student.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, name: student.name, mobile: student.mobile });
    } catch { res.status(500).json({ error: "Login failed" }); }
});

// ────────────────────────────────────────────────
// 9. COMPANY ROUTES (license control)
// ────────────────────────────────────────────────

// Company login check
app.post('/api/company/login', (req, res) => {
    const { password } = req.body;
    if (password === COMPANY_PASSWORD) {
        res.json({ success: true, message: "Access granted" });
    } else {
        res.status(401).json({ error: "Invalid company password" });
    }
});

// Get license info
app.post('/api/company/license', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== COMPANY_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        const license = await getLicense();
        res.json({
            totalAllowed: license.totalAllowed,
            totalConducted: license.totalConducted,
            remaining: license.totalAllowed - license.totalConducted,
            updatedAt: license.updatedAt
        });
    } catch { res.status(500).json({ error: "Failed to fetch license" }); }
});

// Update license (company sets new total allowed)
app.post('/api/company/set-limit', async (req, res) => {
    try {
        const { password, totalAllowed } = req.body;
        if (password !== COMPANY_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        if (!totalAllowed || totalAllowed < 1) return res.status(400).json({ error: "Invalid limit" });

        const license = await ExamLicense.findOne();
        if (license) {
            license.totalAllowed = Number(totalAllowed);
            license.updatedAt = new Date();
            await license.save();
        } else {
            await new ExamLicense({ totalAllowed: Number(totalAllowed), totalConducted: 0 }).save();
        }
        res.json({ success: true, message: `Exam limit set to ${totalAllowed}` });
    } catch { res.status(500).json({ error: "Failed to update limit" }); }
});

// Reset conducted count (company can reset)
app.post('/api/company/reset-count', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== COMPANY_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        await ExamLicense.updateOne({}, { totalConducted: 0, updatedAt: new Date() });
        res.json({ success: true, message: "Exam count reset to 0" });
    } catch { res.status(500).json({ error: "Failed to reset count" }); }
});

// Admin: get license status (no password needed — just shows counts)
app.get('/api/license-status', async (req, res) => {
    try {
        const license = await getLicense();
        res.json({
            totalAllowed: license.totalAllowed,
            totalConducted: license.totalConducted,
            remaining: license.totalAllowed - license.totalConducted
        });
    } catch { res.status(500).json({ error: "Failed to fetch status" }); }
});

// ────────────────────────────────────────────────
// 10. EXCEL UPLOAD → DRAFT
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
        const SKIP_ANS   = ['ANSWER', 'ANS', 'A / B / C / D', 'A/B/C/D', 'ANSWER\n(A/B/C/D)'];
        const SKIP_QTEXT = ['type question here', 'kannada', 'q.no', '1, 2, 3'];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const qText = String(row[1] || '').trim();
            if (!qText) continue;

            // Skip header/label rows — Q.No must be a real number
            const qNoRaw = row[0];
            const qNoNum = Number(String(qNoRaw).trim());
            if (!qNoRaw || isNaN(qNoNum)) continue;

            // Skip template instruction rows by question text keywords
            const qLower = qText.toLowerCase();
            if (SKIP_QTEXT.some(kw => qLower.includes(kw))) continue;

            const answer = String(row[6] || '').trim().toUpperCase();

            // Skip rows where answer column is a header label
            if (SKIP_ANS.includes(answer)) continue;

            if (!['A', 'B', 'C', 'D'].includes(answer))
                return res.status(400).json({ error: `Row ${i + 1}: Answer must be A/B/C/D. Got: "${row[6]}"` });

            questions.push({
                questionNumber: qNoNum,
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

        res.json({ success: true, draftId: draft._id, totalQuestions: questions.length, questions });
    } catch (err) {
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
        res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to update draft" }); }
});

app.delete('/api/drafts/:id', async (req, res) => {
    try {
        await DraftExam.findByIdAndDelete(req.params.id);
        res.json({ message: "Draft deleted" });
    } catch { res.status(500).json({ error: "Delete failed" }); }
});

// ────────────────────────────────────────────────
// 11. SCHEDULE EXAM (with license check)
// ────────────────────────────────────────────────

app.post('/api/schedule/:draftId', async (req, res) => {
    try {
        const { scheduledAt, durationMinutes } = req.body;
        if (!scheduledAt || !durationMinutes)
            return res.status(400).json({ error: "scheduledAt and durationMinutes required" });

        const startTime = new Date(scheduledAt);
        if (isNaN(startTime.getTime())) return res.status(400).json({ error: "Invalid date" });
        if (startTime <= new Date()) return res.status(400).json({ error: "Scheduled time must be in the future" });

        // ── LICENSE CHECK ──
        const license = await getLicense();
        if (license.totalConducted >= license.totalAllowed) {
            return res.status(403).json({
                error: `Exam limit reached! You have used all ${license.totalAllowed} allowed exams. Please contact the company to increase your limit.`,
                limitReached: true
            });
        }

        const draft = await DraftExam.findById(req.params.draftId);
        if (!draft) return res.status(404).json({ error: "Draft not found" });

        const expiresAt = new Date(startTime.getTime() + Number(durationMinutes) * 60 * 1000);

        // Cancel any existing scheduled/live exam
        await ScheduledExam.updateMany({ status: { $in: ['scheduled', 'live'] } }, { status: 'ended' });

        const scheduled = await new ScheduledExam({
            title: draft.title, subject: draft.subject, testNumber: draft.testNumber,
            totalQuestions: draft.totalQuestions, durationMinutes: Number(durationMinutes),
            questions: draft.questions, status: 'scheduled', scheduledAt: startTime, expiresAt
        }).save();

        // Increment conducted count
        await ExamLicense.updateOne({}, { $inc: { totalConducted: 1 }, updatedAt: new Date() });

        // Delete draft after scheduling
        await DraftExam.findByIdAndDelete(req.params.draftId);

        console.log(`📅 Exam scheduled: "${draft.title}" | Used: ${license.totalConducted + 1}/${license.totalAllowed}`);
        res.json({
            success: true,
            message: `Exam scheduled!`,
            examId: scheduled._id,
            scheduledAt: startTime,
            expiresAt,
            licenseUsed: license.totalConducted + 1,
            licenseTotal: license.totalAllowed
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to schedule: " + err.message });
    }
});

app.post('/api/cancel-exam/:id', async (req, res) => {
    try {
        const exam = await ScheduledExam.findByIdAndUpdate(req.params.id, { status: 'ended' }, { new: true });
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        res.json({ success: true, message: "Exam cancelled" });
    } catch { res.status(500).json({ error: "Failed to cancel" }); }
});

app.get('/api/scheduled-exams', async (req, res) => {
    try {
        res.json(await ScheduledExam.find().select('-questions').sort({ scheduledAt: -1 }));
    } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// ────────────────────────────────────────────────
// 12. AUTO-DELETE QUESTIONS HELPER
// ────────────────────────────────────────────────
async function autoDeleteQuestionsIfEnded(exam) {
    if (exam.status === 'ended' && !exam.questionsDeleted) {
        await ScheduledExam.findByIdAndUpdate(exam._id, {
            questions: [],
            questionsDeleted: true
        });
        console.log(`🗑️ Questions auto-deleted for exam: "${exam.title}"`);
    }
}

// ────────────────────────────────────────────────
// 13. STUDENT EXAM ROUTE
// ────────────────────────────────────────────────

app.get('/active-exam', async (req, res) => {
    try {
        const now = new Date();

        // Auto-expire + auto-delete questions for ended exams
        const expiredExams = await ScheduledExam.find({
            status: 'live', expiresAt: { $lt: now }, questionsDeleted: false
        });
        for (const exam of expiredExams) {
            await ScheduledExam.findByIdAndUpdate(exam._id, {
                status: 'ended', questions: [], questionsDeleted: true
            });
            console.log(`🗑️ Auto-ended & questions deleted: "${exam.title}"`);
        }

        // Also mark any that were updated
        await ScheduledExam.updateMany(
            { status: 'live', expiresAt: { $lt: now } },
            { status: 'ended' }
        );

        // Auto-activate scheduled exams
        await ScheduledExam.updateMany(
            { status: 'scheduled', scheduledAt: { $lte: now }, expiresAt: { $gt: now } },
            { status: 'live' }
        );

        const exam = await ScheduledExam.findOne({ status: 'live' });
        if (exam) {
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
                    }))
                }
            });
        }

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
                }
            });
        }

        return res.json({ state: 'none', exam: null });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch exam" });
    }
});

// ────────────────────────────────────────────────
// 14. SUBMIT EXAM
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

        // Auto-delete questions after last submission check is not needed here
        // Questions are deleted when exam expires via active-exam route

        res.json({ message: "Submitted!", correct, wrong, unanswered, total: exam.totalQuestions });
    } catch {
        res.status(500).json({ error: "Submission failed" });
    }
});

// ────────────────────────────────────────────────
// 15. RESULT ROUTES
// ────────────────────────────────────────────────

// Student: own results only (requires login)
app.get('/my-results', authenticate, async (req, res) => {
    try {
        const results = await Result.find({ studentMobile: req.user.mobile })
            .select('-answers')
            .sort({ submittedAt: -1 });
        res.json(results);
    } catch { res.status(500).json({ error: "Failed to fetch results" }); }
});

// Admin: all results (no auth — admin page only)
app.get('/api/all-results', async (req, res) => {
    try {
        const results = await Result.find().select('-answers').sort({ submittedAt: -1 });
        res.json(results);
    } catch { res.status(500).json({ error: "Failed to fetch results" }); }
});

// Admin: results filtered by exam
app.get('/api/results-by-exam/:examId', async (req, res) => {
    try {
        const results = await Result.find({ examId: req.params.examId })
            .select('-answers').sort({ score: -1 });
        res.json(results);
    } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// ────────────────────────────────────────────────
// 16. VIDEO CLASSES (YouTube + Subject + Class Number)
// ────────────────────────────────────────────────

const VALID_SUBJECTS = [
    'General Knowledge (GK)',
    'English',
    'Kannada',
    'Maths'
];

const Video = mongoose.model('Video', new mongoose.Schema({
    title:       { type: String, required: true },
    subject:     { type: String, required: true, enum: VALID_SUBJECTS },
    classNumber: { type: Number, required: true, min: 1 },
    youtubeUrl:  { type: String, required: true },
    youtubeId:   { type: String, required: true },
    createdAt:   { type: Date, default: Date.now }
}));

// Helper — extract YouTube video ID from any URL format
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// POST /api/videos — Admin: add video class
app.post('/api/videos', async (req, res) => {
    try {
        const { title, subject, classNumber, youtubeUrl } = req.body;
        if (!title || !subject || !classNumber || !youtubeUrl)
            return res.status(400).json({ error: "Title, subject, class number and YouTube URL are all required" });
        if (!VALID_SUBJECTS.includes(subject))
            return res.status(400).json({ error: "Invalid subject" });
        const youtubeId = extractYouTubeId(youtubeUrl);
        if (!youtubeId) return res.status(400).json({ error: "Invalid YouTube URL. Paste a youtube.com or youtu.be link." });

        // Prevent duplicate class numbers per subject
        const exists = await Video.findOne({ subject, classNumber: Number(classNumber) });
        if (exists) return res.status(400).json({ error: `Class ${classNumber} for "${subject}" already exists. Use a different class number.` });

        const video = await new Video({ title, subject, classNumber: Number(classNumber), youtubeUrl, youtubeId }).save();
        res.status(201).json({ success: true, video });
    } catch (err) { res.status(500).json({ error: "Failed to save: " + err.message }); }
});

// PUT /api/videos/:id — Admin: edit video class
app.put('/api/videos/:id', async (req, res) => {
    try {
        const { title, subject, classNumber, youtubeUrl } = req.body;
        if (!title || !subject || !classNumber || !youtubeUrl)
            return res.status(400).json({ error: "All fields required" });
        if (!VALID_SUBJECTS.includes(subject))
            return res.status(400).json({ error: "Invalid subject" });

        const youtubeId = extractYouTubeId(youtubeUrl);
        if (!youtubeId) return res.status(400).json({ error: "Invalid YouTube URL" });

        // Check duplicate (exclude current doc)
        const exists = await Video.findOne({ subject, classNumber: Number(classNumber), _id: { $ne: req.params.id } });
        if (exists) return res.status(400).json({ error: `Class ${classNumber} for "${subject}" already exists.` });

        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { title, subject, classNumber: Number(classNumber), youtubeUrl, youtubeId },
            { new: true }
        );
        if (!video) return res.status(404).json({ error: "Video not found" });
        res.json({ success: true, video });
    } catch { res.status(500).json({ error: "Failed to update" }); }
});

// DELETE /api/videos/:id — Admin: delete video class
app.delete('/api/videos/:id', async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted" });
    } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// GET /api/videos — All videos sorted by subject then classNumber
app.get('/api/videos', async (req, res) => {
    try {
        const { subject } = req.query;
        const filter = subject ? { subject } : {};
        const videos = await Video.find(filter).sort({ subject: 1, classNumber: 1 });
        res.json(videos);
    } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// GET /api/videos/:id — Single video
app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ error: "Not found" });
        res.json(video);
    } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// GET /api/subjects — Return list of valid subjects
app.get('/api/subjects', (req, res) => {
    res.json(VALID_SUBJECTS);
});

// ────────────────────────────────────────────────
// 17. SPA FALLBACK & START
// ────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 SERVER ON PORT ${PORT}`));
