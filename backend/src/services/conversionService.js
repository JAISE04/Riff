import { exec } from "child_process";
import { promisify } from "util";
import ffmpegLib from "fluent-ffmpeg";
import NodeID3 from "node-id3";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

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

// Cobalt API instances (free, open-source YouTube download service)
const COBALT_APIS = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekmiki.com", 
  "https://cobalt.api.timelessnesses.me"
];

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

// Try to get download URL from Cobalt API
async function getCobaltDownloadUrl(videoUrl) {
  for (const apiBase of COBALT_APIS) {
    try {
      console.log(`Trying Cobalt API: ${apiBase}`);
      
      const response = await axios.post(
        `${apiBase}/`,
        {
          url: videoUrl,
          downloadMode: "audio",
          audioFormat: "mp3",
          audioBitrate: "320"
        },
        {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      if (response.data?.url) {
        console.log(`Got download URL from ${apiBase}`);
        return response.data.url;
      }
      
      if (response.data?.status === "tunnel" || response.data?.status === "redirect") {
        return response.data.url;
      }

    } catch (error) {
      console.log(`Cobalt API ${apiBase} failed: ${error.message}`);
      continue;
    }
  }
  throw new Error("All Cobalt API instances failed");
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
  const tempAudioPath = path.join(TEMP_PATH, `${jobId}_temp.mp3`);

  try {
    onProgress(10);

    console.log("Getting download URL from Cobalt API...");

    // Get download URL from Cobalt
    const downloadUrl = await getCobaltDownloadUrl(videoUrl);
    
    onProgress(30);
    console.log("Downloading audio file...");

    // Download the audio file
    const response = await axios({
      method: "GET",
      url: downloadUrl,
      responseType: "stream",
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    // Write to temp file
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempAudioPath);
      response.data.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    console.log("Download complete!");
    onProgress(70);

    // Check if we need to convert or just rename
    const fileSize = fs.statSync(tempAudioPath).size;
    if (fileSize < 1000) {
      throw new Error("Downloaded file is too small, download may have failed");
    }

    // Ensure it's proper MP3 format with ffmpeg
    await new Promise((resolve, reject) => {
      ffmpegLib(tempAudioPath)
        .audioBitrate(320)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .on("progress", (progress) => {
          const percent = Math.floor(70 + (progress.percent || 0) * 0.2);
          onProgress(Math.min(percent, 90));
        })
        .on("error", (err) => {
          console.error("FFmpeg conversion error:", err.message);
          reject(err);
        })
        .on("end", () => {
          console.log("MP3 processing complete!");
          resolve();
        })
        .save(outputPath);
    });

    // Clean up temp file
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
