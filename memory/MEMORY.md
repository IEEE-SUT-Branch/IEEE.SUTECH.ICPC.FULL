# IEEE ICPC-ECPC.HUB — Project Memory

## Stack

- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4 + Axios + Monaco Editor
- **Backend**: Node.js + Express 4 + MongoDB (Mongoose) + JWT + Socket.io
- **Deployment**: Vercel (serverless via `api/index.js`)

## Key Paths

- `Frontend/src/api.js` — Centralized Axios instance (JWT interceptor + auto-refresh)
- `Frontend/src/App.jsx` — Routes + ProtectedRoute (reads `localStorage.currentUser`)
- `Frontend/src/components/TimeContext.jsx` — Contest timer context (all admin contest control)
- `Backend/src/app.js` — Express app (CORS, routes)
- `Backend/src/config/env.js` — Env var parsing
- `Backend/src/socket/index.js` — Socket.io (not available on Vercel serverless)

## Auth Pattern

- JWT stored in `localStorage`:  `accessToken`, `refreshToken`, `currentUser` (JSON)
- `api.js` auto-attaches Bearer token on every request
- On 401 → auto-refreshes token → retries original request
- On refresh failure → clears storage → redirects to `/login`

## UI Design System (Applied 2026-03-12)

- **Font**: Space Grotesk (loaded via Google Fonts in `index.html`)
- **Icons**: Material Symbols Outlined (loaded via Google Fonts), supplemented by lucide-react
- **Primary color**: `#006199`
- **Background**: `#f5f7f8`
- **Icon usage**: `<span className="material-symbols-outlined">icon_name</span>`
- **Style approach**: Inline styles with JavaScript objects (for color compatibility)

## Routes

| Path | Component | Role |
|------|-----------|------|
| `/login` | Login | none |
| `/lobby` | Lobby | student |
| `/arena` | Arena | student |
| `/admin/dashboard` | AdminDashboard | admin |
| `/admin/problems` | AdminProblems | admin |
| `/admin/monitoring` | AdminMonitoring (**NEW**) | admin |
| `/admin/standings` | AdminStandings (**NEW**) | admin |
| `/admin/addtime` | AdminTime | admin |
| `/addproblem` | AddProblem | admin |

## New Pages (2026-03-12)

- **AdminMonitoring** — Lab monitoring grid with student cards, anti-cheat live feed, warn/penalize/disqualify actions
  - API: `GET /api/monitor/students`, `GET /api/monitor/overview`, `POST /api/monitor/warn/:id`, etc.
- **AdminStandings** — Live ICPC standings table (moved from AdminDashboard), with filters, pagination, difficulty analysis
  - API: `GET /api/standings`, `GET /api/standings/export`

## Fixes Applied (2026-03-12)

1. `Frontend/.env` created — `VITE_API_URL=https://sutech-ecpc-platform.vercel.app/api`
2. `Frontend/.env.local.example` added for local dev (`http://localhost:3000/api`)
3. `api.js` — uses `import.meta.env.VITE_API_URL` instead of hardcoded URL
4. `vite.config.js` — added `server.proxy` mapping `/api` → `http://localhost:3000`
5. `ArenaHeader.jsx` — fixed `localStorage.getItem('student')` → `'currentUser'`
6. `AdminDashboard.jsx`, `AdminProblems.jsx`, `AddProblem.jsx`, `TimeContext.jsx` — all migrated from raw `fetch()` to centralized `api`
7. `Backend/.env` — `CORS_ORIGIN` updated
8. Complete UI redesign applied across all components (Space Grotesk font, #006199 primary, Material Symbols icons)

## Known Remaining Issues

- Socket.io not available on Vercel (no client code either — real-time features degrade gracefully)
- `Backend/.env` committed with real credentials (MongoDB, SMTP, webhooks)
- Admin seed credentials are weak (`admin` / `admin123`)
