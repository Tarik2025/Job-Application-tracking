# 🚀 Career Copilot — AI-Powered Job Application Tracker

A full-stack personal job application tracking system with Gemini AI for email classification, resume matching, interview prep, and intelligent automation.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Architecture & Data Flow](#architecture--data-flow)
- [API Reference](#api-reference)
- [Email Automation](#email-automation)
- [AI Services](#ai-services)
- [Chrome Extension](#chrome-extension)
- [Admin Panel](#admin-panel)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [Future Development Roadmap](#future-development-roadmap)
- [Contributing](#contributing)

---

## Features

### Core
- 📋 **Kanban Board** — Drag-and-drop applications across 6 statuses (Applied → Under Review → Interview → Offer → Rejected → Withdrawn)
- 📊 **Table View** — Sortable, searchable, paginated list with inline editing (status, priority)
- ➕ **CRUD Operations** — Create, read, update, delete applications with full field support
- 🏷️ **Tags & Priority** — Organize with custom tags and priority levels (low/medium/high)

### AI-Powered
- 📧 **Email Classification** — Paste or auto-fetch emails → AI categorizes as application_received, interview, rejection, offer, follow_up
- 📄 **Resume vs JD Matching** — Upload PDF resume → compare against job descriptions → get match score & skill gaps
- 🎓 **Interview Prep Generator** — AI generates tailored questions, 5-day study plan, and company insights
- 🔮 **Status Prediction** — AI predicts if application is active, cold, or likely rejected based on days elapsed
- 📝 **Follow-up Email Generator** — AI drafts professional follow-up emails for each application

### Automation
- 🤖 **Auto Email Fetch** — Connects to Gmail/Outlook via IMAP, fetches every 30 minutes
- 🔄 **Auto Application Updates** — Classifies emails and automatically updates application status
- 📨 **Auto Application Creation** — Creates new applications from job-related emails
- 📜 **Status History** — Every status change is logged with timestamps

### Analytics & Intelligence
- 📈 **Dashboard Analytics** — Response rates, interview rates, offer rates, monthly trends
- 🏢 **Company Analytics** — Per-company performance (response time, success rate)
- 💰 **Salary Insights** — Expected vs offered salary tracking
- 📊 **Skills Gap Analysis** — Identifies in-demand skills from your job descriptions
- 🔥 **Streak Tracking** — Daily application streak with longest streak record

### Organization
- 🔔 **Reminders** — Set reminders with auto-created 7-day follow-up on new applications
- 📅 **Interview Calendar** — Schedule interviews, track rounds, record outcomes
- 🚫 **Company Blacklist** — Auto-suggests ghosting companies (30+ days no response)
- 🎯 **Goals** — Set daily/weekly/monthly application targets with progress tracking
- 📜 **Activity Feed** — Complete timeline of all actions

### Admin
- 👑 **Admin Panel** — Separate admin login with secret key authentication
- 👥 **User Management** — CRUD users, activate/deactivate, view all applications
- 📋 **Global Application View** — See and manage all users' applications
- 📊 **Platform Statistics** — Total users, applications, emails, resumes

### Extension
- 🧩 **Chrome Extension** — Scrape job listings from LinkedIn, Naukri, Glassdoor directly into the tracker

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 19 | App Router, SSR, client components |
| **Styling** | Tailwind CSS 4, CSS Variables | Theming (dark/light), responsive design |
| **Animations** | Framer Motion | Page transitions, layout animations |
| **Icons** | Lucide React | UI icons |
| **Backend** | Express 5, Node.js | REST API server |
| **Database** | better-sqlite3 (SQLite) | Embedded database, WAL mode |
| **AI** | Google Gemini 2.0 Flash | Email classification, resume matching, interview prep |
| **Email** | nodemailer (SMTP), imap (IMAP) | Send reset emails, fetch inbox |
| **Auth** | JWT, bcryptjs | Token-based auth with httpOnly cookies |
| **PDF** | pdf-parse | Resume text extraction |
| **Scheduling** | node-cron | Auto email fetch every 30 min |
| **Extension** | Chrome Manifest V3 | Job scraping from portals |
| **Deploy** | Vercel (frontend), Railway (backend) | Production hosting |

---

## Project Structure

```
Career-Copilot/
├── client/                     # Next.js 15 Frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.js        # Landing page
│   │   │   ├── login/         # Login page
│   │   │   ├── signup/        # Multi-step registration (4 steps)
│   │   │   ├── dashboard/     # Main dashboard (all features)
│   │   │   ├── profile/       # User profile management
│   │   │   ├── admin/         # Standalone admin page
│   │   │   ├── forgot-password/
│   │   │   ├── layout.js      # Root layout with theme provider
│   │   │   └── globals.css    # CSS variables, utility classes
│   │   ├── components/
│   │   │   ├── ui/index.js    # Reusable UI components (Button, Modal, Input, etc.)
│   │   │   ├── KanbanBoard.js # Kanban + Table view with CRUD
│   │   │   ├── AddApplication.js # New application form
│   │   │   ├── EmailClassifier.js # Email accounts, fetch, classify
│   │   │   ├── ResumeMatch.js # Resume upload & JD matching
│   │   │   ├── InterviewPrep.js # AI interview prep generator
│   │   │   ├── InterviewCalendar.js # Schedule & track interviews
│   │   │   ├── Analytics.js   # Charts, stats, company analysis
│   │   │   ├── StreakGoals.js # Streak, goals, blacklist, skills gap
│   │   │   ├── Reminders.js   # Reminder management
│   │   │   ├── ActivityFeed.js # Activity timeline
│   │   │   └── AdminPanel.js  # Admin with login gate
│   │   └── lib/
│   │       ├── api.js         # All API calls (single source of truth)
│   │       └── theme.js       # Dark/light theme provider
│   ├── package.json
│   ├── next.config.mjs        # API rewrites to backend
│   ├── postcss.config.mjs
│   └── jsconfig.json          # Path aliases (@/components, @/lib)
│
├── server/                     # Express 5 Backend
│   ├── index.js               # Server entry point, middleware, routes
│   ├── db.js                  # SQLite schema, migrations, seed data
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Register, login, logout, password reset
│   │   ├── applications.js    # CRUD, bulk ops, tags, reminders, AI predict
│   │   ├── emails.js          # Email accounts, fetch, classify
│   │   ├── resume.js          # Upload, parse PDF, match vs JD
│   │   ├── interview.js       # Generate interview prep
│   │   ├── analytics.js       # Dashboard stats, company analytics
│   │   ├── advanced.js        # Streak, goals, blacklist, interviews, docs
│   │   ├── admin.js           # Admin CRUD with separate auth
│   │   ├── colleges.js        # College search/add
│   │   ├── stacks.js          # Tech stack management
│   │   └── search.js          # Global search
│   ├── services/
│   │   ├── gemini.js          # AI wrapper (Gemini API + manual fallback)
│   │   ├── manual.js          # Rule-based fallback (no AI needed)
│   │   ├── emailFetcher.js    # IMAP email fetching & auto-classification
│   │   ├── scheduler.js       # Cron job for auto email fetch
│   │   └── mail.js            # SMTP email sender (nodemailer)
│   ├── utils/
│   │   └── pagination.js      # Pagination & sort helpers
│   ├── uploads/               # Uploaded resume files
│   ├── .env                   # Environment variables (not in git)
│   └── package.json
│
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js             # Scrapes job details from portals
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Popup logic
│
├── .gitignore
├── package.json               # Root package.json
├── railway.toml               # Railway deployment config
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key (free at https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/Tarik2025/Job-Application-tracking.git
cd Job-Application-tracking

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

Create `server/.env`:

```env
PORT=3001
JWT_SECRET=your-random-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:3000

# Gmail SMTP (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### 3. Run

```bash
# Terminal 1 — Backend (port 3001)
cd server && npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm run dev
```

### 4. First Use
1. Open http://localhost:3000
2. Register your first account → automatically becomes admin
3. Go to Email AI → Connect your Gmail with app password for automation

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Backend server port | Yes (default: 3001) |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Yes (fallback: manual rules) |
| `FRONTEND_URL` | Frontend URL for CORS & email links | Yes |
| `SMTP_HOST` | SMTP server for sending emails | Optional |
| `SMTP_PORT` | SMTP port (587 for Gmail) | Optional |
| `SMTP_USER` | Email address for sending | Optional |
| `SMTP_PASS` | Gmail 16-char app password | Optional |

**Getting Gmail App Password:**
1. Enable 2FA at https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords
3. Create app password → use in `SMTP_PASS`

---

## Architecture & Data Flow

### Authentication Flow
```
User → POST /auth/register → bcrypt hash → SQLite → JWT cookie → Dashboard
User → POST /auth/login → verify password → JWT cookie (7 day expiry)
Admin → POST /admin/login → email + password + secret_key → admin_token cookie
```

### Email Automation Flow
```
1. User connects email account (IMAP credentials stored in DB)
2. Scheduler runs every 30 minutes (node-cron)
3. IMAP fetches last 7 days of emails (max 50)
4. Filter: only job-related keywords pass
5. Dedup: skip if subject+date already processed
6. Classify: Gemini AI (or manual fallback) extracts company, role, status
7. Match: find existing application by company name
8. Update: change application status + log history
9. Or Create: new application if no match found
```

### AI Classification Logic
```
Priority: Gemini AI → Manual keyword rules (always works offline)

Manual rules detect:
- "offer letter", "pleased to offer" → offer
- "interview", "schedule", "round" → interview_invitation
- "regret", "unfortunately", "not moving forward" → rejection
- "in queue", "thank you for applying", "shortlisted" → application_received
- "follow up", "checking in" → follow_up
```

### Frontend Routing
```
/              → Landing page (public)
/login         → Login
/signup        → 4-step registration
/dashboard     → Main app (all tabs via sidebar)
/profile       → User profile
/forgot-password → Password reset
/admin         → Standalone admin page
```

---

## API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create account (first user = admin) |
| POST | `/login` | Login with email/password |
| POST | `/logout` | Clear auth cookie |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update profile |
| DELETE | `/me` | Delete account (requires password) |
| PUT | `/change-password` | Change password |
| POST | `/forgot-password` | Send reset email |
| POST | `/reset-password` | Reset with token |

### Applications (`/api/applications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List (paginated, filtered, sorted) |
| GET | `/:id` | Get single with history, tags, reminders |
| POST | `/` | Create (duplicate check included) |
| PUT | `/:id` | Update (status history auto-logged) |
| DELETE | `/:id` | Delete |
| PATCH | `/bulk/status` | Bulk status update |
| POST | `/bulk/delete` | Bulk delete |
| GET | `/:id/predict` | AI status prediction |
| GET | `/:id/follow-up` | AI follow-up email |
| GET | `/export` | Export as CSV |
| GET | `/report/weekly` | Weekly report stats |
| GET | `/companies/stats` | Per-company analytics |

**Query params for GET /:**
- `page`, `limit` — pagination
- `sort_by`, `sort_order` — sorting
- `status`, `company`, `platform`, `priority`, `work_mode` — filters
- `search` — full-text search (company, role, location, notes)
- `tag` — filter by tag name
- `days_min`, `days_max` — filter by days since applied

### Emails (`/api/emails`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List classified emails |
| POST | `/classify` | Manual classify (auto-creates/updates app) |
| GET | `/accounts` | List connected accounts |
| POST | `/accounts` | Connect email account |
| DELETE | `/accounts/:id` | Remove account |
| POST | `/fetch` | Trigger manual fetch |

### Resume (`/api/resumes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List uploaded resumes |
| POST | `/upload` | Upload PDF resume |
| POST | `/match` | Match resume vs JD |

### Interview (`/api/interview`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Interview prep history |
| POST | `/generate` | Generate prep plan |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Full analytics dashboard |
| GET | `/companies` | Company-level analytics |
| GET | `/timeline` | Application timeline |

### Advanced (`/api/advanced`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/streak` | Current & longest streak |
| GET/POST/DELETE | `/goals` | CRUD goals |
| GET/POST/DELETE | `/blacklist` | Company blacklist |
| GET | `/blacklist/suggest` | Auto-suggest ghosted companies |
| GET/POST/PUT | `/interviews` | Interview scheduling |
| GET/POST/DELETE | `/documents` | Document management |
| GET | `/activity` | Activity feed (paginated) |
| GET | `/salary` | Salary insights |
| GET | `/skills-gap` | Skills demand analysis |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Admin login (email + password + secret_key) |
| GET | `/stats` | Platform overview stats |
| GET/POST/PUT/DELETE | `/users` | User CRUD |
| PATCH | `/users/:id/toggle` | Activate/deactivate user |
| GET/PUT/DELETE | `/applications` | All applications |
| GET | `/audit` | Audit log |
| GET | `/emails` | All emails |
| GET | `/search` | Global search |

---

## Email Automation

### How It Works
1. User connects Gmail via **App Password** (not regular password)
2. System stores IMAP credentials in `email_accounts` table
3. `node-cron` scheduler runs `fetchAllAccounts()` every 30 minutes
4. For each account: connects via IMAP → fetches last 7 days → max 50 emails
5. Filters using job-related keywords (application, interview, offer, reject, etc.)
6. Deduplicates by subject + date
7. Classifies using Gemini AI (falls back to keyword matching)
8. Auto-creates or updates applications based on classification

### Manual Classification
Users can also paste email content directly → same classification pipeline → auto-creates/updates applications.

### Supported Providers
- Gmail (imap.gmail.com)
- Outlook (imap-mail.outlook.com)
- Yahoo (imap.yahoo.com)

---

## AI Services

### Gemini AI (Primary)
- Model: `gemini-2.0-flash`
- Used for: email classification, resume matching, interview prep, status prediction, follow-up generation
- Falls back to manual rules if API fails or key not provided

### Manual Fallback (Always Available)
Located in `server/services/manual.js`:
- **Email Classification** — Keyword-based pattern matching with confidence scoring
- **Resume Matching** — Skill taxonomy matching (200+ skills), experience extraction, education detection
- **Interview Prep** — Role-specific questions (frontend, backend, fullstack, data, devops)
- **Status Prediction** — Time-based heuristics (5d = active, 14d = active, 28d = cold, 30d+ = likely rejected)
- **Follow-up Generator** — Template-based professional emails

### Skill Taxonomy
The system recognizes 200+ skills across categories:
- Languages, Frontend, Backend, Database, Cloud, DevOps, Mobile, AI/ML, Tools, Concepts

---

## Chrome Extension

### Setup
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Navigate to a job listing on LinkedIn/Naukri/Glassdoor

### Usage
1. Click the extension icon on a job page
2. It extracts: company, role, platform, job URL, description, location
3. Click "Save" → creates application in your tracker
4. Requires: Login token (set in extension settings)

### Supported Portals
- LinkedIn Jobs
- Naukri.com
- Glassdoor

---

## Admin Panel

### Access
- **Email:** smdtarik1244@gmail.com
- **Password:** Apple@2302
- **Secret Key:** 2302

### Features
- Platform statistics (users, apps, emails, resumes)
- User management (create, edit, activate/deactivate, delete)
- Application oversight (view all, change status, delete)
- Audit log (all actions tracked)
- Global search across users, applications, emails

---

## Deployment

### Backend → Railway

1. Push code to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Set root directory to `/server`
4. Add environment variables: `JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`, `SMTP_*`
5. Deploy — Railway auto-detects Node.js

`railway.toml` is already configured.

### Frontend → Vercel

1. Go to https://vercel.com → Import from GitHub
2. Set root directory to `client`
3. Framework: Next.js (auto-detected)
4. Update `client/next.config.mjs` rewrite destination to Railway URL:
   ```js
   rewrites: () => [{ source: '/api/:path*', destination: 'https://your-railway-url.up.railway.app/api/:path*' }]
   ```
5. Deploy

---

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User accounts with full profile |
| `applications` | Job applications (company, role, status, etc.) |
| `status_history` | Every status change logged |
| `emails` | Classified emails |
| `email_accounts` | Connected IMAP accounts |
| `resumes` | Uploaded resume data |
| `interview_prep` | Generated prep plans |

### Organization Tables
| Table | Purpose |
|-------|---------|
| `tags` | Custom user tags |
| `application_tags` | Many-to-many tag assignments |
| `notes_history` | Notes per application |
| `reminders` | Scheduled reminders |
| `interviews` | Interview schedule & outcomes |
| `documents` | Cover letters, offer letters, etc. |

### Intelligence Tables
| Table | Purpose |
|-------|---------|
| `blacklist` | Blocked companies |
| `goals` | Application goals (daily/weekly/monthly) |
| `activity_feed` | All user actions timeline |
| `audit_log` | System-wide audit trail |

### Reference Tables
| Table | Purpose |
|-------|---------|
| `colleges` | Searchable college list (auto-grows) |
| `stacks` | Tech stack options |
| `user_stacks` | User-stack associations |
| `follow_ups` | Scheduled follow-up messages |

---

## Future Development Roadmap

### High Priority
- [ ] **Real-time notifications** — WebSocket push when email auto-classifies
- [ ] **Multi-resume support** — Switch between resumes for different roles
- [ ] **Application timeline visualization** — Visual journey per application
- [ ] **Email templates** — Custom templates for follow-ups, thank-you notes
- [ ] **Mobile responsive** — Optimize for mobile views
- [ ] **Bulk import** — Import applications from CSV/Excel

### Medium Priority
- [ ] **OAuth for email** — Google OAuth instead of app passwords (more secure)
- [ ] **Collaborative features** — Share applications with mentors/friends
- [ ] **AI cover letter generator** — Generate cover letters from resume + JD
- [ ] **Company research** — Auto-fetch Glassdoor reviews, tech blog links
- [ ] **Networking tracker** — Track referrals, contacts, coffee chats
- [ ] **Application scoring** — AI rates your fit before you apply
- [ ] **Dashboard widgets** — Customizable dashboard layout
- [ ] **Dark/light per-component** — More theme customization

### Low Priority / Nice-to-Have
- [ ] **Browser notifications** — Desktop push for reminders
- [ ] **Telegram/Discord bot** — Get updates via messaging
- [ ] **AI mock interviews** — Practice with AI interviewer
- [ ] **Resume builder** — Build ATS-friendly resumes in-app
- [ ] **Job recommendation engine** — Suggest jobs based on profile
- [ ] **Offer comparison tool** — Side-by-side offer analysis
- [ ] **Calendar integration** — Google Calendar / Outlook sync for interviews
- [ ] **Multi-language support** — i18n
- [ ] **PWA support** — Installable as mobile app
- [ ] **GraphQL API** — Alternative to REST for flexible queries

### Infrastructure
- [ ] **PostgreSQL migration** — For production scalability
- [ ] **Redis caching** — Cache analytics, reduce DB load
- [ ] **Rate limiting** — Protect API from abuse
- [ ] **E2E tests** — Playwright/Cypress test suite
- [ ] **CI/CD pipeline** — GitHub Actions for lint, test, deploy
- [ ] **Docker support** — Containerized deployment
- [ ] **API versioning** — v1/v2 support for breaking changes
- [ ] **Monitoring** — Error tracking (Sentry), uptime monitoring

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style
- Frontend: React functional components, hooks only
- Backend: ES modules (import/export), async/await
- CSS: Tailwind utility classes + CSS variables for theming
- Naming: camelCase for JS, kebab-case for CSS classes

---

## License

MIT — free to use, modify, and distribute.

---

Built with ❤️ by [Tarik2025](https://github.com/Tarik2025)
