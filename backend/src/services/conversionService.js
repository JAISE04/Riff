import { exec } from "child_process";
import { promisify } from "util";
import ffmpegLib from "fluent-ffmpeg";
import NodeID3 from "node-id3";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { getSpotifyToken } from "./spotifyService.js";

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

// Search for song on JioSaavn using the unofficial API
async function searchJioSaavn(title, artist) {
  try {
    const query = `${title} ${artist}`.trim();
    console.log(`[JioSaavn] Searching for: ${query}`);
    
    // Use the saavn.dev API (unofficial but reliable)
    const searchUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=5`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      },
      timeout: 15000
    });

    console.log(`[JioSaavn] Response status: ${response.status}`);

    const songs = response.data?.data?.results || [];
    console.log(`[JioSaavn] Found ${songs.length} songs`);
    
    if (songs.length > 0) {
      const song = songs[0];
      console.log(`[JioSaavn] Top result:`, {
        name: song.name,
        artist: song.artists?.map(a => a.name).join(", "),
        downloadUrlCount: song.downloadUrl?.length || 0
      });
      
      // The API returns download URLs directly
      const downloadUrls = song.downloadUrl || [];
      
      if (downloadUrls.length > 0) {
        console.log(`[JioSaavn] Available qualities:`, downloadUrls.map(d => ({ quality: d.quality, hasUrl: !!d.url })));
      }
      
      // Get highest quality available (prefer 320kbps)
      const highQuality = downloadUrls.find(d => d.quality === "320kbps");
      const medQuality = downloadUrls.find(d => d.quality === "160kbps");
      const lowQuality = downloadUrls.find(d => d.quality === "96kbps");
      
      const bestUrl = highQuality?.url || medQuality?.url || lowQuality?.url;
      
      if (bestUrl) {
        console.log(`[JioSaavn] ✓ Found song: ${song.name} (${highQuality ? '320kbps' : medQuality ? '160kbps' : '96kbps'})`);
        return { url: bestUrl, source: "jiosaavn" };
      } else {
        console.log(`[JioSaavn] Song found but no valid URL`);
      }
    }
  } catch (error) {
    console.log(`[JioSaavn] ✗ Failed: ${error.message}`);
  }
  return null;
}

// Search using Deezer (has good coverage and allows preview streams)
async function searchDeezer(title, artist) {
  try {
    const query = `${title} ${artist}`.trim();
    console.log(`[Deezer] Searching for: ${query}`);
    
    const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 15000
    });

    const tracks = response.data?.data || [];
    console.log(`[Deezer] Found ${tracks.length} tracks`);
    
    if (tracks.length > 0) {
      const track = tracks[0];
      // Deezer provides 30-second preview URL (low quality but works)
      if (track.preview) {
        console.log(`[Deezer] ✓ Found: ${track.title} by ${track.artist?.name}`);
        return { url: track.preview, source: "deezer-preview" };
      }
    }
  } catch (error) {
    console.log(`[Deezer] ✗ Failed: ${error.message}`);
  }
  return null;
}

// Get preview URL directly from Spotify metadata (if available)
async function searchSpotifyPreview(title, artist, spotifyId) {
  try {
    console.log(`[Spotify Preview] Checking for audio preview`);
    
    // Note: The preview_url should be in the metadata already
    // This is a fallback if metadata includes preview
    // For now, we'll return null since we need the actual preview URL from metadata
    return null;
  } catch (error) {
    console.log(`[Spotify Preview] ✗ Failed: ${error.message}`);
  }
  return null;
}

// Try using Spotisaver's API as a fallback (if available)
async function searchSpotisaver(title, artist) {
  try {
    const query = `${title} ${artist}`.trim();
    console.log(`[Spotisaver] Searching for: ${query}`);
    
    // Try different potential Spotisaver API endpoints
    const endpoints = [
      `https://api.spotisaver.com/download?query=${encodeURIComponent(query)}`,
      `https://spotisaver.net/api/search?q=${encodeURIComponent(query)}`,
      `https://spotisaver.xyz/api/download?track=${encodeURIComponent(query)}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          timeout: 10000
        });
        
        if (response.data?.url || response.data?.downloadUrl) {
          const downloadUrl = response.data?.url || response.data?.downloadUrl;
          console.log(`[Spotisaver] ✓ Found via ${endpoint}`);
          return { url: downloadUrl, source: "spotisaver" };
        }
      } catch (e) {
        // Try next endpoint
      }
    }
    console.log(`[Spotisaver] ✗ Not found on any endpoint`);
  } catch (error) {
    console.log(`[Spotisaver] ✗ Failed: ${error.message}`);
  }
  return null;
}

// Get download URL from YouTube via Piped/Invidious
async function getYouTubeUrl(videoId) {
  const errors = [];

  // Piped instances - updated list
  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.r4fo.com", 
    "https://api.piped.privacydev.net"
  ];

  for (const instance of pipedInstances) {
    try {
      console.log(`[Piped] Trying: ${instance}`);
      const response = await axios.get(
        `${instance}/streams/${videoId}`,
        { 
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0" }
        }
      );

      const audioStreams = response.data?.audioStreams || [];
      console.log(`[Piped] Got ${audioStreams.length} audio streams from ${instance}`);
      const sortedAudio = audioStreams
        .filter(s => s.mimeType?.includes("audio"))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (sortedAudio.length > 0) {
        console.log(`[Piped] ✓ Got audio from ${instance}`);
        return { url: sortedAudio[0].url, source: "youtube" };
      }
    } catch (error) {
      console.log(`[Piped] ✗ ${instance}: ${error.message}`);
      errors.push(error.message);
    }
  }

  // Invidious instances - updated list
  const invidiousInstances = [
    "https://inv.nadeko.net",
    "https://invidious.privacydev.net",
    "https://invidious.slipfox.xyz"
  ];

  for (const instance of invidiousInstances) {
    try {
      console.log(`[Invidious] Trying: ${instance}`);
      const response = await axios.get(
        `${instance}/api/v1/videos/${videoId}`,
        { 
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0" }
        }
      );

      const formats = response.data?.adaptiveFormats || [];
      console.log(`[Invidious] Got ${formats.length} adaptive formats from ${instance}`);
      const audioFormats = formats
        .filter(f => f.type?.includes("audio"))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats.length > 0) {
        console.log(`[Invidious] ✓ Got audio from ${instance}`);
        return { url: audioFormats[0].url, source: "youtube" };
      }
    } catch (error) {
      console.log(`[Invidious] ✗ ${instance}: ${error.message}`);
      errors.push(error.message);
    }
  }

  console.log(`[YouTube] ✗ All instances failed`);
  return null;
}

// Main function to get audio URL from multiple sources
async function getAudioUrl(metadata, videoId) {
  const { title, artist, spotifyId } = metadata;
  
  // Try multiple sources in parallel for speed
  console.log("Searching multiple audio sources...");
  
  const results = await Promise.allSettled([
    searchSpotifyPreview(title, artist, spotifyId),
    searchDeezer(title, artist),
    searchJioSaavn(title, artist),
    searchSpotisaver(title, artist),
    getYouTubeUrl(videoId)
  ]);

  console.log(`[Audio Sources Summary]`);
  console.log(`  Spotify Preview: ${results[0].status === "fulfilled" ? (results[0].value ? "✓ Found" : "✗ Not found") : "✗ Error"}`);
  console.log(`  Deezer: ${results[1].status === "fulfilled" ? (results[1].value ? "✓ Found" : "✗ Not found") : "✗ Error"}`);
  console.log(`  JioSaavn: ${results[2].status === "fulfilled" ? (results[2].value ? "✓ Found" : "✗ Not found") : "✗ Error"}`);
  console.log(`  Spotisaver: ${results[3].status === "fulfilled" ? (results[3].value ? "✓ Found" : "✗ Not found") : "✗ Error"}`);
  console.log(`  YouTube: ${results[4].status === "fulfilled" ? (results[4].value ? "✓ Found" : "✗ Not found") : "✗ Error"}`);
  
  if (results[0].reason) console.log(`  Spotify Preview error: ${results[0].reason.message}`);
  if (results[1].reason) console.log(`  Deezer error: ${results[1].reason.message}`);
  if (results[2].reason) console.log(`  JioSaavn error: ${results[2].reason.message}`);
  if (results[3].reason) console.log(`  Spotisaver error: ${results[3].reason.message}`);
  if (results[4].reason) console.log(`  YouTube error: ${results[4].reason.message}`);

  // Check results in order of preference (full songs first, previews last)
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.url) {
      // Skip Spotify/Deezer preview if we have better options
      if (result.value.source === "spotify-preview" || result.value.source === "deezer-preview") {
        continue; // Try other sources first
      }
      console.log(`Using audio source: ${result.value.source}`);
      return result.value;
    }
  }

  // If only preview is available, use it as last resort
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.url) {
      console.log(`Using audio source (fallback to preview): ${result.value.source}`);
      return result.value;
    }
  }

  throw new Error("Could not find audio from any source. The song may not be available for download.");
}

// Download audio from YouTube and convert to MP3
export async function downloadAndConvert(
  youtubeMatch,
  metadata,
  jobId,
  onProgress
) {
  const { videoId } = youtubeMatch;

  console.log(`Starting download for video: ${videoId}`);
  console.log(`Song: ${metadata.title} by ${metadata.artist}`);

  const outputPath = path.join(TEMP_PATH, `${jobId}.mp3`);
  const tempAudioPath = path.join(TEMP_PATH, `${jobId}_temp.audio`);

  try {
    onProgress(10);

    console.log("Searching multiple audio sources...");

    // Get audio URL from multiple sources (JioSaavn, SoundCloud, YouTube)
    const audioInfo = await getAudioUrl(metadata, videoId);
    
    onProgress(30);
    console.log(`Downloading from ${audioInfo.source}...`);

    // Download the audio file
    const response = await axios({
      method: "GET",
      url: audioInfo.url,
      responseType: "stream",
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        "Connection": "keep-alive"
      },
      maxRedirects: 5
    });

    // Write to temp file
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempAudioPath);
      response.data.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    console.log("Download complete!");
    onProgress(60);

    // Check file size
    const fileSize = fs.statSync(tempAudioPath).size;
    if (fileSize < 10000) {
      throw new Error("Downloaded file is too small, may have failed");
    }

    console.log(`Downloaded ${(fileSize / 1024 / 1024).toFixed(2)} MB, converting to MP3...`);

    // Convert to proper MP3 format with ffmpeg
    await new Promise((resolve, reject) => {
      ffmpegLib(tempAudioPath)
        .audioBitrate(320)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .on("progress", (progress) => {
          const percent = Math.floor(60 + (progress.percent || 0) * 0.3);
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
    for (const file of [tempAudioPath, outputPath]) {
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (e) { }
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
