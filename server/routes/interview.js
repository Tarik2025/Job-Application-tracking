import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { generateInterviewPrep } from '../services/gemini.js';

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

const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyGenerator: (req) => String(req.user.id), message: { error: 'AI generation limit reached, try again in an hour' } });

router.post('/generate', aiLimiter, async (req, res) => {
  try {
    const { application_id, role, company } = req.body;
    let r = role, c = company, jd = '';
    if (application_id) {
      // Enforce ownership — only fetch app belonging to this user
      const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(application_id, req.user.id);
      if (app) { r = app.role; c = app.company; jd = app.job_description || ''; }
    }
    if (!r || !c) return res.status(400).json({ error: 'Role and company required' });
    const prep = await generateInterviewPrep(r, c, jd);
    db.prepare('INSERT INTO interview_prep (application_id,user_id,questions,topics,study_plan,company_insights,difficulty) VALUES (?,?,?,?,?,?,?)').run(application_id||null, req.user.id, JSON.stringify(prep.questions), JSON.stringify(prep.topics), JSON.stringify(prep.preparation_plan || []), prep.company_insights || null, 'mixed');
    res.json(prep);
  } catch (err) { console.error('POST /generate:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT id,application_id,difficulty,created_at FROM interview_prep WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

// Get full detail for one prep record
router.get('/:id', (req, res) => {
  const prep = db.prepare('SELECT * FROM interview_prep WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!prep) return res.status(404).json({ error: 'Not found' });
  res.json(prep);
});

export default router;
