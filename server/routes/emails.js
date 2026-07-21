import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { classifyEmail } from '../services/gemini.js';
import { fetchAllAccounts } from '../services/emailFetcher.js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const router = Router();
router.use(auth);

// Encrypt/decrypt IMAP passwords at rest using AES-256-CBC
// ENCRYPTION_KEY is separate from JWT_SECRET so rotating JWT never breaks stored passwords
const ENC_KEY = scryptSync(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback', 'cc-imap-salt-v1', 32);
function encrypt(text) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', ENC_KEY, iv);
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
function decrypt(enc) {
  try {
    const [ivHex, data] = enc.split(':');
    const decipher = createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
  } catch { return enc; } // fallback for legacy plaintext passwords
}

// List classified emails (paginated, no body in list view)
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as c FROM emails WHERE user_id=?').get(req.user.id).c;
  const rows = db.prepare('SELECT id,subject,from_address,classification,application_id,received_at,created_at FROM emails WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.user.id, limit, offset);
  res.json({ data: rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
});

// Manual classify
router.post('/classify', async (req, res) => {
  try {
    const { subject, body, received_date } = req.body;
    if (!body) return res.status(400).json({ error: 'Email body required' });

    const classification = await classifyEmail(body, subject);

    // Verify company name using Clearbit free API (2s timeout to avoid hanging)
    if (classification.company) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const cbRes = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(classification.company)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (cbRes.ok) {
          const suggestions = await cbRes.json();
          if (suggestions.length > 0) {
            classification.company = suggestions[0].name;
            classification.company_domain = suggestions[0].domain;
            classification.company_logo = suggestions[0].logo;
          }
        }
      } catch {}
    }

    classification.received_date = received_date || null;
    const r = db.prepare('INSERT INTO emails (user_id,application_id,subject,from_address,body,classification,extracted_data,received_at) VALUES (?,?,?,?,?,?,?,?)').run(req.user.id, null, subject||null, null, body, classification.classification, JSON.stringify(classification), received_date||null);
    res.json({ id: r.lastInsertRowid, classification, applicationId: null, action: null });
  } catch (err) { console.error('POST /classify:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Confirm and add to applications after classification
router.post('/classify/confirm', async (req, res) => {
  try {
    const { company, role, status, received_date, email_id } = req.body;
    if (!company) return res.status(400).json({ error: 'Company required' });

    const appliedDate = received_date || new Date().toISOString();
    let applicationId = null;
    let action = null;

    const app = db.prepare('SELECT id, status FROM applications WHERE user_id = ? AND company = ? ORDER BY applied_date DESC LIMIT 1').get(req.user.id, company);
    if (app) {
      applicationId = app.id;
      if (status && status !== app.status) {
        db.prepare('UPDATE applications SET status=?, last_updated=CURRENT_TIMESTAMP WHERE id=?').run(status, app.id);
        db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)').run(app.id, req.user.id, app.status, status, 'Updated from email classification');
        action = 'updated';
      } else {
        action = 'exists';
      }
    } else {
      const newApp = db.prepare('INSERT INTO applications (user_id, company, role, status, platform, applied_date) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, company, role || 'Unknown Role', status || 'applied', 'Email', appliedDate);
      applicationId = newApp.lastInsertRowid;
      db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)').run(applicationId, req.user.id, null, status || 'applied', 'Created from email classification');
      // Auto-reminder: follow up in 7 days (consistent with manual application creation)
      const remindDate = new Date(Date.now() + 7 * 86400000).toISOString();
      db.prepare('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES (?,?,?,?)').run(req.user.id, applicationId, `Follow up with ${company}`, remindDate);
      action = 'created';
    }

    // Link email to application
    if (email_id) {
      db.prepare('UPDATE emails SET application_id=? WHERE id=? AND user_id=?').run(applicationId, email_id, req.user.id);
    }

    res.json({ applicationId, action });
  } catch (err) { console.error('POST /classify/confirm:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Email accounts CRUD
router.get('/accounts', (req, res) => {
  res.json(db.prepare('SELECT id,email,host,port,label,last_fetched,created_at FROM email_accounts WHERE user_id = ?').all(req.user.id));
});

router.post('/accounts', (req, res) => {
  const { email, password, host, port, label } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and app password required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  // Limit accounts per user
  const accountCount = db.prepare('SELECT COUNT(*) as c FROM email_accounts WHERE user_id=?').get(req.user.id).c;
  if (accountCount >= 5) return res.status(400).json({ error: 'Maximum 5 email accounts allowed' });
  // Check duplicate before insert for a clear error message
  const existing = db.prepare('SELECT id FROM email_accounts WHERE user_id=? AND email=?').get(req.user.id, email);
  if (existing) return res.status(409).json({ error: 'This email account is already connected' });
  const r = db.prepare('INSERT INTO email_accounts (user_id,email,password,host,port,label) VALUES (?,?,?,?,?,?)').run(req.user.id, email, encrypt(password), host||'imap.gmail.com', port||993, label||null);
  res.json({ id: r.lastInsertRowid, message: 'Connected' });
});

router.delete('/accounts/:id', (req, res) => {
  const r = db.prepare('DELETE FROM email_accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Removed' });
});

// Auto-fetch
router.post('/fetch', async (req, res) => {
  try {
    const results = await fetchAllAccounts(req.user.id);
    db.prepare('UPDATE email_accounts SET last_fetched = CURRENT_TIMESTAMP WHERE user_id = ?').run(req.user.id);
    res.json({ results });
  } catch (err) { console.error('POST /fetch:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
