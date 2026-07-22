import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'crypto';
import { unlink } from 'fs/promises';
import rateLimit from 'express-rate-limit';
import db, { logAudit } from '../db.js';
import { auth } from '../middleware/auth.js';
import { resetPasswordEmail } from '../services/mail.js';

const router = Router();
const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many reset requests, try again later' } });

// Dummy hash for timing-safe login (prevents account enumeration via timing)
const DUMMY_HASH = '$2a$12$000000000000000000000uGm.dXxRHQJJkCpXxN9LWDuHpvGjIBO';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, username, phone, country_code, gender, dob, user_type, college, degree, branch, year_of_study, passout_year, company, designation, experience, skills, preferred_role, city, state, country, linkedin, github, portfolio, stacks } = req.body;

    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, and password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase().slice(0, 255);
    // Username validation
    let cleanUsername = null;
    if (username) {
      cleanUsername = username.trim().toLowerCase().slice(0, 30);
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) return res.status(400).json({ error: 'Username must be 3-30 chars, letters/numbers/underscore only' });
      const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
      if (existingUsername) return res.status(400).json({ error: 'Username already taken' });
    }
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

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);

    const registerUser = db.transaction(() => {
      // Re-check inside transaction to close race condition window
      const dup = db.prepare('SELECT id FROM users WHERE email=?').get(cleanEmail);
      if (dup) throw Object.assign(new Error('Email already registered'), { code: 'DUPLICATE_EMAIL' });
      const result = db.prepare(
        `INSERT INTO users (email,password,name,username,phone,country_code,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(cleanEmail, hash, cleanName, cleanUsername, phone||null, country_code||'+91', gender||null, dob||null, user_type||null, college||null, degree||null, branch||null, year_of_study||null, passout_year||null, company||null, designation||null, experience||null, skills||null, preferred_role||null, city||null, state||null, country||'India', linkedin||null, github||null, portfolio||null);

      const userId = result.lastInsertRowid;

      if (college?.trim()) db.prepare('INSERT OR IGNORE INTO colleges (name, added_by) VALUES (?, ?)').run(college.trim(), userId);

      if (Array.isArray(stacks) && stacks.length) {
        const ins = db.prepare('INSERT OR IGNORE INTO user_stacks (user_id, stack_id) VALUES (?, ?)');
        const find = db.prepare('SELECT id FROM stacks WHERE name = ?');
        const add = db.prepare('INSERT OR IGNORE INTO stacks (name, added_by) VALUES (?, ?)');
        for (const s of stacks) { let st = find.get(s); if (!st) { add.run(s, userId); st = find.get(s); } if (st) ins.run(userId, st.id); }
      }
      return userId;
    });

    const userId = registerUser();
    logAudit(userId, 'REGISTER', 'user', userId, { email }, req.ip);
    // Read tv from DB — defensive against future default changes
    const { token_version } = db.prepare('SELECT token_version FROM users WHERE id=?').get(userId);
    const token = jwt.sign({ id: userId, email: cleanEmail, name: cleanName, tv: token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ user: { id: userId, email, name } });
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') return res.status(400).json({ error: 'Email already registered' });
    console.error('POST /register:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email/username and password required' });
    // Accept email or username
    const isEmail = email.includes('@');
    const user = isEmail
      ? db.prepare('SELECT id,email,name,password,is_active,token_version FROM users WHERE email = ?').get(email.trim().toLowerCase())
      : db.prepare('SELECT id,email,name,password,is_active,token_version FROM users WHERE username = ?').get(email.trim().toLowerCase());
    // Always run bcrypt.compare to prevent timing-based account enumeration
    const passwordMatch = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

    logAudit(user.id, 'LOGIN', 'user', user.id, null, req.ip);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, tv: user.token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { console.error('POST /login:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Logout — increment token_version to invalidate all existing tokens
router.post('/logout', auth, (req, res) => {
  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id);
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
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      // Enforce max length on string fields to prevent oversized payloads
      const val = typeof req.body[f] === 'string' ? req.body[f].slice(0, 500) : req.body[f];
      updates.push(`${f} = ?`); values.push(val);
    }
  }
  if (updates.length === 0 && !Array.isArray(req.body.stacks)) return res.status(400).json({ error: 'No fields to update' });

  try {
    if (updates.length > 0 || Array.isArray(req.body.stacks)) {
      db.transaction(() => {
        if (updates.length > 0) {
          updates.push('updated_at = CURRENT_TIMESTAMP');
          values.push(req.user.id);
          db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }
        if (Array.isArray(req.body.stacks)) {
          db.prepare('DELETE FROM user_stacks WHERE user_id = ?').run(req.user.id);
          const ins = db.prepare('INSERT OR IGNORE INTO user_stacks (user_id, stack_id) VALUES (?, ?)');
          const find = db.prepare('SELECT id FROM stacks WHERE name = ?');
          const add = db.prepare('INSERT OR IGNORE INTO stacks (name, added_by) VALUES (?, ?)');
          for (const s of req.body.stacks) { let st = find.get(s); if (!st) { add.run(s, req.user.id); st = find.get(s); } if (st) ins.run(req.user.id, st.id); }
        }
      })();
    }

    logAudit(req.user.id, 'UPDATE_PROFILE', 'user', req.user.id, Object.keys(req.body), req.ip);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('PUT /me:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password too short' });
  if (!/[A-Z]/.test(new_password)) return res.status(400).json({ error: 'Password needs an uppercase letter' });
  if (!/[0-9]/.test(new_password)) return res.status(400).json({ error: 'Password needs a number' });
  if (!/[^A-Za-z0-9]/.test(new_password)) return res.status(400).json({ error: 'Password needs a special character' });

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(current_password, user.password))) return res.status(401).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE users SET password = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
  logAudit(req.user.id, 'CHANGE_PASSWORD', 'user', req.user.id, null, req.ip);
  res.json({ message: 'Password changed' });
});

// Delete own account — also removes resume files from disk
router.delete('/me', auth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required for account deletion' });
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Incorrect password' });

  // Delete resume files from disk before cascading DB delete
  const resumes = db.prepare('SELECT file_path FROM resumes WHERE user_id=?').all(req.user.id);
  logAudit(req.user.id, 'DELETE_ACCOUNT', 'user', req.user.id, null, req.ip);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  for (const r of resumes) { if (r.file_path) unlink(r.file_path).catch(() => {}); }
  res.clearCookie('token');
  res.json({ message: 'Account deleted' });
});

// Forgot password — email sent BEFORE token saved to avoid orphaned tokens on SMTP failure
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ message: 'If account exists, reset link sent' });
    const token = randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    await resetPasswordEmail(email, token); // send first — only persist if delivery succeeds
    db.prepare('UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?').run(token, expires, user.id);
    logAudit(user.id, 'FORGOT_PASSWORD', 'user', user.id, null, req.ip);
    res.json({ message: 'If account exists, reset link sent' });
  } catch { res.status(500).json({ error: 'Failed to send email' }); }
});

// Reset password — token is single-use: cleared from DB after use
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password needs an uppercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a number' });
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a special character' });
    const user = db.prepare('SELECT id, reset_token, reset_token_expires FROM users WHERE reset_token IS NOT NULL AND reset_token_expires > ?').get(Date.now());
    // Timing-safe comparison to prevent token guessing via timing attacks
    if (!user || !user.reset_token || Buffer.byteLength(token) !== Buffer.byteLength(user.reset_token) || !timingSafeEqual(Buffer.from(token), Buffer.from(user.reset_token))) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password=?, reset_token=NULL, reset_token_expires=NULL, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hash, user.id);
    logAudit(user.id, 'RESET_PASSWORD', 'user', user.id, null, req.ip);
    res.json({ message: 'Password reset successful' });
  } catch { res.status(400).json({ error: 'Invalid or expired token' }); }
});


// Check username availability with suggestions
router.post('/check-username', (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ available: false, suggestions: [] });
  const clean = username.trim().toLowerCase().slice(0, 30);
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) return res.json({ available: false, suggestions: [] });
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(clean);
  if (!existing) return res.json({ available: true, suggestions: [] });
  // Generate 3 suggestions: append random numbers
  const suggestions = [1, 2, 3].map((i) => {
    const suffix = Math.floor(Math.random() * 900 + 100);
    return `${clean}${suffix}`;
  }).filter((s) => !db.prepare('SELECT id FROM users WHERE username = ?').get(s));
  res.json({ available: false, suggestions });
});

// Check if email exists (for signup validation) — auth required to prevent enumeration
router.post('/check-email', auth, (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ exists: false });
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  res.json({ exists: !!user });
});

export default router;
