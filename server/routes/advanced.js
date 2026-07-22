import { Router } from 'express';
import pool, { logActivity } from '../db.js';
import { auth } from '../middleware/auth.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';
import { paginate, paginatedResponse } from '../utils/pagination.js';

const router = Router();

router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

// SCORES
router.get('/scores', async (req, res) => {
  try {
    const { rows: apps } = await pool.query('SELECT id,company,role,status,priority,job_description,contact_person,contact_email,notes,response_date,applied_date FROM applications WHERE user_id=$1', [req.user.id]);
    const { rows: taggedRows } = await pool.query('SELECT DISTINCT application_id FROM application_tags WHERE application_id IN (SELECT id FROM applications WHERE user_id=$1)', [req.user.id]);
    const taggedIds = new Set(taggedRows.map(r => r.application_id));
    const scored = apps.map(a => {
      let score = 0;
      if (a.job_description) score += 20;
      if (a.contact_person || a.contact_email) score += 15;
      if (a.priority === 'high') score += 15;
      if (a.response_date) score += 25;
      const days = Math.floor((Date.now() - new Date(a.applied_date).getTime()) / 86400000);
      if (days <= 14) score += 10;
      if (a.notes) score += 10;
      if (taggedIds.has(a.id)) score += 5;
      return { id: a.id, company: a.company, role: a.role, status: a.status, score: Math.min(score, 100), days_since: days };
    });
    scored.sort((a, b) => b.score - a.score);
    res.json(scored);
  } catch (err) { console.error('GET /scores:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/scores/sync', doubleCsrfProtection, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: apps } = await client.query('SELECT id,priority,job_description,contact_person,contact_email,notes,response_date,applied_date FROM applications WHERE user_id=$1', [req.user.id]);
    const { rows: taggedRows } = await client.query('SELECT DISTINCT application_id FROM application_tags WHERE application_id IN (SELECT id FROM applications WHERE user_id=$1)', [req.user.id]);
    const taggedIds = new Set(taggedRows.map(r => r.application_id));
    await client.query('BEGIN');
    for (const a of apps) {
      let score = 0;
      if (a.job_description) score += 20;
      if (a.contact_person || a.contact_email) score += 15;
      if (a.priority === 'high') score += 15;
      if (a.response_date) score += 25;
      const days = Math.floor((Date.now() - new Date(a.applied_date).getTime()) / 86400000);
      if (days <= 14) score += 10;
      if (a.notes) score += 10;
      if (taggedIds.has(a.id)) score += 5;
      score = Math.min(score, 100);
      await client.query('UPDATE applications SET score=$1 WHERE id=$2 AND score!=$3', [score, a.id, score]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Scores synced' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /scores/sync:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// STREAK
router.get('/streak', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT DISTINCT DATE(applied_date) as d FROM applications WHERE user_id=$1 ORDER BY d DESC", [req.user.id]);
    const dates = rows.map(r => r.d instanceof Date ? r.d.toISOString().split('T')[0] : String(r.d).split('T')[0]);

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
        if (diff === 1) streak++; else break;
      }
    }

    const longestStreak = (() => {
      if (!dates.length) return 0;
      let max = 1, curr = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
        if (diff === 1) { curr++; max = Math.max(max, curr); } else curr = 1;
      }
      return max;
    })();

    const [wk, mo] = await Promise.all([
      pool.query("SELECT COUNT(*) as c FROM applications WHERE user_id=$1 AND applied_date >= NOW() - INTERVAL '7 days'", [req.user.id]),
      pool.query("SELECT COUNT(*) as c FROM applications WHERE user_id=$1 AND applied_date >= NOW() - INTERVAL '30 days'", [req.user.id]),
    ]);

    res.json({ current_streak: streak, longest_streak: longestStreak, total_days_applied: dates.length, this_week: parseInt(wk.rows[0].c), this_month: parseInt(mo.rows[0].c) });
  } catch (err) { console.error('GET /streak:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// BLACKLIST
router.get('/blacklist', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM blacklist WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json(rows);
});

router.post('/blacklist', doubleCsrfProtection, async (req, res) => {
  const { company, reason } = req.body;
  if (!company) return res.status(400).json({ error: 'Company required' });
  await pool.query('INSERT INTO blacklist (user_id,company,reason) VALUES ($1,$2,$3) ON CONFLICT (user_id,company) DO NOTHING', [req.user.id, company, reason||null]);
  await logActivity(req.user.id, 'blacklist', `Blacklisted ${company}`, reason||null, 'blacklist', null);
  res.json({ message: 'Blacklisted' });
});

router.delete('/blacklist/:id', doubleCsrfProtection, async (req, res) => {
  await pool.query('DELETE FROM blacklist WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Removed' });
});

router.get('/blacklist/check', async (req, res) => {
  const { company } = req.query;
  if (!company) return res.json({ blacklisted: false });
  if (company.length > 200) return res.status(400).json({ error: 'Query too long' });
  const { rows } = await pool.query('SELECT * FROM blacklist WHERE user_id=$1 AND company ILIKE $2', [req.user.id, `%${company}%`]);
  res.json({ blacklisted: !!rows[0], entry: rows[0] || null });
});

router.get('/blacklist/suggest', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT company, COUNT(*) as times_ghosted, MAX(applied_date) as last_applied
      FROM applications
      WHERE user_id=$1 AND status='applied' AND response_date IS NULL
        AND EXTRACT(EPOCH FROM (NOW() - applied_date))/86400 > 30
        AND company NOT IN (SELECT company FROM blacklist WHERE user_id=$1)
      GROUP BY company ORDER BY times_ghosted DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error('GET /blacklist/suggest:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// INTERVIEWS
router.get('/interviews', async (req, res) => {
  try {
    const { upcoming } = req.query;
    let q = 'SELECT i.*,a.company,a.role FROM interviews i JOIN applications a ON i.application_id=a.id WHERE i.user_id=$1';
    if (upcoming === '1') q += " AND i.interview_date >= NOW() AND i.outcome='pending'";
    q += ' ORDER BY i.interview_date ASC';
    const { rows } = await pool.query(q, [req.user.id]);
    res.json(rows);
  } catch (err) { console.error('GET /interviews:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/interviews', doubleCsrfProtection, async (req, res) => {
  try {
    const { application_id, round_name, interview_date, interview_type, interviewer, meeting_link, notes } = req.body;
    if (!application_id || !round_name || !interview_date) return res.status(400).json({ error: 'application_id, round_name, interview_date required' });
    if (isNaN(new Date(interview_date).getTime())) return res.status(400).json({ error: 'Invalid interview_date' });

    const { rows: appRows } = await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [application_id, req.user.id]);
    if (!appRows[0]) return res.status(404).json({ error: 'Application not found' });

    const { rows: r } = await pool.query(
      'INSERT INTO interviews (application_id,user_id,round_name,interview_date,interview_type,interviewer,meeting_link,notes,outcome) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [application_id, req.user.id, round_name, interview_date, interview_type||null, interviewer||null, meeting_link||null, notes||null, 'pending']
    );

    if (['applied','under_review'].includes(appRows[0].status)) {
      await pool.query('UPDATE applications SET status=$1, last_updated=CURRENT_TIMESTAMP WHERE id=$2', ['interview', application_id]);
    }

    await logActivity(req.user.id, 'interview_scheduled', `Interview scheduled at ${appRows[0].company}`, `${round_name} on ${interview_date}`, 'application', application_id);
    res.json({ id: r[0].id });
  } catch (err) { console.error('POST /interviews:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/interviews/:id', doubleCsrfProtection, async (req, res) => {
  try {
    const { outcome, notes, interview_date, meeting_link } = req.body;
    const { rows } = await pool.query('SELECT * FROM interviews WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    const updates = []; const values = [];
    if (outcome) { updates.push(`outcome=$${updates.length+1}`); values.push(outcome); }
    if (notes) { updates.push(`notes=$${updates.length+1}`); values.push(notes); }
    if (interview_date) { updates.push(`interview_date=$${updates.length+1}`); values.push(interview_date); }
    if (meeting_link) { updates.push(`meeting_link=$${updates.length+1}`); values.push(meeting_link); }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });

    values.push(req.params.id);
    await pool.query(`UPDATE interviews SET ${updates.join(',')} WHERE id=$${values.length}`, values);
    if (outcome) await logActivity(req.user.id, 'interview_outcome', `Interview outcome: ${outcome}`, `Round: ${rows[0].round_name}`, 'interview', Number(req.params.id));
    res.json({ message: 'Updated' });
  } catch (err) { console.error('PUT /interviews/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// DOCUMENTS
router.get('/documents', async (req, res) => {
  try {
    const { application_id, doc_type } = req.query;
    let q = 'SELECT d.*,a.company,a.role FROM documents d LEFT JOIN applications a ON d.application_id=a.id WHERE d.user_id=$1';
    const p = [req.user.id];
    if (application_id) { q += ` AND d.application_id=$${p.length+1}`; p.push(application_id); }
    if (doc_type) { q += ` AND d.doc_type=$${p.length+1}`; p.push(doc_type); }
    q += ' ORDER BY d.created_at DESC';
    const { rows } = await pool.query(q, p);
    res.json(rows);
  } catch (err) { console.error('GET /documents:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/documents', doubleCsrfProtection, async (req, res) => {
  try {
    const { application_id, doc_type, title, content } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query('INSERT INTO documents (application_id,user_id,doc_type,title,content) VALUES ($1,$2,$3,$4,$5) RETURNING id', [application_id||null, req.user.id, doc_type||'other', title, content||null]);
    await logActivity(req.user.id, 'document', `Added document: ${title}`, null, 'document', rows[0].id);
    res.json({ id: rows[0].id });
  } catch (err) { console.error('POST /documents:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/documents/:id', doubleCsrfProtection, async (req, res) => {
  await pool.query('DELETE FROM documents WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Deleted' });
});

// ACTIVITY FEED
router.get('/activity', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { rows: countRows } = await pool.query('SELECT COUNT(*) as c FROM activity_feed WHERE user_id=$1', [req.user.id]);
    const total = parseInt(countRows[0].c);
    const { rows } = await pool.query('SELECT * FROM activity_feed WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [req.user.id, limit, offset]);
    res.json(paginatedResponse(rows, total, page, limit));
  } catch (err) { console.error('GET /activity:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GOALS
router.get('/goals', async (req, res) => {
  try {
    const { rows: goals } = await pool.query('SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    const enriched = await Promise.all(goals.map(async g => {
      if (g.goal_type === 'applications') {
        let q = 'SELECT COUNT(*) as c FROM applications WHERE user_id=$1'; const p = [req.user.id];
        if (g.start_date) { q += ` AND applied_date >= $${p.length+1}`; p.push(g.start_date); }
        if (g.end_date) { q += ` AND applied_date <= $${p.length+1}`; p.push(g.end_date); }
        const { rows } = await pool.query(q, p);
        const count = parseInt(rows[0].c);
        return { ...g, current_count: count, is_completed: count >= g.target_count ? 1 : 0, progress: g.target_count > 0 ? Math.min(Math.round((count / g.target_count) * 100), 100) : 0 };
      }
      if (g.goal_type === 'interviews') {
        let q = 'SELECT COUNT(*) as c FROM interviews WHERE user_id=$1'; const p = [req.user.id];
        if (g.start_date) { q += ` AND interview_date >= $${p.length+1}`; p.push(g.start_date); }
        if (g.end_date) { q += ` AND interview_date <= $${p.length+1}`; p.push(`${g.end_date} 23:59:59`); }
        const { rows } = await pool.query(q, p);
        const count = parseInt(rows[0].c);
        return { ...g, current_count: count, is_completed: count >= g.target_count ? 1 : 0, progress: g.target_count > 0 ? Math.min(Math.round((count / g.target_count) * 100), 100) : 0 };
      }
      return { ...g, progress: g.target_count > 0 ? Math.min(Math.round((g.current_count / g.target_count) * 100), 100) : 0 };
    }));
    res.json(enriched);
  } catch (err) { console.error('GET /goals:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/goals/sync', doubleCsrfProtection, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: goals } = await client.query('SELECT * FROM goals WHERE user_id=$1', [req.user.id]);
    await client.query('BEGIN');
    for (const g of goals) {
      let count = g.current_count, is_completed = g.is_completed;
      if (g.goal_type === 'applications') {
        let q = 'SELECT COUNT(*) as c FROM applications WHERE user_id=$1'; const p = [req.user.id];
        if (g.start_date) { q += ` AND applied_date >= $${p.length+1}`; p.push(g.start_date); }
        if (g.end_date) { q += ` AND applied_date <= $${p.length+1}`; p.push(g.end_date); }
        const { rows } = await client.query(q, p);
        count = parseInt(rows[0].c); is_completed = count >= g.target_count ? 1 : 0;
      } else if (g.goal_type === 'interviews') {
        let q = 'SELECT COUNT(*) as c FROM interviews WHERE user_id=$1'; const p = [req.user.id];
        if (g.start_date) { q += ` AND interview_date >= $${p.length+1}`; p.push(g.start_date); }
        if (g.end_date) { q += ` AND interview_date <= $${p.length+1}`; p.push(`${g.end_date} 23:59:59`); }
        const { rows } = await client.query(q, p);
        count = parseInt(rows[0].c); is_completed = count >= g.target_count ? 1 : 0;
      }
      await client.query('UPDATE goals SET current_count=$1, is_completed=$2 WHERE id=$3 AND (current_count!=$1 OR is_completed!=$2)', [count, is_completed, g.id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Goals synced' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /goals/sync:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

router.post('/goals', doubleCsrfProtection, async (req, res) => {
  try {
    const { title, target_count, period, start_date, end_date, goal_type } = req.body;
    if (!title || !target_count) return res.status(400).json({ error: 'Title and target required' });
    const parsedTarget = parseInt(target_count);
    if (!Number.isInteger(parsedTarget) || parsedTarget < 1) return res.status(400).json({ error: 'target_count must be a positive integer' });
    const start = start_date || new Date().toISOString().split('T')[0];
    let end = end_date;
    if (!end && period === 'daily') end = start;
    if (!end && period === 'weekly') end = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
    if (!end && period === 'monthly') end = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
    const { rows } = await pool.query('INSERT INTO goals (user_id,title,goal_type,target_count,period,start_date,end_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [req.user.id, title, goal_type||'applications', parsedTarget, period||'weekly', start, end]);
    await logActivity(req.user.id, 'goal', `New goal: ${title}`, `Target: ${parsedTarget}`, 'goal', rows[0].id);
    res.json({ id: rows[0].id });
  } catch (err) { console.error('POST /goals:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/goals/:id', doubleCsrfProtection, async (req, res) => {
  await pool.query('DELETE FROM goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Deleted' });
});

// SALARY INSIGHTS
router.get('/salary', async (req, res) => {
  try {
    const { rows: apps } = await pool.query("SELECT company,role,salary_expected,salary_offered,status FROM applications WHERE user_id=$1 AND (salary_expected IS NOT NULL OR salary_offered IS NOT NULL)", [req.user.id]);
    const parseSalary = (s) => { if (!s) return null; const n = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; };
    const expected = apps.map(a => parseSalary(a.salary_expected)).filter(Boolean);
    const offered = apps.map(a => parseSalary(a.salary_offered)).filter(Boolean);
    const offers = apps.filter(a => a.status === 'offer' && a.salary_offered).map(a => ({ company: a.company, role: a.role, salary: a.salary_offered }));
    res.json({
      expected: { min: expected.length ? Math.min(...expected) : null, max: expected.length ? Math.max(...expected) : null, avg: expected.length ? Math.round(expected.reduce((s,v)=>s+v,0)/expected.length) : null, count: expected.length },
      offered: { min: offered.length ? Math.min(...offered) : null, max: offered.length ? Math.max(...offered) : null, avg: offered.length ? Math.round(offered.reduce((s,v)=>s+v,0)/offered.length) : null, count: offered.length },
      offers, total_with_salary: apps.length
    });
  } catch (err) { console.error('GET /salary:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// OFFER COMPARISON
router.get('/compare-offers', async (req, res) => {
  const { rows } = await pool.query("SELECT id,company,role,salary_offered,location,work_mode,contact_person,notes FROM applications WHERE user_id=$1 AND status='offer'", [req.user.id]);
  res.json(rows);
});

// SKILLS GAP
router.get('/skills-gap', async (req, res) => {
  try {
    const { rows: apps } = await pool.query('SELECT job_description,status FROM applications WHERE user_id=$1 AND job_description IS NOT NULL', [req.user.id]);
    const techSkills = ['javascript','typescript','python','java','react','angular','vue','node','express','django','spring','aws','azure','docker','kubernetes','sql','mongodb','postgres','redis','git','linux','tailwind','nextjs','graphql','rest','microservices','agile','terraform','go','rust','kafka','elasticsearch'];
    const allSkills = {}, rejectedSkills = {};
    for (const app of apps) {
      const jdLower = app.job_description.toLowerCase();
      for (const s of techSkills.filter(s => jdLower.includes(s))) {
        allSkills[s] = (allSkills[s] || 0) + 1;
        if (app.status === 'rejected') rejectedSkills[s] = (rejectedSkills[s] || 0) + 1;
      }
    }
    const sorted = Object.entries(allSkills).sort((a,b)=>b[1]-a[1]).map(([skill,count])=>({ skill, demand: count, in_rejections: rejectedSkills[skill]||0 }));
    res.json({ total_jds_analyzed: apps.length, skills: sorted.slice(0, 20) });
  } catch (err) { console.error('GET /skills-gap:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
