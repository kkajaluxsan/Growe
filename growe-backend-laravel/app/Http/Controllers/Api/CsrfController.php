<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class CsrfController extends Controller
{
    public const COOKIE_NAME = 'growe-csrf';
    public const HEADER_NAME = 'x-csrf-token';

    public function issue(Request $request): JsonResponse
    {
        $token = bin2hex(random_bytes(24));
        $secret = config('growe.csrf_secret');
        $sig = hash_hmac('sha256', $token, $secret);
        $signed = $token . '.' . $sig;

        $secure = app()->environment('production');
        $sameSite = 'lax';

        // Match Express behavior: httpOnly=false so SPA can read it if needed
        cookie()->queue(
            self::COOKIE_NAME,
            $signed,
            60 * 24, // minutes
            '/',
            null,
            $secure,
            false,
            false,
            $sameSite
        );

        return response()->json(['csrfToken' => $signed]);
    }
}

