import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { classifyEmail } from './gemini.js';
import db from '../db.js';
import { createDecipheriv, scryptSync } from 'crypto';

const ENC_KEY = scryptSync(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback', 'cc-imap-salt-v1', 32);
function decrypt(enc) {
  try {
    const [ivHex, data] = enc.split(':');
    const decipher = createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
  } catch { return enc; } // fallback for legacy plaintext
}

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
      password: decrypt(emailConfig.password),
      host: emailConfig.host || 'imap.gmail.com',
      port: emailConfig.port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: true }
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
            let uid = null;
            msg.once('attributes', (attrs) => { uid = attrs.uid; });
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
              stream.on('end', () => { results.push({ raw: buffer, uid }); });
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
      for (const { raw, uid } of results) {
        try {
          const parsed = await simpleParser(raw);
          const subject = parsed.subject || '';
          const from = parsed.from?.text || '';
          const text = parsed.text || parsed.html?.replace(/<[^>]+>/g, '') || '';
          const date = parsed.date;

          if (!isJobRelated(subject, from, text)) continue;

          // Dedup by IMAP UID (stable, server-assigned) — fall back to exact subject+from+date
          const imapUid = uid ? `${emailConfig.email}:${uid}` : null;
          const existing = imapUid
            ? db.prepare('SELECT id FROM emails WHERE user_id=? AND imap_uid=?').get(userId, imapUid)
            : db.prepare('SELECT id FROM emails WHERE user_id=? AND subject=? AND from_address=? AND received_at=?').get(userId, subject, from, date ? date.toISOString() : null);

          if (existing) continue;

          // Classify with Gemini
          const classification = await classifyEmail(text.slice(0, 3000), subject);

          // Auto-link to application
          let applicationId = null;
          if (classification.company) {
            const app = db.prepare('SELECT id, status FROM applications WHERE user_id = ? AND company = ? ORDER BY applied_date DESC LIMIT 1')
              .get(userId, classification.company);
            if (app) {
              applicationId = app.id;
              // Only auto-update status when confidence is high (>=0.8) and status differs
              const confidence = typeof classification.confidence === 'number' ? classification.confidence : 0;
              if (classification.suggested_status && classification.suggested_status !== app.status && confidence >= 0.8) {
                db.prepare('UPDATE applications SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?')
                  .run(classification.suggested_status, app.id);
                db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)')
                  .run(app.id, userId, app.status, classification.suggested_status, `Auto-updated from email: ${subject}`);
              }
            } else {
              // Auto-create application — check duplicate first
              const role = classification.role || 'Unknown Role';
              const dupCheck = db.prepare('SELECT id FROM applications WHERE user_id=? AND company=? AND role=?').get(userId, classification.company, role);
              if (!dupCheck) {
                const newApp = db.prepare(
                  'INSERT INTO applications (user_id, company, role, status, platform) VALUES (?, ?, ?, ?, ?)'
                ).run(userId, classification.company, role, classification.suggested_status || 'applied', 'Email');
                applicationId = newApp.lastInsertRowid;
                db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)')
                  .run(applicationId, userId, null, classification.suggested_status || 'applied', `Auto-created from email: ${subject}`);
                // Auto-reminder: follow up in 7 days
                const remindDate = new Date(Date.now() + 7 * 86400000).toISOString();
                db.prepare('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES (?,?,?,?)')
                  .run(userId, applicationId, `Follow up with ${classification.company}`, remindDate);
              } else {
                applicationId = dupCheck.id;
              }
            }
          }

          // Save email with imap_uid for future dedup
          db.prepare(
            'INSERT INTO emails (user_id, application_id, subject, from_address, body, classification, extracted_data, received_at, imap_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(userId, applicationId, subject, from, text.slice(0, 5000), classification.classification, JSON.stringify(classification), date ? date.toISOString() : null, imapUid);

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
