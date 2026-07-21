import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'career-copilot.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');   // safe with WAL, much faster than FULL
db.pragma('cache_size = -32000');    // 32MB page cache
db.pragma('temp_store = MEMORY');    // temp tables in RAM
db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O

db.exec(`
  -- Users
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    country_code TEXT DEFAULT '+91',
    gender TEXT,
    dob TEXT,
    user_type TEXT CHECK(user_type IN ('student', 'professional')),
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Colleges
  -- added_by references users(id); SET NULL so college survives user deletion
  CREATE TABLE IF NOT EXISTS colleges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    added_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Tech stacks
  -- added_by references users(id); SET NULL so stack survives user deletion
  CREATE TABLE IF NOT EXISTS stacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    added_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
  );

  -- User stacks (many-to-many)
  -- stack_id now has ON DELETE CASCADE so deleting a stack cleans up user_stacks
  CREATE TABLE IF NOT EXISTS user_stacks (
    user_id INTEGER NOT NULL,
    stack_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, stack_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stack_id) REFERENCES stacks(id) ON DELETE CASCADE
  );

  -- Applications
  -- work_mode CHECK: removed NULL from IN list; column is nullable so NULL is allowed naturally
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
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
    applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Status history
  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Tags
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  -- Application tags (many-to-many)
  CREATE TABLE IF NOT EXISTS application_tags (
    application_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (application_id, tag_id),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  -- Notes history
  CREATE TABLE IF NOT EXISTS notes_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Reminders
  -- is_done constrained to boolean 0/1
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    application_id INTEGER,
    title TEXT NOT NULL,
    remind_at DATETIME NOT NULL,
    is_done INTEGER DEFAULT 0 CHECK(is_done IN (0,1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
  );

  -- Interview schedule
  -- outcome CHECK: removed NULL from IN list; column is nullable so NULL is allowed naturally
  CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    round_name TEXT NOT NULL,
    interview_date DATETIME NOT NULL,
    interview_type TEXT CHECK(interview_type IN ('phone','video','onsite','coding','system_design','hr','managerial')),
    interviewer TEXT,
    meeting_link TEXT,
    notes TEXT,
    outcome TEXT CHECK(outcome IS NULL OR outcome IN ('pending','passed','failed','rescheduled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Documents (cover letters, offer letters per application)
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER,
    user_id INTEGER NOT NULL,
    doc_type TEXT CHECK(doc_type IN ('cover_letter','offer_letter','referral','other')),
    title TEXT NOT NULL,
    content TEXT,
    filename TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Blacklisted companies
  CREATE TABLE IF NOT EXISTS blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, company)
  );

  -- Activity feed
  -- entity_type constrained to known values used across all routes
  CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT CHECK(entity_type IS NULL OR entity_type IN ('application','document','interview','email','resume','goal','reminder','blacklist')),
    entity_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Goals
  -- goal_type added so advanced.js can reliably auto-count instead of fragile title matching
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    goal_type TEXT DEFAULT 'applications' CHECK(goal_type IN ('applications','interviews','follow_ups','custom')),
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    period TEXT CHECK(period IN ('daily','weekly','monthly')),
    start_date TEXT,
    end_date TEXT,
    is_completed INTEGER DEFAULT 0 CHECK(is_completed IN (0,1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Emails
  -- Added from_address and received_at columns:
  --   from_address: needed for reliable deduplication in emailFetcher.js
  --   received_at:  emails/classify accepts received_date; store it as a proper column
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    application_id INTEGER,
    subject TEXT,
    from_address TEXT,
    body TEXT NOT NULL,
    classification TEXT,
    extracted_data TEXT,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
  );

  -- Email accounts
  -- UNIQUE(user_id, email) prevents the same inbox being added twice,
  -- which would cause the scheduler to fetch and process it multiple times
  CREATE TABLE IF NOT EXISTS email_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    host TEXT DEFAULT 'imap.gmail.com',
    port INTEGER DEFAULT 993,
    label TEXT,
    last_fetched DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, email)
  );

  -- Resumes
  -- Added file_path column: multer saves files with a hashed name under uploads/;
  -- without file_path there is no way to retrieve or delete the actual file on disk
  CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT,
    extracted_text TEXT,
    skills TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Follow-ups
  -- sent constrained to boolean 0/1
  -- NOTE: This table is intentionally unused (no routes wire to it).
  -- It is kept as dead schema for potential future use.
  -- To remove cleanly: add a migration DROP TABLE IF EXISTS follow_ups
  -- and remove the two indexes below once confirmed safe to drop.
  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reminder_date DATETIME NOT NULL,
    message TEXT,
    sent INTEGER DEFAULT 0 CHECK(sent IN (0,1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Interview prep
  -- Added study_plan and company_insights columns:
  --   generateInterviewPrep() returns preparation_plan + company_insights but
  --   interview.js was silently dropping both on every INSERT
  CREATE TABLE IF NOT EXISTS interview_prep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER,
    user_id INTEGER NOT NULL,
    questions TEXT,
    topics TEXT,
    study_plan TEXT,
    company_insights TEXT,
    difficulty TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Audit log
  -- user_id is intentionally nullable and has NO FK because admin actions use
  -- user_id = 0 (which does not exist in users). A FK here would break admin logging.
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- -- Performance indexes ----------------------------------------------------
  -- Every WHERE user_id=? query does a full table scan without these.
  -- Critical for production with multiple users.

  CREATE INDEX IF NOT EXISTS idx_applications_user_id        ON applications(user_id);
  CREATE INDEX IF NOT EXISTS idx_applications_user_status    ON applications(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_applications_user_company   ON applications(user_id, company);
  CREATE INDEX IF NOT EXISTS idx_applications_applied_date   ON applications(user_id, applied_date DESC);

  CREATE INDEX IF NOT EXISTS idx_status_history_app_id       ON status_history(application_id);
  CREATE INDEX IF NOT EXISTS idx_status_history_user_id      ON status_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_status_history_created_at   ON status_history(user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_emails_user_id              ON emails(user_id);
  CREATE INDEX IF NOT EXISTS idx_emails_application_id       ON emails(application_id);

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

  -- -- Migrations for existing databases --------------------------------------
  -- These ALTER TABLE statements are safe to run repeatedly because
  -- better-sqlite3 will throw only if the column already exists, which we
  -- catch below in the migration runner.

  -- Seed colleges
  INSERT OR IGNORE INTO colleges (name) VALUES
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
    ('Central University of Kashmir');

  -- Seed stacks
  INSERT OR IGNORE INTO stacks (name) VALUES
    ('MERN Stack'),('MEAN Stack'),('Java Full Stack'),('Python/Django'),('Python/Flask'),
    ('Spring Boot'),('Ruby on Rails'),('PHP/Laravel'),('.NET/C#'),
    ('React Native'),('Flutter'),('Swift/iOS'),('Kotlin/Android'),
    ('DevOps/Cloud'),('AI/ML'),('Data Science'),('Cyber Security'),
    ('Blockchain'),('Game Development'),('Embedded Systems'),('UI/UX Design');
`);

