import { Router } from 'express';
import db, { logActivity } from '../db.js';
import { auth } from '../middleware/auth.js';
import { paginate, paginatedResponse } from '../utils/pagination.js';

const router = Router();
router.use(auth);

// ===== APPLICATION SCORING =====
// Score based on: has JD (+20), has contact (+15), priority high (+15), response received (+25), days < 14 (+10), has notes (+10), has tags (+5)
router.get('/scores', (req, res) => {
  const apps = db.prepare('SELECT * FROM applications WHERE user_id=?').all(req.user.id);
  const scored = apps.map(a => {
    let score = 0;
    if (a.job_description) score += 20;
    if (a.contact_person || a.contact_email) score += 15;
    if (a.priority === 'high') score += 15;
    if (a.response_date) score += 25;
    const days = Math.floor((Date.now() - new Date(a.applied_date).getTime()) / 86400000);
    if (days <= 14) score += 10;
    if (a.notes) score += 10;
    const hasTags = db.prepare('SELECT COUNT(*) as c FROM application_tags WHERE application_id=?').get(a.id).c > 0;
    if (hasTags) score += 5;
    score = Math.min(score, 100);
    // Update score in DB
    db.prepare('UPDATE applications SET score=? WHERE id=?').run(score, a.id);
    return { id: a.id, company: a.company, role: a.role, status: a.status, score, days_since: days };
  });
  scored.sort((a, b) => b.score - a.score);
  res.json(scored);
});

// ===== STREAK TRACKER =====
router.get('/streak', (req, res) => {
  const dates = db.prepare("SELECT DISTINCT date(applied_date) as d FROM applications WHERE user_id=? ORDER BY d DESC").all(req.user.id).map(r => r.d);

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dates[0] === today || dates[0] === yesterday) {
    streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev - curr) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
  }

  const longestStreak = (() => {
    if (dates.length === 0) return 0;
    let max = 1, curr = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000;
      if (diff === 1) { curr++; max = Math.max(max, curr); }
      else curr = 1;
    }
    return max;
  })();

  const totalDaysApplied = dates.length;
  const thisWeek = db.prepare("SELECT COUNT(*) as c FROM applications WHERE user_id=? AND applied_date >= date('now','-7 days')").get(req.user.id).c;
  const thisMonth = db.prepare("SELECT COUNT(*) as c FROM applications WHERE user_id=? AND applied_date >= date('now','-30 days')").get(req.user.id).c;

  res.json({ current_streak: streak, longest_streak: longestStreak, total_days_applied: totalDaysApplied, this_week: thisWeek, this_month: thisMonth });
});

// ===== BLACKLIST =====
router.get('/blacklist', (req, res) => {
  res.json(db.prepare('SELECT * FROM blacklist WHERE user_id=? ORDER BY created_at DESC').all(req.user.id));
});

router.post('/blacklist', (req, res) => {
  const { company, reason } = req.body;
  if (!company) return res.status(400).json({ error: 'Company required' });
  db.prepare('INSERT OR IGNORE INTO blacklist (user_id,company,reason) VALUES (?,?,?)').run(req.user.id, company, reason || null);
  logActivity(req.user.id, 'blacklist', `Blacklisted ${company}`, reason);
  res.json({ message: 'Blacklisted' });
});

router.delete('/blacklist/:id', (req, res) => {
  db.prepare('DELETE FROM blacklist WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Removed' });
});

// Check if company is blacklisted
router.get('/blacklist/check', (req, res) => {
  const { company } = req.query;
  if (!company) return res.json({ blacklisted: false });
  const found = db.prepare('SELECT * FROM blacklist WHERE user_id=? AND company LIKE ?').get(req.user.id, `%${company}%`);
  res.json({ blacklisted: !!found, entry: found || null });
});

// Auto-detect ghosted companies (applied > 30 days, no response, no status change)
router.get('/blacklist/suggest', (req, res) => {
  const ghosted = db.prepare(`
    SELECT company, COUNT(*) as times_ghosted, MAX(applied_date) as last_applied
    FROM applications 
    WHERE user_id=? AND status='applied' AND response_date IS NULL 
      AND julianday('now') - julianday(applied_date) > 30
      AND company NOT IN (SELECT company FROM blacklist WHERE user_id=?)
    GROUP BY company ORDER BY times_ghosted DESC
  `).all(req.user.id, req.user.id);
  res.json(ghosted);
});

