import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path (in backend folder)
const dbPath = path.join(__dirname, "..", "..", "riff.db");

// Initialize database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    step TEXT,
    progress INTEGER DEFAULT 0,
    url_type TEXT,
    source_id TEXT,
    metadata TEXT,
    playlist_info TEXT,
    download_url TEXT,
    filename TEXT,
    file_size INTEGER,
    quality TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
`);

console.log("📦 SQLite database initialized at:", dbPath);

// Job operations
export const jobStore = {
  // Create a new job
  create: (jobData) => {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO jobs (id, status, step, progress, url_type, source_id, created_at, updated_at)
      VALUES (@id, @status, @step, @progress, @urlType, @sourceId, @createdAt, @updatedAt)
    `);

    stmt.run({
      id: jobData.id,
      status: jobData.status || "pending",
      step: jobData.step || "Initializing...",
      progress: jobData.progress || 0,
      urlType: jobData.urlType || null,
      sourceId: jobData.sourceId || null,
      createdAt: now,
      updatedAt: now,
    });

    return jobStore.get(jobData.id);
  },

  // Get a job by ID
  get: (jobId) => {
    const stmt = db.prepare("SELECT * FROM jobs WHERE id = ?");
    const row = stmt.get(jobId);

    if (!row) return null;

    return {
      id: row.id,
      status: row.status,
      step: row.step,
      progress: row.progress,
      urlType: row.url_type,
      sourceId: row.source_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      playlistInfo: row.playlist_info ? JSON.parse(row.playlist_info) : null,
      downloadUrl: row.download_url,
      filename: row.filename,
      fileSize: row.file_size,
      quality: row.quality,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  },

  // Update a job
  update: (jobId, updates) => {
    const job = jobStore.get(jobId);
    if (!job) return null;

    const fields = [];
    const values = { id: jobId, updatedAt: Date.now() };

    if (updates.status !== undefined) {
      fields.push("status = @status");
      values.status = updates.status;
    }
    if (updates.step !== undefined) {
      fields.push("step = @step");
      values.step = updates.step;
    }
    if (updates.progress !== undefined) {
      fields.push("progress = @progress");
      values.progress = updates.progress;
    }
    if (updates.metadata !== undefined) {
      fields.push("metadata = @metadata");
      values.metadata = JSON.stringify(updates.metadata);
    }
    if (updates.playlistInfo !== undefined) {
      fields.push("playlist_info = @playlistInfo");
      values.playlistInfo = JSON.stringify(updates.playlistInfo);
    }
    if (updates.downloadUrl !== undefined) {
      fields.push("download_url = @downloadUrl");
      values.downloadUrl = updates.downloadUrl;
    }
    if (updates.filename !== undefined) {
      fields.push("filename = @filename");
      values.filename = updates.filename;
    }
    if (updates.fileSize !== undefined) {
      fields.push("file_size = @fileSize");
      values.fileSize = updates.fileSize;
    }
    if (updates.quality !== undefined) {
      fields.push("quality = @quality");
      values.quality = updates.quality;
    }
    if (updates.error !== undefined) {
      fields.push("error = @error");
      values.error = updates.error;
    }
    if (updates.completedAt !== undefined) {
      fields.push("completed_at = @completedAt");
      values.completedAt = updates.completedAt;
    }

    fields.push("updated_at = @updatedAt");

    const stmt = db.prepare(
      `UPDATE jobs SET ${fields.join(", ")} WHERE id = @id`
    );
    stmt.run(values);

    return jobStore.get(jobId);
  },

  // Delete a job
  delete: (jobId) => {
    const stmt = db.prepare("DELETE FROM jobs WHERE id = ?");
    stmt.run(jobId);
  },

  // Clean up old jobs (older than specified minutes)
  cleanupOld: (olderThanMinutes = 60) => {
    const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
    const stmt = db.prepare(
      "DELETE FROM jobs WHERE created_at < ? AND status IN ('completed', 'error')"
    );
    const result = stmt.run(cutoff);

    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} old job(s) from database`);
    }

    return result.changes;
  },

  // Get stats
  getStats: () => {
    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM jobs
    `
      )
      .get();

    return stats;
  },

  // Get active jobs count
  getActiveCount: () => {
    const result = db
      .prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'pending'")
      .get();
    return result.count;
  },
};

// Cleanup old jobs every 10 minutes
setInterval(() => {
  jobStore.cleanupOld(60); // Clean jobs older than 60 minutes
}, 10 * 60 * 1000);

export default db;
