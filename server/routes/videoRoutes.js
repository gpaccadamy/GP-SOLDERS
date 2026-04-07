const express = require("express");
const router = express.Router();
const {
  addVideo,
  getAllVideos,
  getVideosBySubject,
  deleteVideo,
} = require("../controllers/videoController");

router.post("/", addVideo);
router.get("/", getAllVideos);
router.get("/subject/:subject", getVideosBySubject);
router.delete("/:id", deleteVideo);

module.exports = router;
