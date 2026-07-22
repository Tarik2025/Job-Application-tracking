import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { classifyEmail } from './gemini.js';
import pool from '../db.js';
import { createDecipheriv, scryptSync } from 'crypto';
import { z } from 'zod';

const ParsedEmailSchema = z.object({
  subject: z.string().optional(),
  from: z.object({ text: z.string().optional() }).optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  date: z.date().optional(),
});

if (!process.env.ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY must be set — required for IMAP password decryption');
  process.exit(1);
}
const ENC_KEY = scryptSync(process.env.ENCRYPTION_KEY, 'cc-imap-salt-v1', 32);
function decrypt(enc) {
  if (typeof enc !== 'string' || !enc.includes(':')) throw new Error('Invalid encrypted value');
  const [ivHex, data] = enc.split(':');
  if (!ivHex || !data || ivHex.length !== 32) throw new Error('Malformed encrypted value');
  const decipher = createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

const JOB_KEYWORDS = ['application','interview','offer','reject','position','role','hiring','recruiter','HR','job','opportunity','shortlist','selected','candidature','resume','apply','congratulations','unfortunately','we regret','next steps','assessment','coding test','technical round','onboarding','joining','naukri','linkedin'];

function isJobRelated(subject = '', from = '', text = '') {
  const content = `${subject} ${from} ${text}`.toLowerCase();
  return JOB_KEYWORDS.some(kw => content.includes(kw.toLowerCase()));
}

const FETCH_TIMEOUT_MS = 60000;

export function fetchEmails(emailConfig, userId) {
  const imapPromise = new Promise((resolve, reject) => {
    const imap = new Imap({
      user: emailConfig.email,
      password: decrypt(emailConfig.password),
      host: emailConfig.host || 'imap.gmail.com',
      port: emailConfig.port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: true },
      connTimeout: 15000,
      authTimeout: 10000,
    });

    const results = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) { imap.end(); return reject(err); }
        const since = new Date();
        since.setDate(since.getDate() - 7);
        imap.search(['ALL', ['SINCE', since]], (err, uids) => {
          if (err) { imap.end(); return reject(err); }
          if (!uids || uids.length === 0) { imap.end(); return resolve([]); }
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
      const classified = [];
      for (const { raw, uid } of results) {
        try {
          const rawParsed = await simpleParser(raw);
          const parsed = ParsedEmailSchema.parse(rawParsed);
          const subject = parsed.subject || '';
          const from = parsed.from?.text || '';
          const text = parsed.text || parsed.html?.replace(/<[^>]+>/g, '') || '';
          const date = parsed.date;

          if (!isJobRelated(subject, from, text)) continue;

          const imapUid = uid ? `${emailConfig.email}:${uid}` : null;
          const { rows: existingRows } = imapUid
            ? await pool.query('SELECT id FROM emails WHERE user_id=$1 AND imap_uid=$2', [userId, imapUid])
            : await pool.query('SELECT id FROM emails WHERE user_id=$1 AND subject=$2 AND from_address=$3 AND received_at=$4', [userId, subject, from, date ? date.toISOString() : null]);

          if (existingRows[0]) continue;

          const classification = await classifyEmail(text.slice(0, 3000), subject);

          let applicationId = null;
          if (classification.company) {
            const { rows: appRows } = await pool.query('SELECT id,status FROM applications WHERE user_id=$1 AND company=$2 ORDER BY applied_date DESC LIMIT 1', [userId, classification.company]);
            if (appRows[0]) {
              applicationId = appRows[0].id;
              const confidence = typeof classification.confidence === 'number' ? classification.confidence : 0;
              if (classification.suggested_status && classification.suggested_status !== appRows[0].status && confidence >= 0.8) {
                await pool.query('UPDATE applications SET status=$1, last_updated=CURRENT_TIMESTAMP WHERE id=$2', [classification.suggested_status, appRows[0].id]);
                await pool.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [appRows[0].id, userId, appRows[0].status, classification.suggested_status, `Auto-updated from email: ${subject}`]);
              }
            } else {
              const role = classification.role || 'Unknown Role';
              const { rows: dupRows } = await pool.query('SELECT id FROM applications WHERE user_id=$1 AND company=$2 AND role=$3', [userId, classification.company, role]);
              if (!dupRows[0]) {
                const { rows: newApp } = await pool.query(
                  'INSERT INTO applications (user_id,company,role,status,platform) VALUES ($1,$2,$3,$4,$5) RETURNING id',
                  [userId, classification.company, role, classification.suggested_status||'applied', 'Email']
                );
                applicationId = newApp[0].id;
                await pool.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [applicationId, userId, null, classification.suggested_status||'applied', `Auto-created from email: ${subject}`]);
                const remindDate = new Date(Date.now() + 7*86400000).toISOString();
                await pool.query('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES ($1,$2,$3,$4)', [userId, applicationId, `Follow up with ${classification.company}`, remindDate]);
              } else {
                applicationId = dupRows[0].id;
              }
            }
          }

          await pool.query(
            'INSERT INTO emails (user_id,application_id,subject,from_address,body,classification,extracted_data,received_at,imap_uid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [userId, applicationId, subject, from, text.slice(0, 5000), classification.classification, JSON.stringify(classification), date ? date.toISOString() : null, imapUid]
          );

          classified.push({ subject, classification, applicationId });
        } catch { continue; }
      }
      resolve(classified);
    });

    imap.connect();
  });

  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('IMAP fetch timed out')), FETCH_TIMEOUT_MS));
  return Promise.race([imapPromise, timeout]);
}

export async function fetchAllAccounts(userId) {
  const { rows: accounts } = await pool.query('SELECT * FROM email_accounts WHERE user_id=$1', [userId]);
  const allResults = [];
  for (const account of accounts) {
    try {
      const results = await fetchEmails(account, userId);
      allResults.push({ email: account.email, fetched: results.length, results });
    } catch {
      allResults.push({ email: account.email, error: 'Failed to fetch emails' });
    }
  }
  return allResults;
}
