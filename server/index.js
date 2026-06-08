import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
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

dotenv.config();
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
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

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

// Chrome extension
app.post('/api/extension/job', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { company, role, platform, job_url, job_description, location } = req.body;
    const r = db.prepare('INSERT INTO applications (user_id,company,role,platform,job_url,job_description,location) VALUES (?,?,?,?,?,?,?)').run(user.id, company, role, platform, job_url, job_description, location);
    res.json({ id: r.lastInsertRowid });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startEmailScheduler();
});
