import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'career-copilot.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Colleges
  CREATE TABLE IF NOT EXISTS colleges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    added_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tech stacks
  CREATE TABLE IF NOT EXISTS stacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    added_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- User stacks
  CREATE TABLE IF NOT EXISTS user_stacks (
    user_id INTEGER NOT NULL,
    stack_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, stack_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stack_id) REFERENCES stacks(id)
  );

  -- Applications
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
    work_mode TEXT CHECK(work_mode IN ('remote','hybrid','onsite',NULL)),
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

  -- Application tags
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
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    application_id INTEGER,
    title TEXT NOT NULL,
    remind_at DATETIME NOT NULL,
    is_done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
  );

  -- Interview schedule
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
    outcome TEXT CHECK(outcome IN ('pending','passed','failed','rescheduled',NULL)),
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

  -- Blacklisted companies (ghosted/bad experience)
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
  CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Goals
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    period TEXT CHECK(period IN ('daily','weekly','monthly')),
    start_date TEXT,
    end_date TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Emails
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    application_id INTEGER,
    subject TEXT,
    body TEXT NOT NULL,
    classification TEXT,
    extracted_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
  );

  -- Email accounts
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Resumes
  CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    extracted_text TEXT,
    skills TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Follow-ups
  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reminder_date DATETIME NOT NULL,
    message TEXT,
    sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Interview prep
  CREATE TABLE IF NOT EXISTS interview_prep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER,
    user_id INTEGER NOT NULL,
    questions TEXT,
    topics TEXT,
    difficulty TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Audit log
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

export default db;

export function logAudit(userId, action, entity, entityId = null, details = null, ip = null) {
  db.prepare('INSERT INTO audit_log (user_id,action,entity,entity_id,details,ip) VALUES (?,?,?,?,?,?)').run(userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip);
}

export function logActivity(userId, type, title, description = null, entityType = null, entityId = null) {
  db.prepare('INSERT INTO activity_feed (user_id,type,title,description,entity_type,entity_id) VALUES (?,?,?,?,?,?)').run(userId, type, title, description, entityType, entityId);
}
