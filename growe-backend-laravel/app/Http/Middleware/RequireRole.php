<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        $roleName = $user->role?->name;
        if (!$roleName || !in_array($roleName, $roles, true)) {
            return response()->json([
                'error' => 'Insufficient permissions',
                'required' => $roles,
            ], 403);
        }

        return $next($request);
    }
}

