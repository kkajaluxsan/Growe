<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Express behavior: Bearer token preferred; cookie fallback is optional
            $user = JWTAuth::parseToken()->authenticate();
            if (!$user) {
                return response()->json(['error' => 'Authentication required'], 401);
            }
            if (!$user->is_active) {
                return response()->json(['error' => 'Account is deactivated'], 403);
            }
            // $request->user() will now resolve to this authenticated user
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        return $next($request);
    }
}

