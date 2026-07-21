import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import db, { logAudit } from '../db.js';
import { paginate, paginatedResponse } from '../utils/pagination.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';

// In-memory admin token blocklist — invalidates tokens on logout within their remaining TTL
const revokedAdminTokens = new Map(); // token -> revocation timestamp

// Prune expired tokens every hour (admin tokens live max 4h)
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [token, revokedAt] of revokedAdminTokens) {
    if (revokedAt < cutoff) revokedAdminTokens.delete(token);
  }
}, 60 * 60 * 1000);

const router = Router();

const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, message: { error: 'Too many admin requests' } });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Validate required admin env vars at startup
if (!ADMIN_EMAIL || !ADMIN_SECRET || !ADMIN_PASSWORD_HASH) {
  console.error('FATAL: ADMIN_EMAIL, ADMIN_SECRET, and ADMIN_PASSWORD_HASH must be set in environment');
  process.exit(1);
}

// Admin login — no CSRF needed here: login issues the cookie, not a state-changing authenticated action
router.post('/login', adminLimiter, async (req, res) => {
  const { email, password, secret_key } = req.body;
  if (!email || !password || !secret_key) return res.status(400).json({ error: 'Email, password and secret key required' });
  if (email !== ADMIN_EMAIL || secret_key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  if (!await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) return res.status(401).json({ error: 'Invalid admin credentials' });

  const token = jwt.sign({ id: 0, email: ADMIN_EMAIL, name: 'Admin', is_admin: true }, process.env.JWT_SECRET, { expiresIn: '4h' });
  res.cookie('admin_token', token, { httpOnly: true, maxAge: 4*60*60*1000, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ admin: true, email: ADMIN_EMAIL });
});

router.post('/logout', adminGuard, doubleCsrfProtection, (req, res) => {
  // Revoke the token server-side so it cannot be reused even if captured
  const token = req.cookies?.admin_token;
  if (token) revokedAdminTokens.set(token, Date.now());
  res.clearCookie('admin_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Admin logged out' });
});

function adminGuard(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: 'Admin authentication required' });
  if (revokedAdminTokens.has(token)) return res.status(401).json({ error: 'Admin session expired' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!payload.is_admin) return res.status(403).json({ error: 'Admin access only' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid admin token' });
  }
}

router.get('/me', adminGuard, (req, res) => {
  res.json({ admin: true, email: ADMIN_EMAIL });
});

router.use(adminGuard);
router.use(adminLimiter);
router.use(doubleCsrfProtection);

// ===== DASHBOARD STATS =====
router.get('/stats', (req, res) => {
  res.json({
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    activeUsers: db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get().c,
    totalApps: db.prepare('SELECT COUNT(*) as c FROM applications').get().c,
    totalEmails: db.prepare('SELECT COUNT(*) as c FROM emails').get().c,
    totalResumes: db.prepare('SELECT COUNT(*) as c FROM resumes').get().c,
    statusBreakdown: db.prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status').all(),
    platformBreakdown: db.prepare('SELECT platform, COUNT(*) as count FROM applications WHERE platform IS NOT NULL GROUP BY platform').all(),
    recentSignups: db.prepare('SELECT id,name,email,user_type,created_at FROM users ORDER BY created_at DESC LIMIT 5').all(),
  });
});

// ===== GLOBAL SEARCH =====
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  const users = db.prepare('SELECT id,name,email,user_type FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10').all(`%${q}%`, `%${q}%`);
  const apps = db.prepare('SELECT a.id,a.company,a.role,a.status,u.name as user_name FROM applications a JOIN users u ON a.user_id=u.id WHERE a.company LIKE ? OR a.role LIKE ? LIMIT 10').all(`%${q}%`, `%${q}%`);
  const emails = db.prepare('SELECT id,subject,classification,created_at FROM emails WHERE subject LIKE ? LIMIT 10').all(`%${q}%`);

  res.json({ users, applications: apps, emails });
});

const USER_SORT_COLS = Object.freeze({ name: 'name', email: 'email', created_at: 'created_at', user_type: 'user_type' });
const APP_SORT_COLS = Object.freeze({ applied_date: 'a.applied_date', company: 'a.company', role: 'a.role', status: 'a.status', last_updated: 'a.last_updated' });