// ===== INTERVIEW CALENDAR =====
router.get('/interviews', (req, res) => {
  const { upcoming } = req.query;
  let query = 'SELECT i.*,a.company,a.role FROM interviews i JOIN applications a ON i.application_id=a.id WHERE i.user_id=?';
  if (upcoming === '1') query += " AND i.interview_date >= datetime('now') AND i.outcome='pending'";
  query += ' ORDER BY i.interview_date ASC';
  res.json(db.prepare(query).all(req.user.id));
});

router.post('/interviews', (req, res) => {
  const { application_id, round_name, interview_date, interview_type, interviewer, meeting_link, notes } = req.body;
  if (!application_id || !round_name || !interview_date) return res.status(400).json({ error: 'application_id, round_name, interview_date required' });

  const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(application_id, req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const r = db.prepare('INSERT INTO interviews (application_id,user_id,round_name,interview_date,interview_type,interviewer,meeting_link,notes,outcome) VALUES (?,?,?,?,?,?,?,?,?)').run(application_id, req.user.id, round_name, interview_date, interview_type||null, interviewer||null, meeting_link||null, notes||null, 'pending');

  // Auto-update app status to interview
  if (app.status === 'applied' || app.status === 'under_review') {
    db.prepare('UPDATE applications SET status=?, last_updated=CURRENT_TIMESTAMP WHERE id=?').run('interview', application_id);
  }

  logActivity(req.user.id, 'interview_scheduled', `Interview scheduled at ${app.company}`, `${round_name} on ${interview_date}`, 'application', application_id);
  res.json({ id: r.lastInsertRowid });
});

router.put('/interviews/:id', (req, res) => {
  const { outcome, notes, interview_date, meeting_link } = req.body;
  const interview = db.prepare('SELECT * FROM interviews WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!interview) return res.status(404).json({ error: 'Not found' });

  const updates = []; const values = [];
  if (outcome) { updates.push('outcome=?'); values.push(outcome); }
  if (notes) { updates.push('notes=?'); values.push(notes); }
  if (interview_date) { updates.push('interview_date=?'); values.push(interview_date); }
  if (meeting_link) { updates.push('meeting_link=?'); values.push(meeting_link); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });

  values.push(req.params.id);
  db.prepare(`UPDATE interviews SET ${updates.join(',')} WHERE id=?`).run(...values);
  res.json({ message: 'Updated' });
});

// ===== DOCUMENTS =====
router.get('/documents', (req, res) => {
  const { application_id, doc_type } = req.query;
  let q = 'SELECT d.*,a.company,a.role FROM documents d LEFT JOIN applications a ON d.application_id=a.id WHERE d.user_id=?';
  const p = [req.user.id];
  if (application_id) { q += ' AND d.application_id=?'; p.push(application_id); }
  if (doc_type) { q += ' AND d.doc_type=?'; p.push(doc_type); }
  q += ' ORDER BY d.created_at DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/documents', (req, res) => {
  const { application_id, doc_type, title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const r = db.prepare('INSERT INTO documents (application_id,user_id,doc_type,title,content) VALUES (?,?,?,?,?)').run(application_id||null, req.user.id, doc_type||'other', title, content||null);
  logActivity(req.user.id, 'document', `Added document: ${title}`, null, 'document', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid });
});

router.delete('/documents/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

// ===== ACTIVITY FEED =====
router.get('/activity', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const total = db.prepare('SELECT COUNT(*) as c FROM activity_feed WHERE user_id=?').get(req.user.id).c;
  const rows = db.prepare('SELECT * FROM activity_feed WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.user.id, limit, offset);
  res.json(paginatedResponse(rows, total, page, limit));
});

// ===== GOALS =====
router.get('/goals', (req, res) => {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  // Auto-calculate current_count for application goals
  const enriched = goals.map(g => {
    if (g.title.toLowerCase().includes('appl')) {
      let where = "WHERE user_id=?";
      const p = [req.user.id];
      if (g.start_date) { where += ' AND applied_date >= ?'; p.push(g.start_date); }
      if (g.end_date) { where += ' AND applied_date <= ?'; p.push(g.end_date); }
      const count = db.prepare(`SELECT COUNT(*) as c FROM applications ${where}`).get(...p).c;
      db.prepare('UPDATE goals SET current_count=?, is_completed=? WHERE id=?').run(count, count >= g.target_count ? 1 : 0, g.id);
      return { ...g, current_count: count, is_completed: count >= g.target_count ? 1 : 0, progress: Math.min(Math.round((count / g.target_count) * 100), 100) };
    }
    return { ...g, progress: Math.min(Math.round((g.current_count / g.target_count) * 100), 100) };
  });
  res.json(enriched);
});

router.post('/goals', (req, res) => {
  const { title, target_count, period, start_date, end_date } = req.body;
  if (!title || !target_count) return res.status(400).json({ error: 'Title and target required' });

  const start = start_date || new Date().toISOString().split('T')[0];
  let end = end_date;
  if (!end && period === 'daily') end = start;
  if (!end && period === 'weekly') end = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  if (!end && period === 'monthly') end = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const r = db.prepare('INSERT INTO goals (user_id,title,target_count,period,start_date,end_date) VALUES (?,?,?,?,?,?)').run(req.user.id, title, target_count, period || 'weekly', start, end);
  logActivity(req.user.id, 'goal', `New goal: ${title}`, `Target: ${target_count}`);
  res.json({ id: r.lastInsertRowid });
});

router.delete('/goals/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

// ===== SALARY INSIGHTS =====
router.get('/salary', (req, res) => {
  const apps = db.prepare("SELECT company,role,salary_expected,salary_offered,status FROM applications WHERE user_id=? AND (salary_expected IS NOT NULL OR salary_offered IS NOT NULL)").all(req.user.id);

  const parseSalary = (s) => { if (!s) return null; const n = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; };

  const expected = apps.map(a => parseSalary(a.salary_expected)).filter(Boolean);
  const offered = apps.map(a => parseSalary(a.salary_offered)).filter(Boolean);
  const offers = apps.filter(a => a.status === 'offer' && a.salary_offered).map(a => ({ company: a.company, role: a.role, salary: a.salary_offered }));

  res.json({
    expected: { min: expected.length ? Math.min(...expected) : null, max: expected.length ? Math.max(...expected) : null, avg: expected.length ? Math.round(expected.reduce((s, v) => s + v, 0) / expected.length) : null, count: expected.length },
    offered: { min: offered.length ? Math.min(...offered) : null, max: offered.length ? Math.max(...offered) : null, avg: offered.length ? Math.round(offered.reduce((s, v) => s + v, 0) / offered.length) : null, count: offered.length },
    offers,
    total_with_salary: apps.length
  });
});

// ===== OFFER COMPARISON =====
router.get('/compare-offers', (req, res) => {
  const offers = db.prepare("SELECT id,company,role,salary_offered,location,work_mode,contact_person,notes FROM applications WHERE user_id=? AND status='offer'").all(req.user.id);
  res.json(offers);
});

// ===== SKILLS GAP (across all JDs) =====
router.get('/skills-gap', (req, res) => {
  const apps = db.prepare('SELECT job_description,status FROM applications WHERE user_id=? AND job_description IS NOT NULL').all(req.user.id);
  const techSkills = ['javascript','typescript','python','java','react','angular','vue','node','express','django','spring','aws','azure','docker','kubernetes','sql','mongodb','postgres','redis','git','linux','tailwind','nextjs','graphql','rest','microservices','agile','terraform','go','rust','kafka','elasticsearch'];

  const allSkills = {};
  const rejectedSkills = {};

  for (const app of apps) {
    const jdLower = app.job_description.toLowerCase();
    const found = techSkills.filter(s => jdLower.includes(s));
    for (const s of found) {
      allSkills[s] = (allSkills[s] || 0) + 1;
      if (app.status === 'rejected') rejectedSkills[s] = (rejectedSkills[s] || 0) + 1;
    }
  }

  const sorted = Object.entries(allSkills).sort((a, b) => b[1] - a[1]).map(([skill, count]) => ({
    skill, demand: count, in_rejections: rejectedSkills[skill] || 0
  }));

  res.json({ total_jds_analyzed: apps.length, skills: sorted.slice(0, 20) });
});

export default router;
