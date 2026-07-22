import { Router } from 'express';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';
import { classifyEmail } from '../services/gemini.js';
import { fetchAllAccounts } from '../services/emailFetcher.js';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';

const router = Router();

router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

const ENC_KEY = scryptSync(process.env.ENCRYPTION_KEY, 'cc-imap-salt-v1', 32);
function encrypt(text) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', ENC_KEY, iv);
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

// List emails
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { rows: countRows } = await pool.query('SELECT COUNT(*) as c FROM emails WHERE user_id=$1', [req.user.id]);
    const total = parseInt(countRows[0].c);
    const { rows } = await pool.query(
      'SELECT id,subject,from_address,classification,application_id,received_at,created_at FROM emails WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json({ data: rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
  } catch (err) { console.error('GET /emails:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Manual classify
router.post('/classify', async (req, res) => {
  try {
    const { subject, body, received_date } = req.body;
    if (!body) return res.status(400).json({ error: 'Email body required' });

    const classification = await classifyEmail(body, subject);

    if (classification.company) {
      try {
        const clearbitUrl = new URL('https://autocomplete.clearbit.com/v1/companies/suggest');
        clearbitUrl.searchParams.set('query', classification.company);
        if (clearbitUrl.hostname !== 'autocomplete.clearbit.com' || clearbitUrl.protocol !== 'https:') throw new Error('SSRF guard');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const cbRes = await fetch(clearbitUrl.toString(), { signal: controller.signal });
        clearTimeout(timer);
        if (cbRes.ok) {
          const suggestions = await cbRes.json();
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            const top = suggestions[0];
            if (typeof top.name === 'string' && top.name.length <= 500) classification.company = top.name;
            if (typeof top.domain === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(top.domain)) classification.company_domain = top.domain;
            if (typeof top.logo === 'string' && top.logo.startsWith('https://')) classification.company_logo = top.logo;
          }
        }
      } catch {}
    }

    classification.received_date = received_date || null;
    const { rows } = await pool.query(
      'INSERT INTO emails (user_id,application_id,subject,from_address,body,classification,extracted_data,received_at,imap_uid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [req.user.id, null, subject||null, null, body, classification.classification, JSON.stringify(classification), received_date||null, null]
    );
    res.json({ id: rows[0].id, classification, applicationId: null, action: null });
  } catch (err) { console.error('POST /classify:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Confirm classify
router.post('/classify/confirm', async (req, res) => {
  const client = await pool.connect();
  try {
    const { company, role, received_date, email_id } = req.body;
    const status = req.body.status || null;
    if (!company) return res.status(400).json({ error: 'Company required' });
    const VALID = ['applied','under_review','interview','offer','rejected','withdrawn'];
    if (status !== null && !VALID.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

    const appliedDate = received_date || new Date().toISOString();
    let applicationId = null, action = null;

    await client.query('BEGIN');
    const { rows: appRows } = await client.query('SELECT id,status FROM applications WHERE user_id=$1 AND company=$2 ORDER BY applied_date DESC LIMIT 1', [req.user.id, company]);

    if (appRows[0]) {
      applicationId = appRows[0].id;
      if (status && status !== appRows[0].status) {
        await client.query('UPDATE applications SET status=$1, last_updated=CURRENT_TIMESTAMP WHERE id=$2', [status, appRows[0].id]);
        await client.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [appRows[0].id, req.user.id, appRows[0].status, status, 'Updated from email classification']);
        action = 'updated';
      } else { action = 'exists'; }
    } else {
      const { rows: newApp } = await client.query(
        'INSERT INTO applications (user_id,company,role,status,platform,applied_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [req.user.id, company, role||'Unknown Role', status||'applied', 'Email', appliedDate]
      );
      applicationId = newApp[0].id;
      await client.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [applicationId, req.user.id, null, status||'applied', 'Created from email classification']);
      const remindDate = new Date(Date.now() + 7*86400000).toISOString();
      await client.query('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES ($1,$2,$3,$4)', [req.user.id, applicationId, `Follow up with ${company}`, remindDate]);
      action = 'created';
    }

    if (email_id) await client.query('UPDATE emails SET application_id=$1 WHERE id=$2 AND user_id=$3', [applicationId, email_id, req.user.id]);
    await client.query('COMMIT');
    res.json({ applicationId, action });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /classify/confirm:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// Email accounts
router.get('/accounts', async (req, res) => {
  const { rows } = await pool.query('SELECT id,email,host,port,label,last_fetched,created_at FROM email_accounts WHERE user_id=$1', [req.user.id]);
  res.json(rows);
});

router.post('/accounts', async (req, res) => {
  try {
    const { password, host, port, label } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const cleanHost = typeof host === 'string' ? host.trim().toLowerCase() : 'imap.gmail.com';
    if (!email || !password) return res.status(400).json({ error: 'Email and app password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (!/^[a-z0-9.-]+$/.test(cleanHost)) return res.status(400).json({ error: 'Invalid IMAP host' });
    const ALLOWED_PORTS = [993, 143, 465, 587];
    const parsedPort = parseInt(port);
    if (port !== undefined && (isNaN(parsedPort) || !ALLOWED_PORTS.includes(parsedPort))) return res.status(400).json({ error: `Invalid port. Allowed: ${ALLOWED_PORTS.join(', ')}` });
    const safePort = ALLOWED_PORTS.includes(parsedPort) ? parsedPort : 993;

    const { rows: countRows } = await pool.query('SELECT COUNT(*) as c FROM email_accounts WHERE user_id=$1', [req.user.id]);
    if (parseInt(countRows[0].c) >= 5) return res.status(400).json({ error: 'Maximum 5 email accounts allowed' });

    const { rows: existing } = await pool.query('SELECT id FROM email_accounts WHERE user_id=$1 AND email=$2', [req.user.id, email]);
    if (existing[0]) return res.status(409).json({ error: 'This email account is already connected' });

    const { rows } = await pool.query(
      'INSERT INTO email_accounts (user_id,email,password,host,port,label) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user.id, email, encrypt(password), cleanHost, safePort, label||null]
    );
    res.json({ id: rows[0].id, message: 'Connected' });
  } catch (err) { console.error('POST /accounts:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/accounts/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM email_accounts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Removed' });
});

// Auto-fetch
router.post('/fetch', async (req, res) => {
  try {
    const results = await fetchAllAccounts(req.user.id);
    await pool.query('UPDATE email_accounts SET last_fetched=CURRENT_TIMESTAMP WHERE user_id=$1', [req.user.id]);
    res.json({ results });
  } catch (err) { console.error('POST /fetch:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
