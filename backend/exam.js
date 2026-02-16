const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// ============================
// Middleware
// ============================
app.use(cors());
app.use(express.json());

// ============================
// MongoDB Atlas Connection
// ============================

// ⚠️ IMPORTANT:
// In Render → Environment → Add Environment Variable:
// MONGO_URI = your mongodb atlas connection string

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ Mongo Error:", err));

// ============================
// Schema
// ============================

const QuestionSchema = new mongoose.Schema({
    question: String,
    rawText: String,
    createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.model("Question", QuestionSchema);

// ============================
// Ensure Uploads Folder Exists
// ============================

const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

// ============================
// Multer Setup
// ============================

const upload = multer({ dest: uploadPath });

// ============================
// Test Route
// ============================

app.get("/", (req, res) => {
    res.send("Backend working ✅");
});

// ============================
// Upload Route
// ============================

app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);

        const text = data.text;

        // Split by numbering (1. 2. 3.)
        const questions = text
            .split(/\n?\d+\.\s/)
            .filter(q => q.trim() !== "");

        for (let q of questions) {
            await Question.create({
                question: q.trim(),
                rawText: q.trim()
            });
        }

        // Delete uploaded file
        fs.unlinkSync(req.file.path);

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(`✅ ${questions.length} Questions saved successfully`);

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send("Server error while processing PDF");
    }
});

// ============================
// Start Server (Render Ready)
// ============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
