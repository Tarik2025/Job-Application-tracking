import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Fail fast on missing/weak required env vars
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set to a strong random string (32+ chars)');
  process.exit(1);
}
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
  console.error('FATAL: ENCRYPTION_KEY must be set to a strong random string (32+ chars)');
  process.exit(1);
}

import pool, { initDb } from './db.js';
import { startEmailScheduler } from './services/scheduler.js';
import authRoutes from './routes/auth.js';
import collegeRoutes from './routes/colleges.js';
import stackRoutes from './routes/stacks.js';
import applicationRoutes from './routes/applications.js';
import emailRoutes from './routes/emails.js';
import resumeRoutes from './routes/resume.js';
import interviewRoutes from './routes/interview.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import searchRoutes from './routes/search.js';
import advancedRoutes from './routes/advanced.js';
import { auth as _auth } from './middleware/auth.js';
import { generateToken, doubleCsrfProtection } from './middleware/csrf.js';

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many requests, try again later' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts, try again later' } });
app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/login', authLimiter);

app.use(cors({ origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000'), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  if (req.path === '/api/csrf-token') return next();
  doubleCsrfProtection(req, res, next);
});

// XSS sanitization middleware — strips all dangerous HTML/JS patterns from JSON bodies
// NOTE: multipart/form-data (file uploads) bypasses this middleware by design —
// multer handles those requests and filename sanitization is done in resume.js
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const strip = (str) => str
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:\s*text\/html/gi, '')
      .replace(/<iframe[\s\S]*?>/gi, '')
      .replace(/<svg[\s\S]*?on\w+[\s\S]*?>/gi, '');
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      for (const key of Object.keys(obj)) {
        if (dangerousKeys.includes(key)) { obj[key] = undefined; continue; }
        const value = obj[key];
        if (typeof value === 'string') obj[key] = strip(value);
        else if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) sanitize(value);
      }
    };
    sanitize(req.body);
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/stacks', stackRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/advanced', advancedRoutes);

// Chrome extension — save job with full consistency (status_history + reminder + duplicate check)
app.post('/api/extension/job', _auth, doubleCsrfProtection, async (req, res) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  const client = await pool.connect();
  try {
    const { company, role, platform, job_url, job_description, location } = req.body;
    if (!company || !role) return res.status(400).json({ error: 'Company and role required' });

    const dup = await client.query('SELECT id,status FROM applications WHERE user_id=$1 AND company=$2 AND role=$3', [req.user.id, company, role]);
    if (dup.rows[0]) return res.status(409).json({ error: 'Already saved', existing: dup.rows[0] });

    await client.query('BEGIN');
    const r = await client.query(
      'INSERT INTO applications (user_id,company,role,platform,job_url,job_description,location) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [req.user.id, company, role, platform||null, job_url||null, job_description||null, location||null]
    );
    const appId = r.rows[0].id;
    await client.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [appId, req.user.id, null, 'applied', 'Saved from Chrome extension']);
    const remindDate = new Date(Date.now() + 7 * 86400000).toISOString();
    await client.query('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES ($1,$2,$3,$4)', [req.user.id, appId, `Follow up with ${company}`, remindDate]);
    await client.query('COMMIT');
    res.json({ id: appId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/extension/job:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// CSRF token endpoint — frontend calls this once to get a token
app.get('/api/csrf-token', (req, res) => res.json({ csrfToken: generateToken(req, res) }));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startEmailScheduler();
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
