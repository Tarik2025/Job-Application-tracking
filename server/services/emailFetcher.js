import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { classifyEmail } from './gemini.js';
import db from '../db.js';

// Job-related keywords to filter emails
const JOB_KEYWORDS = [
  'application', 'interview', 'offer', 'reject', 'position', 'role',
  'hiring', 'recruiter', 'HR', 'job', 'opportunity', 'shortlist',
  'selected', 'candidature', 'resume', 'apply', 'congratulations',
  'unfortunately', 'we regret', 'next steps', 'assessment', 'coding test',
  'technical round', 'onboarding', 'joining', 'naukri', 'linkedin'
];

function isJobRelated(subject = '', from = '', text = '') {
  const content = `${subject} ${from} ${text}`.toLowerCase();
  return JOB_KEYWORDS.some(kw => content.includes(kw.toLowerCase()));
}

export function fetchEmails(emailConfig, userId) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: emailConfig.email,
      password: emailConfig.password,
      host: emailConfig.host || 'imap.gmail.com',
      port: emailConfig.port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const results = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) { imap.end(); return reject(err); }

        // Fetch emails from last 7 days
        const since = new Date();
        since.setDate(since.getDate() - 7);

        imap.search(['ALL', ['SINCE', since]], (err, uids) => {
          if (err) { imap.end(); return reject(err); }
          if (!uids || uids.length === 0) { imap.end(); return resolve([]); }

          // Get last 50 emails max
          const recentUids = uids.slice(-50);
          const fetch = imap.fetch(recentUids, { bodies: '', struct: true });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
              stream.on('end', () => { results.push(buffer); });
            });
          });

          fetch.once('end', () => { imap.end(); });
        });
      });
    });

    imap.once('error', reject);
    imap.once('end', async () => {
      // Parse and classify job-related emails
      const classified = [];
      for (const raw of results) {
        try {
          const parsed = await simpleParser(raw);
          const subject = parsed.subject || '';
          const from = parsed.from?.text || '';
          const text = parsed.text || parsed.html?.replace(/<[^>]+>/g, '') || '';
          const date = parsed.date;

          if (!isJobRelated(subject, from, text)) continue;

          // Check if already processed (by subject + date)
          const existing = db.prepare(
            'SELECT id FROM emails WHERE user_id = ? AND subject = ? AND created_at LIKE ?'
          ).get(userId, subject, date ? `${date.toISOString().slice(0, 10)}%` : '%');

          if (existing) continue;

          // Classify with Gemini
          const classification = await classifyEmail(text.slice(0, 3000), subject);

          // Auto-link to application
          let applicationId = null;
          if (classification.company) {
            const app = db.prepare('SELECT id, status FROM applications WHERE user_id = ? AND company LIKE ? ORDER BY applied_date DESC LIMIT 1')
              .get(userId, `%${classification.company}%`);
            if (app) {
              applicationId = app.id;
              if (classification.suggested_status && classification.suggested_status !== app.status) {
                db.prepare('UPDATE applications SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?')
                  .run(classification.suggested_status, app.id);
                db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)')
                  .run(app.id, userId, app.status, classification.suggested_status, `Auto-updated from email: ${subject}`);
              }
            } else {
              // Auto-create application
              const role = classification.role || 'Unknown Role';
              const newApp = db.prepare(
                'INSERT INTO applications (user_id, company, role, status, platform) VALUES (?, ?, ?, ?, ?)'
              ).run(userId, classification.company, role, classification.suggested_status || 'applied', 'Email');
              applicationId = newApp.lastInsertRowid;
              db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)')
                .run(applicationId, userId, null, classification.suggested_status || 'applied', `Auto-created from email: ${subject}`);
            }
          }

          // Save email
          db.prepare(
            'INSERT INTO emails (user_id, application_id, subject, body, classification, extracted_data) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(userId, applicationId, subject, text.slice(0, 5000), classification.classification, JSON.stringify(classification));

          classified.push({ subject, classification, applicationId });
        } catch (e) {
          // Skip unparseable emails
          continue;
        }
      }
      resolve(classified);
    });

    imap.connect();
  });
}

// Fetch from all configured accounts for a user
export async function fetchAllAccounts(userId) {
  const accounts = db.prepare('SELECT * FROM email_accounts WHERE user_id = ?').all(userId);
  const allResults = [];

  for (const account of accounts) {
    try {
      const results = await fetchEmails(account, userId);
      allResults.push({ email: account.email, fetched: results.length, results });
    } catch (err) {
      allResults.push({ email: account.email, error: err.message });
    }
  }
  return allResults;
}
