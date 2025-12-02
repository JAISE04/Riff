import yts from "yt-search";

// Get metadata for a specific YouTube video by ID
export async function getYouTubeMetadata(videoId) {
  try {
    const result = await yts({ videoId });

    if (!result) {
      throw new Error("Video not found");
    }

    // Extract artist and title from video title
    let title = result.title;
    let artist = result.author?.name || "Unknown Artist";

    // Try to parse "Artist - Title" format
    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+)$/, // "Artist - Title"
      /^(.+?)\s*[|]\s*(.+)$/, // "Artist | Title"
    ];

    for (const pattern of patterns) {
      const match = result.title.match(pattern);
      if (match) {
        // Clean up artist name
        const potentialArtist = match[1]
          .trim()
          .replace(
            /\s*(official|audio|video|music|lyrics|hd|hq|4k|vevo)\s*/gi,
            ""
          )
          .trim();
        const potentialTitle = match[2]
          .trim()
          .replace(/\s*[\(\[].*?[\)\]]\s*/g, "") // Remove parenthetical info
          .replace(/\s*(official|audio|video|music|lyrics|hd|hq|4k)\s*/gi, "")
          .trim();

        if (potentialArtist && potentialTitle) {
          artist = potentialArtist;
          title = potentialTitle;
          break;
        }
      }
    }

    // Clean up title if no pattern matched
    if (title === result.title) {
      title = title
        .replace(/\s*[\(\[].*?[\)\]]\s*/g, "") // Remove parenthetical info
        .replace(/\s*(official|audio|video|music|lyrics|hd|hq|4k)\s*/gi, "")
        .trim();
    }

    console.log(`YouTube metadata: "${title}" by "${artist}"`);

    return {
      title,
      artist,
      album: "YouTube",
      coverUrl:
        result.thumbnail ||
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: result.seconds ? result.seconds * 1000 : null,
    };
  } catch (error) {
    console.error("Error fetching YouTube metadata:", error.message);
    throw new Error("Failed to fetch video information");
  }
}

// Find the best YouTube match for a Spotify track
export async function findYouTubeMatch(metadata) {
  const { title, artist, duration } = metadata;

  // Build search queries in order of preference
  const searchQueries = [
    `${artist} ${title} official audio`,
    `${artist} ${title} audio`,
    `${artist} ${title}`,
    `${title} ${artist}`,
  ];

  for (const query of searchQueries) {
    try {
      const searchResults = await yts(query);

      if (!searchResults.videos || searchResults.videos.length === 0) {
        continue;
      }

      // Filter and score results
      const scoredResults = searchResults.videos
        .slice(0, 10)
        .map((video) => ({
          ...video,
          score: calculateMatchScore(video, metadata),
        }))
        .filter((video) => video.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scoredResults.length > 0) {
        const bestMatch = scoredResults[0];
        console.log(
          `Found match: "${bestMatch.title}" (score: ${bestMatch.score})`
        );

        return {
          videoId: bestMatch.videoId,
          title: bestMatch.title,
          url: bestMatch.url,
          duration: bestMatch.seconds,
          thumbnail: bestMatch.thumbnail,
        };
      }
    } catch (error) {
      console.error(`Search error for "${query}":`, error.message);
      continue;
    }
  }

  return null;
}

// Calculate how well a YouTube video matches the Spotify track
function calculateMatchScore(video, metadata) {
  let score = 0;
  const videoTitle = video.title.toLowerCase();
  const trackTitle = metadata.title.toLowerCase();
  const artistName = metadata.artist.toLowerCase();

  // Title match (high weight)
  if (videoTitle.includes(trackTitle)) {
    score += 40;
  } else {
    // Partial title match
    const titleWords = trackTitle.split(" ").filter((w) => w.length > 2);
    const matchedWords = titleWords.filter((word) => videoTitle.includes(word));
    score += (matchedWords.length / titleWords.length) * 25;
  }

  // Artist match (high weight)
  const artistParts = artistName.split(/[,&]/).map((a) => a.trim());
  for (const artist of artistParts) {
    if (videoTitle.includes(artist)) {
      score += 30;
      break;
    }
  }

  // Duration match (if available)
  if (metadata.duration && video.seconds) {
    const spotifyDurationSec = metadata.duration / 1000;
    const durationDiff = Math.abs(video.seconds - spotifyDurationSec);

    if (durationDiff < 5) {
      score += 20;
    } else if (durationDiff < 15) {
      score += 10;
    } else if (durationDiff < 30) {
      score += 5;
    } else if (durationDiff > 120) {
      // Penalize very different durations (likely wrong version or compilation)
      score -= 20;
    }
  }

  // Prefer official content
  if (videoTitle.includes("official") || videoTitle.includes("audio")) {
    score += 10;
  }

  // Penalize live versions, covers, remixes unless specified
  const unwantedTerms = [
    "live",
    "cover",
    "remix",
    "karaoke",
    "instrumental",
    "acoustic",
  ];
  const trackTitleLower = trackTitle.toLowerCase();

  for (const term of unwantedTerms) {
    if (videoTitle.includes(term) && !trackTitleLower.includes(term)) {
      score -= 15;
    }
  }

  // Penalize very short or very long videos
  if (video.seconds < 60 || video.seconds > 600) {
    score -= 10;
  }

  return Math.max(0, score);
}
