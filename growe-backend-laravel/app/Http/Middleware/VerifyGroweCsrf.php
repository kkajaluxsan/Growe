<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Api\CsrfController;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyGroweCsrf
{
    public function handle(Request $request, Closure $next): Response
    {
        if (env('DISABLE_CSRF') === '1') {
            return $next($request);
        }

        if (in_array(strtoupper($request->method()), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $cookieToken = $request->cookies->get(CsrfController::COOKIE_NAME);
        $headerToken = $request->headers->get(CsrfController::HEADER_NAME);

        if (!$cookieToken || !$headerToken) {
            return response()->json(['success' => false, 'error' => 'CSRF token missing'], 403);
        }
        if (!hash_equals($cookieToken, $headerToken)) {
            return response()->json(['success' => false, 'error' => 'CSRF token invalid'], 403);
        }

        $parts = explode('.', $cookieToken, 2);
        if (count($parts) !== 2) {
            return response()->json(['success' => false, 'error' => 'CSRF token invalid'], 403);
        }

        [$value, $sig] = $parts;
        if ($value === '' || $sig === '') {
            return response()->json(['success' => false, 'error' => 'CSRF token invalid'], 403);
        }

        $expected = hash_hmac('sha256', $value, config('growe.csrf_secret'));
        if (!hash_equals($expected, $sig)) {
            return response()->json(['success' => false, 'error' => 'CSRF token invalid'], 403);
        }

        return $next($request);
    }
}

