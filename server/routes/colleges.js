import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  const sanitized = q ? q.replace(/[%_]/g, '') : '';
  const results = sanitized && sanitized.length >= 2
    ? db.prepare('SELECT name FROM colleges WHERE name LIKE ? ORDER BY name LIMIT 20').all(`%${sanitized}%`)
    : db.prepare('SELECT name FROM colleges ORDER BY name LIMIT 50').all();
  res.json(results.map(r => r.name));
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 3) return res.status(400).json({ error: 'Name too short' });
  db.prepare('INSERT OR IGNORE INTO colleges (name) VALUES (?)').run(name.trim());
  res.json({ message: 'Added' });
});

export default router;
