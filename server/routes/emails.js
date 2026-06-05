import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { classifyEmail } from '../services/gemini.js';
import { fetchAllAccounts } from '../services/emailFetcher.js';

const router = Router();
router.use(auth);

// List classified emails
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM emails WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

// Manual classify
router.post('/classify', async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!body) return res.status(400).json({ error: 'Email body required' });

    const classification = await classifyEmail(body, subject);
    let applicationId = null;
    let action = null;

    if (classification.company) {
      const app = db.prepare('SELECT id, status FROM applications WHERE user_id = ? AND company LIKE ? ORDER BY applied_date DESC LIMIT 1').get(req.user.id, `%${classification.company}%`);
      if (app) {
        applicationId = app.id;
        if (classification.suggested_status && classification.suggested_status !== app.status) {
          db.prepare('UPDATE applications SET status=?, last_updated=CURRENT_TIMESTAMP WHERE id=?').run(classification.suggested_status, app.id);
          db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)').run(app.id, req.user.id, app.status, classification.suggested_status, `Auto-updated from email: ${subject || 'No subject'}`);
          action = 'updated';
        }
      } else {
        const role = classification.role || 'Unknown Role';
        const newApp = db.prepare('INSERT INTO applications (user_id, company, role, status, platform) VALUES (?, ?, ?, ?, ?)').run(req.user.id, classification.company, role, classification.suggested_status || 'applied', 'Email');
        applicationId = newApp.lastInsertRowid;
        db.prepare('INSERT INTO status_history (application_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)').run(applicationId, req.user.id, null, classification.suggested_status || 'applied', `Auto-created from email: ${subject || 'No subject'}`);
        action = 'created';
      }
    }

    const r = db.prepare('INSERT INTO emails (user_id,application_id,subject,body,classification,extracted_data) VALUES (?,?,?,?,?,?)').run(req.user.id, applicationId, subject||null, body, classification.classification, JSON.stringify(classification));
    res.json({ id: r.lastInsertRowid, classification, applicationId, action });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Email accounts CRUD
router.get('/accounts', (req, res) => {
  res.json(db.prepare('SELECT id,email,host,port,label,last_fetched,created_at FROM email_accounts WHERE user_id = ?').all(req.user.id));
});

router.post('/accounts', (req, res) => {
  const { email, password, host, port, label } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and app password required' });
  const r = db.prepare('INSERT INTO email_accounts (user_id,email,password,host,port,label) VALUES (?,?,?,?,?,?)').run(req.user.id, email, password, host||'imap.gmail.com', port||993, label||null);
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
