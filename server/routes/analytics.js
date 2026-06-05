import { Router } from 'express';
import db from '../db.js';
import { auth } from '../middleware/auth.js';
import { calculateInsights } from '../services/manual.js';

const router = Router();
router.use(auth);

router.get('/', (req, res) => {
  const uid = req.user.id;
  const apps = db.prepare('SELECT * FROM applications WHERE user_id=?').all(uid);
  const total = apps.length;

  const statusBreakdown = db.prepare('SELECT status, COUNT(*) as count FROM applications WHERE user_id=? GROUP BY status').all(uid);
  const platformBreakdown = db.prepare('SELECT platform, COUNT(*) as count FROM applications WHERE user_id=? AND platform IS NOT NULL GROUP BY platform ORDER BY count DESC').all(uid);
  const priorityBreakdown = db.prepare('SELECT priority, COUNT(*) as count FROM applications WHERE user_id=? GROUP BY priority').all(uid);
  const monthlyApps = db.prepare("SELECT strftime('%Y-%m', applied_date) as month, COUNT(*) as count FROM applications WHERE user_id=? GROUP BY month ORDER BY month DESC LIMIT 12").all(uid);
  const workModeBreakdown = db.prepare('SELECT work_mode, COUNT(*) as count FROM applications WHERE user_id=? AND work_mode IS NOT NULL GROUP BY work_mode').all(uid);

  // Response time analytics
  const responded = apps.filter(a => a.response_date);
  const avgResponseDays = responded.length > 0 ? Math.round(responded.reduce((s, a) => s + Math.floor((new Date(a.response_date) - new Date(a.applied_date)) / 86400000), 0) / responded.length) : null;
  const fastestResponse = responded.length > 0 ? Math.min(...responded.map(a => Math.floor((new Date(a.response_date) - new Date(a.applied_date)) / 86400000))) : null;

  // Rates
  const interviews = statusBreakdown.find(s => s.status === 'interview')?.count || 0;
  const offers = statusBreakdown.find(s => s.status === 'offer')?.count || 0;
  const rejections = statusBreakdown.find(s => s.status === 'rejected')?.count || 0;

  // Insights from manual engine
  const insights = calculateInsights(apps);

  res.json({
    total,
    responseRate: total > 0 ? Math.round(((interviews + offers + rejections) / total) * 100) : 0,
    interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
    offerRate: interviews > 0 ? Math.round((offers / interviews) * 100) : 0,
    avgResponseDays,
    fastestResponse,
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
