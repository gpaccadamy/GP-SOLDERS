const Video = require("../models/Video");

// Extract YouTube ID from URL
const extractYoutubeId = (url) => {
  try {
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
    if (url.includes("youtube.com/watch")) return new URL(url).searchParams.get("v");
    if (url.includes("youtube.com/embed/")) return url.split("embed/")[1].split("?")[0];
  } catch {}
  return null;
};

const addVideo = async (req, res) => {
  try {
    const { subject, videoNumber, title, youtubeUrl } = req.body;
    if (!subject || !videoNumber || !title || !youtubeUrl)
      return res.status(400).json({ message: "All fields are required" });

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId)
      return res.status(400).json({ message: "Invalid YouTube URL" });

    const video = new Video({ subject, videoNumber, title, youtubeUrl, youtubeId });
    await video.save();
    res.status(201).json({ message: "Video added successfully", video });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getVideosBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    const videos = await Video.find({ subject }).sort({ videoNumber: 1 });
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    await Video.findByIdAndDelete(id);
    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { addVideo, getAllVideos, getVideosBySubject, deleteVideo };