const express = require("express");
const router = express.Router();
const {
  addTrainingVideo,
  getAllTrainingVideos,
  deleteTrainingVideo,
} = require("../controllers/trainingVideoController");

router.post("/", addTrainingVideo);
router.get("/", getAllTrainingVideos);
router.delete("/:id", deleteTrainingVideo);

module.exports = router;