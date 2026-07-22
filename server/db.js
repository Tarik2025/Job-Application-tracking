import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('Unexpected pool error', err));

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      country_code TEXT DEFAULT '+91',
      gender TEXT,
      dob TEXT,
      user_type TEXT CHECK(user_type IN ('student','professional')),
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
      country TEXT DEFAULT 'India',
      linkedin TEXT,
      github TEXT,
      portfolio TEXT,
      target_days INTEGER,
      target_start_date TEXT,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0,1)),
      token_version INTEGER DEFAULT 0,
      username TEXT,
      reset_token TEXT,
      reset_token_expires BIGINT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

    CREATE TABLE IF NOT EXISTS colleges (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stacks (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_stacks (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stack_id INTEGER NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, stack_id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'applied' CHECK(status IN ('applied','under_review','interview','offer','rejected','withdrawn')),
      platform TEXT,
      job_url TEXT,
      job_description TEXT,
      salary_expected TEXT,
      salary_offered TEXT,
      location TEXT,
      work_mode TEXT CHECK(work_mode IS NULL OR work_mode IN ('remote','hybrid','onsite')),
      contact_person TEXT,
      contact_email TEXT,
      notes TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      score INTEGER DEFAULT 0,
      applied_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      response_date TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS application_tags (
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (application_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS notes_history (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      remind_at TIMESTAMPTZ NOT NULL,
      is_done INTEGER DEFAULT 0 CHECK(is_done IN (0,1)),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      round_name TEXT NOT NULL,
      interview_date TIMESTAMPTZ NOT NULL,
      interview_type TEXT CHECK(interview_type IN ('phone','video','onsite','coding','system_design','hr','managerial')),
      interviewer TEXT,
      meeting_link TEXT,
      notes TEXT,
      outcome TEXT CHECK(outcome IS NULL OR outcome IN ('pending','passed','failed','rescheduled')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_type TEXT CHECK(doc_type IN ('cover_letter','offer_letter','referral','other')),
      title TEXT NOT NULL,
      content TEXT,
      filename TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, company)
    );

    CREATE TABLE IF NOT EXISTS activity_feed (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      entity_type TEXT CHECK(entity_type IS NULL OR entity_type IN ('application','document','interview','email','resume','goal','reminder','blacklist')),
      entity_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      goal_type TEXT DEFAULT 'applications' CHECK(goal_type IN ('applications','interviews','follow_ups','custom')),
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      period TEXT CHECK(period IN ('daily','weekly','monthly')),
      start_date TEXT,
      end_date TEXT,
      is_completed INTEGER DEFAULT 0 CHECK(is_completed IN (0,1)),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      subject TEXT,
      from_address TEXT,
      body TEXT NOT NULL,
      classification TEXT,
      extracted_data TEXT,
      received_at TIMESTAMPTZ,
      imap_uid TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_imap_uid ON emails(user_id, imap_uid) WHERE imap_uid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS email_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      host TEXT DEFAULT 'imap.gmail.com',
      port INTEGER DEFAULT 993,
      label TEXT,
      last_fetched TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, email)
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_path TEXT,
      extracted_text TEXT,
      skills TEXT,
      uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reminder_date TIMESTAMPTZ NOT NULL,
      message TEXT,
      sent INTEGER DEFAULT 0 CHECK(sent IN (0,1)),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interview_prep (
      id SERIAL PRIMARY KEY,
      application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      questions TEXT,
      topics TEXT,
      study_plan TEXT,
      company_insights TEXT,
      difficulty TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_applications_user_id        ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_user_status    ON applications(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_applications_user_company   ON applications(user_id, company);
    CREATE INDEX IF NOT EXISTS idx_applications_applied_date   ON applications(user_id, applied_date DESC);
    CREATE INDEX IF NOT EXISTS idx_status_history_app_id       ON status_history(application_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_user_id      ON status_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_created_at   ON status_history(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_emails_user_id              ON emails(user_id);
    CREATE INDEX IF NOT EXISTS idx_emails_application_id       ON emails(application_id);
    CREATE INDEX IF NOT EXISTS idx_emails_user_received        ON emails(user_id, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reminders_user_id           ON reminders(user_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_user_done         ON reminders(user_id, is_done, remind_at);
    CREATE INDEX IF NOT EXISTS idx_interviews_user_id          ON interviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_application_id   ON interviews(application_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_date             ON interviews(user_id, interview_date);
    CREATE INDEX IF NOT EXISTS idx_notes_history_app_id        ON notes_history(application_id);
    CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id       ON activity_feed(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_feed_user_created  ON activity_feed(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_goals_user_id               ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id                ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_application_tags_app_id     ON application_tags(application_id);
    CREATE INDEX IF NOT EXISTS idx_application_tags_tag_id     ON application_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_documents_user_id           ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_application_id    ON documents(application_id);
    CREATE INDEX IF NOT EXISTS idx_resumes_user_id             ON resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_interview_prep_user_id      ON interview_prep(user_id);
    CREATE INDEX IF NOT EXISTS idx_interview_prep_app_id       ON interview_prep(application_id);
    CREATE INDEX IF NOT EXISTS idx_blacklist_user_id           ON blacklist(user_id);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_application_id   ON follow_ups(application_id);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id          ON follow_ups(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id           ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at        ON audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id      ON email_accounts(user_id);
  `);

  // Seed colleges
  await pool.query(`
    INSERT INTO colleges (name) VALUES
      ('IIT Delhi'),('IIT Bombay'),('IIT Madras'),('IIT Kanpur'),('IIT Kharagpur'),
      ('IIT Roorkee'),('IIT Guwahati'),('IIT Hyderabad'),('IIT BHU'),('IIT Indore'),
      ('NIT Trichy'),('NIT Warangal'),('NIT Surathkal'),('NIT Calicut'),('NIT Rourkela'),
      ('BITS Pilani'),('BITS Hyderabad'),('BITS Goa'),
      ('VIT Vellore'),('SRM Chennai'),('DTU Delhi'),('NSUT Delhi'),
      ('IIIT Hyderabad'),('IIIT Delhi'),('IIIT Bangalore'),
      ('PEC Chandigarh'),('COEP Pune'),('VJTI Mumbai'),('Jadavpur University'),
      ('Anna University'),('Manipal Institute of Technology'),('Thapar University'),
      ('Amity University'),('LPU Punjab'),('Chandigarh University'),
      ('Shiv Nadar University'),('KIIT Bhubaneswar'),('SRM AP'),('VIT AP'),
      ('Central University of Kashmir')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Seed stacks
  await pool.query(`
    INSERT INTO stacks (name) VALUES
      ('MERN Stack'),('MEAN Stack'),('Java Full Stack'),('Python/Django'),('Python/Flask'),
      ('Spring Boot'),('Ruby on Rails'),('PHP/Laravel'),('.NET/C#'),
      ('React Native'),('Flutter'),('Swift/iOS'),('Kotlin/Android'),
      ('DevOps/Cloud'),('AI/ML'),('Data Science'),('Cyber Security'),
      ('Blockchain'),('Game Development'),('Embedded Systems'),('UI/UX Design')
    ON CONFLICT (name) DO NOTHING;
  `);

  console.log('✅ Database initialized');
}

export default pool;

export async function logAudit(userId, action, entity, entityId = null, details = null, ip = null) {
  await pool.query(
    'INSERT INTO audit_log (user_id,action,entity,entity_id,details,ip) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip]
  );
}

export async function logActivity(userId, type, title, description = null, entityType = null, entityId = null) {
  await pool.query(
    'INSERT INTO activity_feed (user_id,type,title,description,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, type, title, description, entityType, entityId]
  );
}
