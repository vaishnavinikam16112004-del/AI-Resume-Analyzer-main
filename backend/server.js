import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pdfParse from "pdf-parse";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Analysis from "./models/Analysis.js";
import { analyzeResume } from "./services/analyzer.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// =========================
// AUTHENTICATION MIDDLEWARE
// =========================
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

// =========================
// FILE UPLOAD
// =========================
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported."));
    }
  }
});

// =========================
// MIDDLEWARE
// =========================
const clientUrl = process.env.CLIENT_URL?.trim();
const normalizedClientUrl = clientUrl ? clientUrl.replace(/\/+$/, "") : null;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      clientUrl,
      normalizedClientUrl
    ].filter(Boolean),
    credentials: true
  })
);

app.use(
  express.json({
    limit: "1mb"
  })
);

// =========================
// AUTH ROUTES
// =========================
app.use("/api/auth", authRoutes);

// =========================
// HEALTH CHECK
// =========================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY)
  });
});

// =========================
// GET USER'S HISTORY
// =========================
app.get("/api/history", authenticate, async (req, res) => {
  console.log("🔥 HISTORY API CALLED");
  try {
    console.log("Loading history for user:", req.userId);

    const history = await Analysis.find({
      userId: req.userId
    })
      .sort({ createdAt: -1 })
      .limit(20);

    console.log("History count:", history.length);

    res.json(history);

  } catch (error) {
    console.error("History error:", error);

    res.status(500).json({
      message: "Could not load analysis history."
    });
  }
});

// =========================
// ANALYZE RESUME
// =========================
app.post(
  "/api/analyze",
  authenticate,
  upload.single("resume"),
  async (req, res) => {
    try {

      console.log("Analyzing for user:", req.userId);

      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a PDF resume."
        });
      }

      const pdf = await pdfParse(req.file.buffer);

      const text = pdf.text?.trim();

      if (!text) {
        return res.status(400).json({
          message: "Could not extract readable text from this PDF."
        });
      }

      const result = await analyzeResume(
        text,
        req.body.jobDescription || ""
      );

      // =========================
      // SAVE ANALYSIS
      // =========================

      try {

        const savedAnalysis = await Analysis.create({
          userId: req.userId,
          fileName: req.file.originalname,
          jobDescription: req.body.jobDescription || "",
          result
        });

        console.log(
          "Analysis saved:",
          savedAnalysis._id,
          "User:",
          savedAnalysis.userId
        );

      } catch (dbError) {

        console.warn(
          "MongoDB save skipped:",
          dbError.message
        );
      }

      res.json({
        fileName: req.file.originalname,
        result
      });

    } catch (error) {

      console.error("Analysis error:", error);

      res.status(500).json({
        message: error.message || "Analysis failed."
      });
    }
  }
);

// =========================
// ERROR HANDLER
// =========================
app.use((err, req, res, next) => {

  console.error("Server error:", err);

  res.status(400).json({
    message: err.message || "Request failed."
  });
});

// =========================
// MONGODB + SERVER
// =========================
mongoose
  .connect(
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/ai_resume_analyzer"
  )
  .then(() => {

    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(
        `Backend running on http://localhost:${PORT}`
      );
    });

  })
  .catch((error) => {

    console.error(
      "MongoDB connection error:",
      error.message
    );

    console.warn(
      "Starting API without database."
    );

    app.listen(PORT, () => {
      console.log(
        `Backend running on http://localhost:${PORT}`
      );
    });
  });