
# GROWE - Academic Collaboration Platform

Production-grade academic collaboration system for university students: peer learning, tutoring, assignment management, and real-time group meetings.

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

Backend default: http://localhost:5000 (or `PORT` from `.env`).

### 3. Frontend

```bash
cd growe-frontend
npm install
npm run dev
```

Frontend: http://localhost:5173. Set Vite proxy target to your backend port if different.

### 4. Default Admin

After seeds: **admin@growe.edu** / **admin123**

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
| Admin | GET /api/admin/metrics, users, audit-log; PATCH users; suspend/terminate |

## Architecture

- **MVC** + service layer; centralized error handling and logging
- **RBAC:** Admin, Tutor, Student; verified-user middleware
- **Email verification:** Token-based, resend with rate limit; optional dev auto-verify
- **Booking:** Transactional overlap checks, indexes for performance
- **Meetings:** WebRTC mesh + Socket.IO signaling; admin force-terminate
- **Audit:** Admin actions logged to `audit_log`
>>>>>>> d31f3dd (Add .gitignore and remove node_modules from tracking)
