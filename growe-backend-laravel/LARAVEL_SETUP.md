## Growe Laravel setup (keep frontend + Socket.io unchanged)

### 1) Create Laravel (latest)

```bash
composer create-project laravel/laravel growe-backend-laravel
cd growe-backend-laravel
```

Copy the generated files from this repo folder into that Laravel project (overwrite when prompted).

### 2) Install JWT (preserve Bearer JWT contract)

```bash
composer require tymon/jwt-auth
php artisan vendor:publish --provider="Tymon\\JWTAuth\\Providers\\LaravelServiceProvider"
```

Important: set `JWT_SECRET` in `.env` to **the same value** as the Node backend `JWT_SECRET` so existing tokens remain valid after cutover.

### 3) Register middleware (Laravel 11/12)

In Laravel 11+, middleware aliases are configured in `bootstrap/app.php`.
Add aliases for the custom middleware:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'jwt' => \App\Http\Middleware\JwtAuth::class,
        'verified' => \App\Http\Middleware\RequireVerified::class,
        'role' => \App\Http\Middleware\RequireRole::class,
        'admin' => \App\Http\Middleware\RequireAdmin::class,
        'growe.csrf' => \App\Http\Middleware\VerifyGroweCsrf::class,
    ]);
})
```

### 4) CORS

Set `config/cors.php` to allow your frontend origin and credentials. Align with Express:

- `allowed_origins`: `FRONTEND_URL` or `*` (dev)
- `supports_credentials`: `true`

### 5) Static uploads path

Make sure avatars are served at `/uploads/avatars/*`:

- store files in `public/uploads/avatars/`

### 6) Scheduler (booking reminder job)

Add a scheduled command that runs every 15 minutes (see `README.md` cron snippet).

### 7) Socket.io remains in Node

Keep running the existing Node Socket.io service unchanged:

- uses the same `JWT_SECRET`
- connects to same PostgreSQL
- keeps event names and room names identical

### 8) Meeting termination hook (admin)

Your Express admin endpoint emits `meeting-terminated` over Socket.io. Laravel cannot emit Socket.io directly.

To preserve behavior with Socket.io still in Node, add a tiny internal endpoint in your Node Socket.io service:

```http
POST /internal/emit-meeting-terminated
{ "meetingId": "<uuid>" }
```

and in Node call:

```js
io.to(`meeting-${meetingId}`).emit('meeting-terminated', { meetingId });
```

Then set in Laravel `.env`:

```env
SOCKET_IO_BRIDGE_URL=http://localhost:5001
```

If unset, Laravel will still terminate the meeting in DB but will not broadcast the realtime event.

