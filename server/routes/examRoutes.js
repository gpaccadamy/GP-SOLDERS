const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  uploadExam, getDrafts, getDraftById, updateDraft, deleteDraft,
  scheduleExam, getScheduledExams, cancelExam,
  getLicenseInfo, updateLicense, resetLicenseCount,
  getActiveExam, getAllResults, getResultsByExam,
} = require("../controllers/examController");  // ✅ FIXED - lowercase 'examController'

const upload = multer({ storage: multer.memoryStorage() });

// Draft routes
router.post("/upload-exam", upload.single("examFile"), uploadExam);
router.get("/drafts", getDrafts);
router.get("/drafts/:id", getDraftById);
router.put("/drafts/:id", updateDraft);
router.delete("/drafts/:id", deleteDraft);

// Schedule routes
router.post("/schedule/:draftId", scheduleExam);
router.get("/scheduled-exams", getScheduledExams);
router.post("/cancel-exam/:id", cancelExam);

// License routes
router.get("/license", getLicenseInfo);
router.put("/license", updateLicense);
router.post("/license/reset-count", resetLicenseCount);

// Active exam (students)
router.get("/active-exam", getActiveExam);

// Results
router.get("/all-results", getAllResults);
router.get("/results-by-exam/:examId", getResultsByExam);

module.exports = router;