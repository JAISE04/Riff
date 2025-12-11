import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jobStore } from "../utils/database.js";
import youtubedl from "youtube-dl-exec";

const execAsync = promisify(exec);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check if command exists
async function checkCommand(command, versionFlag = "--version") {
  try {
    const { stdout } = await execAsync(`${command} ${versionFlag}`);
    return { installed: true, version: stdout.trim().split("\n")[0] };
  } catch (error) {
    return { installed: false, error: error.message };
  }
}

// Main debug endpoint - checks all system requirements
router.get("/", async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    checks: {},
  };

  // 1. Check FFmpeg
  checks.checks.ffmpeg = await checkCommand("ffmpeg", "-version");

  // 2. Check yt-dlp (system-wide OR bundled with youtube-dl-exec)
  const systemYtdlp = await checkCommand("yt-dlp", "--version");
  if (systemYtdlp.installed) {
    checks.checks.ytdlp = systemYtdlp;
  } else {
    // youtube-dl-exec bundles yt-dlp automatically
    checks.checks.ytdlp = {
      installed: true,
      version: "bundled with youtube-dl-exec",
      note: "yt-dlp is bundled and auto-downloaded by youtube-dl-exec package",
    };
  }

  // 3. Check Spotify credentials
  checks.checks.spotify = {
    clientIdSet: !!process.env.SPOTIFY_CLIENT_ID,
    clientSecretSet: !!process.env.SPOTIFY_CLIENT_SECRET,
    clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0,
  };

  // 4. Check temp directory
  const tempPath = path.join(
    __dirname,
    "..",
    "..",
    process.env.TEMP_FILES_PATH || "./temp"
  );
  try {
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(tempPath, ".write-test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);

    const files = fs.readdirSync(tempPath);
    checks.checks.tempDirectory = {
      exists: true,
      writable: true,
      path: tempPath,
      fileCount: files.length,
      files: files.slice(0, 10), // Show first 10 files
    };
  } catch (error) {
    checks.checks.tempDirectory = {
      exists: fs.existsSync(tempPath),
      writable: false,
      error: error.message,
    };
  }

  // 5. Check database
  try {
    const stats = jobStore.getStats();
    checks.checks.database = {
      connected: true,
      ...stats,
    };
  } catch (error) {
    checks.checks.database = {
      connected: false,
      error: error.message,
    };
  }

  // 6. Memory usage
  const memUsage = process.memoryUsage();
  checks.checks.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
  };

  // 7. Uptime
  checks.checks.uptime = {
    seconds: Math.floor(process.uptime()),
    formatted: formatUptime(process.uptime()),
  };

  // Overall status
  const allPassed =
    checks.checks.ffmpeg.installed &&
    checks.checks.ytdlp.installed &&
    checks.checks.spotify.clientIdSet &&
    checks.checks.spotify.clientSecretSet &&
    checks.checks.tempDirectory.writable &&
    checks.checks.database.connected;

  checks.status = allPassed ? "✅ All checks passed" : "❌ Some checks failed";
  checks.ready = allPassed;

  res.json(checks);
});

// Test Spotify API connection
router.get("/spotify", async (req, res) => {
  try {
    const { getSpotifyToken } = await import("../services/spotifyService.js");
    const token = await getSpotifyToken();
    res.json({
      status: "ok",
      message: "Spotify API connection successful",
      tokenLength: token?.length || 0,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Spotify API connection failed",
      error: error.message,
    });
  }
});

// Test YouTube search
router.get("/youtube", async (req, res) => {
  try {
    const ytSearch = await import("yt-search");
    const result = await ytSearch.default("test audio");
    res.json({
      status: "ok",
      message: "YouTube search working",
      resultCount: result.videos?.length || 0,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "YouTube search failed",
      error: error.message,
    });
  }
});

// List active jobs
router.get("/jobs", (req, res) => {
  try {
    const stats = jobStore.getStats();
    res.json({
      status: "ok",
      ...stats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// Clear all temp files (use with caution)
router.post("/clear-temp", (req, res) => {
  const tempPath = path.join(
    __dirname,
    "..",
    "..",
    process.env.TEMP_FILES_PATH || "./temp"
  );
  try {
    const files = fs.readdirSync(tempPath);
    let deleted = 0;
    for (const file of files) {
      try {
        const filePath = path.join(tempPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          fs.unlinkSync(filePath);
          deleted++;
        } else if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true });
          deleted++;
        }
      } catch (e) {
        // Skip files that can't be deleted
      }
    }
    res.json({
      status: "ok",
      message: `Cleared ${deleted} files/folders from temp directory`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

export default router;
