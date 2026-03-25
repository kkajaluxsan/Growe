<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        if (($user->role?->name) !== 'admin') {
            return response()->json([
                'error' => 'Insufficient permissions',
                'required' => ['admin'],
            ], 403);
        }

        return $next($request);
    }
}

