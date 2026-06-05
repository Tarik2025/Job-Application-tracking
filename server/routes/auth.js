import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { logAudit } from '../db.js';
import { auth } from '../middleware/auth.js';
import { resetPasswordEmail } from '../services/mail.js';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, country_code, gender, dob, user_type, college, degree, branch, year_of_study, passout_year, company, designation, experience, skills, preferred_role, city, state, country, linkedin, github, portfolio, stacks } = req.body;

    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password needs an uppercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a number' });
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a special character' });

    // DOB validation - must be at least 5 years old
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear() - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
      if (age < 5) return res.status(400).json({ error: 'User must be at least 5 years old' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      `INSERT INTO users (email,password,name,phone,country_code,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(email, hash, name, phone||null, country_code||'+91', gender||null, dob||null, user_type||null, college||null, degree||null, branch||null, year_of_study||null, passout_year||null, company||null, designation||null, experience||null, skills||null, preferred_role||null, city||null, state||null, country||'India', linkedin||null, github||null, portfolio||null);

    const userId = result.lastInsertRowid;

    if (college?.trim()) db.prepare('INSERT OR IGNORE INTO colleges (name, added_by) VALUES (?, ?)').run(college.trim(), userId);

    if (stacks?.length) {
      const ins = db.prepare('INSERT OR IGNORE INTO user_stacks (user_id, stack_id) VALUES (?, ?)');
      const find = db.prepare('SELECT id FROM stacks WHERE name = ?');
      const add = db.prepare('INSERT OR IGNORE INTO stacks (name, added_by) VALUES (?, ?)');
      for (const s of stacks) { let st = find.get(s); if (!st) { add.run(s, userId); st = find.get(s); } if (st) ins.run(userId, st.id); }
    }

    logAudit(userId, 'REGISTER', 'user', userId, { email }, req.ip);
    const token = jwt.sign({ id: userId, email, name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
    res.json({ user: { id: userId, email, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });

    logAudit(user.id, 'LOGIN', 'user', user.id, null, req.ip);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Logout
router.post('/logout', auth, (req, res) => {
  logAudit(req.user.id, 'LOGOUT', 'user', req.user.id, null, req.ip);
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Get profile
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,email,name,phone,country_code,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio,target_days,target_start_date,is_active,created_at FROM users WHERE id = ?').get(req.user.id);
  const stacks = db.prepare('SELECT s.name FROM user_stacks us JOIN stacks s ON us.stack_id = s.id WHERE us.user_id = ?').all(req.user.id).map(r => r.name);
  res.json({ user: { ...user, stacks } });
});

// Update profile
router.put('/me', auth, (req, res) => {
  const fields = ['name','phone','country_code','gender','dob','user_type','college','degree','branch','year_of_study','passout_year','company','designation','experience','skills','preferred_role','city','state','country','linkedin','github','portfolio','target_days','target_start_date'];
  const updates = []; const values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0 && !req.body.stacks) return res.status(400).json({ error: 'No fields to update' });

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  if (req.body.stacks) {
    db.prepare('DELETE FROM user_stacks WHERE user_id = ?').run(req.user.id);
    const ins = db.prepare('INSERT OR IGNORE INTO user_stacks (user_id, stack_id) VALUES (?, ?)');
    const find = db.prepare('SELECT id FROM stacks WHERE name = ?');
    const add = db.prepare('INSERT OR IGNORE INTO stacks (name, added_by) VALUES (?, ?)');
    for (const s of req.body.stacks) { let st = find.get(s); if (!st) { add.run(s, req.user.id); st = find.get(s); } if (st) ins.run(req.user.id, st.id); }
  }

  logAudit(req.user.id, 'UPDATE_PROFILE', 'user', req.user.id, Object.keys(req.body), req.ip);
  res.json({ message: 'Updated' });
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password too short' });

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(current_password, user.password))) return res.status(401).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
  logAudit(req.user.id, 'CHANGE_PASSWORD', 'user', req.user.id, null, req.ip);
  res.json({ message: 'Password changed' });
});

// Delete own account
router.delete('/me', auth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required for account deletion' });
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Incorrect password' });

  logAudit(req.user.id, 'DELETE_ACCOUNT', 'user', req.user.id, null, req.ip);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.clearCookie('token');
  res.json({ message: 'Account deleted' });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ message: 'If account exists, reset link sent' });
    const token = jwt.sign({ id: user.id, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await resetPasswordEmail(email, token);
    logAudit(user.id, 'FORGOT_PASSWORD', 'user', user.id, null, req.ip);
    res.json({ message: 'If account exists, reset link sent' });
  } catch { res.status(500).json({ error: 'Failed to send email' }); }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Invalid token' });
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, payload.id);
    logAudit(payload.id, 'RESET_PASSWORD', 'user', payload.id, null, req.ip);
    res.json({ message: 'Password reset successful' });
  } catch { res.status(400).json({ error: 'Invalid or expired token' }); }
});

export default router;
