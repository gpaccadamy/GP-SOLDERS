const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// ────────────────────────────────────────────────
// S ECURITY & PRODUCTION MIDDLEWARE [web:13][web:18]
// ────────────────────────────────────────────────
app.use(helmet()); // Secure headers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (100 req/15min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' }
});
app.use('/api/', limiter);

// CORS (strict origins)
const allowedOrigins = [
  'https://academy-student-portal.onrender.com',
  'http://localhost:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: false
}));

// ────────────────────────────────────────────────
// STATIC FILES
// ────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ────────────────────────────────────────────────
// DATABASE & CLOUDINARY
// ────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI missing');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err);
    process.exit(1);
  });

// ────────────────────────────────────────────────
// IMPROVED SCHEMAS WITH VALIDATION [web:3][web:17]
// ────────────────────────────────────────────────
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name required'], trim: true, maxlength: 100 },
  roll: { type: String, required: true, trim: true, maxlength: 50 },
  mobile: { type: String, required: [true, 'Mobile required'], unique: true, match: [/^\d{10}$/, 'Invalid mobile'] },
  password: { type: String, required: [true, 'Password required'], minlength: 4 }
});

const PdfQuestionDraftSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title required'], trim: true, maxlength: 200 },
  subject: { type: String, required: [true, 'Subject required'], trim: true, maxlength: 100 },
  testNumber: { type: Number, required: [true, 'Test number required'], min: 1, max: 999 },
  questions: [{
    questionText: { type: String, required: [true, 'Question text required'], trim: true },
    options: [{ type: String, required: true, trim: true }],
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], default: null }
  }],
  createdAt: { type: Date, default: Date.now }
}, { validateBeforeSave: true });

const DraftExamSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  testNumber: { type: Number, required: true, min: 1 },
  totalQuestions: { type: Number, required: true, min: 1 },
  questions: [{
    imageUrl: String,
    correctAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Other schemas (Exam, Result, etc.) - add similar validation...
const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String, subject: String, classNum: Number, testNumber: Number,
  totalQuestions: Number, questions: [{ imageUrl: String, correctAnswer: String }],
  conductedAt: { type: Date, default: Date.now }
}));
const Result = mongoose.model('Result', new mongoose.Schema({
  studentMobile: String, studentName: String, examId: mongoose.Schema.Types.ObjectId,
  examTitle: String, examSubject: String, examTestNumber: Number,
  correct: Number, wrong: Number, score: Number, total: Number, answers: [String],
  submittedAt: { type: Date, default: Date.now }
}));
const Student = mongoose.model('Student', StudentSchema);
const PdfQuestionDraft = mongoose.model('PdfQuestionDraft', PdfQuestionDraftSchema);
const DraftExam = mongoose.model('DraftExam', DraftExamSchema);
// Add Video, Note, ArmyVideo models similarly...

// ────────────────────────────────────────────────
// IMPROVED PDF PARSER [web:2][web:14]
// ────────────────────────────────────────────────
function parseQuestionsFromText(rawText) {
  const text = rawText.toLowerCase(); // Normalize for regex
  const questions = [];
  
  // Robust regex for common MCQ formats (English + Kannada support)
  const qRegex = /(?:^|\n)(?:q|\d+)[)\.\s]*([^\n]{50,})(?=(?:\n[a-d]\)|[\n\s]?(?:[ಎಬಿಸಿಡಿ]\)\s))/gi;
  let match;
  
  while ((match = qRegex.exec(text)) !== null) {
    const qStart = match.index;
    const qText = match[1].trim().replace(/^\d+\.\s*/, '');
    
    const opts = [];
    let optRegex = /([a-d]\)|[ಎಬಿಸಿಡಿ]\))\s*([^\n]{10,})/gi;
    let optMatch;
    while ((optMatch = optRegex.exec(text.slice(qStart + 50))) && opts.length < 4) {
      opts.push(optMatch[0].trim());
    }
    
    if (opts.length >= 3) { // Valid MCQ
      questions.push({ questionText: qText, options: opts, correctAnswer: null });
    }
  }
  
  return questions.slice(0, 100); // Limit to prevent abuse
}

