
# GROWE - Academic Collaboration Platform

Production-grade academic collaboration system for university students: peer learning, tutoring, assignment management, and real-time group meetings.

## Quick start (share this repo)

1. Install [Node.js 18+](https://nodejs.org/) and [PostgreSQL](https://www.postgresql.org/), then create a database: `createdb growe`
2. From the **repo root**: `npm run setup`
3. Copy `growe-backend/.env.example` → `growe-backend/.env` and set at least **`DATABASE_URL`** and **`JWT_SECRET`** (long random string)
4. `npm run migrate` then `npm run db:seed` (optional; adds default admin user)
5. `npm run dev` → open **http://localhost:5173** (API on **http://localhost:5001**)

Optional: `npm run dev:lan` to expose the Vite UI on your LAN (same machine must reach the API; adjust firewall if needed).

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL, JWT, bcrypt, Socket.IO
- **Frontend:** React, Tailwind CSS, Axios, Socket.IO client, WebRTC

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running; create database with `createdb growe`)

## Setup

### 1. Database

```bash
createdb growe
```

### 2. Backend

```bash
cd growe-backend
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET; optional PORT, FRONTEND_URL, NODE_ENV
npm install
npm run migrate
npm run seed
npm run dev
```

Backend default: http://localhost:5001 (or `PORT` from `.env`).

### 3. Frontend

```bash
cd growe-frontend
npm install
npm run dev
```

Frontend: http://localhost:5173. Set Vite proxy target to your backend port if different.

### 4. Default Admin

After seeds: **admin@growe.edu*** / **admin123**

## Auth: Email verification + Google sign-in

### Email verification (SMTP)

Set these in `growe-backend/.env`:

- `FRONTEND_URL=http://localhost:5173`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`
- Optional: `VERIFICATION_TOKEN_EXPIRY_MINUTES=60` (15–1440)

Notes:

- In **development**, registration returns success even if SMTP is not configured; however, if `SMTP_USER` is set (or `FORCE_EMAIL_VERIFICATION=1`), registration will fail with `503` when email sending fails.
- If you request a new verification email, older links become invalid.

### Google sign-in / sign-up

You must configure **both** frontend and backend to use the same Google OAuth Client ID.

Frontend (`growe-frontend/.env`):

- `VITE_GOOGLE_CLIENT_ID=...`

Backend (`growe-backend/.env`):

- `GOOGLE_CLIENT_ID=...`

If Google shows **“Access Denied”**:

- In Google Cloud Console → OAuth consent screen:
  - If the app is in **Testing**, add your Google account email under **Test users**.
- In Google Cloud Console → Credentials → your OAuth 2.0 Client:
  - Add **Authorized JavaScript origins** for your dev URL(s), e.g. `http://localhost:5173` and `http://127.0.0.1:5173`.
- Make sure the `clientId` used by the frontend matches `GOOGLE_CLIENT_ID` on the backend (ID token audience must match).

## Production

- Set `NODE_ENV=production`.
- Ensure `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` are set.
- Health check: `GET /api/health` (returns DB status).
- Graceful shutdown on SIGTERM/SIGINT.

## Docker (optional)

From repo root:

```bash
docker compose up -d
```

Requires `growe-backend/.env` and a running PostgreSQL (or use a `db` service in `docker-compose.yml`). See `growe-backend/Dockerfile` and `growe-frontend/Dockerfile` for build args.

## API Overview

| Area | Examples |
|------|----------|
| Auth | POST /api/auth/register, login, GET verify-email, POST resend-verification |
| Groups | GET/POST /api/groups, join-request, approve |
| Assignments | CRUD /api/assignments |
| Tutors | GET /api/tutors/list, slots; tutor profile & availability |
| Bookings | POST /api/bookings, list, cancel, status |
| Meetings | GET/POST /api/meetings, WebRTC via Socket.IO |
| Messaging | GET /api/conversations, POST /conversations/direct/:userId, GET /conversations/:id/messages, Socket: join-conversation, send-message, typing, mark-as-read |
| Users | GET /api/users/search?q=&limit=&page= (verified + active; excludes self; Teams-style discovery) |
| Admin | GET /api/admin/metrics, users, audit-log; PATCH users; suspend/terminate |

## Architecture

### Primary API (production path)

- **React (`growe-frontend`)** proxies `/api` to **Node (`growe-backend`)** on port **5001** (see `growe-frontend/vite.config.js`).
- **JSON envelope (Node):** Successful JSON responses are normalized to `{ success: true, message: 'OK', data }` via `apiEnvelope` middleware (skipped for `/api/health` and `/api/csrf-token`). The Axios client unwraps `data` so most UI code still receives the inner payload. Errors use `{ success: false, error, ... }` when applicable.
- **Identity:** authenticated user comes from JWT + refresh cookie; core actions require **verified** users where enforced by middleware and sockets.
- **Direct messaging:** Verified users can start DMs with other **active + verified** users (Teams-like). Admins can message any **active** user for admin flows.
- **Laravel (`growe-backend-laravel-app`):** optional parallel implementation; the Vite dev app does **not** call Laravel by default. Use one stack in production to avoid drift.

### Modules

- **MVC** + service layer; centralized error handling and logging
- **RBAC:** Admin, Tutor, Student; verified-user middleware
- **Email verification:** Token-based, resend with rate limit
- **Booking:** Transactional overlap checks, indexes for performance
- **Meetings:** WebRTC mesh + Socket.IO signaling; admin force-terminate
- **Audit:** Admin actions logged to `audit_log`

### End-to-end smoke (dev)

1. Register / Google login → verified user
2. `GET /api/users/search?q=test` → list users
3. Messages → new message → direct chat (policy may require shared group/booking)
4. Groups → create → invite / member search → add member
5. Tutors → availability → schedule meeting from group
6. Meeting room → join with second user (WebRTC)
