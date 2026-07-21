import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many requests' } });

router.get('/', publicLimiter, (req, res) => {
  const { q } = req.query;
  const sanitized = q ? q.replace(/[%_]/g, '') : '';
  const results = sanitized && sanitized.length >= 2
    ? db.prepare('SELECT name FROM colleges WHERE name LIKE ? ORDER BY name LIMIT 20').all(`%${sanitized}%`)
    : db.prepare('SELECT name FROM colleges ORDER BY name LIMIT 50').all();
  res.json(results.map(r => r.name));
});

router.post('/', auth, (req, res) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 3) return res.status(400).json({ error: 'Name too short' });
  if (name.trim().length > 200) return res.status(400).json({ error: 'Name too long (max 200 chars)' });
  db.prepare('INSERT OR IGNORE INTO colleges (name) VALUES (?)').run(name.trim().slice(0, 200));
  res.json({ message: 'Added' });
});

export default router;
