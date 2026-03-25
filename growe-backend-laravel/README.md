## Growe Backend (Laravel)

This folder contains the **Laravel rewrite** of the existing `growe-backend` (Node/Express) API, designed to keep **all current functionality intact**:

- Same REST paths (all under `/api/*`)
- Same auth header: `Authorization: Bearer <jwt>`
- Same CSRF behavior (double-submit cookie + `x-csrf-token` header)
- Same PostgreSQL schema (UUID keys, existing tables/columns)
- Socket.io **stays** as a separate Node service (realtime not migrated to Laravel)

### Why this folder isn’t “installed” yet

This environment doesn’t have Composer available, so dependencies are not installed here.
You will run the install steps on your machine/server.

### Install / bootstrap (local or server)

1) Create a fresh Laravel app (latest) and copy these files over:

```bash
composer create-project laravel/laravel growe-backend-laravel
```

2) Add required packages:

```bash
cd growe-backend-laravel
composer require tymon/jwt-auth
php artisan vendor:publish --provider="Tymon\\JWTAuth\\Providers\\LaravelServiceProvider"
php artisan jwt:secret
```

3) Configure environment.

Copy `.env.example` to `.env` and set values to match your existing Express backend:

- `DB_*` for PostgreSQL
- `JWT_SECRET` (must match Node’s `JWT_SECRET` if you want tokens to remain valid across cutover)
- `CSRF_SECRET` (or it will fall back to `JWT_SECRET`)
- `FRONTEND_URL`, SMTP, AI keys

4) Serving uploads

Your API returns avatar URLs like `/uploads/avatars/<file>`.
Place files in `public/uploads/avatars/` (or symlink there) to keep paths identical.

5) Don’t re-run migrations on the existing DB

Migrations are included to document and support **fresh environments**, but your production DB already has these tables.
If you point Laravel at the existing DB, do **not** run `php artisan migrate` unless you are sure migrations match state and are idempotent for your schema.

6) Scheduler (booking reminders)

Enable Laravel scheduler on your server:

```bash
* * * * * php /path/to/growe-backend-laravel/artisan schedule:run >> /dev/null 2>&1
```

The scheduler is configured to run the booking reminder command every 15 minutes.

### Socket.io remains in Node

Keep running your existing Socket.io server (from `growe-backend/server.js` or extracted into a standalone service).
It should keep using:

- the same PostgreSQL database
- the same `JWT_SECRET`
- the same `FRONTEND_URL` CORS origin

