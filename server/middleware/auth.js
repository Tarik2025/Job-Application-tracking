import jwt from 'jsonwebtoken';
import db from '../db.js';
export function auth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Verify token_version matches DB — invalidates tokens after logout/password change
    const row = db.prepare('SELECT token_version, is_active FROM users WHERE id = ?').get(payload.id);
    if (!row) return res.status(401).json({ error: 'Invalid token' });
    if (!row.is_active) return res.status(403).json({ error: 'Account deactivated' });
    if (row.token_version !== payload.tv) return res.status(401).json({ error: 'Session expired. Please login again.' });
    // Refresh token if less than 1 day left
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now < 86400) {
      // Re-read tv from DB so refresh always embeds the current version
      const newToken = jwt.sign({ id: payload.id, email: payload.email, name: payload.name, tv: row.token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', newToken, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    }
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please login again.' });
    res.status(401).json({ error: 'Invalid token' });
  }
}
