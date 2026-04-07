const TrainingVideo = require("../models/TrainingVideo");

const extractYoutubeId = (url) => {
  try {
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
    if (url.includes("youtube.com/watch")) return new URL(url).searchParams.get("v");
    if (url.includes("youtube.com/embed/")) return url.split("embed/")[1].split("?")[0];
  } catch (e) {}
  return null;
};

const addTrainingVideo = async (req, res) => {
  try {
    const { title, description, youtubeUrl, category } = req.body;

    if (!title || !youtubeUrl) {
      return res.status(400).json({ message: "Title and YouTube URL are required" });
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      return res.status(400).json({ message: "Invalid YouTube URL" });
    }

    const video = new TrainingVideo({
      title,
      description: description || "",
      youtubeUrl,
      youtubeId,
      category: category || "Training"
    });

    await video.save();
    res.status(201).json({ message: "Training video added successfully", video });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllTrainingVideos = async (req, res) => {
  try {
    const videos = await TrainingVideo.find().sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteTrainingVideo = async (req, res) => {
  try {
    const { id } = req.params;
    await TrainingVideo.findByIdAndDelete(id);
    res.status(200).json({ message: "Training video deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { 
  addTrainingVideo, 
  getAllTrainingVideos, 
  deleteTrainingVideo 
};