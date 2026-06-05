import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT name FROM stacks ORDER BY name').all().map(r => r.name));
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name too short' });
  db.prepare('INSERT OR IGNORE INTO stacks (name) VALUES (?)').run(name.trim());
  res.json({ message: 'Added' });
});

export default router;
