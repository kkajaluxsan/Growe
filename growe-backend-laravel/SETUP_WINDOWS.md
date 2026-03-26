## Windows setup (PHP + Composer + Laravel)

Your machine currently does **not** have `php` or `composer` available on PATH, so Laravel cannot be executed yet.

### Option A (recommended): install PHP + Composer via winget

1) Install PHP (8.2+ recommended, 8.3+ ideal):

```powershell
winget install -e --id PHP.PHP
```

2) Install Composer:

```powershell
winget install -e --id Composer.Composer
```

3) Close and reopen your terminal, then verify:

```powershell
php -v
composer --version
```

### Option B: use a bundle (fast)

- **Laravel Herd (Windows)** or **XAMPP/WAMP** can provide PHP easily.
  - Ensure `php` is on PATH and version is compatible with the latest Laravel.

### Create the runnable Laravel app

Because this repo contains only the **Growe module code**, you still need the standard Laravel application skeleton.

From repo root:

```powershell
composer create-project laravel/laravel growe-backend-laravel-app
```

Then copy the contents of this folder into that app (overwrite):

```text
growe-backend-laravel/app
growe-backend-laravel/config/growe.php
growe-backend-laravel/routes/api.php
growe-backend-laravel/database/migrations
growe-backend-laravel/.env.example
```

### Install JWT package (required)

```powershell
cd growe-backend-laravel-app
composer require tymon/jwt-auth
php artisan vendor:publish --provider="Tymon\JWTAuth\Providers\LaravelServiceProvider"
```

Set `.env` `JWT_SECRET` to **match** the Node backend’s `JWT_SECRET` to preserve existing tokens.

### Middleware aliases (Laravel 11/12)

Add aliases in `bootstrap/app.php` as documented in `LARAVEL_SETUP.md`.

### Smoke test

```powershell
php artisan route:list
php artisan serve
```

