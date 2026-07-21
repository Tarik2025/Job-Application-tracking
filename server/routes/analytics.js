import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { calculateInsights } from '../services/manual.js';

const router = Router();

// CSRF mitigation: reject state-changing requests without JSON content-type
router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

router.get('/', (req, res) => {
  const uid = req.user.id;

  const statusBreakdown = db.prepare('SELECT status, COUNT(*) as count FROM applications WHERE user_id=? GROUP BY status').all(uid);
  const platformBreakdown = db.prepare('SELECT platform, COUNT(*) as count FROM applications WHERE user_id=? AND platform IS NOT NULL GROUP BY platform ORDER BY count DESC').all(uid);
  const priorityBreakdown = db.prepare('SELECT priority, COUNT(*) as count FROM applications WHERE user_id=? GROUP BY priority').all(uid);
  const monthlyApps = db.prepare("SELECT strftime('%Y-%m', applied_date) as month, COUNT(*) as count FROM applications WHERE user_id=? GROUP BY month ORDER BY month DESC LIMIT 12").all(uid);
  const workModeBreakdown = db.prepare('SELECT work_mode, COUNT(*) as count FROM applications WHERE user_id=? AND work_mode IS NOT NULL GROUP BY work_mode').all(uid);

  const total = statusBreakdown.reduce((s, r) => s + r.count, 0);

  // Response time analytics — done in SQL, not JS memory
  const responseStats = db.prepare(`
    SELECT
      COUNT(*) as responded_count,
      ROUND(AVG(julianday(response_date) - julianday(applied_date))) as avg_response_days,
      MIN(CAST(julianday(response_date) - julianday(applied_date) AS INTEGER)) as fastest_response
    FROM applications
    WHERE user_id=? AND response_date IS NOT NULL
  `).get(uid);

  const interviews = statusBreakdown.find(s => s.status === 'interview')?.count || 0;
  const offers = statusBreakdown.find(s => s.status === 'offer')?.count || 0;
  const rejections = statusBreakdown.find(s => s.status === 'rejected')?.count || 0;

  // Insights — only fetch fields needed, not full rows with job_description
  const insightApps = db.prepare('SELECT status, platform, applied_date, last_updated FROM applications WHERE user_id=?').all(uid);
  const insights = calculateInsights(insightApps);

  res.json({
    total,
    responseRate: total > 0 ? Math.round(((interviews + offers + rejections) / total) * 100) : 0,
    interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
    offerRate: interviews > 0 ? Math.round((offers / interviews) * 100) : 0,
    avgResponseDays: responseStats.avg_response_days,
    fastestResponse: responseStats.fastest_response,
    statusBreakdown,
    platformBreakdown,
    priorityBreakdown,
    monthlyApps,
    workModeBreakdown,
    insights,
  });
});

// Detailed company-level analytics
router.get('/companies', (req, res) => {
  const companies = db.prepare(`
    SELECT company,
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('interview','offer') THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status='offer' THEN 1 ELSE 0 END) as offers,
      MIN(applied_date) as first_applied,
      AVG(CASE WHEN response_date IS NOT NULL THEN julianday(response_date)-julianday(applied_date) END) as avg_days
    FROM applications WHERE user_id=? GROUP BY company ORDER BY total DESC
  `).all(req.user.id);

  res.json(companies.map(c => ({
    ...c,
    avg_days: c.avg_days ? Math.round(c.avg_days) : null,
    response_rate: c.total > 0 ? Math.round(((c.positive + c.rejected) / c.total) * 100) : 0,
  })));
});

// Timeline: status changes over time
router.get('/timeline', (req, res) => {
  res.json(db.prepare(`
    SELECT sh.*, a.company, a.role 
    FROM status_history sh 
    JOIN applications a ON sh.application_id=a.id 
    WHERE sh.user_id=? 
    ORDER BY sh.created_at DESC LIMIT 50
  `).all(req.user.id));
});

export default router;