// ===== USERS CRUD =====
router.get('/users', adminGuard, adminLimiter, (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const sortField = USER_SORT_COLS[req.query.sort_by] || 'created_at';
  const sortDir = req.query.sort_dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const { search, user_type, is_active } = req.query;

  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (name LIKE ? OR email LIKE ? OR college LIKE ? OR company LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  if (user_type) { where += ' AND user_type = ?'; params.push(user_type); }
  if (is_active !== undefined) { where += ' AND is_active = ?'; params.push(Number(is_active)); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT id,email,name,phone,user_type,college,company,city,is_active,created_at, (SELECT COUNT(*) FROM applications WHERE user_id=users.id) as app_count FROM users ${where} ORDER BY ${sortField} ${sortDir} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

router.get('/users/:id', adminGuard, adminLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const user = db.prepare('SELECT id,email,name,phone,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio,target_days,is_active,created_at FROM users WHERE id=?').get(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const stacks = db.prepare('SELECT s.name FROM user_stacks us JOIN stacks s ON us.stack_id=s.id WHERE us.user_id=?').all(id).map(r=>r.name);
  const appCount = db.prepare('SELECT COUNT(*) as c FROM applications WHERE user_id=?').get(id).c;
  res.json({ ...user, stacks, app_count: appCount });
});

router.post('/users', adminGuard, adminLimiter, async (req, res) => {
  const { email, password, name, user_type } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, password required' });
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(400).json({ error: 'Email exists' });
  const hash = await bcrypt.hash(password, 12);
  const r = db.prepare('INSERT INTO users (email,password,name,user_type) VALUES (?,?,?,?)').run(email, hash, name, user_type||null);
  logAudit(0, 'ADMIN_CREATE_USER', 'user', r.lastInsertRowid, { email }, req.ip);
  res.json({ id: r.lastInsertRowid, email, name });
});

router.put('/users/:id', adminGuard, adminLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const fields = ['name','email','phone','gender','dob','user_type','college','degree','branch','year_of_study','passout_year','company','designation','experience','skills','preferred_role','city','state','country','linkedin','github','portfolio','is_active'];
  const updates = []; const values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (req.body.password) { updates.push('password = ?'); values.push(await bcrypt.hash(req.body.password, 12)); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  logAudit(0, 'ADMIN_UPDATE_USER', 'user', id, Object.keys(req.body), req.ip);
  res.json({ message: 'Updated' });
});

router.delete('/users/:id', adminGuard, adminLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const user = db.prepare('SELECT id,email FROM users WHERE id=?').get(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  logAudit(0, 'ADMIN_DELETE_USER', 'user', id, { email: user.email }, req.ip);
  res.json({ message: 'Deleted' });
});

// Deactivate/Activate user
router.patch('/users/:id/toggle', adminGuard, adminLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const user = db.prepare('SELECT id,is_active FROM users WHERE id=?').get(id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const newState = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active=? WHERE id=?').run(newState, id);
  logAudit(0, newState ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_DEACTIVATE_USER', 'user', id, null, req.ip);
  res.json({ is_active: newState });
});

// ===== APPLICATIONS (all users) =====
router.get('/applications', adminGuard, adminLimiter, (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const sortField = APP_SORT_COLS[req.query.sort_by] || 'a.applied_date';
  const sortDir = req.query.sort_dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const { search, status, user_id, platform } = req.query;

  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (a.company LIKE ? OR a.role LIKE ? OR u.name LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (status) { where += ' AND a.status = ?'; params.push(status); }
  if (user_id) { where += ' AND a.user_id = ?'; params.push(user_id); }
  if (platform) { where += ' AND a.platform = ?'; params.push(platform); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM applications a JOIN users u ON a.user_id=u.id ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT a.*,u.name as user_name,u.email as user_email FROM applications a JOIN users u ON a.user_id=u.id ${where} ORDER BY ${sortField} ${sortDir} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

router.put('/applications/:id', adminGuard, adminLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const app = db.prepare('SELECT * FROM applications WHERE id=?').get(id);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const fields = ['company','role','status','platform','job_url','job_description','salary_expected','salary_offered','location','notes','priority'];
  const updates = []; const values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });
  updates.push('last_updated = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  logAudit(0, 'ADMIN_UPDATE_APP', 'application', id, req.body, req.ip);
  res.json(db.prepare('SELECT * FROM applications WHERE id=?').get(id));
});

router.delete('/applications/:id', adminGuard, adminLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
  const r = db.prepare('DELETE FROM applications WHERE id=?').run(id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  logAudit(0, 'ADMIN_DELETE_APP', 'application', id, null, req.ip);
  res.json({ message: 'Deleted' });
});

// ===== AUDIT LOG =====
router.get('/audit', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { user_id, action, entity, search } = req.query;

  let where = 'WHERE 1=1';
  const params = [];
  if (user_id) { where += ' AND a.user_id = ?'; params.push(user_id); }
  if (action) { where += ' AND a.action = ?'; params.push(action); }
  if (entity) { where += ' AND a.entity = ?'; params.push(entity); }
  if (search) { where += ' AND (a.action LIKE ? OR a.details LIKE ? OR u.name LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM audit_log a LEFT JOIN users u ON a.user_id=u.id ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT a.*,u.name as user_name,u.email as user_email FROM audit_log a LEFT JOIN users u ON a.user_id=u.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

// ===== EMAILS (all) =====
router.get('/emails', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { search, classification } = req.query;

  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (e.subject LIKE ?)'; params.push(`%${search}%`); }
  if (classification) { where += ' AND e.classification = ?'; params.push(classification); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM emails e ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT e.*,u.name as user_name FROM emails e JOIN users u ON e.user_id=u.id ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

export default router;
