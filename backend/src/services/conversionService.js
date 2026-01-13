import { exec } from "child_process";
import { promisify } from "util";
import ffmpegLib from "fluent-ffmpeg";
import NodeID3 from "node-id3";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import play from "play-dl";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_PATH = path.join(
  __dirname,
  "../../",
  process.env.TEMP_FILES_PATH || "./temp"
);

const isWindows = process.platform === "win32";

// FFmpeg path - use environment variable, or system default on Linux
const FFMPEG_PATH =
  process.env.FFMPEG_PATH ||
  (isWindows
    ? path.join(
        os.homedir(),
        "AppData",
        "Local",
        "Microsoft",
        "WinGet",
        "Packages",
        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "ffmpeg-8.0.1-full_build",
        "bin",
        "ffmpeg.exe"
      )
    : "ffmpeg"); // Use system ffmpeg on Linux

const FFPROBE_PATH =
  process.env.FFPROBE_PATH ||
  (isWindows
    ? path.join(
        os.homedir(),
        "AppData",
        "Local",
        "Microsoft",
        "WinGet",
        "Packages",
        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "ffmpeg-8.0.1-full_build",
        "bin",
        "ffprobe.exe"
      )
    : "ffprobe"); // Use system ffprobe on Linux

// Set FFmpeg paths for fluent-ffmpeg
ffmpegLib.setFfmpegPath(FFMPEG_PATH);
ffmpegLib.setFfprobePath(FFPROBE_PATH);

// Ensure temp directory exists
if (!fs.existsSync(TEMP_PATH)) {
  fs.mkdirSync(TEMP_PATH, { recursive: true });
}

// Helper to sanitize filenames - remove problematic characters
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "") // Remove illegal chars
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "") // Remove zero-width and directional chars
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "") // Keep only printable chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .substring(0, 100); // Limit length
}

// Download audio from YouTube and convert to MP3
export async function downloadAndConvert(
  youtubeMatch,
  metadata,
  jobId,
  onProgress
) {
  const { videoId } = youtubeMatch;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`Starting download for video: ${videoId}`);
  console.log(`Video URL: ${videoUrl}`);

  // Use sanitized title for filename, fallback to jobId if title is missing
  const safeTitle = metadata.title ? sanitizeFilename(metadata.title) : jobId;
  // Use jobId for the actual file to avoid path issues, rename later
  const outputPath = path.join(TEMP_PATH, `${jobId}.mp3`);
  const tempAudioPath = path.join(TEMP_PATH, `${jobId}_temp.webm`);

  try {
    onProgress(10);

    console.log("Starting download with play-dl...");

    // Get stream using play-dl (handles YouTube bot detection better)
    const stream = await play.stream(videoUrl, { quality: 2 }); // quality 2 = highest audio
    
    onProgress(20);

    // Write stream to temp file
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempAudioPath);
      
      stream.stream.on("error", (err) => {
        console.error("play-dl stream error:", err.message);
        reject(err);
      });

      writeStream.on("error", reject);
      writeStream.on("finish", resolve);

      stream.stream.pipe(writeStream);
    });

    console.log("Download complete, converting to MP3...");
    onProgress(60);

    // Convert to MP3 using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpegLib(tempAudioPath)
        .audioBitrate(320)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .on("progress", (progress) => {
          const percent = Math.floor(60 + (progress.percent || 0) * 0.3); // 60-90%
          onProgress(Math.min(percent, 90));
        })
        .on("error", (err) => {
          console.error("FFmpeg conversion error:", err.message);
          reject(err);
        })
        .on("end", () => {
          console.log("MP3 conversion complete!");
          resolve();
        })
        .save(outputPath);
    });

    // Clean up temp audio file
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }

    onProgress(90);

    // Add ID3 tags
    await tagMP3File(outputPath, metadata);
    onProgress(100);

    // Get file size
    const stats = fs.statSync(outputPath);

    return {
      filename: `${jobId}.mp3`,
      path: outputPath,
      fileSize: stats.size,
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempAudioPath)) {
      try {
        fs.unlinkSync(tempAudioPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

// Add ID3 tags to MP3 file
async function tagMP3File(filePath, metadata) {
  const tags = {
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album || "Unknown Album",
    year: metadata.releaseDate ? metadata.releaseDate.split("-")[0] : undefined,
    trackNumber: metadata.trackNumber?.toString(),
  };

  // Download and embed cover art if available
  if (metadata.coverUrl) {
    try {
      const response = await axios.get(metadata.coverUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      tags.image = {
        mime: "image/jpeg",
        type: { id: 3, name: "front cover" },
        description: "Cover",
        imageBuffer: Buffer.from(response.data),
      };
    } catch (error) {
      console.warn("Failed to download cover art:", error.message);
    }
  }

  // Write tags to file
  const success = NodeID3.write(tags, filePath);

  if (!success) {
    console.warn("Failed to write ID3 tags to file");
  }

  return success;
}