// ────────────────────────────────────────────────
// PDF UPLOAD MULTER
// ────────────────────────────────────────────────
const pdfUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF allowed'), false);
  }
});

// ────────────────────────────────────────────────
// VALIDATION MIDDLEWARE
// ────────────────────────────────────────────────
const validatePdfUpload = [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 200 }),
  body('subject').trim().notEmpty().withMessage('Subject required').isLength({ max: 100 }),
  body('testNumber').isInt({ min: 1, max: 999 }).withMessage('Valid test number required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    next();
  }
];

// ────────────────────────────────────────────────
// PDF ROUTES (Organized)
// ────────────────────────────────────────────────
app.post('/api/exam/pdf-upload', 
  pdfUpload.single('pdf'), 
  validatePdfUpload,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

      const pdfData = await pdfParse(req.file.buffer);
      const questions = parseQuestionsFromText(pdfData.text);
      
      if (questions.length === 0) {
        return res.status(400).json({ error: 'No questions found. Check PDF format.' });
      }

      const draft = new PdfQuestionDraft({
        title: req.body.title,
        subject: req.body.subject,
        testNumber: Number(req.body.testNumber),
        questions
      });
      await draft.save();

      res.json({
        draftId: draft._id,
        questionCount: draft.questions.length
      });
    } catch (err) {
      next(err); // Pass to global handler
    }
  }
);

app.get('/api/pdf-drafts', async (req, res, next) => {
  try {
    const drafts = await PdfQuestionDraft.find().sort({ createdAt: -1 }).select('-questions.options');
    res.json(drafts);
  } catch (err) {
    next(err);
  }
});

app.get('/api/pdf-draft/:id', async (req, res, next) => {
  try {
    const draft = await PdfQuestionDraft.findById(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    res.json(draft);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/pdf-draft/:id/set-answer',
  body('questionIndex').isInt({ min: 0 }).optional(),
  body('correctAnswer').isIn(['A', 'B', 'C', 'D']).optional(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const draft = await PdfQuestionDraft.findById(req.params.id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      
      const { questionIndex, correctAnswer } = req.body;
      if (questionIndex >= draft.questions.length) {
        return res.status(400).json({ error: 'Invalid question index' });
      }
      
      draft.questions[questionIndex].correctAnswer = correctAnswer.toUpperCase();
      await draft.save();
      
      res.json({ message: 'Answer saved' });
    } catch (err) {
      next(err);
    }
  }
);

app.post('/api/pdf-draft/:id/finalize', async (req, res, next) => {
  try {
    const pdfDraft = await PdfQuestionDraft.findById(req.params.id);
    if (!pdfDraft) return res.status(404).json({ error: 'Draft not found' });
    
    if (pdfDraft.questions.some(q => !q.correctAnswer)) {
      return res.status(400).json({ error: 'Set all correct answers first' });
    }

    const draftExam = new DraftExam({
      title: pdfDraft.title,
      subject: pdfDraft.subject,
      testNumber: pdfDraft.testNumber,
      totalQuestions: pdfDraft.questions.length,
      questions: pdfDraft.questions.map(q => ({ 
        imageUrl: null, // Add image upload later if needed
        correctAnswer: q.correctAnswer 
      }))
    });
    await draftExam.save();
    await PdfQuestionDraft.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Finalized', draftExamId: draftExam._id });
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────────────
// EXISTING ROUTES (Keep your other routes: students, videos, exams, etc.)
// Add them here with similar try-catch + validation...
app.post('/student-login', async (req, res, next) => {
  // Your existing code with try-catch -> next(err)
});

// ... (Add all other routes similarly)

// ────────────────────────────────────────────────
// GLOBAL ERROR HANDLER [web:12][web:16]
// ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message, err.stack);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing...');
  await mongoose.connection.close();
  process.exit(0);
});

