# 🚀 Career Copilot — Job Application Tracker

This repository contains a full-stack job application tracker with an Express backend, a Next.js frontend, and an optional Chrome extension for quick job saving. The app includes email automation (IMAP fetch), resume parsing, interview-prep generation, analytics and an admin panel.

This README has been rewritten to match the current repository layout and developer workflow.

---

## Quick overview

- Backend: server/ — Node.js + Express, exposes a REST API under /api
- Frontend: client/ — Next.js 15 (App Router)
- DB: SQLite (better-sqlite3) stored at server/career-copilot.db
- Scheduler: node-cron for periodic email fetches
- Extension: extension/ — Chrome Manifest V3 helper that posts jobs to the API

---

## Run locally (developer flow)

1) Install all dependencies (root helper):

```bash
npm run install:all
```

2) Create server/.env with required values (minimal example):

```
PORT=3001
JWT_SECRET=<32+ chars random>
ENCRYPTION_KEY=<32+ chars random>
CSRF_SECRET=<32+ chars random>
FRONTEND_URL=http://localhost:3000
# Admin (required for admin routes)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<bcrypt-hash>
ADMIN_SECRET=<admin-secret>
# Optional (email + AI)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=<smtp-password>
GEMINI_API_KEY=<optional>
```

3) Start services:

- Backend (dev reload):
  cd server && npm run dev
- Frontend (Next):
  cd client && npm run dev

Notes:
- Next may pick a different port if 3000 is occupied (the dev server will log the chosen port).
- The root package.json provides convenience scripts (install:all, dev, build, start).

---

## Required environment variables (short)

- JWT_SECRET (required, 32+ chars)
- ENCRYPTION_KEY (required, 32+ chars)
- CSRF_SECRET (required, 32+ chars)
- FRONTEND_URL
- ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_SECRET (required to enable admin routes)
- SMTP_* (optional — enables outgoing emails)
- GEMINI_API_KEY (optional — enables AI features)

Important: The server validates presence/strength of certain env vars at startup and will exit if they are missing or too short.

To generate an ADMIN_PASSWORD_HASH (bcrypt):

```bash
cd server
node -e "console.log(require('bcryptjs').hashSync('your-admin-password',12))"
```

Copy the printed value to ADMIN_PASSWORD_HASH.

---

## Architecture & important internals

- Authentication: JWT tokens are issued as httpOnly cookies on register/login; middleware verifies tokens for protected routes.
- Database: server/db.js creates schema, seeds colleges & stacks, runs safe migrations automatically.
- Email automation: users can add IMAP accounts; a scheduler (every 30 minutes) fetches recent emails and classifies them (AI → manual rules), then updates or creates application records.
- Admin: admin routes are protected by a separate admin login (email + password + secret_key). Admin config is enabled only when ADMIN_* env vars are present.
- Extension: POST /api/extension/job accepts JSON from the Chrome extension (requires auth + CSRF) and performs duplicate checks, status history insert and a follow-up reminder by default.

---

## Public API quick checks (smoke)

- GET /api/health → { status: 'ok' }
- GET /api/colleges → seeded list
- GET /api/stacks → seeded list

---

## Development notes & recommendations

- Add E2E tests (Playwright or Cypress) for register → login → create application → upload resume flow.
- Consider adding docker-compose for reproducible local dev (SQLite + env file + ports).
- The server logs warnings when SMTP or AI keys are not configured; features gracefully degrade where possible.
- Ensure ADMIN_* env vars are securely provisioned in production; prefer ADMIN_PASSWORD_HASH over plaintext password.

---

## Contributing

1. Fork → branch → PR against main
2. Describe changes and update README if architecture or setup changed

---

If anything above needs different wording or you want diagrams (ASCII or mermaid), tell me which sections to expand and I will update the README accordingly.
