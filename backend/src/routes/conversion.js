import express from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import {
  getSpotifyMetadata,
  getPlaylistMetadata,
} from "../services/spotifyService.js";
import {
  findYouTubeMatch,
  getYouTubeMetadata,
} from "../services/youtubeService.js";
import { downloadAndConvert } from "../services/conversionService.js";
import { getDownloadUrl, getTempDir } from "../utils/fileManager.js";
import { jobStore } from "../utils/database.js";

const router = express.Router();

// Detect URL type
function detectUrlType(url) {
  const spotifyTrackRegex =
    /^https?:\/\/(open\.)?spotify\.com\/track\/([a-zA-Z0-9]+)/i;
  const spotifyPlaylistRegex =
    /^https?:\/\/(open\.)?spotify\.com\/playlist\/([a-zA-Z0-9]+)/i;
  const youtubeRegex =
    /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i;

  const spotifyTrackMatch = url.match(spotifyTrackRegex);
  if (spotifyTrackMatch) {
    return { type: "spotify", id: spotifyTrackMatch[2] };
  }

  const spotifyPlaylistMatch = url.match(spotifyPlaylistRegex);
  if (spotifyPlaylistMatch) {
    return { type: "spotify-playlist", id: spotifyPlaylistMatch[2] };
  }

  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { type: "youtube", id: youtubeMatch[4] };
  }

  return null;
}

// Start a new conversion
router.post("/convert", async (req, res) => {
  const { spotifyUrl } = req.body;

  if (!spotifyUrl) {
    return res.status(400).json({
      error: "URL is required",
      message: "Please provide a valid Spotify or YouTube URL",
    });
  }

  // Detect URL type
  const urlInfo = detectUrlType(spotifyUrl);

  if (!urlInfo) {
    return res.status(400).json({
      error: "Invalid URL",
      message:
        "Please provide a valid Spotify track/playlist or YouTube video URL",
    });
  }

  const jobId = uuidv4();

  // Create job in SQLite database
  jobStore.create({
    id: jobId,
    status: "pending",
    step: "Initializing...",
    progress: 0,
    urlType: urlInfo.type,
    sourceId: urlInfo.id,
  });

  res.json({
    jobId,
    message: "Conversion started",
    status: "pending",
  });

  // Process conversion asynchronously
  if (urlInfo.type === "spotify") {
    processSpotifyConversion(jobId, urlInfo.id, spotifyUrl);
  } else if (urlInfo.type === "spotify-playlist") {
    processPlaylistConversion(jobId, urlInfo.id, spotifyUrl);
  } else {
    processYouTubeConversion(jobId, urlInfo.id, spotifyUrl);
  }
});

// Check conversion status
router.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = jobStore.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
      message: "Conversion job not found or has expired",
    });
  }

  res.json(job);
});

// Get server stats (for monitoring)
router.get("/stats", (req, res) => {
  const stats = jobStore.getStats();
  res.json(stats);
});

