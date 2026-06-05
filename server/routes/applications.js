import { Router } from 'express';
import db, { logAudit } from '../db.js';
import { auth } from '../middleware/auth.js';
import { predictStatus, generateFollowUp } from '../services/gemini.js';
import { paginate, buildSort, paginatedResponse } from '../utils/pagination.js';

const router = Router();
router.use(auth);

const SORT_FIELDS = ['applied_date', 'last_updated', 'company', 'role', 'status', 'priority', 'response_date'];

// ===== LIST (paginated, filtered, sorted, with days_since) =====
router.get('/', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const sort = buildSort(req.query, SORT_FIELDS, 'applied_date', 'DESC');
  const { status, company, platform, priority, search, tag, work_mode, days_min, days_max } = req.query;

  let where = 'WHERE a.user_id = ?';
  const params = [req.user.id];

  if (status) { where += ' AND a.status = ?'; params.push(status); }
  if (company) { where += ' AND a.company LIKE ?'; params.push(`%${company}%`); }
  if (platform) { where += ' AND a.platform = ?'; params.push(platform); }
  if (priority) { where += ' AND a.priority = ?'; params.push(priority); }
  if (work_mode) { where += ' AND a.work_mode = ?'; params.push(work_mode); }
  if (search) { where += ' AND (a.company LIKE ? OR a.role LIKE ? OR a.location LIKE ? OR a.notes LIKE ? OR a.contact_person LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  if (tag) { where += ' AND a.id IN (SELECT application_id FROM application_tags at2 JOIN tags t ON at2.tag_id=t.id WHERE t.name=? AND t.user_id=?)'; params.push(tag, req.user.id); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM applications a ${where}`).get(...params).c;
  let rows = db.prepare(`SELECT a.* FROM applications a ${where} ORDER BY a.${sort} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  // Enrich with days_since, tags
  rows = rows.map(r => {
    const days_since = Math.floor((Date.now() - new Date(r.applied_date).getTime()) / 86400000);
    const tags = db.prepare('SELECT t.name,t.color FROM application_tags at2 JOIN tags t ON at2.tag_id=t.id WHERE at2.application_id=?').all(r.id);
    return { ...r, days_since, tags };
  });

  // Filter by days if requested
  if (days_min) rows = rows.filter(r => r.days_since >= Number(days_min));
  if (days_max) rows = rows.filter(r => r.days_since <= Number(days_max));

  res.json(paginatedResponse(rows, total, page, limit));
});

// ===== GET SINGLE (with full history, notes, tags) =====
router.get('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const days_since = Math.floor((Date.now() - new Date(app.applied_date).getTime()) / 86400000);
  const tags = db.prepare('SELECT t.id,t.name,t.color FROM application_tags at2 JOIN tags t ON at2.tag_id=t.id WHERE at2.application_id=?').all(app.id);
  const history = db.prepare('SELECT * FROM status_history WHERE application_id=? ORDER BY created_at DESC').all(app.id);
  const notes = db.prepare('SELECT * FROM notes_history WHERE application_id=? ORDER BY created_at DESC').all(app.id);
  const reminders = db.prepare('SELECT * FROM reminders WHERE application_id=? AND user_id=? ORDER BY remind_at ASC').all(app.id, req.user.id);

  res.json({ ...app, days_since, tags, history, notes, reminders });
});

// ===== CREATE (with duplicate check) =====
router.post('/', (req, res) => {
  const { company, role, status, platform, job_url, job_description, salary_expected, salary_offered, location, work_mode, contact_person, contact_email, notes, priority, tags } = req.body;
  if (!company || !role) return res.status(400).json({ error: 'Company and role required' });

  // Duplicate check
  const duplicate = db.prepare('SELECT id,status,applied_date FROM applications WHERE user_id=? AND company LIKE ? AND role LIKE ?').get(req.user.id, company, role);
  if (duplicate) return res.status(409).json({ error: 'Duplicate found', existing: duplicate });

  const r = db.prepare('INSERT INTO applications (user_id,company,role,status,platform,job_url,job_description,salary_expected,salary_offered,location,work_mode,contact_person,contact_email,notes,priority) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(req.user.id, company, role, status||'applied', platform||null, job_url||null, job_description||null, salary_expected||null, salary_offered||null, location||null, work_mode||null, contact_person||null, contact_email||null, notes||null, priority||'medium');

  const appId = r.lastInsertRowid;

  // Log initial status
  db.prepare('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES (?,?,?,?,?)').run(appId, req.user.id, null, status||'applied', 'Application created');

  // Add tags
  if (tags?.length) {
    for (const t of tags) {
      let tag = db.prepare('SELECT id FROM tags WHERE user_id=? AND name=?').get(req.user.id, t);
      if (!tag) { db.prepare('INSERT INTO tags (user_id,name) VALUES (?,?)').run(req.user.id, t); tag = db.prepare('SELECT id FROM tags WHERE user_id=? AND name=?').get(req.user.id, t); }
      db.prepare('INSERT OR IGNORE INTO application_tags (application_id,tag_id) VALUES (?,?)').run(appId, tag.id);
    }
  }

  // Auto-create reminder if no response in 7 days
  const remindDate = new Date(Date.now() + 7*86400000).toISOString();
  db.prepare('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES (?,?,?,?)').run(req.user.id, appId, `Follow up with ${company}`, remindDate);

  logAudit(req.user.id, 'CREATE', 'application', appId, { company, role }, req.ip);
  res.json(db.prepare('SELECT * FROM applications WHERE id=?').get(appId));
});

// ===== UPDATE (with status history tracking) =====
router.put('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const fields = ['company','role','status','platform','job_url','job_description','salary_expected','salary_offered','location','work_mode','contact_person','contact_email','notes','priority'];
  const updates = []; const values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });

  // Track status change
  if (req.body.status && req.body.status !== app.status) {
    db.prepare('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES (?,?,?,?,?)').run(app.id, req.user.id, app.status, req.body.status, req.body.status_note || null);
    if (['interview','offer','rejected'].includes(req.body.status) && !app.response_date) {
      updates.push('response_date = CURRENT_TIMESTAMP');
    }
  }

  updates.push('last_updated = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  // Update tags if provided
  if (req.body.tags) {
    db.prepare('DELETE FROM application_tags WHERE application_id=?').run(app.id);
    for (const t of req.body.tags) {
      let tag = db.prepare('SELECT id FROM tags WHERE user_id=? AND name=?').get(req.user.id, t);
      if (!tag) { db.prepare('INSERT INTO tags (user_id,name) VALUES (?,?)').run(req.user.id, t); tag = db.prepare('SELECT id FROM tags WHERE user_id=? AND name=?').get(req.user.id, t); }
      db.prepare('INSERT OR IGNORE INTO application_tags (application_id,tag_id) VALUES (?,?)').run(app.id, tag.id);
    }
  }

  logAudit(req.user.id, 'UPDATE', 'application', Number(req.params.id), req.body, req.ip);
  res.json(db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id));
});

// ===== DELETE =====
router.delete('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM applications WHERE id=?').run(req.params.id);
  logAudit(req.user.id, 'DELETE', 'application', Number(req.params.id), { company: app.company, role: app.role }, req.ip);
  res.json({ message: 'Deleted' });
});

// ===== BULK OPS =====
router.patch('/bulk/status', (req, res) => {
  const { ids, status } = req.body;
  if (!ids?.length || !status) return res.status(400).json({ error: 'ids and status required' });
  const stmt = db.prepare('UPDATE applications SET status=?, last_updated=CURRENT_TIMESTAMP WHERE id=? AND user_id=?');
  const hist = db.prepare('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES (?,?,?,?,?)');
  let updated = 0;
  for (const id of ids) {
    const app = db.prepare('SELECT status FROM applications WHERE id=? AND user_id=?').get(id, req.user.id);
    if (app) { stmt.run(status, id, req.user.id); hist.run(id, req.user.id, app.status, status, 'Bulk update'); updated++; }
  }
  logAudit(req.user.id, 'BULK_UPDATE', 'application', null, { ids, status }, req.ip);
  res.json({ updated });
});

router.post('/bulk/delete', (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'ids required' });
  const stmt = db.prepare('DELETE FROM applications WHERE id=? AND user_id=?');
  let deleted = 0;
  for (const id of ids) { const r = stmt.run(id, req.user.id); deleted += r.changes; }
  logAudit(req.user.id, 'BULK_DELETE', 'application', null, { ids }, req.ip);
  res.json({ deleted });
});

// ===== ADD NOTE =====
router.post('/:id/notes', (req, res) => {
  const app = db.prepare('SELECT id FROM applications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const r = db.prepare('INSERT INTO notes_history (application_id,user_id,content) VALUES (?,?,?)').run(app.id, req.user.id, content.trim());
  res.json({ id: r.lastInsertRowid, content: content.trim(), created_at: new Date().toISOString() });
});

// ===== TAGS CRUD =====
router.get('/tags/list', (req, res) => {
  res.json(db.prepare('SELECT * FROM tags WHERE user_id=? ORDER BY name').all(req.user.id));
});

router.post('/tags', (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  db.prepare('INSERT OR IGNORE INTO tags (user_id,name,color) VALUES (?,?,?)').run(req.user.id, name.trim(), color||'#6366f1');
  res.json({ message: 'Created' });
});

router.delete('/tags/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

// ===== REMINDERS =====
router.get('/reminders/list', (req, res) => {
  const { show_done } = req.query;
  let where = 'WHERE user_id=?';
  if (!show_done) where += ' AND is_done=0';
  res.json(db.prepare(`SELECT r.*,a.company,a.role FROM reminders r LEFT JOIN applications a ON r.application_id=a.id ${where} ORDER BY r.remind_at ASC`).all(req.user.id));
});

router.post('/reminders', (req, res) => {
  const { application_id, title, remind_at } = req.body;
  if (!title || !remind_at) return res.status(400).json({ error: 'Title and remind_at required' });
  const r = db.prepare('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES (?,?,?,?)').run(req.user.id, application_id||null, title, remind_at);
  res.json({ id: r.lastInsertRowid });
});

router.patch('/reminders/:id/done', (req, res) => {
  db.prepare('UPDATE reminders SET is_done=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Done' });
});

router.delete('/reminders/:id', (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

// ===== COMPANY INTELLIGENCE =====
router.get('/companies/stats', (req, res) => {
  const companies = db.prepare(`
    SELECT company,
      COUNT(*) as total_apps,
      SUM(CASE WHEN status='interview' THEN 1 ELSE 0 END) as interviews,
      SUM(CASE WHEN status='offer' THEN 1 ELSE 0 END) as offers,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejections,
      AVG(CASE WHEN response_date IS NOT NULL THEN julianday(response_date)-julianday(applied_date) END) as avg_response_days
    FROM applications WHERE user_id=? GROUP BY company ORDER BY total_apps DESC
  `).all(req.user.id);
  res.json(companies);
});

// ===== WEEKLY REPORT =====
router.get('/report/weekly', (req, res) => {
  const uid = req.user.id;
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString();

  const applied = db.prepare('SELECT COUNT(*) as c FROM applications WHERE user_id=? AND applied_date >= ?').get(uid, weekAgo).c;
  const responses = db.prepare("SELECT COUNT(*) as c FROM status_history WHERE user_id=? AND created_at >= ? AND to_status IN ('interview','offer','rejected')").get(uid, weekAgo).c;
  const interviews = db.prepare("SELECT COUNT(*) as c FROM status_history WHERE user_id=? AND created_at >= ? AND to_status='interview'").get(uid, weekAgo).c;
  const offers = db.prepare("SELECT COUNT(*) as c FROM status_history WHERE user_id=? AND created_at >= ? AND to_status='offer'").get(uid, weekAgo).c;
  const totalActive = db.prepare("SELECT COUNT(*) as c FROM applications WHERE user_id=? AND status NOT IN ('rejected','withdrawn')").get(uid).c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM reminders WHERE user_id=? AND is_done=0 AND remind_at < CURRENT_TIMESTAMP").get(uid).c;

  res.json({ period: '7 days', applied, responses, interviews, offers, totalActive, overdueReminders: overdue });
});

// ===== EXPORT CSV =====
router.get('/export', (req, res) => {
  const apps = db.prepare('SELECT id,company,role,status,platform,location,work_mode,salary_expected,salary_offered,priority,applied_date,last_updated,response_date,contact_person,contact_email,notes FROM applications WHERE user_id=? ORDER BY applied_date DESC').all(req.user.id);

  const headers = 'S.No,Company,Role,Status,Platform,Location,Work Mode,Expected Salary,Offered Salary,Priority,Applied Date,Last Updated,Response Date,Days Since,Contact,Contact Email,Notes';
  const rows = apps.map((a, i) => {
    const days = Math.floor((Date.now() - new Date(a.applied_date).getTime()) / 86400000);
    return `${i+1},"${a.company}","${a.role}",${a.status},${a.platform||''},${a.location||''},${a.work_mode||''},${a.salary_expected||''},${a.salary_offered||''},${a.priority},${a.applied_date?.split('T')[0]||''},${a.last_updated?.split('T')[0]||''},${a.response_date?.split('T')[0]||''},${days},${a.contact_person||''},${a.contact_email||''},"${(a.notes||'').replace(/"/g,'""')}"`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
  res.send([headers, ...rows].join('\n'));
});

// ===== AI =====
router.get('/:id/predict', async (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    const days = Math.floor((Date.now() - new Date(app.last_updated).getTime()) / 86400000);
    res.json(await predictStatus(app, days));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/follow-up', async (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(await generateFollowUp(app));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
