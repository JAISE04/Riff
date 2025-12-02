import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import conversionRoutes from "./routes/conversion.js";
import { cleanupExpiredFiles } from "./utils/fileManager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure temp directory exists
const tempPath = path.join(
  __dirname,
  "..",
  process.env.TEMP_FILES_PATH || "./temp"
);
if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true });
}

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Serve temporary files for download
app.use(
  "/downloads",
  express.static(tempPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp3")) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${path.basename(filePath)}"`
        );
      }
    },
  })
);

// API Routes
app.use("/api", conversionRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Cleanup expired files every 5 minutes
setInterval(() => {
  cleanupExpiredFiles(
    tempPath,
    parseInt(process.env.FILE_EXPIRATION_MINUTES) || 30
  );
}, 5 * 60 * 1000);

// Initial cleanup on startup
cleanupExpiredFiles(
  tempPath,
  parseInt(process.env.FILE_EXPIRATION_MINUTES) || 30
);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Temp files stored in: ${tempPath}`);
});
