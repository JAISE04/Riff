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

// Try to get download URL using multiple methods
async function getDownloadUrl(videoUrl, videoId) {
  const errors = [];

  // Method 1: Try Cobalt API with correct v10 format
  const cobaltInstances = [
    "https://api.cobalt.tools",
    "https://co.eepy.today"
  ];

  for (const apiBase of cobaltInstances) {
    try {
      console.log(`Trying Cobalt API: ${apiBase}`);
      
      const response = await axios.post(
        `${apiBase}/`,
        {
          url: videoUrl,
          videoQuality: "144",
          audioFormat: "mp3",
          audioBitrate: "320",
          filenameStyle: "basic",
          downloadMode: "audio"
        },
        {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      const data = response.data;
      if (data?.url) {
        console.log(`Got download URL from Cobalt: ${apiBase}`);
        return { url: data.url, type: "direct" };
      }
      if (data?.audio) {
        console.log(`Got audio URL from Cobalt: ${apiBase}`);
        return { url: data.audio, type: "direct" };
      }

    } catch (error) {
      console.log(`Cobalt ${apiBase} failed: ${error.message}`);
      errors.push(`Cobalt: ${error.message}`);
    }
  }

  // Method 2: Try y2mate-style APIs
  const y2mateApis = [
    {
      name: "savefrom",
      search: `https://api.saveservall.xyz/api/info?url=${encodeURIComponent(videoUrl)}`,
    }
  ];

  for (const api of y2mateApis) {
    try {
      console.log(`Trying ${api.name}...`);
      const response = await axios.get(api.search, { timeout: 15000 });
      
      if (response.data?.audio?.url) {
        return { url: response.data.audio.url, type: "direct" };
      }
      if (response.data?.formats) {
        const audioFormat = response.data.formats.find(f => f.mimeType?.includes("audio"));
        if (audioFormat?.url) {
          return { url: audioFormat.url, type: "direct" };
        }
      }
    } catch (error) {
      console.log(`${api.name} failed: ${error.message}`);
      errors.push(`${api.name}: ${error.message}`);
    }
  }

  // Method 3: Use Invidious API (YouTube frontend) to get audio stream
  const invidiousInstances = [
    "https://invidious.fdn.fr",
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de"
  ];

  for (const instance of invidiousInstances) {
    try {
      console.log(`Trying Invidious: ${instance}`);
      const response = await axios.get(
        `${instance}/api/v1/videos/${videoId}`,
        { timeout: 15000 }
      );

      const formats = response.data?.adaptiveFormats || [];
      const audioFormats = formats
        .filter(f => f.type?.includes("audio"))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats.length > 0) {
        console.log(`Got audio URL from Invidious: ${instance}`);
        return { url: audioFormats[0].url, type: "stream" };
      }
    } catch (error) {
      console.log(`Invidious ${instance} failed: ${error.message}`);
      errors.push(`Invidious: ${error.message}`);
    }
  }

  throw new Error(`All download methods failed: ${errors.slice(0, 3).join("; ")}`);
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

    console.log("Getting download URL...");

    // Get download URL using multiple methods
    const downloadInfo = await getDownloadUrl(videoUrl, videoId);
    
    onProgress(30);
    console.log(`Downloading audio file (type: ${downloadInfo.type})...`);

    // Download the audio file
    const response = await axios({
      method: "GET",
      url: downloadInfo.url,
      responseType: "stream",
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
