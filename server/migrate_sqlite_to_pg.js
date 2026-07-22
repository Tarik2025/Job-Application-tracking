import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlitePath = join(__dirname, 'career-copilot.db');

if (!process.env.DATABASE_URL) {
  console.error('Please set DATABASE_URL environment variable and rerun.');
  process.exit(1);
}

// Connect
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sqlite = new Database(sqlitePath);

async function run(sql, params = []) {
  return pool.query(sql, params);
}

async function createTables() {
  // Create Postgres-compatible tables (simplified types)
  await run(`
  CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    country_code TEXT,
    gender TEXT,
    dob TEXT,
    user_type TEXT,
    college TEXT,
    degree TEXT,
    branch TEXT,
    year_of_study TEXT,
    passout_year TEXT,
    company TEXT,
    designation TEXT,
    experience TEXT,
    skills TEXT,
    preferred_role TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    linkedin TEXT,
    github TEXT,
    portfolio TEXT,
    target_days INTEGER,
    target_start_date TEXT,
    is_active INTEGER DEFAULT 1,
    token_version INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS colleges (
    id BIGINT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    added_by BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS stacks (
    id BIGINT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    added_by BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_stacks (
    user_id BIGINT NOT NULL,
    stack_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, stack_id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'applied',
    platform TEXT,
    job_url TEXT,
    job_description TEXT,
    salary_expected TEXT,
    salary_offered TEXT,
    location TEXT,
    work_mode TEXT,
    contact_person TEXT,
    contact_email TEXT,
    notes TEXT,
    priority TEXT DEFAULT 'medium',
    score INTEGER DEFAULT 0,
    applied_date TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW(),
    response_date TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id BIGINT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tags (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS application_tags (
    application_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (application_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS notes_history (
    id BIGINT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    application_id BIGINT,
    title TEXT NOT NULL,
    remind_at TIMESTAMP NOT NULL,
    is_done INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id BIGINT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    round_name TEXT NOT NULL,
    interview_date TIMESTAMP NOT NULL,
    interview_type TEXT,
    interviewer TEXT,
    meeting_link TEXT,
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS documents (
    id BIGINT PRIMARY KEY,
    application_id BIGINT,
    user_id BIGINT NOT NULL,
    doc_type TEXT,
    title TEXT NOT NULL,
    content TEXT,
    filename TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS activity_feed (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS goals (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    goal_type TEXT DEFAULT 'applications',
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    period TEXT,
    start_date TEXT,
    end_date TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS emails (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    application_id BIGINT,
    subject TEXT,
    from_address TEXT,
    body TEXT NOT NULL,
    classification TEXT,
    extracted_data TEXT,
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    imap_uid TEXT
  );

  CREATE TABLE IF NOT EXISTS email_accounts (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    host TEXT DEFAULT 'imap.gmail.com',
    port INTEGER DEFAULT 993,
    label TEXT,
    last_fetched TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT,
    extracted_text TEXT,
    skills TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id BIGINT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reminder_date TIMESTAMP NOT NULL,
    message TEXT,
    sent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS interview_prep (
    id BIGINT PRIMARY KEY,
    application_id BIGINT,
    user_id BIGINT NOT NULL,
    questions TEXT,
    topics TEXT,
    study_plan TEXT,
    company_insights TEXT,
    difficulty TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id BIGINT,
    details TEXT,
    ip TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  `);
}

async function copyTable(tableName) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  if (!rows || rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
  const insertSQL = `INSERT INTO ${tableName}(${cols.join(',')}) VALUES(${placeholders})`;

  // Insert rows in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const vals = cols.map(c => row[c] === undefined ? null : row[c]);
      await client.query(insertSQL, vals).catch(async (err) => {
        // If duplicate key or other conflict, ignore
        // try upsert fallback by appending ON CONFLICT DO NOTHING
        if (err.code && (err.code === '23505' || err.code === '23514')) {
          try {
            await client.query(insertSQL + ' ON CONFLICT DO NOTHING', vals);
          } catch (e2) {
            // ignore
          }
        }
      });
    }
    await client.query('COMMIT');
    console.log(`Copied ${rows.length} rows into ${tableName}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed copying table ${tableName}:`, err);
  } finally {
    client.release();
  }
}

async function setSequences() {
  // For tables with BIGINT PK, set sequence to max(id)
  const tables = ['users','colleges','stacks','applications','status_history','tags','notes_history','reminders','interviews','documents','blacklist','activity_feed','goals','emails','email_accounts','resumes','follow_ups','interview_prep','audit_log'];
  for (const t of tables) {
    try {
      await run(`SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`, [t]);
    } catch (err) {
      // ignore missing sequence
    }
  }
}

async function main() {
  console.log('Creating tables in Postgres...');
  await createTables();

  const tableOrder = ['users','colleges','stacks','user_stacks','applications','status_history','tags','application_tags','notes_history','reminders','interviews','documents','blacklist','activity_feed','goals','emails','email_accounts','resumes','follow_ups','interview_prep','audit_log'];

  for (const t of tableOrder) {
    console.log('Copying table', t);
    await copyTable(t);
  }

  console.log('Updating sequences...');
  await setSequences();

  console.log('Migration complete.');
  await pool.end();
  sqlite.close();
}

main().catch(err => { console.error(err); process.exit(1); });