// -- Safe column migrations (for databases that already exist) --------------
// Each migration is attempted individually; if the column already exists
// SQLite throws "duplicate column name" which we silently ignore.
// NOTE: SQLite ALTER TABLE ADD COLUMN does not support CHECK constraints.
// CHECK constraints in CREATE TABLE above only apply to freshly created DBs.
// For existing DBs, data integrity for new columns is enforced at the app layer.
const migrations = [
  // emails table
  `ALTER TABLE emails ADD COLUMN from_address TEXT`,
  `ALTER TABLE emails ADD COLUMN received_at DATETIME`,
  // resumes table
  `ALTER TABLE resumes ADD COLUMN file_path TEXT`,
  // interview_prep table
  `ALTER TABLE interview_prep ADD COLUMN study_plan TEXT`,
  `ALTER TABLE interview_prep ADD COLUMN company_insights TEXT`,
  // goals table -- default 'applications' so all existing goals auto-count correctly
  `ALTER TABLE goals ADD COLUMN goal_type TEXT DEFAULT 'applications'`,
  // users table
  `ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN reset_token TEXT`,
  `ALTER TABLE users ADD COLUMN reset_token_expires INTEGER`,
  // emails table -- imap_uid for stable server-side deduplication
  `ALTER TABLE emails ADD COLUMN imap_uid TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_imap_uid ON emails(user_id, imap_uid) WHERE imap_uid IS NOT NULL`,
  // email_accounts -- add unique constraint for existing DBs via a new unique index
  // (SQLite cannot ALTER TABLE ADD CONSTRAINT, so we use CREATE UNIQUE INDEX)
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_email_accounts_user_email ON email_accounts(user_id, email)`,
  `CREATE INDEX IF NOT EXISTS idx_emails_user_received ON emails(user_id, received_at DESC)`,
];

for (const sql of migrations) {
  try {
    db.prepare(sql).run();
  } catch (err) {
    // Only ignore "duplicate column name" and "already exists" -- rethrow everything else
    const msg = err.message || '';
    if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
      throw new Error(`Migration failed: ${sql} -- ${msg}`);
    }
  }
}

export default db;

export function logAudit(userId, action, entity, entityId = null, details = null, ip = null) {
  db.prepare('INSERT INTO audit_log (user_id,action,entity,entity_id,details,ip) VALUES (?,?,?,?,?,?)').run(userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip);
}

export function logActivity(userId, type, title, description = null, entityType = null, entityId = null) {
  db.prepare('INSERT INTO activity_feed (user_id,type,title,description,entity_type,entity_id) VALUES (?,?,?,?,?,?)').run(userId, type, title, description, entityType, entityId);
}
