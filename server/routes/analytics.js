import { Router } from 'express';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';
import { calculateInsights } from '../services/manual.js';

const router = Router();

router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const [sb, pb, prb, ma, wm, rs, ia] = await Promise.all([
      pool.query('SELECT status, COUNT(*) as count FROM applications WHERE user_id=$1 GROUP BY status', [uid]),
      pool.query('SELECT platform, COUNT(*) as count FROM applications WHERE user_id=$1 AND platform IS NOT NULL GROUP BY platform ORDER BY count DESC', [uid]),
      pool.query('SELECT priority, COUNT(*) as count FROM applications WHERE user_id=$1 GROUP BY priority', [uid]),
      pool.query("SELECT TO_CHAR(applied_date, 'YYYY-MM') as month, COUNT(*) as count FROM applications WHERE user_id=$1 GROUP BY month ORDER BY month DESC LIMIT 12", [uid]),
      pool.query('SELECT work_mode, COUNT(*) as count FROM applications WHERE user_id=$1 AND work_mode IS NOT NULL GROUP BY work_mode', [uid]),
      pool.query(`SELECT COUNT(*) as responded_count, ROUND(AVG(EXTRACT(EPOCH FROM (response_date - applied_date))/86400)) as avg_response_days, MIN(CAST(EXTRACT(EPOCH FROM (response_date - applied_date))/86400 AS INTEGER)) as fastest_response FROM applications WHERE user_id=$1 AND response_date IS NOT NULL`, [uid]),
      pool.query('SELECT status, platform, applied_date, last_updated FROM applications WHERE user_id=$1', [uid]),
    ]);

    const statusBreakdown = sb.rows;
    const total = statusBreakdown.reduce((s, r) => s + parseInt(r.count), 0);
    const interviews = parseInt(statusBreakdown.find(s => s.status === 'interview')?.count || 0);
    const offers = parseInt(statusBreakdown.find(s => s.status === 'offer')?.count || 0);
    const rejections = parseInt(statusBreakdown.find(s => s.status === 'rejected')?.count || 0);
    const responseStats = rs.rows[0];
    const insights = calculateInsights(ia.rows);

    res.json({
      total,
      responseRate: total > 0 ? Math.round(((interviews + offers + rejections) / total) * 100) : 0,
      interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
      offerRate: interviews > 0 ? Math.round((offers / interviews) * 100) : 0,
      avgResponseDays: responseStats.avg_response_days,
      fastestResponse: responseStats.fastest_response,
      statusBreakdown,
      platformBreakdown: pb.rows,
      priorityBreakdown: prb.rows,
      monthlyApps: ma.rows,
      workModeBreakdown: wm.rows,
      insights,
    });
  } catch (err) { console.error('GET /analytics:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/companies', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT company,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('interview','offer') THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status='offer' THEN 1 ELSE 0 END) as offers,
        MIN(applied_date) as first_applied,
        AVG(CASE WHEN response_date IS NOT NULL THEN EXTRACT(EPOCH FROM (response_date - applied_date))/86400 END) as avg_days
      FROM applications WHERE user_id=$1 GROUP BY company ORDER BY total DESC
    `, [req.user.id]);
    res.json(rows.map(c => ({
      ...c,
      avg_days: c.avg_days ? Math.round(c.avg_days) : null,
      response_rate: c.total > 0 ? Math.round(((parseInt(c.positive) + parseInt(c.rejected)) / parseInt(c.total)) * 100) : 0,
    })));
  } catch (err) { console.error('GET /analytics/companies:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/timeline', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sh.*, a.company, a.role
      FROM status_history sh
      JOIN applications a ON sh.application_id=a.id
      WHERE sh.user_id=$1
      ORDER BY sh.created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error('GET /analytics/timeline:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
