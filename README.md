# 🚀 Career Copilot — Complete Developer Guide

This README is an authoritative, executable guide to understand, run, and extend the project. It documents architecture, file responsibilities, request/response flows, database schema overview, environment variables, local development, testing, deployment, and migration notes. Follow it to reproduce the entire project from source.

---

## 1. High-level overview

Career Copilot is a full-stack job-application tracking system with three main components:

- server/ — Express 5 REST API (Node.js). Handles auth, application CRUD, email automation, resume parsing, AI wrappers, admin, and scheduler.
- client/ — Next.js 15 (App Router), React 19 UI. Public pages, auth flows, dashboard, admin UI, and integrations (resume upload, email view).
- extension/ — Chrome Manifest V3 extension to scrape job listings and POST to server extension endpoint.

Primary runtime: server exposes `/api/*` endpoints consumed by client and extension.

---

## 2. Architecture diagram (mermaid)

```mermaid
flowchart LR
  subgraph Frontend
    C[Next.js client]
  end
  subgraph Backend
    S[Express server]
    DB[SQLite / Postgres]
    Scheduler[node-cron]
    AI[Gemini adapter]
  end
  EXT[Chrome extension]
  C -->|API calls| S
  EXT -->|POST /api/extension/job (auth)| S
  S --> DB
  Scheduler --> S
  S --> AI
  S -->|send email| SMTP[nodemailer]
  S -->|fetch email via IMAP| IMAP
```

---

## 3. File & folder responsibilities (detailed)

- server/
  - index.js — app bootstrap: env validation, middleware, route wiring, scheduler start, health endpoint.
  - db.js — central DB bootstrap: creates SQLite schema, runs migrations, seeds initial data. When migrating to Postgres, replace or augment this file with a pg adapter or wrapper.
  - routes/ — express routers grouped by concern:
    - auth.js — register/login/logout/password flows. Issues JWT cookie. Uses bcryptjs for hashing.
    - applications.js — application CRUD, duplicate checks, status history, exports.
    - emails.js — IMAP account CRUD, manual classify endpoint, fetch endpoint.
    - resume.js — multer upload, pdf-parse extraction, store file_path in resumes table.
    - admin.js — admin-only routes; requires ADMIN_* env vars; issues admin_token cookie.
    - others: colleges.js, stacks.js, analytics.js, interview.js, advanced.js, search.js
  - services/
    - gemini.js — AI wrapper (calls Google Gemini if GEMINI_API_KEY present; otherwise fallback)
    - manual.js — deterministic rules for email classification and lightweight NLP fallback.
    - emailFetcher.js — IMAP polling client + parsing + deduplication and classification pipeline.
    - scheduler.js — node-cron scheduling that triggers emailFetcher and periodic jobs.
    - mail.js — SMTP sending (nodemailer) and templates.
  - middleware/
    - auth.js — verifies JWT cookie and attaches req.user
    - csrf.js — CSRF token generation and double-submit protection utilities
  - uploads/ — resume uploads (ensure proper file perms in production)
  - migrate_sqlite_to_pg.js — data migration helper (SQLite -> Postgres). Use server/MIGRATION_TO_POSTGRES.md to run.

- client/
  - src/app/ — Next.js App Router pages and layouts (login, signup, dashboard, admin, profile, forgot-password)
  - src/components/ — UI components (Kanban, tables, forms, resume match, email classifier, interview prep)
  - src/lib/api.js — central API client wrappers used across UI; prefer this for network calls.
  - next.config.mjs — rewrites to backend for local development

- extension/ — Chrome extension that posts to `/api/extension/job` with auth cookie and CSRF token.

---

## 4. Data model highlights

Core tables (see server/db.js for full schema):
- users (id, email, password, name, token_version, is_active, created_at)
- applications (id, user_id, company, role, status, platform, job_url, applied_date)
- status_history (application_id, from_status, to_status, note)
- emails (id, user_id, application_id, subject, from_address, body, classification, received_at)
- resumes (id, user_id, filename, file_path, extracted_text)
- reminders, interviews, tags, user_stacks, goals, activity_feed, audit_log

Indices: db.js creates indexes on user_id, applied_date and other high-cardinality columns for performance.

---

## 5. Request & flow examples (end-to-end)

1. Registration + login
   - POST /api/auth/register { email, password, name, stacks? }
     - Validates input, hashes password with bcrypt, inserts into users.
     - Issues JWT cookie `token` with user id and token_version.
   - POST /api/auth/login { email, password }
     - Verifies password, issues JWT cookie.

2. Create application (client)
   - Client POST /api/applications { company, role, job_url, platform }
   - Server duplicate-checks for user by company+role; inserts into applications + status_history; returns new app id.

