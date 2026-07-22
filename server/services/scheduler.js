import cron from 'node-cron';
import pool from '../db.js';
import { fetchAllAccounts } from './emailFetcher.js';
import { cleanupOrphanedUploads } from '../utils/cleanupOrphans.js';

let isRunning = false;

export function startEmailScheduler() {
  cron.schedule('*/30 * * * *', async () => {
    if (isRunning) {
      console.log('📧 Skipping email fetch — previous run still active');
      return;
    }
    isRunning = true;
    try {
      console.log('📧 Auto-fetching emails...');
      const { rows: users } = await pool.query('SELECT DISTINCT user_id FROM email_accounts');

      for (const { user_id } of users) {
        try {
          const results = await fetchAllAccounts(user_id);
          const total = results.reduce((sum, r) => sum + (r.fetched || 0), 0);
          await pool.query('UPDATE email_accounts SET last_fetched = CURRENT_TIMESTAMP WHERE user_id = $1', [user_id]);
          if (total > 0) console.log(`  ✓ User ${user_id}: ${total} new job emails classified`);
        } catch (err) {
          console.error(`  ✕ User ${user_id}: email fetch failed —`, err.message);
        }
      }
    } catch (err) {
      console.error('Scheduler top-level error:', err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log('⏰ Email auto-fetch scheduled (every 30 min)');

  cron.schedule('0 3 * * 0', async () => {
    try {
      await cleanupOrphanedUploads();
    } catch (err) {
      console.error('Orphan cleanup error:', err.message);
    }
  });
}
