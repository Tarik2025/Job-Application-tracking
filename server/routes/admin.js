import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pool, { logAudit } from '../db.js';
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
router.get('/stats', async (req, res) => {
  try {
    const [u, au, ap, em, re, sb, pb, rs] = await Promise.all([
      pool.query('SELECT COUNT(*) as c FROM users'),
      pool.query('SELECT COUNT(*) as c FROM users WHERE is_active=1'),
      pool.query('SELECT COUNT(*) as c FROM applications'),
      pool.query('SELECT COUNT(*) as c FROM emails'),
      pool.query('SELECT COUNT(*) as c FROM resumes'),
      pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status'),
      pool.query('SELECT platform, COUNT(*) as count FROM applications WHERE platform IS NOT NULL GROUP BY platform'),
      pool.query('SELECT id,name,email,user_type,created_at FROM users ORDER BY created_at DESC LIMIT 5'),
    ]);
    res.json({
      totalUsers: parseInt(u.rows[0].c),
      activeUsers: parseInt(au.rows[0].c),
      totalApps: parseInt(ap.rows[0].c),
      totalEmails: parseInt(em.rows[0].c),
      totalResumes: parseInt(re.rows[0].c),
      statusBreakdown: sb.rows,
      platformBreakdown: pb.rows,
      recentSignups: rs.rows,
    });
  } catch (err) { console.error('GET /stats:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== GLOBAL SEARCH =====
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
    const [users, apps, emails] = await Promise.all([
      pool.query('SELECT id,name,email,user_type FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10', [`%${q}%`]),
      pool.query('SELECT a.id,a.company,a.role,a.status,u.name as user_name FROM applications a JOIN users u ON a.user_id=u.id WHERE a.company ILIKE $1 OR a.role ILIKE $1 LIMIT 10', [`%${q}%`]),
      pool.query('SELECT id,subject,classification,created_at FROM emails WHERE subject ILIKE $1 LIMIT 10', [`%${q}%`]),
    ]);
    res.json({ users: users.rows, applications: apps.rows, emails: emails.rows });
  } catch (err) { console.error('GET /search:', err); res.status(500).json({ error: 'Internal server error' }); }
});

const USER_SORT_COLS = Object.freeze({ name: 'name', email: 'email', created_at: 'created_at', user_type: 'user_type' });
const APP_SORT_COLS = Object.freeze({ applied_date: 'a.applied_date', company: 'a.company', role: 'a.role', status: 'a.status', last_updated: 'a.last_updated' });

// ===== USERS CRUD =====
router.get('/users', adminGuard, adminLimiter, async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const sortField = USER_SORT_COLS[req.query.sort_by] || 'created_at';
    const sortDir = req.query.sort_dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { search, user_type, is_active } = req.query;
    let where = 'WHERE 1=1'; const params = [];
    const p = () => `$${params.length + 1}`;
    if (search) { where += ` AND (name ILIKE ${p()} OR email ILIKE ${p()} OR college ILIKE ${p()} OR company ILIKE ${p()})`; const s = `%${search}%`; params.push(s,s,s,s); }
    if (user_type) { where += ` AND user_type=${p()}`; params.push(user_type); }
    if (is_active !== undefined) { where += ` AND is_active=${p()}`; params.push(Number(is_active)); }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as c FROM users ${where}`, params);
    const { rows } = await pool.query(`SELECT id,email,name,phone,user_type,college,company,city,is_active,created_at,(SELECT COUNT(*) FROM applications WHERE user_id=users.id) as app_count FROM users ${where} ORDER BY ${sortField} ${sortDir} LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    res.json(paginatedResponse(rows, parseInt(countRows[0].c), page, limit));
  } catch (err) { console.error('GET /users:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/users/:id', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT id,email,name,phone,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio,target_days,is_active,created_at FROM users WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const [{ rows: stacks }, { rows: countRows }] = await Promise.all([
      pool.query('SELECT s.name FROM user_stacks us JOIN stacks s ON us.stack_id=s.id WHERE us.user_id=$1', [id]),
      pool.query('SELECT COUNT(*) as c FROM applications WHERE user_id=$1', [id]),
    ]);
    res.json({ ...rows[0], stacks: stacks.map(r => r.name), app_count: parseInt(countRows[0].c) });
  } catch (err) { console.error('GET /users/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/users', adminGuard, adminLimiter, async (req, res) => {
  try {
    const { email, password, name, user_type } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, password required' });
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing[0]) return res.status(400).json({ error: 'Email exists' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query('INSERT INTO users (email,password,name,user_type) VALUES ($1,$2,$3,$4) RETURNING id', [email, hash, name, user_type||null]);
    await logAudit(0, 'ADMIN_CREATE_USER', 'user', rows[0].id, { email }, req.ip);
    res.json({ id: rows[0].id, email, name });
  } catch (err) { console.error('POST /users:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/users/:id', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const fields = ['name','email','phone','gender','dob','user_type','college','degree','branch','year_of_study','passout_year','company','designation','experience','skills','preferred_role','city','state','country','linkedin','github','portfolio','is_active'];
    const updates = []; const values = [];
    for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=$${updates.length+1}`); values.push(req.body[f]); } }
    if (req.body.password) { updates.push(`password=$${updates.length+1}`); values.push(await bcrypt.hash(req.body.password, 12)); }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    updates.push('updated_at=CURRENT_TIMESTAMP');
    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=$${values.length}`, values);
    await logAudit(0, 'ADMIN_UPDATE_USER', 'user', id, Object.keys(req.body), req.ip);
    res.json({ message: 'Updated' });
  } catch (err) { console.error('PUT /users/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/users/:id', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT id,email FROM users WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    await logAudit(0, 'ADMIN_DELETE_USER', 'user', id, { email: rows[0].email }, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('DELETE /users/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/users/:id/toggle', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT id,is_active FROM users WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const newState = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE users SET is_active=$1 WHERE id=$2', [newState, id]);
    await logAudit(0, newState ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_DEACTIVATE_USER', 'user', id, null, req.ip);
    res.json({ is_active: newState });
  } catch (err) { console.error('PATCH /users/:id/toggle:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== APPLICATIONS (all users) =====
router.get('/applications', adminGuard, adminLimiter, async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const sortField = APP_SORT_COLS[req.query.sort_by] || 'a.applied_date';
    const sortDir = req.query.sort_dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { search, status, user_id, platform } = req.query;
    let where = 'WHERE 1=1'; const params = [];
    const p = () => `$${params.length + 1}`;
    if (search) { where += ` AND (a.company ILIKE ${p()} OR a.role ILIKE ${p()} OR u.name ILIKE ${p()})`; const s = `%${search}%`; params.push(s,s,s); }
    if (status) { where += ` AND a.status=${p()}`; params.push(status); }
    if (user_id) { where += ` AND a.user_id=${p()}`; params.push(user_id); }
    if (platform) { where += ` AND a.platform=${p()}`; params.push(platform); }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as c FROM applications a JOIN users u ON a.user_id=u.id ${where}`, params);
    const { rows } = await pool.query(`SELECT a.*,u.name as user_name,u.email as user_email FROM applications a JOIN users u ON a.user_id=u.id ${where} ORDER BY ${sortField} ${sortDir} LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    res.json(paginatedResponse(rows, parseInt(countRows[0].c), page, limit));
  } catch (err) { console.error('GET /applications:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/applications/:id', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const fields = ['company','role','status','platform','job_url','job_description','salary_expected','salary_offered','location','notes','priority'];
    const updates = []; const values = [];
    for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=$${updates.length+1}`); values.push(req.body[f]); } }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    updates.push('last_updated=CURRENT_TIMESTAMP');
    values.push(id);
    await pool.query(`UPDATE applications SET ${updates.join(',')} WHERE id=$${values.length}`, values);
    await logAudit(0, 'ADMIN_UPDATE_APP', 'application', id, req.body, req.ip);
    const { rows: updated } = await pool.query('SELECT * FROM applications WHERE id=$1', [id]);
    res.json(updated[0]);
  } catch (err) { console.error('PUT /applications/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/applications/:id', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rowCount } = await pool.query('DELETE FROM applications WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    await logAudit(0, 'ADMIN_DELETE_APP', 'application', id, null, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('DELETE /applications/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== AUDIT LOG =====
router.get('/audit', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { user_id, action, entity, search } = req.query;
    let where = 'WHERE 1=1'; const params = [];
    const p = () => `$${params.length + 1}`;
    if (user_id) { where += ` AND a.user_id=${p()}`; params.push(user_id); }
    if (action) { where += ` AND a.action=${p()}`; params.push(action); }
    if (entity) { where += ` AND a.entity=${p()}`; params.push(entity); }
    if (search) { where += ` AND (a.action ILIKE ${p()} OR a.details ILIKE ${p()} OR u.name ILIKE ${p()})`; const s = `%${search}%`; params.push(s,s,s); }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as c FROM audit_log a LEFT JOIN users u ON a.user_id=u.id ${where}`, params);
    const { rows } = await pool.query(`SELECT a.*,u.name as user_name,u.email as user_email FROM audit_log a LEFT JOIN users u ON a.user_id=u.id ${where} ORDER BY a.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    res.json(paginatedResponse(rows, parseInt(countRows[0].c), page, limit));
  } catch (err) { console.error('GET /audit:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== USER PROXY — full dashboard data as admin =====

router.get('/users/:id/applications', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { page, limit, offset } = paginate(req.query);
    const { status, search, platform, priority } = req.query;
    let where = 'WHERE user_id=$1'; const params = [id];
    const p = () => `$${params.length + 1}`;
    if (status) { where += ` AND status=${p()}`; params.push(status); }
    if (platform) { where += ` AND platform=${p()}`; params.push(platform); }
    if (priority) { where += ` AND priority=${p()}`; params.push(priority); }
    if (search) { where += ` AND (company ILIKE ${p()} OR role ILIKE ${p()})`; const s = `%${search}%`; params.push(s,s); }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as c FROM applications ${where}`, params);
    const { rows } = await pool.query(`SELECT * FROM applications ${where} ORDER BY applied_date DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    res.json(paginatedResponse(rows, parseInt(countRows[0].c), page, limit));
  } catch (err) { console.error('GET /users/:id/applications:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/users/:id/analytics', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const [{ rows: apps }, { rows: sb }, { rows: pb }, { rows: ma }] = await Promise.all([
      pool.query('SELECT status FROM applications WHERE user_id=$1', [id]),
      pool.query('SELECT status, COUNT(*) as count FROM applications WHERE user_id=$1 GROUP BY status', [id]),
      pool.query('SELECT platform, COUNT(*) as count FROM applications WHERE user_id=$1 AND platform IS NOT NULL GROUP BY platform', [id]),
      pool.query("SELECT TO_CHAR(applied_date,'YYYY-MM') as month, COUNT(*) as count FROM applications WHERE user_id=$1 GROUP BY month ORDER BY month DESC LIMIT 12", [id]),
    ]);
    const total = apps.length;
    const responded = apps.filter(a => ['interview','offer','rejected'].includes(a.status)).length;
    const interviewed = apps.filter(a => ['interview','offer'].includes(a.status)).length;
    const offered = apps.filter(a => a.status === 'offer').length;
    res.json({ total, responseRate: total ? Math.round((responded/total)*100) : 0, interviewRate: total ? Math.round((interviewed/total)*100) : 0, offerRate: total ? Math.round((offered/total)*100) : 0, statusBreakdown: sb, platformBreakdown: pb, monthlyApps: ma, insights: { total, responseRate: total ? Math.round((responded/total)*100) : 0, avgResponseDays: 0 } });
  } catch (err) { console.error('GET /users/:id/analytics:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/users/:id/streak', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query("SELECT DISTINCT DATE(applied_date) as d FROM applications WHERE user_id=$1 ORDER BY d DESC", [id]);
    const dates = rows.map(r => r.d instanceof Date ? r.d.toISOString().split('T')[0] : String(r.d).split('T')[0]);
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0];
    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        if ((new Date(dates[i-1]) - new Date(dates[i])) / 86400000 === 1) streak++; else break;
      }
    }
    const [wk, mo] = await Promise.all([
      pool.query("SELECT COUNT(*) as c FROM applications WHERE user_id=$1 AND applied_date >= NOW() - INTERVAL '7 days'", [id]),
      pool.query("SELECT COUNT(*) as c FROM applications WHERE user_id=$1 AND applied_date >= NOW() - INTERVAL '30 days'", [id]),
    ]);
    res.json({ current_streak: streak, longest_streak: streak, total_days_applied: dates.length, this_week: parseInt(wk.rows[0].c), this_month: parseInt(mo.rows[0].c) });
  } catch (err) { console.error('GET /users/:id/streak:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/users/:id/goals', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC', [id]);
    res.json(rows.map(g => ({ ...g, progress: g.target_count > 0 ? Math.min(Math.round((g.current_count/g.target_count)*100), 100) : 0 })));
  } catch (err) { console.error('GET /users/:id/goals:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/users/:id/reminders', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT r.*,a.company,a.role FROM reminders r LEFT JOIN applications a ON r.application_id=a.id WHERE r.user_id=$1 ORDER BY r.remind_at ASC', [id]);
    res.json(rows);
  } catch (err) { console.error('GET /users/:id/reminders:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== USER RESUMES =====
router.get('/users/:id/resumes', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rows } = await pool.query('SELECT id,filename,skills,uploaded_at FROM resumes WHERE user_id=$1 ORDER BY uploaded_at DESC', [id]);
    res.json(rows);
  } catch (err) { console.error('GET /users/:id/resumes:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/users/:id/resumes/:rid', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id), rid = Number(req.params.rid);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(rid) || rid < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { rowCount } = await pool.query('DELETE FROM resumes WHERE id=$1 AND user_id=$2', [rid, id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    await logAudit(0, 'ADMIN_DELETE_RESUME', 'resume', rid, { user_id: id }, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('DELETE /users/:id/resumes/:rid:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== USER ACTIVITY =====
router.get('/users/:id/activity', adminGuard, adminLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    const { page, limit, offset } = paginate(req.query);
    const { rows: countRows } = await pool.query('SELECT COUNT(*) as c FROM activity_feed WHERE user_id=$1', [id]);
    const { rows } = await pool.query('SELECT * FROM activity_feed WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [id, limit, offset]);
    res.json(paginatedResponse(rows, parseInt(countRows[0].c), page, limit));
  } catch (err) { console.error('GET /users/:id/activity:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ===== EMAILS (all) =====
router.get('/emails', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { search, classification } = req.query;
    let where = 'WHERE 1=1'; const params = [];
    const p = () => `$${params.length + 1}`;
    if (search) { where += ` AND e.subject ILIKE ${p()}`; params.push(`%${search}%`); }
    if (classification) { where += ` AND e.classification=${p()}`; params.push(classification); }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) as c FROM emails e ${where}`, params);
    const { rows } = await pool.query(`SELECT e.*,u.name as user_name FROM emails e JOIN users u ON e.user_id=u.id ${where} ORDER BY e.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    res.json(paginatedResponse(rows, parseInt(countRows[0].c), page, limit));
  } catch (err) { console.error('GET /emails:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
