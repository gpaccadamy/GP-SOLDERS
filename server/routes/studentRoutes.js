const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Result = require("../models/Result");
const ScheduledExam = require("../models/ScheduledExam");
const Notification = require("../models/Notification");

// JWT middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  try {
    req.student = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Queue to prevent duplicate submissions
const submissionQueue = new Map();

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, mobile, password, roll } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ error: "Name, mobile and password required" });
    }
    const existing = await Student.findOne({ mobile });
    if (existing) return res.status(400).json({ error: "Mobile already registered" });
    
    const student = await new Student({ name, mobile, password, roll }).save();
    res.json({ success: true, message: "Registered", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create student (admin only)
router.post("/create", async (req, res) => {
  try {
    const { name, mobile, password, roll } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ error: "Name, mobile and password required" });
    }
    const existing = await Student.findOne({ mobile });
    if (existing) return res.status(400).json({ error: "Mobile already exists" });
    
    const student = await new Student({ name, mobile, password, roll }).save();
    res.json({ success: true, student, message: "Student created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const student = await Student.findOne({ mobile, password });
    if (!student) return res.status(401).json({ error: "Invalid credentials" });

    // Check if student is active
    if (!student.active) {
      return res.status(403).json({ error: "Account is inactive. Contact administrator." });
    }

    const token = jwt.sign(
      { id: student._id, mobile: student.mobile, name: student.name },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );
    res.json({ success: true, token, name: student.name, mobile: student.mobile, active: student.active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit exam - with queue for high traffic
router.post("/submit-exam", auth, async (req, res) => {
  try {
    const { examId, answers } = req.body;
    const key = `${req.student.mobile}-${examId}`;
    
    // Check if already submitted
    const existing = await Result.findOne({ studentMobile: req.student.mobile, examId });
    if (existing) {
      return res.json({ success: true, resultId: existing._id, alreadySubmitted: true });
    }

    // Queue check - prevent duplicate processing
    if (submissionQueue.has(key)) {
      return res.status(429).json({ error: "Submission in progress", retryAfter: 2 });
    }

    submissionQueue.set(key, true);
    
    const exam = await ScheduledExam.findById(examId);
    if (!exam) {
      submissionQueue.delete(key);
      return res.status(404).json({ error: "Exam not found" });
    }
    
    let correct = 0, wrong = 0, unanswered = 0;
    const total = exam.questions.length;
    
    exam.questions.forEach((q) => {
      const ans = answers[q._id.toString()];
      if (!ans) unanswered++;
      else if (ans === q.correctAnswer) correct++;
      else wrong++;
    });
    
    const result = await new Result({
      studentMobile: req.student.mobile,
      studentName: req.student.name,
      examId,
      examTitle: exam.title,
      examSubject: exam.subject,
      examTestNumber: exam.testNumber,
      correct,
      wrong,
      unanswered,
      score: correct,
      total,
      answers: new Map(Object.entries(answers)),
    }).save();
    
    submissionQueue.delete(key);
    
    res.json({ success: true, resultId: result._id });
  } catch (err) {
    submissionQueue.delete(`${req.student.mobile}-${req.body.examId}`);
    res.status(500).json({ error: err.message });
  }
});

// Check submission status
router.get("/submission-status/:examId", auth, async (req, res) => {
  try {
    const result = await Result.findOne({ 
      examId: req.params.examId, 
      studentMobile: req.student.mobile 
    });
    if (result) {
      res.json({ 
        saved: true, 
        result: {
          correct: result.correct,
          wrong: result.wrong,
          unanswered: result.unanswered,
          total: result.total,
          score: result.score
        }
      });
    } else {
      res.json({ saved: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my results
router.get("/my-results", auth, async (req, res) => {
  try {
    const results = await Result.find({ studentMobile: req.student.mobile })
      .select("-answers")
      .sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student profile (for student profile page)
router.get("/profile", auth, async (req, res) => {
  try {
    const student = await Student.findOne({ mobile: req.student.mobile })
      .select("-password");
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES (No auth middleware - assuming admin access control elsewhere)

// Get all students
router.get("/all", async (req, res) => {
  try {
    const students = await Student.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student password (admin only)
router.put("/update-password/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password required" });
    }

    const student = await Student.findOneAndUpdate(
      { mobile },
      { password: newPassword },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle student active status (admin only)
router.put("/toggle-active/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;

    const student = await Student.findOne({ mobile });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    student.active = !student.active;
    await student.save();

    res.json({
      success: true,
      message: `Student ${student.active ? 'activated' : 'deactivated'} successfully`,
      active: student.active
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student (admin only)
router.delete("/delete/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;

    // Also delete all results for this student
    await Result.deleteMany({ studentMobile: mobile });

    const student = await Student.findOneAndDelete({ mobile });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      success: true,
      message: "Student and all associated results deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Notifications (admin create + list; student active fetch) ====
router.post("/notifications", async (req, res) => {
  try {
    const { message, startDate, endDate } = req.body;
    if (!message || !startDate || !endDate) {
      return res.status(400).json({ error: "message, startDate and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid startDate or endDate" });
    }

    if (start >= end) {
      return res.status(400).json({ error: "startDate must be before endDate" });
    }

    const diffMs = end - start;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      return res.status(400).json({ error: "Notification period cannot exceed 90 days" });
    }

    const newNotification = await new Notification({ message, startDate: start, endDate: end }).save();
    res.json({ success: true, notification: newNotification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/notifications/all", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/notifications/active", async (req, res) => {
  try {
    const now = new Date();
    const active = await Notification.find({ startDate: { $lte: now }, endDate: { $gte: now } }).sort({ startDate: 1 });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
