import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'crypto';
import { unlink } from 'fs/promises';
import rateLimit from 'express-rate-limit';
import pool, { logAudit } from '../db.js';
import { auth } from '../middleware/auth.js';
import { resetPasswordEmail } from '../services/mail.js';

const router = Router();
const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many reset requests, try again later' } });
const DUMMY_HASH = '$2a$12$000000000000000000000uGm.dXxRHQJJkCpXxN9LWDuHpvGjIBO';

// Register
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, name, username, phone, country_code, gender, dob, user_type, college, degree, branch, year_of_study, passout_year, company, designation, experience, skills, preferred_role, city, state, country, linkedin, github, portfolio, stacks } = req.body;

    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email, and password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase().slice(0, 255);

    let cleanUsername = null;
    if (username) {
      cleanUsername = username.trim().toLowerCase().slice(0, 30);
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) return res.status(400).json({ error: 'Username must be 3-30 chars, letters/numbers/underscore only' });
      const { rows: uRows } = await client.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
      if (uRows[0]) return res.status(400).json({ error: 'Username already taken' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password needs an uppercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a number' });
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a special character' });

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear() - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
      if (age < 5) return res.status(400).json({ error: 'User must be at least 5 years old' });
    }

    const { rows: existing } = await client.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing[0]) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);

    await client.query('BEGIN');
    const { rows: dupCheck } = await client.query('SELECT id FROM users WHERE email=$1', [cleanEmail]);
    if (dupCheck[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Email already registered' }); }

    const { rows: inserted } = await client.query(
      `INSERT INTO users (email,password,name,username,phone,country_code,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING id,token_version`,
      [cleanEmail, hash, cleanName, cleanUsername, phone||null, country_code||'+91', gender||null, dob||null, user_type||null, college||null, degree||null, branch||null, year_of_study||null, passout_year||null, company||null, designation||null, experience||null, skills||null, preferred_role||null, city||null, state||null, country||'India', linkedin||null, github||null, portfolio||null]
    );
    const userId = inserted[0].id;
    const token_version = inserted[0].token_version;

    if (college?.trim()) {
      await client.query('INSERT INTO colleges (name, added_by) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING', [college.trim(), userId]);
    }

    if (Array.isArray(stacks) && stacks.length) {
      for (const s of stacks) {
        await client.query('INSERT INTO stacks (name, added_by) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING', [s, userId]);
        const { rows: st } = await client.query('SELECT id FROM stacks WHERE name=$1', [s]);
        if (st[0]) await client.query('INSERT INTO user_stacks (user_id,stack_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, st[0].id]);
      }
    }

    await client.query('COMMIT');
    await logAudit(userId, 'REGISTER', 'user', userId, { email }, req.ip);
    const token = jwt.sign({ id: userId, email: cleanEmail, name: cleanName, tv: token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: isProd ? 'none' : 'lax', secure: isProd });
    res.json({ user: { id: userId, email, name } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /register:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email/username and password required' });
    const isEmail = email.includes('@');
    const { rows } = isEmail
      ? await pool.query('SELECT id,email,name,password,is_active,token_version FROM users WHERE email = $1', [email.trim().toLowerCase()])
      : await pool.query('SELECT id,email,name,password,is_active,token_version FROM users WHERE username = $1', [email.trim().toLowerCase()]);
    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    await logAudit(user.id, 'LOGIN', 'user', user.id, null, req.ip);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, tv: user.token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: isProd ? 'none' : 'lax', secure: isProd });
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { console.error('POST /login:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user.id]);
  await logAudit(req.user.id, 'LOGOUT', 'user', req.user.id, null, req.ip);
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', { sameSite: isProd ? 'none' : 'lax', secure: isProd });
  res.json({ message: 'Logged out' });
});

// Get profile
router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,email,name,phone,country_code,gender,dob,user_type,college,degree,branch,year_of_study,passout_year,company,designation,experience,skills,preferred_role,city,state,country,linkedin,github,portfolio,target_days,target_start_date,is_active,created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  const { rows: stackRows } = await pool.query(
    'SELECT s.name FROM user_stacks us JOIN stacks s ON us.stack_id = s.id WHERE us.user_id = $1',
    [req.user.id]
  );
  res.json({ user: { ...rows[0], stacks: stackRows.map(r => r.name) } });
});

// Update profile
router.put('/me', auth, async (req, res) => {
  const fields = ['name','phone','country_code','gender','dob','user_type','college','degree','branch','year_of_study','passout_year','company','designation','experience','skills','preferred_role','city','state','country','linkedin','github','portfolio','target_days','target_start_date'];
  const updates = []; const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      const val = typeof req.body[f] === 'string' ? req.body[f].slice(0, 500) : req.body[f];
      updates.push(`${f} = $${updates.length + 1}`); values.push(val);
    }
  }
  if (updates.length === 0 && !Array.isArray(req.body.stacks)) return res.status(400).json({ error: 'No fields to update' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.user.id);
      await client.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    }
    if (Array.isArray(req.body.stacks)) {
      await client.query('DELETE FROM user_stacks WHERE user_id = $1', [req.user.id]);
      for (const s of req.body.stacks) {
        await client.query('INSERT INTO stacks (name, added_by) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING', [s, req.user.id]);
        const { rows: st } = await client.query('SELECT id FROM stacks WHERE name=$1', [s]);
        if (st[0]) await client.query('INSERT INTO user_stacks (user_id,stack_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, st[0].id]);
      }
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, 'UPDATE_PROFILE', 'user', req.user.id, Object.keys(req.body), req.ip);
    res.json({ message: 'Updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /me:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

  const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(current_password, rows[0].password))) return res.status(401).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(new_password, 12);
  await pool.query('UPDATE users SET password=$1, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [hash, req.user.id]);
  await logAudit(req.user.id, 'CHANGE_PASSWORD', 'user', req.user.id, null, req.ip);
  res.json({ message: 'Password changed' });
});

// Delete own account
router.delete('/me', auth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required for account deletion' });
  const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(password, rows[0].password))) return res.status(401).json({ error: 'Incorrect password' });

  const { rows: resumes } = await pool.query('SELECT file_path FROM resumes WHERE user_id=$1', [req.user.id]);
  await logAudit(req.user.id, 'DELETE_ACCOUNT', 'user', req.user.id, null, req.ip);
  await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  for (const r of resumes) { if (r.file_path) unlink(r.file_path).catch(() => {}); }
  res.clearCookie('token');
  res.json({ message: 'Account deleted' });
});

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.json({ message: 'If account exists, reset link sent' });
    const token = randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000;
    await resetPasswordEmail(email, token);
    await pool.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3', [token, expires, rows[0].id]);
    await logAudit(rows[0].id, 'FORGOT_PASSWORD', 'user', rows[0].id, null, req.ip);
    res.json({ message: 'If account exists, reset link sent' });
  } catch { res.status(500).json({ error: 'Failed to send email' }); }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password needs an uppercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a number' });
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'Password needs a special character' });
    const { rows } = await pool.query('SELECT id, reset_token, reset_token_expires FROM users WHERE reset_token IS NOT NULL AND reset_token_expires > $1', [Date.now()]);
    const user = rows[0];
    if (!user || !user.reset_token || Buffer.byteLength(token) !== Buffer.byteLength(user.reset_token) || !timingSafeEqual(Buffer.from(token), Buffer.from(user.reset_token))) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [hash, user.id]);
    await logAudit(user.id, 'RESET_PASSWORD', 'user', user.id, null, req.ip);
    res.json({ message: 'Password reset successful' });
  } catch { res.status(400).json({ error: 'Invalid or expired token' }); }
});

// Check username availability
router.post('/check-username', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ available: false, suggestions: [] });
  const clean = username.trim().toLowerCase().slice(0, 30);
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) return res.json({ available: false, suggestions: [] });
  const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [clean]);
  if (!rows[0]) return res.json({ available: true, suggestions: [] });
  const suggestions = [];
  for (let i = 0; i < 3; i++) {
    const s = `${clean}${Math.floor(Math.random() * 900 + 100)}`;
    const { rows: sr } = await pool.query('SELECT id FROM users WHERE username=$1', [s]);
    if (!sr[0]) suggestions.push(s);
  }
  res.json({ available: false, suggestions });
});

// Check email exists
router.post('/check-email', auth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ exists: false });
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  res.json({ exists: !!rows[0] });
});

export default router;
