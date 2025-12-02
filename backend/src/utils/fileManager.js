import fs from "fs";
import path from "path";

// Get the public download URL for a file
export function getDownloadUrl(filename) {
  const baseUrl =
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${baseUrl}/downloads/${filename}`;
}

// Clean up expired temporary files
export function cleanupExpiredFiles(tempPath, expirationMinutes) {
  if (!fs.existsSync(tempPath)) {
    return;
  }

  const now = Date.now();
  const expirationMs = expirationMinutes * 60 * 1000;

  try {
    const files = fs.readdirSync(tempPath);
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(tempPath, file);

      try {
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > expirationMs) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`Error checking file ${file}:`, error.message);
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired file(s)`);
    }
  } catch (error) {
    console.error("Error during cleanup:", error.message);
  }
}

// Delete a specific file
export function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
  }
  return false;
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Get temp directory path
export function getTempDir() {
  const tempPath = process.env.TEMP_FILES_PATH || "./temp";
  return path.resolve(tempPath);
}
