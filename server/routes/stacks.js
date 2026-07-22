import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many requests' } });

router.get('/', publicLimiter, async (req, res) => {
  const { rows } = await pool.query('SELECT name FROM stacks ORDER BY name');
  res.json(rows.map(r => r.name));
});

router.post('/', auth, async (req, res) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) return res.status(400).json({ error: 'Name too short' });
  if (name.trim().length > 100) return res.status(400).json({ error: 'Name too long (max 100 chars)' });
  await pool.query('INSERT INTO stacks (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name.trim().slice(0, 100)]);
  res.json({ message: 'Added' });
});

export default router;
