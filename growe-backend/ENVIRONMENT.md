## GROWE backend environment profiles

This backend runs on **Node.js + Express + Postgres**. Configuration is driven entirely by
the `.env` file in this folder. Copy `./.env.example` to `./.env` and adjust values for
each environment.

### 1. Local development

- **Goal**: fast feedback on your machine, safe defaults.
- Recommended variables:

```bash
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://postgres:password@localhost:5432/growe
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug
```

Auth and AI:

- `JWT_SECRET`: any string **>= 32 characters** (do not use this value in production).
- `GOOGLE_CLIENT_ID`: optional, required only if you want Google login locally.
- `GROQ_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`: optional; set at least one to
  enable the AI assistant locally.

Email (pick **one** of these approaches):

1. **Resend HTTP API (simple, works without SMTP)**  
   - Set in `.env`:

   ```bash
   RESEND_API_KEY=re_xxx_from_dashboard
   RESEND_FROM=onboarding@resend.dev   # or an address on a verified domain
   ```

   - Leave `USE_RESEND_HTTP_API` unset or `0` (the backend will still prefer HTTP when
     `RESEND_API_KEY` is present).

2. **SMTP dev mailbox (MailDev)**  
   - Run from `growe-backend/`:

   ```bash
   npm run maildev
   ```

   - Then set:

   ```bash
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USER=
   SMTP_PASS=
   SMTP_SECURE=false
   SMTP_FROM="GROWE" <noreply@example.test>
   ```

   Open the MailDev UI (usually `http://localhost:1080`) to see outgoing messages.

3. **Resend SMTP**  
   - Use when you specifically want to test SMTP:

   ```bash
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=re_xxx_from_dashboard
   SMTP_SECURE=false
   SMTP_FROM="GROWE" <onboarding@resend.dev>
   ```

In development the backend will fall back to printing verification/reset links to the
API terminal when email delivery is misconfigured, so you can still test flows.

### 2. Pilot / small production

- **Goal**: small real deployment for a limited group of tutors + students.

Baseline settings:

```bash
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:password@db-host:5432/growe
FRONTEND_URL=https://app.your-domain.com
LOG_LEVEL=info
```

Required:

- `JWT_SECRET`: strong random string (>= 32 chars), **different** from development.
- A **real email provider**:
  - Either **Resend HTTP API**:

    ```bash
    RESEND_API_KEY=re_xxx_from_dashboard
    RESEND_FROM=noreply@your-verified-domain.com
    ```

  - Or a real **SMTP relay** (SendGrid, SES, Resend SMTP, etc.) using the examples in
    `.env.example`.
- `SMTP_FROM` / `RESEND_FROM` must be a sender that your provider has verified.

Safety toggles:

- `EMAIL_CONFIG_STRICT=1`: backend will refuse to start if email is clearly misconfigured
  (recommended for pilot and production).
- `FORCE_EMAIL_VERIFICATION=true`: new registrations fail if the verification email
  cannot be sent.

### 3. Notes on FRONTEND_URL

`FRONTEND_URL` must match the URL users actually open in their browser:

- Local dev: `http://localhost:5173`
- Pilot/production: e.g. `https://app.your-domain.com`

The backend uses this value to build **email verification** and **password reset** links.

