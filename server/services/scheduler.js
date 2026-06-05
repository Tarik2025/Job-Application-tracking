import cron from 'node-cron';
import db from '../db.js';
import { fetchAllAccounts } from './emailFetcher.js';

export function startEmailScheduler() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('📧 Auto-fetching emails...');
    const users = db.prepare('SELECT DISTINCT user_id FROM email_accounts').all();

    for (const { user_id } of users) {
      try {
        const results = await fetchAllAccounts(user_id);
        const total = results.reduce((sum, r) => sum + (r.fetched || 0), 0);
        if (total > 0) console.log(`  ✓ User ${user_id}: ${total} new job emails classified`);
      } catch (err) {
        console.error(`  ✕ User ${user_id}: ${err.message}`);
      }
    }
  });

  console.log('⏰ Email auto-fetch scheduled (every 30 min)');
}
