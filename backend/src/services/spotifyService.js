import axios from "axios";

let spotifyAccessToken = null;
let tokenExpiresAt = 0;

// Get Spotify access token using Client Credentials flow
async function getSpotifyToken() {
  if (spotifyAccessToken && Date.now() < tokenExpiresAt) {
    return spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === "your_spotify_client_id") {
    // Use fallback metadata extraction for demo purposes
    return null;
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString("base64")}`,
        },
      }
    );

    spotifyAccessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
    return spotifyAccessToken;
  } catch (error) {
    console.error("Error getting Spotify token:", error.message);
    return null;
  }
}

// Extract track ID from various Spotify URL formats
function extractTrackId(url) {
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify:track:([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get track metadata from Spotify API
export async function getSpotifyMetadata(trackId) {
  const token = await getSpotifyToken();

  if (token) {
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const track = response.data;
      return {
        title: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        album: track.album.name,
        coverUrl: track.album.images[0]?.url || null,
        duration: track.duration_ms,
        releaseDate: track.album.release_date,
        trackNumber: track.track_number,
        isrc: track.external_ids?.isrc || null,
      };
    } catch (error) {
      console.error("Error fetching Spotify metadata:", error.message);
      throw new Error("Failed to fetch track metadata from Spotify");
    }
  } else {
    // Fallback: Try to get basic info using oEmbed (no auth required)
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
      const response = await axios.get(oembedUrl);

      // Parse title from oEmbed response (format: "Song by Artist")
      const titleMatch = response.data.title.match(/^(.+) by (.+)$/);

      return {
        title: titleMatch ? titleMatch[1] : response.data.title,
        artist: titleMatch ? titleMatch[2] : "Unknown Artist",
        album: "Unknown Album",
        coverUrl: response.data.thumbnail_url || null,
        duration: null,
        releaseDate: null,
        trackNumber: null,
        isrc: null,
      };
    } catch (error) {
      console.error("Error fetching oEmbed data:", error.message);
      throw new Error(
        "Failed to fetch track information. Please check the URL and try again."
      );
    }
  }
}

export { extractTrackId };
