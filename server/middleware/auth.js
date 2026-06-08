import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Check if token is about to expire (less than 1 day left), refresh it
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now < 86400) {
      const newToken = jwt.sign({ id: payload.id, email: payload.email, name: payload.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', newToken, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax' });
    }
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please login again.' });
    res.status(401).json({ error: 'Invalid token' });
  }
}
