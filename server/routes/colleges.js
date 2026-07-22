import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many requests' } });

router.get('/', publicLimiter, async (req, res) => {
  const { q } = req.query;
  const sanitized = q ? q.replace(/[%_]/g, '') : '';
  const { rows } = sanitized && sanitized.length >= 2
    ? await pool.query('SELECT name FROM colleges WHERE name ILIKE $1 ORDER BY name LIMIT 20', [`%${sanitized}%`])
    : await pool.query('SELECT name FROM colleges ORDER BY name LIMIT 50');
  res.json(rows.map(r => r.name));
});

router.post('/', auth, async (req, res) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 3) return res.status(400).json({ error: 'Name too short' });
  if (name.trim().length > 200) return res.status(400).json({ error: 'Name too long (max 200 chars)' });
  await pool.query('INSERT INTO colleges (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name.trim().slice(0, 200)]);
  res.json({ message: 'Added' });
});

export default router;
