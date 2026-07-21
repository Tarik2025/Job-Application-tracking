import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import { readFile, unlink } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';
import { matchResume } from '../services/gemini.js';
import { analyzeResume } from '../services/manual.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, '..', 'uploads');

// Confine a file path to the uploads directory — prevents path traversal (CWE-22)
function safeUploadPath(filePath) {
  // Normalize and resolve to an absolute path
  const normalized = resolve(UPLOADS_DIR, resolve(filePath).replace(/^.*[/\\]/, ''));
  // Double-check: resolved path MUST start with UPLOADS_DIR
  if (!normalized.startsWith(UPLOADS_DIR)) {
    throw new Error('Path traversal detected');
  }
  return normalized;
}

// CSRF mitigation: reject state-changing requests without correct content-type
router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    // Exempt multipart/form-data (file uploads handled by multer)
    if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

router.use(auth);
const upload = multer({
  dest: resolve(__dirname, '..', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (_, f, cb) => {
    if (f.mimetype !== 'application/pdf') return cb(Object.assign(new Error('Only PDF files allowed'), { status: 415 }));
    cb(null, true);
  }
});

// List resumes
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT id,filename,skills,uploaded_at FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC').all(req.user.id));
});

// Upload + auto-analyze
router.post('/upload', doubleCsrfProtection, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF required' });
    // Enforce per-user resume limit
    const resumeCount = db.prepare('SELECT COUNT(*) as c FROM resumes WHERE user_id=?').get(req.user.id).c;
    if (resumeCount >= 10) {
      await unlink(safeUploadPath(req.file.path)).catch(() => {});
      return res.status(400).json({ error: 'Maximum 10 resumes allowed. Delete one first.' });
    }
    // Sanitize original filename — strip path traversal chars, limit length
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200);
    const safePath = safeUploadPath(req.file.path);
    const data = await pdf(await readFile(safePath));
    const analysis = analyzeResume(data.text);
    const skillsJson = JSON.stringify(analysis.skills);
    const r = db.prepare('INSERT INTO resumes (user_id,filename,file_path,extracted_text,skills) VALUES (?,?,?,?,?)').run(req.user.id, safeName, safePath, data.text, skillsJson);
    res.json({ id: r.lastInsertRowid, filename: safeName, analysis });
  } catch (err) {
    if (req.file?.path) {
      try { await unlink(safeUploadPath(req.file.path)); } catch {}
    }
    console.error('POST /upload:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete resume — removes DB record and file from disk
router.delete('/:id', doubleCsrfProtection, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const resume = db.prepare('SELECT file_path FROM resumes WHERE id=? AND user_id=?').get(id, req.user.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM resumes WHERE id=? AND user_id=?').run(id, req.user.id);
  if (resume.file_path) {
    try { await unlink(safeUploadPath(resume.file_path)); } catch {}
  }
  res.json({ message: 'Deleted' });
});

// Analyze existing resume
router.get('/:id/analyze', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const resume = db.prepare('SELECT * FROM resumes WHERE id=? AND user_id=?').get(id, req.user.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });
  res.json(analyzeResume(resume.extracted_text));
});

// Match resume vs JD
router.post('/match', doubleCsrfProtection, async (req, res) => {
  try {
    const resume_id = req.body.resume_id ? parseInt(req.body.resume_id) : null;
    const application_id = req.body.application_id ? parseInt(req.body.application_id) : null;
    const { job_description } = req.body;
    let text;
    if (resume_id) {
      if (isNaN(resume_id)) return res.status(400).json({ error: 'Invalid resume_id' });
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
      if (isNaN(application_id)) return res.status(400).json({ error: 'Invalid application_id' });
      const a = db.prepare('SELECT job_description FROM applications WHERE id=? AND user_id=?').get(application_id, req.user.id);
      if (a?.job_description) jd = a.job_description;
    }
    if (!jd) return res.status(400).json({ error: 'Job description required' });
    res.json(await matchResume(text, jd));
  } catch (err) { console.error('POST /match:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
