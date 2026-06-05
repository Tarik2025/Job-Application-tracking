import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import { readFileSync } from 'fs';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { matchResume } from '../services/gemini.js';
import { analyzeResume } from '../services/manual.js';

const router = Router();
router.use(auth);
const upload = multer({ dest: 'uploads/', fileFilter: (_, f, cb) => cb(null, f.mimetype === 'application/pdf') });

// List resumes
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT id,filename,skills,uploaded_at FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC').all(req.user.id));
});

// Upload + auto-analyze
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF required' });
    const data = await pdf(readFileSync(req.file.path));
    const analysis = analyzeResume(data.text);
    const skillsJson = JSON.stringify(analysis.skills);

    const r = db.prepare('INSERT INTO resumes (user_id,filename,extracted_text,skills) VALUES (?,?,?,?)').run(req.user.id, req.file.originalname, data.text, skillsJson);
    res.json({ id: r.lastInsertRowid, filename: req.file.originalname, analysis });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Analyze existing resume
router.get('/:id/analyze', (req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });
  res.json(analyzeResume(resume.extracted_text));
});

// Match resume vs JD
router.post('/match', async (req, res) => {
  try {
    const { resume_id, job_description, application_id } = req.body;
    let text;
    if (resume_id) {
      const r = db.prepare('SELECT extracted_text FROM resumes WHERE id=? AND user_id=?').get(resume_id, req.user.id);
      if (!r) return res.status(404).json({ error: 'Resume not found' });
      text = r.extracted_text;
    } else {
      const r = db.prepare('SELECT extracted_text FROM resumes WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1').get(req.user.id);
      if (!r) return res.status(400).json({ error: 'Upload a resume first' });
      text = r.extracted_text;
    }
    let jd = job_description;
    if (!jd && application_id) {
      const a = db.prepare('SELECT job_description FROM applications WHERE id=? AND user_id=?').get(application_id, req.user.id);
      if (a?.job_description) jd = a.job_description;
    }
    if (!jd) return res.status(400).json({ error: 'Job description required' });
    res.json(await matchResume(text, jd));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
