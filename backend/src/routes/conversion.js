import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getSpotifyMetadata } from "../services/spotifyService.js";
import { findYouTubeMatch } from "../services/youtubeService.js";
import { downloadAndConvert } from "../services/conversionService.js";
import { getDownloadUrl } from "../utils/fileManager.js";

const router = express.Router();

// Store conversion jobs in memory (use Redis for production)
const conversionJobs = new Map();

// Start a new conversion
router.post("/convert", async (req, res) => {
  const { spotifyUrl } = req.body;

  if (!spotifyUrl) {
    return res.status(400).json({
      error: "Spotify URL is required",
      message: "Please provide a valid Spotify track URL",
    });
  }

  // Validate Spotify URL format
  const spotifyRegex =
    /^https?:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)(\?.*)?$/;
  const match = spotifyUrl.match(spotifyRegex);

  if (!match) {
    return res.status(400).json({
      error: "Invalid Spotify URL",
      message:
        "Please provide a valid Spotify track URL (e.g., https://open.spotify.com/track/...)",
    });
  }

  const trackId = match[1];
  const jobId = uuidv4();

  // Initialize job status
  conversionJobs.set(jobId, {
    id: jobId,
    status: "pending",
    step: "Initializing...",
    progress: 0,
    trackId,
    createdAt: Date.now(),
  });

  res.json({
    jobId,
    message: "Conversion started",
    status: "pending",
  });

  // Process conversion asynchronously
  processConversion(jobId, trackId, spotifyUrl);
});

// Check conversion status
router.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = conversionJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
      message: "Conversion job not found or has expired",
    });
  }

  res.json(job);
});

// Process conversion in background
async function processConversion(jobId, trackId, spotifyUrl) {
  const updateJob = (updates) => {
    const job = conversionJobs.get(jobId);
    if (job) {
      conversionJobs.set(jobId, { ...job, ...updates });
    }
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

    // Auto-cleanup job after 30 minutes
    setTimeout(() => {
      conversionJobs.delete(jobId);
    }, 30 * 60 * 1000);
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

export default router;
