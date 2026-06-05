# 🚀 Career Copilot — AI-Powered Job Application Tracker

Personal job application tracking system with Gemini AI for email classification, resume matching, and interview prep.

## Features

- 🎯 Kanban board (drag-drop status updates)
- 🤖 AI email classification (paste email → auto-categorize)
- 📄 Resume vs JD matching (match score + skill gaps)
- 🎓 AI interview prep generator
- 📊 Analytics dashboard
- 🔮 Application status prediction
- 📧 Follow-up email generator
- 👑 Admin panel (CRUD users & all applications)
- 🧩 Chrome extension (scrape LinkedIn/Naukri/Glassdoor)

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, Tailwind CSS 4 |
| Backend | Express 5, better-sqlite3 |
| AI | Google Gemini 1.5 Flash |
| Extension | Chrome Manifest V3 |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Quick Start

### 1. Get Gemini API Key
- Go to https://aistudio.google.com/apikey
- Create an API key

### 2. Install & Run

```bash
cd Career-Copilot

# Install all dependencies
cd server && npm install && cd ../client && npm install && cd ..

# Configure environment
# Edit server/.env and add your GEMINI_API_KEY

# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

### 3. Open
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### 4. First User = Admin
The first account you register becomes the admin with access to the Admin panel.

---

## Deployment

### Backend → Railway
1. Push to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Add environment variables: `JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`
5. Deploy

### Frontend → Vercel
1. Go to https://vercel.com
2. Import from GitHub (point to `client/` folder)
3. Set root directory to `client`
4. Add environment variable: In `next.config.mjs`, update the rewrite destination to your Railway URL

---

## Chrome Extension Setup
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Navigate to a job listing on LinkedIn/Naukri/Glassdoor
5. Click the extension → Extract → Save

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |

### Applications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/applications | List (with filters) |
| POST | /api/applications | Create |
| PUT | /api/applications/:id | Update |
| DELETE | /api/applications/:id | Delete |
| GET | /api/applications/:id/predict | AI status prediction |
| GET | /api/applications/:id/follow-up | AI follow-up email |

### Email AI
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/emails/classify | Classify pasted email |
| GET | /api/emails | Email history |

### Resume
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/resumes/upload | Upload PDF |
| POST | /api/resumes/match | Match vs JD |
| GET | /api/resumes | List resumes |

### Interview
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/interview/generate | Generate prep |
| GET | /api/interview | History |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics | Dashboard stats |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/stats | Platform stats |
| GET | /api/admin/users | All users |
| POST | /api/admin/users | Create user |
| PUT | /api/admin/users/:id | Update user |
| DELETE | /api/admin/users/:id | Delete user + data |
| GET | /api/admin/applications | All apps |
| PUT | /api/admin/applications/:id | Update any app |
| DELETE | /api/admin/applications/:id | Delete any app |

### Chrome Extension
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/extension/job | Save scraped job |

---

## Environment Variables

```env
PORT=3001
JWT_SECRET=change-this-to-random-string
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:3000
```
