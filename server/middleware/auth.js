import jwt from 'jsonwebtoken';
import pool from '../db.js';

export async function auth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const { rows } = await pool.query('SELECT token_version, is_active FROM users WHERE id = $1', [payload.id]);
    const row = rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid token' });
    if (!row.is_active) return res.status(403).json({ error: 'Account deactivated' });
    if (row.token_version !== payload.tv) return res.status(401).json({ error: 'Session expired. Please login again.' });
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now < 86400) {
      const newToken = jwt.sign({ id: payload.id, email: payload.email, name: payload.name, tv: row.token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('token', newToken, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: isProd ? 'none' : 'lax', secure: isProd });
    }
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please login again.' });
    res.status(401).json({ error: 'Invalid token' });
  }
}
