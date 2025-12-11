const API_BASE = import.meta.env.VITE_API_URL || "";

export async function convertSpotifyUrl(spotifyUrl) {
  const response = await fetch(`${API_BASE}/api/convert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ spotifyUrl }),
  });

  return response.json();
}

export async function checkStatus(jobId) {
  const response = await fetch(`${API_BASE}/api/status/${jobId}`);
  return response.json();
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function formatDuration(ms) {
  if (!ms) return "--:--";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
