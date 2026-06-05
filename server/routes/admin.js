import dotenv from 'dotenv';
dotenv.config();
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { logAudit } from '../db.js';
import { paginate, buildSort, paginatedResponse } from '../utils/pagination.js';

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Admin login with secret key
router.post('/login', async (req, res) => {
  const { email, password, secret_key } = req.body;
  if (!email || !password || !secret_key) return res.status(400).json({ error: 'Email, password and secret key required' });
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD || secret_key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  const token = jwt.sign({ id: 0, email: ADMIN_EMAIL, name: 'Admin', is_admin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('admin_token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
  res.json({ admin: true, email: ADMIN_EMAIL });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Admin logged out' });
});

function adminGuard(req, res, next) {
  const token = req.cookies?.admin_token || req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Admin authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
  const emails = db.prepare('SELECT id,subject,classification,created_at FROM emails WHERE subject LIKE ? OR body LIKE ? LIMIT 10').all(`%${q}%`, `%${q}%`);

  res.json({ users, applications: apps, emails });
});

// ===== USERS CRUD =====
router.get('/users', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const sort = buildSort(req.query, ['name','email','created_at','user_type'], 'created_at', 'DESC');
  const { search, user_type, is_active } = req.query;

  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (name LIKE ? OR email LIKE ? OR college LIKE ? OR company LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  if (user_type) { where += ' AND user_type = ?'; params.push(user_type); }
  if (is_active !== undefined) { where += ' AND is_active = ?'; params.push(Number(is_active)); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT id,email,name,phone,user_type,college,company,city,is_active,created_at, (SELECT COUNT(*) FROM applications WHERE user_id=users.id) as app_count FROM users ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id,email,name,phone,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio,target_days,is_active,created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const stacks = db.prepare('SELECT s.name FROM user_stacks us JOIN stacks s ON us.stack_id=s.id WHERE us.user_id=?').all(req.params.id).map(r=>r.name);
  const appCount = db.prepare('SELECT COUNT(*) as c FROM applications WHERE user_id=?').get(req.params.id).c;
  res.json({ ...user, stacks, app_count: appCount });
});

router.post('/users', async (req, res) => {
  const { email, password, name, user_type } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, password required' });
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(400).json({ error: 'Email exists' });
  const hash = await bcrypt.hash(password, 12);
  const r = db.prepare('INSERT INTO users (email,password,name,user_type) VALUES (?,?,?,?)').run(email, hash, name, user_type||null);
  logAudit(0, 'ADMIN_CREATE_USER', 'user', r.lastInsertRowid, { email }, req.ip);
  res.json({ id: r.lastInsertRowid, email, name });
});

router.put('/users/:id', async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const fields = ['name','email','phone','gender','dob','user_type','college','degree','branch','year_of_study','passout_year','company','designation','experience','skills','preferred_role','city','state','country','linkedin','github','portfolio','is_active'];
  const updates = []; const values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (req.body.password) { updates.push('password = ?'); values.push(await bcrypt.hash(req.body.password, 12)); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  logAudit(0, 'ADMIN_UPDATE_USER', 'user', Number(req.params.id), Object.keys(req.body), req.ip);
  res.json({ message: 'Updated' });
});

router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id,email FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  logAudit(0, 'ADMIN_DELETE_USER', 'user', Number(req.params.id), { email: user.email }, req.ip);
  res.json({ message: 'Deleted' });
});

// Deactivate/Activate user
router.patch('/users/:id/toggle', (req, res) => {
  const user = db.prepare('SELECT id,is_active FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const newState = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active=? WHERE id=?').run(newState, req.params.id);
  logAudit(0, newState ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_DEACTIVATE_USER', 'user', Number(req.params.id), null, req.ip);
  res.json({ is_active: newState });
});

// ===== APPLICATIONS (all users) =====
router.get('/applications', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const sort = buildSort(req.query, ['applied_date','company','role','status','last_updated'], 'applied_date', 'DESC');
  const { search, status, user_id, platform } = req.query;

  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (a.company LIKE ? OR a.role LIKE ? OR u.name LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (status) { where += ' AND a.status = ?'; params.push(status); }
  if (user_id) { where += ' AND a.user_id = ?'; params.push(user_id); }
  if (platform) { where += ' AND a.platform = ?'; params.push(platform); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM applications a JOIN users u ON a.user_id=u.id ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT a.*,u.name as user_name,u.email as user_email FROM applications a JOIN users u ON a.user_id=u.id ${where} ORDER BY a.${sort} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

router.put('/applications/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const fields = ['company','role','status','platform','job_url','job_description','salary_range','location','notes','priority'];
  const updates = []; const values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });
  updates.push('last_updated = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  logAudit(0, 'ADMIN_UPDATE_APP', 'application', Number(req.params.id), req.body, req.ip);
  res.json(db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id));
});

router.delete('/applications/:id', (req, res) => {
  const r = db.prepare('DELETE FROM applications WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  logAudit(0, 'ADMIN_DELETE_APP', 'application', Number(req.params.id), null, req.ip);
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
  if (search) { where += ' AND (e.subject LIKE ? OR e.body LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
  if (classification) { where += ' AND e.classification = ?'; params.push(classification); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM emails e ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT e.*,u.name as user_name FROM emails e JOIN users u ON e.user_id=u.id ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json(paginatedResponse(rows, total, page, limit));
});

export default router;
