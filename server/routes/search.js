import { Router } from 'express';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const raw = req.query.q;
    const q = Array.isArray(raw) ? raw[0] : raw;
    if (!q || typeof q !== 'string' || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

    const uid = req.user.id;
    const pattern = `%${q}%`;

    const [apps, emails, resumes] = await Promise.all([
      pool.query('SELECT id,company,role,status,platform,applied_date FROM applications WHERE user_id=$1 AND (company ILIKE $2 OR role ILIKE $2 OR location ILIKE $2 OR notes ILIKE $2) ORDER BY applied_date DESC LIMIT 10', [uid, pattern]),
      pool.query('SELECT id,subject,classification,created_at FROM emails WHERE user_id=$1 AND subject ILIKE $2 ORDER BY created_at DESC LIMIT 10', [uid, pattern]),
      pool.query('SELECT id,filename,uploaded_at FROM resumes WHERE user_id=$1 AND filename ILIKE $2 LIMIT 5', [uid, pattern]),
    ]);

    res.json({ applications: apps.rows, emails: emails.rows, resumes: resumes.rows, total: apps.rows.length + emails.rows.length + resumes.rows.length });
  } catch (err) { console.error('GET /search:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
