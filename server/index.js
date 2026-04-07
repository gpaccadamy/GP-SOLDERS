const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const videoRoutes = require("./routes/videoRoutes");
const examRoutes = require("./routes/examRoutes");
const studentRoutes = require("./routes/studentRoutes");
const trainingVideoRoutes = require("./routes/trainingVideoRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve React build static files
app.use(express.static(path.join(__dirname, "../client/build")));

// Routes
app.use("/api/videos", videoRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/training-videos", trainingVideoRoutes);

// SPA fallback: return index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

// Print registered routes for debugging
const registeredRoutes = app._router.stack
  .filter((layer) => layer.route)
  .map((layer) => {
    const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
    return `${methods} ${layer.route.path}`;
  });
console.log("📍 Registered routes:", registeredRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