3. Upload resume
   - Client multipart/form-data POST /api/resumes/upload with file; server uses multer to store a hashed filename under server/uploads and persists file_path in resumes table; pdf-parse extracts text stored in extracted_text.

4. Email automation
   - User adds IMAP account: POST /api/emails/accounts { host, port, email, password }
   - Scheduler runs every 30 minutes (server/services/scheduler.js) and calls emailFetcher which:
     - Connects via IMAP, fetches recent messages, deduplicates via imap_uid or subject+date
     - Classifies each message via gemini.js → manual.js fallback
     - Updates matching application or creates a new application and logs status_history

5. Chrome extension
   - Extension obtains CSRF token via GET /api/csrf-token, includes cookie + CSRF on POST /api/extension/job
   - Server validates, runs duplicate-checks, inserts application + status_history + reminder

---

## 6. Environment variables (full)

Required for server startup (server will exit if missing/weak):
- JWT_SECRET (string, 32+ chars) — JWT signing
- ENCRYPTION_KEY (32+ chars) — symmetric key for internal encryption
- CSRF_SECRET (32+ chars) — used by double CSRF middleware
- ADMIN_EMAIL — admin console email
- ADMIN_PASSWORD_HASH — bcrypt hash of admin password (avoid storing plaintext)
- ADMIN_SECRET — admin extra secret key

Optional but enable features:
- FRONTEND_URL — frontend origin for CORS
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS — to send password reset emails
- GEMINI_API_KEY — to enable AI features (email classification, resume matching)
- DATABASE_URL — if set, instructs the app to use Postgres (see migration notes)

Security: Set these in your host/prod env (Render, Railway, Vercel, or your Kubernetes secrets). Do not commit them.

---

## 7. Local development (step-by-step)

1. Install deps (root helper):
   ```bash
   npm run install:all
   ```
2. Create server/.env with required vars (use dummy values for local development, but keep length constraints):
   ```env
   PORT=3001
   JWT_SECRET=32_char_minimum_random_string
   ENCRYPTION_KEY=32_char_minimum_random_string
   CSRF_SECRET=32_char_minimum_random_string
   FRONTEND_URL=http://localhost:3000
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD_HASH=<bcrypt-hash>
   ADMIN_SECRET=admin-secret
   ```
3. Start server and client in separate shells:
   - `cd server && npm run dev`
   - `cd client && npm run dev`
4. Open frontend (Next) — if Next uses a different port, follow the console log.
5. Quick smoke:
   - GET http://localhost:3001/api/health
   - GET http://localhost:3001/api/colleges
   - GET http://localhost:3001/api/stacks

---

## 8. Database migration to Postgres (short)

1. Backup server/career-copilot.db
2. Create target Postgres DB and user
3. Use server/migrate_sqlite_to_pg.js as described in server/MIGRATION_TO_POSTGRES.md
4. After data migration, update server/db.js to use Postgres (I can add a compatibility wrapper)

Note: Data migration script only copies data; you must change db layer in the app to use pg.

---

## 9. Tests & E2E

- There are no committed E2E tests. Recommended additions:
  - Playwright/Cypress scenario: register→login→create application→upload resume→connect IMAP (or mock)→simulate email classification.
  - Unit tests for services/manual.js rules and for db migrations.

---

## 10. Deployment recommendations

- Frontend: Vercel (Next-first). Configure rewrites to backend or use FRONTEND_URL to point to deployed backend.
- Backend: Railway / Render / self-hosted. Ensure environment variables are set and DATABASE_URL is configured for Postgres in production.
- File uploads: store resumes in a durable store (S3 or equivalent) and save file paths/URLs in DB. The current uploads/ folder is fine for single-instance deployments but not for horizontally scaled servers.

---

## 11. Troubleshooting

- Server exits with missing env var error: ensure JWT_SECRET, ENCRYPTION_KEY, CSRF_SECRET are set and long enough.
- Email features disabled: server logs if SMTP not configured.
- Admin routes refuse to start: check ADMIN_EMAIL, ADMIN_SECRET, ADMIN_PASSWORD_HASH.
- IMAP fetch fails: confirm IMAP credentials and allowlist server IP in provider (some providers block unknown hosts).

---

## 12. Next actions I can take for you (pick one)

- Add a Postgres adapter in server/db.js (compatibility layer) and commit it so the app can switch to Postgres with DATABASE_URL.
- Add a Playwright E2E test suite and a CI job to run it.
- Implement S3-backed resume storage and update resume.js to remove local disk reliance.

---

If this guide is missing any section you want expanded (detailed API examples, cURL snippets, or full file-level flow charts), tell me which piece and I will add it.
