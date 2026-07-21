import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// CSRF mitigation: reject state-changing requests without JSON content-type
router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

router.get('/', (req, res) => {
  const raw = req.query.q;
  const q = Array.isArray(raw) ? raw[0] : raw;
  if (!q || typeof q !== 'string' || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

  const uid = req.user.id;
  const pattern = `%${q}%`;

  const applications = db.prepare('SELECT id,company,role,status,platform,applied_date FROM applications WHERE user_id=? AND (company LIKE ? OR role LIKE ? OR location LIKE ? OR notes LIKE ?) ORDER BY applied_date DESC LIMIT 10').all(uid, pattern, pattern, pattern, pattern);

  const emails = db.prepare('SELECT id,subject,classification,created_at FROM emails WHERE user_id=? AND subject LIKE ? ORDER BY created_at DESC LIMIT 10').all(uid, pattern);

  const resumes = db.prepare('SELECT id,filename,uploaded_at FROM resumes WHERE user_id=? AND filename LIKE ? LIMIT 5').all(uid, pattern);

  res.json({ applications, emails, resumes, total: applications.length + emails.length + resumes.length });
});

export default router;
