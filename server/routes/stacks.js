import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many requests' } });

router.get('/', publicLimiter, (req, res) => {
  res.json(db.prepare('SELECT name FROM stacks ORDER BY name').all().map(r => r.name));
});

router.post('/', auth, (req, res) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) return res.status(400).json({ error: 'Name too short' });
  if (name.trim().length > 100) return res.status(400).json({ error: 'Name too long (max 100 chars)' });
  db.prepare('INSERT OR IGNORE INTO stacks (name) VALUES (?)').run(name.trim().slice(0, 100));
  res.json({ message: 'Added' });
});

export default router;
