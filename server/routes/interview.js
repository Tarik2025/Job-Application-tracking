import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';
import { generateInterviewPrep } from '../services/gemini.js';

const router = Router();

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
      const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [application_id, req.user.id]);
      if (rows[0]) { r = rows[0].role; c = rows[0].company; jd = rows[0].job_description || ''; }
    }
    if (!r || !c) return res.status(400).json({ error: 'Role and company required' });
    const prep = await generateInterviewPrep(r, c, jd);
    await pool.query(
      'INSERT INTO interview_prep (application_id,user_id,questions,topics,study_plan,company_insights,difficulty) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [application_id||null, req.user.id, JSON.stringify(prep.questions), JSON.stringify(prep.topics), JSON.stringify(prep.preparation_plan||[]), prep.company_insights||null, 'mixed']
    );
    res.json(prep);
  } catch (err) { console.error('POST /generate:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id,application_id,difficulty,created_at FROM interview_prep WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM interview_prep WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

export default router;
