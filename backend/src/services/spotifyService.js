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

// Fetch metadata from Spotify embed page (no auth required)
async function getEmbedMetadata(trackId) {
  try {
    // Fetch the embed page HTML
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
    const response = await axios.get(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = response.data;

    // Extract JSON data from the page (Spotify embeds contain __NEXT_DATA__ or similar)
    // Try to find the track info in the HTML
    let title = null;
    let artist = null;
    let album = null;
    let coverUrl = null;

    // Method 1: Look for meta tags
    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
      html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
    const descMatch =
      html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
      html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i);
    const imageMatch =
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
      html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);

    if (titleMatch) {
      title = titleMatch[1];
    }

    if (descMatch) {
      // Description often contains "Song · Artist · Album" or "Artist · Song"
      const desc = descMatch[1];
      console.log("Embed description:", desc);

      // Try to parse "Song · Artist" or "Artist · Song · Album" patterns
      const parts = desc.split(/\s*[·•]\s*/);
      if (parts.length >= 2) {
        // Usually format is: "Song · Artist" or "Song · Artist · Album · Year"
        artist = parts[1]?.trim();
        if (parts.length >= 3) {
          album = parts[2]?.trim();
        }
      }
    }

    if (imageMatch) {
      coverUrl = imageMatch[1];
    }

    // Method 2: Look for JSON-LD or embedded JSON data
    const jsonMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i
    );
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        if (jsonData.name) title = jsonData.name;
        if (jsonData.byArtist?.name) artist = jsonData.byArtist.name;
        if (jsonData.inAlbum?.name) album = jsonData.inAlbum.name;
      } catch (e) {
        // JSON parse failed, continue with meta tag data
      }
    }

    console.log("Embed metadata extracted:", { title, artist, album });

    return { title, artist, album, coverUrl };
  } catch (error) {
    console.error("Error fetching embed metadata:", error.message);
    return null;
  }
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
    // Try embed page first for better metadata
    const embedData = await getEmbedMetadata(trackId);

    // Also get oEmbed for thumbnail
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
      const response = await axios.get(oembedUrl);

      console.log("oEmbed response:", response.data);

      let title = embedData?.title || response.data.title;
      let artist = embedData?.artist || "Unknown Artist";
      let album = embedData?.album || "Unknown Album";
      let coverUrl = embedData?.coverUrl || response.data.thumbnail_url || null;

      return {
        title: title,
        artist: artist,
        album: album,
        coverUrl: coverUrl,
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

// Get playlist metadata and tracks from Spotify API
export async function getPlaylistMetadata(playlistId) {
  const token = await getSpotifyToken();

  if (!token) {
    throw new Error(
      "Spotify API credentials required for playlist downloads. Please configure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET."
    );
  }

  try {
    // First get playlist info
    const playlistResponse = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const playlist = playlistResponse.data;

    // Get all tracks (handle pagination)
    let tracks = [];
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

    while (nextUrl) {
      const tracksResponse = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const validTracks = tracksResponse.data.items
        .filter((item) => item.track && item.track.id) // Filter out null/unavailable tracks
        .map((item) => ({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map((a) => a.name).join(", "),
          album: item.track.album.name,
          coverUrl: item.track.album.images[0]?.url || null,
          duration: item.track.duration_ms,
          trackNumber: item.track.track_number,
        }));

      tracks = [...tracks, ...validTracks];
      nextUrl = tracksResponse.data.next;
    }

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      owner: playlist.owner.display_name,
      coverUrl: playlist.images[0]?.url || null,
      totalTracks: tracks.length,
      tracks: tracks,
    };
  } catch (error) {
    console.error("Error fetching playlist metadata:", error.message);
    throw new Error(
      "Failed to fetch playlist. Make sure it's a public playlist."
    );
  }
}

// Extract playlist ID from URL
function extractPlaylistId(url) {
  const patterns = [
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify:playlist:([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export { extractTrackId, extractPlaylistId, getSpotifyToken };
