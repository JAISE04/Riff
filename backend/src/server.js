import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import conversionRoutes from "./routes/conversion.js";
import debugRoutes from "./routes/debug.js";
import { cleanupExpiredFiles } from "./utils/fileManager.js";
import { jobStore } from "./utils/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

// Ensure temp directory exists
const tempPath = path.join(
  __dirname,
  "..",
  process.env.TEMP_FILES_PATH || "./temp"
);
if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true });
}

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for API
  })
);

// Compression for responses
app.use(compression());

// Logging
if (isProduction) {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window (increased for status polling)
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes("/status/"), // Skip rate limit for status checks
});

const convertLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 conversion starts per minute
  message: { error: "Too many conversion requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://localhost:3001"];

// Vercel preview URL pattern (matches any Vercel preview deployment)
const vercelPreviewPattern = /^https:\/\/.*\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Allow if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any Vercel preview deployment
      if (vercelPreviewPattern.test(origin)) {
        return callback(null, true);
      }

      // Allow all in development
      if (!isProduction) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// Apply rate limiting
app.use("/api", apiLimiter);
app.use("/api/convert", convertLimiter);

// Serve temporary files for download
app.use(
  "/downloads",
  express.static(tempPath, {
    setHeaders: (res, filePath) => {
      const filename = path.basename(filePath);
      if (filePath.endsWith(".mp3")) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
      } else if (filePath.endsWith(".zip")) {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
      }
    },
  })
);

// API Routes
app.use("/api", conversionRoutes);

// Debug routes (only in development or with DEBUG env)
if (!isProduction || process.env.ENABLE_DEBUG === "true") {
  app.use("/debug", debugRoutes);
  console.log("🔧 Debug routes enabled at /debug");
}

// Serve frontend in production
if (isProduction) {
  // Check multiple possible frontend paths (Docker vs local)
  const possiblePaths = [
    path.join(__dirname, "..", "..", "frontend", "dist"), // Local dev
    path.join(__dirname, "..", "frontend", "dist"), // Docker /app structure
    "/app/frontend/dist", // Docker absolute
  ];

  let frontendPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      frontendPath = p;
      break;
    }
  }

  if (frontendPath) {
    app.use(express.static(frontendPath));
    app.get("*", (req, res, next) => {
      // Skip API routes and downloads
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/downloads") ||
        req.path === "/health"
      ) {
        return next();
      }
      res.sendFile(path.join(frontendPath, "index.html"));
    });
    console.log(`📦 Serving frontend from: ${frontendPath}`);
  } else {
    console.log("⚠️ Frontend dist not found, API-only mode");
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  const dbStats = jobStore.getStats();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    jobs: dbStats,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({
    error: isProduction ? "Internal server error" : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
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

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("⚠️ Forcing shutdown...");
    process.exit(1);
  }, 10000);
};

// Database stats on startup
const startupStats = jobStore.getStats();
console.log(`📊 Database initialized: ${startupStats.total} jobs in database`);

const server = app.listen(PORT, () => {
  console.log(`🚀 Riff server running on http://localhost:${PORT}`);
  console.log(`📁 Temp files stored in: ${tempPath}`);
  console.log(`💾 Jobs persisted in SQLite database`);
  console.log(`🔒 Environment: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}`);
});

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
