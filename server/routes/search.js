import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return res.status(400).json({ error: 'Query required' });

  const uid = req.user.id;
  const pattern = `%${q}%`;

  const applications = db.prepare('SELECT id,company,role,status,platform,applied_date FROM applications WHERE user_id=? AND (company LIKE ? OR role LIKE ? OR location LIKE ? OR notes LIKE ?) ORDER BY applied_date DESC LIMIT 10').all(uid, pattern, pattern, pattern, pattern);

  const emails = db.prepare('SELECT id,subject,classification,created_at FROM emails WHERE user_id=? AND (subject LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT 10').all(uid, pattern, pattern);

  const resumes = db.prepare('SELECT id,filename,uploaded_at FROM resumes WHERE user_id=? AND (filename LIKE ? OR extracted_text LIKE ?) LIMIT 5').all(uid, pattern, pattern);

  res.json({ applications, emails, resumes, total: applications.length + emails.length + resumes.length });
});

export default router;
