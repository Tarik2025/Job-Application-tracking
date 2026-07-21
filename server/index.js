import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Fail fast if running in production with a weak/default JWT secret
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('FATAL: JWT_SECRET must be set to a strong random string (32+ chars) in production');
  process.exit(1);
}

import db from './db.js';
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

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// XSS sanitization middleware — strips all dangerous HTML/JS patterns
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
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') obj[key] = strip(obj[key]);
        else if (obj[key] && typeof obj[key] === 'object') sanitize(obj[key]);
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
app.post('/api/extension/job', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { company, role, platform, job_url, job_description, location } = req.body;
    if (!company || !role) return res.status(400).json({ error: 'Company and role required' });

    // Duplicate check
    const duplicate = db.prepare('SELECT id,status FROM applications WHERE user_id=? AND company=? AND role=?').get(user.id, company, role);
    if (duplicate) return res.status(409).json({ error: 'Already saved', existing: duplicate });

    const save = db.transaction(() => {
      const r = db.prepare('INSERT INTO applications (user_id,company,role,platform,job_url,job_description,location) VALUES (?,?,?,?,?,?,?)').run(user.id, company, role, platform||null, job_url||null, job_description||null, location||null);
      const appId = r.lastInsertRowid;
      db.prepare('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES (?,?,?,?,?)').run(appId, user.id, null, 'applied', 'Saved from Chrome extension');
      const remindDate = new Date(Date.now() + 7 * 86400000).toISOString();
      db.prepare('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES (?,?,?,?)').run(user.id, appId, `Follow up with ${company}`, remindDate);
      return appId;
    });
    const appId = save();
    res.json({ id: appId });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Invalid token' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startEmailScheduler();
});
