import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import pdf from 'pdf-parse';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';
import { matchResume } from '../services/gemini.js';
import { analyzeResume } from '../services/manual.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

router.use(auth);

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'career-copilot/resumes', resource_type: 'raw', format: 'pdf' },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_, f, cb) => {
    if (f.mimetype !== 'application/pdf') return cb(Object.assign(new Error('Only PDF files allowed'), { status: 415 }));
    cb(null, true);
  }
});

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id,filename,skills,uploaded_at FROM resumes WHERE user_id=$1 ORDER BY uploaded_at DESC', [req.user.id]);
  res.json(rows);
});

router.post('/upload', doubleCsrfProtection, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF required' });
    const { rows: countRows } = await pool.query('SELECT COUNT(*) as c FROM resumes WHERE user_id=$1', [req.user.id]);
    if (parseInt(countRows[0].c) >= 10) {
      await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' }).catch(() => {});
      return res.status(400).json({ error: 'Maximum 10 resumes allowed. Delete one first.' });
    }
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200);
    // Download buffer from Cloudinary to extract text
    const response = await fetch(req.file.path);
    const buffer = Buffer.from(await response.arrayBuffer());
    const data = await pdf(buffer);
    const analysis = analyzeResume(data.text);
    const skillsJson = JSON.stringify(analysis.skills);
    const { rows } = await pool.query(
      'INSERT INTO resumes (user_id,filename,cloudinary_public_id,extracted_text,skills) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.user.id, safeName, req.file.filename, data.text, skillsJson]
    );
    res.json({ id: rows[0].id, filename: safeName, analysis });
  } catch (err) {
    if (req.file?.filename) { await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' }).catch(() => {}); }
    console.error('POST /upload:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', doubleCsrfProtection, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rows } = await pool.query('SELECT cloudinary_public_id FROM resumes WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  await pool.query('DELETE FROM resumes WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (rows[0].cloudinary_public_id) {
    await cloudinary.uploader.destroy(rows[0].cloudinary_public_id, { resource_type: 'raw' }).catch(() => {});
  }
  res.json({ message: 'Deleted' });
});

router.get('/:id/analyze', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rows } = await pool.query('SELECT * FROM resumes WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(analyzeResume(rows[0].extracted_text));
});

router.post('/match', doubleCsrfProtection, async (req, res) => {
  try {
    const resume_id = req.body.resume_id ? parseInt(req.body.resume_id) : null;
    const application_id = req.body.application_id ? parseInt(req.body.application_id) : null;
    const { job_description } = req.body;
    let text;
    if (resume_id) {
      if (isNaN(resume_id)) return res.status(400).json({ error: 'Invalid resume_id' });
      const { rows } = await pool.query('SELECT extracted_text FROM resumes WHERE id=$1 AND user_id=$2', [resume_id, req.user.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Resume not found' });
      text = rows[0].extracted_text;
    } else {
      const { rows } = await pool.query('SELECT extracted_text FROM resumes WHERE user_id=$1 ORDER BY uploaded_at DESC LIMIT 1', [req.user.id]);
      if (!rows[0]) return res.status(400).json({ error: 'Upload a resume first' });
      text = rows[0].extracted_text;
    }
    let jd = job_description;
    if (!jd && application_id) {
      if (isNaN(application_id)) return res.status(400).json({ error: 'Invalid application_id' });
      const { rows } = await pool.query('SELECT job_description FROM applications WHERE id=$1 AND user_id=$2', [application_id, req.user.id]);
      if (rows[0]?.job_description) jd = rows[0].job_description;
    }
    if (!jd) return res.status(400).json({ error: 'Job description required' });
    res.json(await matchResume(text, jd));
  } catch (err) { console.error('POST /match:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
