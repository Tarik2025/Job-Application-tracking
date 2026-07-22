import { Router } from 'express';
import pool, { logAudit } from '../db.js';
import { auth } from '../middleware/auth.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';
import { predictStatus, generateFollowUp } from '../services/gemini.js';
import { paginate, buildSort, paginatedResponse } from '../utils/pagination.js';

const router = Router();

router.use((req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.use(auth);

const SORT_FIELDS = ['applied_date','last_updated','company','role','status','priority','response_date'];

// LIST
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { sql: sortField, dir: sortDir } = buildSort(req.query, SORT_FIELDS, 'applied_date', 'DESC');
    const { status, company, platform, priority, search, tag, work_mode, days_min, days_max } = req.query;

    let where = 'WHERE a.user_id = $1';
    const params = [req.user.id];
    const p = () => `$${params.length + 1}`;

    if (status) { where += ` AND a.status = ${p()}`; params.push(status); }
    if (company) { where += ` AND a.company ILIKE ${p()}`; params.push(`%${company}%`); }
    if (platform) { where += ` AND a.platform = ${p()}`; params.push(platform); }
    if (priority) { where += ` AND a.priority = ${p()}`; params.push(priority); }
    if (work_mode) { where += ` AND a.work_mode = ${p()}`; params.push(work_mode); }
    if (search) {
      where += ` AND (a.company ILIKE ${p()} OR a.role ILIKE ${p()} OR a.location ILIKE ${p()} OR a.notes ILIKE ${p()} OR a.contact_person ILIKE ${p()})`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (tag) {
      where += ` AND a.id IN (SELECT application_id FROM application_tags at2 JOIN tags t ON at2.tag_id=t.id WHERE t.name=${p()} AND t.user_id=${p()})`;
      params.push(tag, req.user.id);
    }
    if (days_min) { where += ` AND EXTRACT(EPOCH FROM (NOW() - a.applied_date))/86400 >= ${p()}`; params.push(Number(days_min)); }
    if (days_max) { where += ` AND EXTRACT(EPOCH FROM (NOW() - a.applied_date))/86400 <= ${p()}`; params.push(Number(days_max)); }

    const countRes = await pool.query(`SELECT COUNT(*) as c FROM applications a ${where}`, params);
    const total = parseInt(countRes.rows[0].c);

    const dataRes = await pool.query(
      `SELECT a.* FROM applications a ${where} ORDER BY a.${sortField} ${sortDir} LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );
    let rows = dataRes.rows;

    const rowIds = rows.map(r => r.id);
    const tagMap = {};
    if (rowIds.length) {
      const { rows: tagRows } = await pool.query(
        `SELECT at2.application_id,t.name,t.color FROM application_tags at2 JOIN tags t ON at2.tag_id=t.id WHERE at2.application_id = ANY($1)`,
        [rowIds]
      );
      tagRows.forEach(t => { (tagMap[t.application_id] = tagMap[t.application_id] || []).push({ name: t.name, color: t.color }); });
    }

    rows = rows.map(r => {
      const days_since = Math.round((Date.now() - new Date(r.applied_date).getTime()) / 86400000);
      return { ...r, days_since, tags: tagMap[r.id] || [] };
    });

    res.json(paginatedResponse(rows, total, page, limit));
  } catch (err) { console.error('GET /applications:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET SINGLE
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    const app = rows[0];
    if (!app) return res.status(404).json({ error: 'Not found' });

    const days_since = Math.round((Date.now() - new Date(app.applied_date).getTime()) / 86400000);
    const [{ rows: tags }, { rows: history }, { rows: notes }, { rows: reminders }] = await Promise.all([
      pool.query('SELECT t.id,t.name,t.color FROM application_tags at2 JOIN tags t ON at2.tag_id=t.id WHERE at2.application_id=$1', [app.id]),
      pool.query('SELECT * FROM status_history WHERE application_id=$1 ORDER BY created_at DESC', [app.id]),
      pool.query('SELECT * FROM notes_history WHERE application_id=$1 ORDER BY created_at DESC', [app.id]),
      pool.query('SELECT * FROM reminders WHERE application_id=$1 AND user_id=$2 ORDER BY remind_at ASC', [app.id, req.user.id]),
    ]);
    res.json({ ...app, days_since, tags, history, notes, reminders });
  } catch (err) { console.error('GET /applications/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// CREATE
router.post('/', doubleCsrfProtection, async (req, res) => {
  const client = await pool.connect();
  try {
    const { company, role, status, platform, job_url, job_description, salary_expected, salary_offered, location, work_mode, contact_person, contact_email, notes, priority, tags } = req.body;
    if (!company || !role) return res.status(400).json({ error: 'Company and role required' });

    const { rows: dup } = await client.query('SELECT id,status,applied_date FROM applications WHERE user_id=$1 AND company=$2 AND role=$3', [req.user.id, company, role]);
    if (dup[0]) return res.status(409).json({ error: 'Duplicate found', existing: dup[0] });

    await client.query('BEGIN');
    const { rows: inserted } = await client.query(
      'INSERT INTO applications (user_id,company,role,status,platform,job_url,job_description,salary_expected,salary_offered,location,work_mode,contact_person,contact_email,notes,priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id',
      [req.user.id, company, role, status||'applied', platform||null, job_url||null, job_description||null, salary_expected||null, salary_offered||null, location||null, work_mode||null, contact_person||null, contact_email||null, notes||null, priority||'medium']
    );
    const appId = inserted[0].id;

    await client.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [appId, req.user.id, null, status||'applied', 'Application created']);

    if (tags?.length) {
      for (const t of tags) {
        await client.query('INSERT INTO tags (user_id,name) VALUES ($1,$2) ON CONFLICT (user_id,name) DO NOTHING', [req.user.id, t]);
        const { rows: tag } = await client.query('SELECT id FROM tags WHERE user_id=$1 AND name=$2', [req.user.id, t]);
        if (tag[0]) await client.query('INSERT INTO application_tags (application_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [appId, tag[0].id]);
      }
    }

    const remindDate = new Date(Date.now() + 7*86400000).toISOString();
    await client.query('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES ($1,$2,$3,$4)', [req.user.id, appId, `Follow up with ${company}`, remindDate]);
    await client.query('COMMIT');

    await logAudit(req.user.id, 'CREATE', 'application', appId, { company, role }, req.ip);
    const { rows: result } = await pool.query('SELECT * FROM applications WHERE id=$1', [appId]);
    res.json(result[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /applications:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// UPDATE
router.put('/:id', doubleCsrfProtection, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await client.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    const app = rows[0];
    if (!app) return res.status(404).json({ error: 'Not found' });

    const fields = ['company','role','status','platform','job_url','job_description','salary_expected','salary_offered','location','work_mode','contact_person','contact_email','notes','priority'];
    const updates = []; const values = [];
    for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${updates.length+1}`); values.push(req.body[f]); } }
    if (updates.length === 0 && !req.body.tags) return res.status(400).json({ error: 'No fields' });

    await client.query('BEGIN');
    if (updates.length > 0) {
      if (req.body.status && req.body.status !== app.status) {
        await client.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [app.id, req.user.id, app.status, req.body.status, req.body.status_note||null]);
        if (['interview','offer','rejected'].includes(req.body.status) && !app.response_date) {
          updates.push('response_date = CURRENT_TIMESTAMP');
        }
      }
      updates.push('last_updated = CURRENT_TIMESTAMP');
      values.push(id);
      await client.query(`UPDATE applications SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    }
    if (req.body.tags) {
      await client.query('DELETE FROM application_tags WHERE application_id=$1', [app.id]);
      for (const t of req.body.tags) {
        await client.query('INSERT INTO tags (user_id,name) VALUES ($1,$2) ON CONFLICT (user_id,name) DO NOTHING', [req.user.id, t]);
        const { rows: tag } = await client.query('SELECT id FROM tags WHERE user_id=$1 AND name=$2', [req.user.id, t]);
        if (tag[0]) await client.query('INSERT INTO application_tags (application_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [app.id, tag[0].id]);
      }
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, 'UPDATE', 'application', id, req.body, req.ip);
    const { rows: result } = await pool.query('SELECT * FROM applications WHERE id=$1', [id]);
    res.json(result[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /applications/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// DELETE
router.delete('/:id', doubleCsrfProtection, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM applications WHERE id=$1', [id]);
    await logAudit(req.user.id, 'DELETE', 'application', id, { company: rows[0].company, role: rows[0].role }, req.ip);
    res.json({ message: 'Deleted' });
  } catch (err) { console.error('DELETE /applications/:id:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// BULK STATUS
router.patch('/bulk/status', doubleCsrfProtection, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ error: 'ids and status required' });
    if (ids.length > 100) return res.status(400).json({ error: 'Max 100 ids per bulk operation' });
    if (!ids.every(id => Number.isInteger(id) && id > 0)) return res.status(400).json({ error: 'All ids must be positive integers' });
    const VALID = ['applied','under_review','interview','offer','rejected','withdrawn'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

    await client.query('BEGIN');
    let updated = 0;
    for (const id of ids) {
      const { rows } = await client.query('SELECT status FROM applications WHERE id=$1 AND user_id=$2', [id, req.user.id]);
      if (rows[0]) {
        await client.query('UPDATE applications SET status=$1, last_updated=CURRENT_TIMESTAMP WHERE id=$2 AND user_id=$3', [status, id, req.user.id]);
        await client.query('INSERT INTO status_history (application_id,user_id,from_status,to_status,note) VALUES ($1,$2,$3,$4,$5)', [id, req.user.id, rows[0].status, status, 'Bulk update']);
        updated++;
      }
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, 'BULK_UPDATE', 'application', null, { ids, status }, req.ip);
    res.json({ updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PATCH /bulk/status:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// BULK DELETE
router.post('/bulk/delete', doubleCsrfProtection, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids required' });
    if (ids.length > 100) return res.status(400).json({ error: 'Max 100 ids per bulk operation' });
    if (!ids.every(id => Number.isInteger(id) && id > 0)) return res.status(400).json({ error: 'All ids must be positive integers' });
    await client.query('BEGIN');
    let deleted = 0;
    for (const id of ids) {
      const { rowCount } = await client.query('DELETE FROM applications WHERE id=$1 AND user_id=$2', [id, req.user.id]);
      deleted += rowCount;
    }
    await client.query('COMMIT');
    await logAudit(req.user.id, 'BULK_DELETE', 'application', null, { ids }, req.ip);
    res.json({ deleted });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error' });
  } finally { client.release(); }
});

// ADD NOTE
router.post('/:id/notes', doubleCsrfProtection, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id FROM applications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
    const { rows: r } = await pool.query('INSERT INTO notes_history (application_id,user_id,content) VALUES ($1,$2,$3) RETURNING id', [rows[0].id, req.user.id, content.trim()]);
    res.json({ id: r[0].id, content: content.trim(), created_at: new Date().toISOString() });
  } catch (err) { console.error('POST /:id/notes:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// TAGS
router.get('/tags/list', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tags WHERE user_id=$1 ORDER BY name', [req.user.id]);
  res.json(rows);
});

router.post('/tags', doubleCsrfProtection, async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  await pool.query('INSERT INTO tags (user_id,name,color) VALUES ($1,$2,$3) ON CONFLICT (user_id,name) DO NOTHING', [req.user.id, name.trim(), color||'#6366f1']);
  res.json({ message: 'Created' });
});

router.delete('/tags/:id', doubleCsrfProtection, async (req, res) => {
  await pool.query('DELETE FROM tags WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Deleted' });
});

// REMINDERS
router.get('/reminders/list', async (req, res) => {
  const { show_done } = req.query;
  let q = 'SELECT r.*,a.company,a.role FROM reminders r LEFT JOIN applications a ON r.application_id=a.id WHERE r.user_id=$1';
  if (!show_done) q += ' AND r.is_done=0';
  q += ' ORDER BY r.remind_at ASC';
  const { rows } = await pool.query(q, [req.user.id]);
  res.json(rows);
});

router.post('/reminders', doubleCsrfProtection, async (req, res) => {
  const { application_id, title, remind_at } = req.body;
  if (!title || !remind_at) return res.status(400).json({ error: 'Title and remind_at required' });
  if (isNaN(new Date(remind_at).getTime())) return res.status(400).json({ error: 'Invalid remind_at date' });
  const { rows } = await pool.query('INSERT INTO reminders (user_id,application_id,title,remind_at) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.id, application_id||null, title, remind_at]);
  res.json({ id: rows[0].id });
});

router.patch('/reminders/:id/done', doubleCsrfProtection, async (req, res) => {
  await pool.query('UPDATE reminders SET is_done=1 WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Done' });
});

router.delete('/reminders/:id', doubleCsrfProtection, async (req, res) => {
  await pool.query('DELETE FROM reminders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Deleted' });
});

// COMPANY STATS
router.get('/companies/stats', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT company,
      COUNT(*) as total_apps,
      SUM(CASE WHEN status='interview' THEN 1 ELSE 0 END) as interviews,
      SUM(CASE WHEN status='offer' THEN 1 ELSE 0 END) as offers,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejections,
      AVG(CASE WHEN response_date IS NOT NULL THEN EXTRACT(EPOCH FROM (response_date - applied_date))/86400 END) as avg_response_days
    FROM applications WHERE user_id=$1 GROUP BY company ORDER BY total_apps DESC
  `, [req.user.id]);
  res.json(rows);
});