// Process conversion in background
async function processSpotifyConversion(jobId, trackId, spotifyUrl) {
  const updateJob = (updates) => {
    jobStore.update(jobId, updates);
  };

  try {
    // Step 1: Fetch Spotify metadata
    updateJob({ step: "Fetching track metadata...", progress: 10 });

    const metadata = await getSpotifyMetadata(trackId);

    updateJob({
      step: "Metadata retrieved",
      progress: 25,
      metadata: {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        coverUrl: metadata.coverUrl,
        duration: metadata.duration,
      },
    });

    // Step 2: Find YouTube match
    updateJob({ step: "Finding audio source...", progress: 35 });

    const youtubeMatch = await findYouTubeMatch(metadata);

    if (!youtubeMatch) {
      throw new Error("Could not find a matching audio source for this track");
    }

    // Try to extract artist from YouTube title if Spotify didn't provide it
    if (metadata.artist === "Unknown Artist" && youtubeMatch.title) {
      const ytTitle = youtubeMatch.title;
      // Common patterns: "Artist - Song", "Artist | Song", "Song by Artist"
      const patterns = [
        /^(.+?)\s*[-–—|]\s*.+/, // "Artist - Song" or "Artist | Song"
        /^.+?\s+by\s+(.+?)(?:\s*[\(\[]|$)/i, // "Song by Artist"
      ];

      for (const pattern of patterns) {
        const match = ytTitle.match(pattern);
        if (match && match[1]) {
          const potentialArtist = match[1]
            .trim()
            .replace(/\s*(official|audio|video|music|lyrics|hd|hq|4k)\s*/gi, "")
            .trim();
          if (
            potentialArtist &&
            potentialArtist.length > 1 &&
            potentialArtist.length < 50
          ) {
            metadata.artist = potentialArtist;
            console.log(`Extracted artist from YouTube: ${metadata.artist}`);
            break;
          }
        }
      }
    }

    // Update metadata with possibly new artist info
    updateJob({
      metadata: {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        coverUrl: metadata.coverUrl,
        duration: metadata.duration,
      },
    });

    updateJob({ step: "Source found, starting download...", progress: 50 });

    // Step 3: Download and convert to MP3
    updateJob({ step: "Converting to MP3...", progress: 60 });

    const result = await downloadAndConvert(
      youtubeMatch,
      metadata,
      jobId,
      (progress) => {
        updateJob({
          step: progress < 90 ? "Encoding MP3..." : "Finalizing...",
          progress: 60 + Math.floor(progress * 0.35),
        });
      }
    );

    // Step 4: Generate download URL
    const downloadUrl = getDownloadUrl(result.filename);
    const sanitizedFilename = `${metadata.artist} - ${metadata.title}.mp3`
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    updateJob({
      status: "completed",
      step: "Ready for download!",
      progress: 100,
      downloadUrl,
      filename: sanitizedFilename,
      fileSize: result.fileSize,
      quality: "320kbps",
      completedAt: Date.now(),
    });

    // Job auto-cleanup handled by SQLite database
  } catch (error) {
    console.error("Conversion error:", error);
    updateJob({
      status: "error",
      step: "Conversion failed",
      progress: 0,
      error: error.message || "An unexpected error occurred during conversion",
    });
  }
}

// Process YouTube conversion
async function processYouTubeConversion(jobId, videoId, youtubeUrl) {
  const updateJob = (updates) => {
    jobStore.update(jobId, updates);
  };

  try {
    // Step 1: Fetch YouTube metadata
    updateJob({ step: "Fetching video metadata...", progress: 10 });

    const metadata = await getYouTubeMetadata(videoId);

    updateJob({
      step: "Metadata retrieved",
      progress: 30,
      metadata: {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        coverUrl: metadata.coverUrl,
        duration: metadata.duration,
      },
    });

    const youtubeMatch = {
      videoId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: metadata.title,
    };

    updateJob({ step: "Starting download...", progress: 50 });

    // Step 2: Download and convert to MP3
    updateJob({ step: "Converting to MP3...", progress: 60 });

    const result = await downloadAndConvert(
      youtubeMatch,
      metadata,
      jobId,
      (progress) => {
        updateJob({
          step: progress < 90 ? "Encoding MP3..." : "Finalizing...",
          progress: 60 + Math.floor(progress * 0.35),
        });
      }
    );

    // Step 3: Generate download URL
    const downloadUrl = getDownloadUrl(result.filename);
    const sanitizedFilename = `${metadata.artist} - ${metadata.title}.mp3`
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    updateJob({
      status: "completed",
      step: "Ready for download!",
      progress: 100,
      downloadUrl,
      filename: sanitizedFilename,
      fileSize: result.fileSize,
      quality: "320kbps",
      completedAt: Date.now(),
    });

    // Job auto-cleanup handled by SQLite database
  } catch (error) {
    console.error("YouTube conversion error:", error);
    updateJob({
      status: "error",
      step: "Conversion failed",
      progress: 0,
      error: error.message || "An unexpected error occurred during conversion",
    });
  }
}

// Process Spotify Playlist conversion with PARALLEL downloads
async function processPlaylistConversion(jobId, playlistId, spotifyUrl) {
  const updateJob = (updates) => {
    jobStore.update(jobId, updates);
  };

  const tempDir = getTempDir();
  const playlistDir = path.join(tempDir, `playlist-${jobId}`);
  const downloadedFiles = [];

  // Concurrency settings
  const CONCURRENT_DOWNLOADS = 4; // Number of parallel downloads

  try {
    // Create playlist directory
    if (!fs.existsSync(playlistDir)) {
      fs.mkdirSync(playlistDir, { recursive: true });
    }

    // Step 1: Fetch playlist metadata
    updateJob({ step: "Fetching playlist info...", progress: 5 });

    const playlist = await getPlaylistMetadata(playlistId);

    updateJob({
      step: `Found ${playlist.totalTracks} tracks`,
      progress: 10,
      metadata: {
        title: playlist.name,
        artist: playlist.owner,
        album: `${playlist.totalTracks} tracks`,
        coverUrl: playlist.coverUrl,
        isPlaylist: true,
        totalTracks: playlist.totalTracks,
      },
      playlistInfo: {
        name: playlist.name,
        totalTracks: playlist.totalTracks,
        completedTracks: 0,
        failedTracks: 0,
        inProgress: 0,
      },
    });

    // Step 2: Process tracks in parallel batches
    let completedTracks = 0;
    let failedTracks = 0;
    let inProgress = 0;
    const failedTrackNames = [];
    const trackResults = new Array(playlist.tracks.length).fill(null);

    // Helper function to download a single track
    const downloadTrack = async (track, index) => {
      try {
        // Find YouTube match
        const youtubeMatch = await findYouTubeMatch({
          title: track.title,
          artist: track.artist,
          duration: track.duration,
        });

        if (!youtubeMatch) {
          throw new Error("No match found");
        }

        // Download and convert
        const result = await downloadAndConvert(
          youtubeMatch,
          track,
          `${jobId}-track-${index}`,
          () => {} // No progress callback for individual tracks
        );

        // Move file to playlist directory with proper name
        const sanitizedName = `${String(index + 1).padStart(2, "0")} - ${
          track.artist
        } - ${track.title}.mp3`
          .replace(/[<>:"/\\|?*]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const newFilePath = path.join(playlistDir, sanitizedName);

        // Copy the file to playlist directory
        const originalPath = path.join(tempDir, result.filename);
        fs.copyFileSync(originalPath, newFilePath);
        fs.unlinkSync(originalPath); // Remove original

        return { success: true, filePath: newFilePath, index };
      } catch (trackError) {
        console.error(
          `Failed to download track ${track.title}:`,
          trackError.message
        );
        return { success: false, trackName: track.title, index };
      }
    };

    // Process tracks in parallel with concurrency limit
    const processInBatches = async () => {
      const queue = playlist.tracks.map((track, index) => ({ track, index }));
      const activePromises = new Map();

      const updateProgress = () => {
        const overallProgress =
          10 +
          Math.floor(
            ((completedTracks + failedTracks) / playlist.tracks.length) * 80
          );
        const currentTracks = Array.from(activePromises.values())
          .map((t) => t.title)
          .slice(0, 3);

        updateJob({
          step: `Downloading ${inProgress} tracks... (${
            completedTracks + failedTracks
          }/${playlist.totalTracks})`,
          progress: overallProgress,
          playlistInfo: {
            name: playlist.name,
            totalTracks: playlist.totalTracks,
            completedTracks,
            failedTracks,
            inProgress,
            currentTracks: currentTracks.join(", "),
          },
        });
      };

      while (queue.length > 0 || activePromises.size > 0) {
        // Start new downloads up to concurrency limit
        while (queue.length > 0 && activePromises.size < CONCURRENT_DOWNLOADS) {
          const { track, index } = queue.shift();
          inProgress++;
          updateProgress();

          const promise = downloadTrack(track, index).then((result) => {
            activePromises.delete(index);
            inProgress--;

            if (result.success) {
              completedTracks++;
              trackResults[result.index] = result.filePath;
            } else {
              failedTracks++;
              failedTrackNames.push(result.trackName);
            }

            updateProgress();
            return result;
          });

          activePromises.set(index, { promise, title: track.title });
        }

        // Wait for at least one to complete before continuing
        if (activePromises.size > 0) {
          await Promise.race(
            Array.from(activePromises.values()).map((p) => p.promise)
          );
        }
      }
    };

    await processInBatches();

    // Collect successfully downloaded files in order
    for (const filePath of trackResults) {
      if (filePath) {
        downloadedFiles.push(filePath);
      }
    }

    // Step 3: Create ZIP file
    updateJob({ step: "Creating ZIP file...", progress: 92 });

    const zipFilename = `${jobId}.zip`;
    const zipPath = path.join(tempDir, zipFilename);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 5 } });

      output.on("close", resolve);
      archive.on("error", reject);

      archive.pipe(output);

      // Add all downloaded files to ZIP
      for (const filePath of downloadedFiles) {
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
      }

      archive.finalize();
    });

    // Clean up individual files
    for (const filePath of downloadedFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
    try {
      fs.rmdirSync(playlistDir);
    } catch (e) {}

    // Get ZIP file size
    const zipStats = fs.statSync(zipPath);

    // Generate download URL
    const downloadUrl = getDownloadUrl(zipFilename);
    const sanitizedPlaylistName = `${playlist.name}.zip`
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    updateJob({
      status: "completed",
      step: "Ready for download!",
      progress: 100,
      downloadUrl,
      filename: sanitizedPlaylistName,
      fileSize: zipStats.size,
      quality: "320kbps",
      completedAt: Date.now(),
      playlistInfo: {
        name: playlist.name,
        totalTracks: playlist.totalTracks,
        completedTracks,
        failedTracks,
        failedTrackNames: failedTrackNames.slice(0, 5), // Show first 5 failed
      },
    });

    // Job auto-cleanup handled by SQLite database
    // ZIP file cleanup handled by fileManager
  } catch (error) {
    console.error("Playlist conversion error:", error);

    // Clean up on error
    for (const filePath of downloadedFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
    try {
      fs.rmdirSync(playlistDir);
    } catch (e) {}

    updateJob({
      status: "error",
      step: "Conversion failed",
      progress: 0,
      error:
        error.message ||
        "An unexpected error occurred during playlist conversion",
    });
  }
}

export default router;
