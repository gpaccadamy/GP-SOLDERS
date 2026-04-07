const XLSX = require("xlsx");
const DraftExam = require("../models/DraftExam");
const ScheduledExam = require("../models/ScheduledExam");
const ExamLicense = require("../models/ExamLicense");
const Result = require("../models/Result");

// ── helper: get or create license doc ──
const getLicense = async () => {
  let lic = await ExamLicense.findOne();
  if (!lic) lic = await new ExamLicense().save();
  return lic;
};

// ─────────────────────────────────────────
// UPLOAD EXCEL → DRAFT
// ─────────────────────────────────────────
const uploadExam = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { title, subject, testNumber } = req.body;
    if (!title || !subject || !testNumber)
      return res.status(400).json({ error: "Title, subject and test number required" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (!rows || rows.length === 0)
      return res.status(400).json({ error: "Excel file is empty" });

    const questions = [];
    const SKIP_ANS = ["ANSWER", "ANS", "A / B / C / D", "A/B/C/D", "ANSWER\n(A/B/C/D)"];
    const SKIP_QTEXT = ["type question here", "kannada", "q.no", "1, 2, 3"];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const qText = String(row[1] || "").trim();
      if (!qText) continue;

      const qNoRaw = row[0];
      const qNoNum = Number(String(qNoRaw).trim());
      if (!qNoRaw || isNaN(qNoNum)) continue;

      const qLower = qText.toLowerCase();
      if (SKIP_QTEXT.some((kw) => qLower.includes(kw))) continue;

      const answer = String(row[6] || "").trim().toUpperCase();
      if (SKIP_ANS.includes(answer)) continue;

      if (!["A", "B", "C", "D"].includes(answer))
        return res.status(400).json({
          error: `Row ${i + 1}: Answer must be A/B/C/D. Got: "${row[6]}"`,
        });

      questions.push({
        questionNumber: qNoNum,
        questionText: qText,
        options: {
          A: String(row[2] || "").trim(),
          B: String(row[3] || "").trim(),
          C: String(row[4] || "").trim(),
          D: String(row[5] || "").trim(),
        },
        correctAnswer: answer,
      });
    }

    if (questions.length === 0)
      return res.status(400).json({ error: "No valid questions found in the Excel file" });

    const draft = await new DraftExam({
      title,
      subject,
      testNumber: Number(testNumber),
      totalQuestions: questions.length,
      questions,
    }).save();

    res.json({ success: true, draftId: draft._id, totalQuestions: questions.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to process Excel: " + err.message });
  }
};

// ─────────────────────────────────────────
// DRAFT CRUD
// ─────────────────────────────────────────
const getDrafts = async (req, res) => {
  try {
    res.json(await DraftExam.find().select("-questions").sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
};

const getDraftById = async (req, res) => {
  try {
    const draft = await DraftExam.findById(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json(draft);
  } catch {
    res.status(500).json({ error: "Failed to fetch draft" });
  }
};

const updateDraft = async (req, res) => {
  try {
    const { title, subject, testNumber, questions } = req.body;
    const draft = await DraftExam.findByIdAndUpdate(
      req.params.id,
      { title, subject, testNumber, questions, totalQuestions: questions.length },
      { new: true }
    );
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update draft" });
  }
};

const deleteDraft = async (req, res) => {
  try {
    await DraftExam.findByIdAndDelete(req.params.id);
    res.json({ message: "Draft deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
};

// ─────────────────────────────────────────
// SCHEDULE EXAM
// ─────────────────────────────────────────
const scheduleExam = async (req, res) => {
  try {
    const { scheduledAt, durationMinutes } = req.body;
    if (!scheduledAt || !durationMinutes)
      return res.status(400).json({ error: "scheduledAt and durationMinutes required" });

    const startTime = new Date(scheduledAt);
    if (isNaN(startTime.getTime()))
      return res.status(400).json({ error: "Invalid date" });
    if (startTime <= new Date())
      return res.status(400).json({ error: "Scheduled time must be in the future" });

    // License check
    const license = await getLicense();
    if (license.totalConducted >= license.totalAllowed) {
      return res.status(403).json({
        error: `Exam limit reached! You have used all ${license.totalAllowed} allowed exams. Please contact the company to increase your limit.`,
        limitReached: true,
      });
    }

    const draft = await DraftExam.findById(req.params.draftId);
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    const expiresAt = new Date(startTime.getTime() + Number(durationMinutes) * 60 * 1000);

    // End any existing scheduled/live exam
    await ScheduledExam.updateMany(
      { status: { $in: ["scheduled", "live"] } },
      { status: "ended" }
    );

    const scheduled = await new ScheduledExam({
      title: draft.title,
      subject: draft.subject,
      testNumber: draft.testNumber,
      totalQuestions: draft.totalQuestions,
      durationMinutes: Number(durationMinutes),
      questions: draft.questions,
      status: "scheduled",
      scheduledAt: startTime,
      expiresAt,
    }).save();

    await ExamLicense.updateOne({}, { $inc: { totalConducted: 1 }, updatedAt: new Date() });
    await DraftExam.findByIdAndDelete(req.params.draftId);

    res.json({
      success: true,
      message: "Exam scheduled!",
      examId: scheduled._id,
      scheduledAt: startTime,
      expiresAt,
      licenseUsed: license.totalConducted + 1,
      licenseTotal: license.totalAllowed,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule: " + err.message });
  }
};

// ─────────────────────────────────────────
// SCHEDULED EXAMS LIST & CANCEL
// ─────────────────────────────────────────
const getScheduledExams = async (req, res) => {
  try {
    res.json(await ScheduledExam.find().select("-questions").sort({ scheduledAt: -1 }));
  } catch {
    res.status(500).json({ error: "Failed to fetch" });
  }
};

const cancelExam = async (req, res) => {
  try {
    const exam = await ScheduledExam.findByIdAndUpdate(
      req.params.id,
      { status: "ended" },
      { new: true }
    );
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json({ success: true, message: "Exam cancelled" });
  } catch {
    res.status(500).json({ error: "Failed to cancel" });
  }
};

// ─────────────────────────────────────────
// LICENSE
// ─────────────────────────────────────────
const getLicenseInfo = async (req, res) => {
  try {
    res.json(await getLicense());
  } catch {
    res.status(500).json({ error: "Failed to fetch license" });
  }
};

const updateLicense = async (req, res) => {
  try {
    const { totalAllowed } = req.body;
    await ExamLicense.updateOne({}, { totalAllowed }, { upsert: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update license" });
  }
};

const resetLicenseCount = async (req, res) => {
  try {
    await ExamLicense.updateOne({}, { totalConducted: 0 }, { upsert: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reset conducted count" });
  }
};

// ─────────────────────────────────────────
// ACTIVE EXAM (for students)
// ─────────────────────────────────────────
const getActiveExam = async (req, res) => {
  try {
    const now = new Date();

    // Auto-expire ended exams & delete questions
    const expiredExams = await ScheduledExam.find({
      status: "live",
      expiresAt: { $lt: now },
      questionsDeleted: false,
    });
    for (const exam of expiredExams) {
      await ScheduledExam.findByIdAndUpdate(exam._id, {
        status: "ended",
        questions: [],
        questionsDeleted: true,
      });
    }
    await ScheduledExam.updateMany(
      { status: "live", expiresAt: { $lt: now } },
      { status: "ended" }
    );

    // Auto-activate scheduled exams
    await ScheduledExam.updateMany(
      { status: "scheduled", scheduledAt: { $lte: now }, expiresAt: { $gt: now } },
      { status: "live" }
    );

    const exam = await ScheduledExam.findOne({ status: "live" });
    if (exam) {
      return res.json({
        state: "live",
        exam: {
          _id: exam._id,
          title: exam.title,
          subject: exam.subject,
          testNumber: exam.testNumber,
          totalQuestions: exam.totalQuestions,
          durationMinutes: exam.durationMinutes,
          scheduledAt: exam.scheduledAt,
          expiresAt: exam.expiresAt,
          questions: exam.questions.map((q) => ({
            _id: q._id,
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            options: q.options,
          })),
        },
      });
    }

    const upcoming = await ScheduledExam.findOne({ status: "scheduled" }).sort({ scheduledAt: 1 });
    if (upcoming) {
      return res.json({
        state: "upcoming",
        exam: {
          _id: upcoming._id,
          title: upcoming.title,
          subject: upcoming.subject,
          testNumber: upcoming.testNumber,
          totalQuestions: upcoming.totalQuestions,
          durationMinutes: upcoming.durationMinutes,
          scheduledAt: upcoming.scheduledAt,
          expiresAt: upcoming.expiresAt,
        },
      });
    }

    return res.json({ state: "none", exam: null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exam" });
  }
};

// ─────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────
const getAllResults = async (req, res) => {
  try {
    const results = await Result.find().select("-answers").sort({ submittedAt: -1 });
    res.json(results);
  } catch {
    res.status(500).json({ error: "Failed to fetch results" });
  }
};

const getResultsByExam = async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId })
      .select("-answers")
      .sort({ score: -1 });
    res.json(results);
  } catch {
    res.status(500).json({ error: "Failed to fetch" });
  }
};

module.exports = {
  uploadExam, getDrafts, getDraftById, updateDraft, deleteDraft,
  scheduleExam, getScheduledExams, cancelExam,
  getLicenseInfo, updateLicense, resetLicenseCount,
  getActiveExam, getAllResults, getResultsByExam,
};
