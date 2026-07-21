import { readdir, unlink } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, '..', 'uploads');

/**
 * Removes files in uploads/ that are not referenced in the resumes table.
 * Safe to run periodically (e.g., weekly cron or on-demand).
 */
export async function cleanupOrphanedUploads() {
  try {
    const files = await readdir(UPLOADS_DIR);
    const dbPaths = new Set(
      db.prepare('SELECT file_path FROM resumes WHERE file_path IS NOT NULL').all().map(r => r.file_path)
    );

    let removed = 0;
    for (const file of files) {
      const fullPath = resolve(UPLOADS_DIR, file);
      if (!dbPaths.has(fullPath)) {
        await unlink(fullPath).catch(() => {});
        removed++;
      }
    }

    if (removed > 0) console.log(`🧹 Cleaned up ${removed} orphaned upload(s)`);
    return removed;
  } catch (err) {
    // uploads/ dir may not exist yet — that's fine
    if (err.code !== 'ENOENT') console.error('Cleanup error:', err.message);
    return 0;
  }
}
