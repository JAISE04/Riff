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

// Get the yt-dlp binary path - use system yt-dlp on Linux, bundled on Windows
const YT_DLP_PATH = isWindows
  ? path.join(__dirname, "../../../node_modules/youtube-dl-exec/bin/yt-dlp.exe")
  : "yt-dlp"; // Use system yt-dlp on Linux (installed via Dockerfile)

// FFmpeg path - use environment variable, or system default on Linux
const FFMPEG_PATH = process.env.FFMPEG_PATH || (isWindows
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

const FFPROBE_PATH = process.env.FFPROBE_PATH || (isWindows
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

// Helper to sanitize filenames
// function sanitizeFilename(name) {
//   return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
// }

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
  const safeTitle = metadata.title ? metadata.title : jobId;
  const tempAudioPath = path.join(TEMP_PATH, `${safeTitle}_temp.webm`);
  const outputPath = path.join(TEMP_PATH, `${safeTitle}.mp3`);

  try {
    onProgress(10);

    // Download audio using yt-dlp with proper path quoting for Windows
    console.log("Starting yt-dlp download...");

    // Get FFmpeg bin directory for yt-dlp
    const ffmpegDir = isWindows ? path.dirname(FFMPEG_PATH) : "/usr/bin";

    // Build command - handle Windows vs Linux path quoting
    let ytDlpCmd;
    if (isWindows) {
      ytDlpCmd = `"${YT_DLP_PATH}" "${videoUrl}" -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-check-certificates --no-warnings --ffmpeg-location "${ffmpegDir}"`;
    } else {
      // On Linux, use system yt-dlp without quotes around the command
      ytDlpCmd = `${YT_DLP_PATH} "${videoUrl}" -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-check-certificates --no-warnings`;
    }

    console.log(`Executing: ${ytDlpCmd}`);
    await execAsync(ytDlpCmd, { shell: true, maxBuffer: 10 * 1024 * 1024 });

    console.log("Download and conversion complete!");
    onProgress(90);

    // Clean up temp file if exists
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }

    // Add ID3 tags
    await tagMP3File(outputPath, metadata);
    onProgress(100);

    // Get file size
    const stats = fs.statSync(outputPath);

    return {
      filename: `${safeTitle}.mp3`,
      path: outputPath,
      fileSize: stats.size,
    };
  } catch (error) {
    // Cleanup on error
    [tempAudioPath, outputPath].forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
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