// WEEKLY REPORT
router.get('/report/weekly', async (req, res) => {
  const uid = req.user.id;
  const [r1, r2, r3, r4, r5, r6] = await Promise.all([
    pool.query("SELECT COUNT(*) as c FROM applications WHERE user_id=$1 AND applied_date >= NOW() - INTERVAL '7 days'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM status_history WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days' AND to_status IN ('interview','offer','rejected')", [uid]),
    pool.query("SELECT COUNT(*) as c FROM status_history WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days' AND to_status='interview'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM status_history WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days' AND to_status='offer'", [uid]),
    pool.query("SELECT COUNT(*) as c FROM applications WHERE user_id=$1 AND status NOT IN ('rejected','withdrawn')", [uid]),
    pool.query('SELECT COUNT(*) as c FROM reminders WHERE user_id=$1 AND is_done=0 AND remind_at < CURRENT_TIMESTAMP', [uid]),
  ]);
  res.json({ period: '7 days', applied: parseInt(r1.rows[0].c), responses: parseInt(r2.rows[0].c), interviews: parseInt(r3.rows[0].c), offers: parseInt(r4.rows[0].c), totalActive: parseInt(r5.rows[0].c), overdueReminders: parseInt(r6.rows[0].c) });
});

// EXPORT CSV
router.get('/export', async (req, res) => {
  const { rows: apps } = await pool.query('SELECT id,company,role,status,platform,location,work_mode,salary_expected,salary_offered,priority,applied_date,last_updated,response_date,contact_person,contact_email,notes FROM applications WHERE user_id=$1 ORDER BY applied_date DESC', [req.user.id]);
  const csvCell = (v) => { const s = (v == null ? '' : String(v)).replace(/"/g, '""'); const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return `"${safe}"`; };
  const headers = 'S.No,Company,Role,Status,Platform,Location,Work Mode,Expected Salary,Offered Salary,Priority,Applied Date,Last Updated,Response Date,Days Since,Contact,Contact Email,Notes';
  const rows = apps.map((a, i) => {
    const days = Math.floor((Date.now() - new Date(a.applied_date).getTime()) / 86400000);
    return [i+1, a.company, a.role, a.status, a.platform||'', a.location||'', a.work_mode||'', a.salary_expected||'', a.salary_offered||'', a.priority, a.applied_date?.toISOString().split('T')[0]||'', a.last_updated?.toISOString().split('T')[0]||'', a.response_date?.toISOString().split('T')[0]||'', days, a.contact_person||'', a.contact_email||'', a.notes||''].map(csvCell).join(',');
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
  res.send([headers, ...rows].join('\n'));
});

// AI
router.get('/:id/predict', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const days = Math.floor((Date.now() - new Date(rows[0].last_updated).getTime()) / 86400000);
    res.json(await predictStatus(rows[0], days));
  } catch (err) { console.error('GET predict:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id/follow-up', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(await generateFollowUp(rows[0]));
  } catch (err) { console.error('GET follow-up:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
