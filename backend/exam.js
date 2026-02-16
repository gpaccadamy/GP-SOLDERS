const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/examDB")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// ✅ Question Schema
const QuestionSchema = new mongoose.Schema({
    question: String,
    rawText: String,
    createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.model("Question", QuestionSchema);

// ✅ Make uploads folder path relative to project root
const uploadPath = path.join(__dirname, "../uploads");

// Create uploads folder if not exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

// ✅ Multer Storage
const upload = multer({ dest: uploadPath });

// ✅ Upload Route
app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);

        const text = data.text;

        // Split questions by numbering
        const questions = text
            .split(/\n?\d+\.\s/)
            .filter(q => q.trim() !== "");

        for (let q of questions) {
            await Question.create({
                question: q.trim(),
                rawText: q.trim()
            });
        }

        fs.unlinkSync(req.file.path);

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send("Questions extracted and saved successfully ✅");

    } catch (error) {
        console.error(error);
        res.status(500).send("Error processing PDF");
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
;
