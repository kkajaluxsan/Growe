<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function health(): JsonResponse
    {
        try {
            DB::select('SELECT 1');
            return response()->json([
                'status' => 'ok',
                'timestamp' => now()->toIso8601String(),
                'database' => 'connected',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'degraded',
                'timestamp' => now()->toIso8601String(),
                'database' => 'disconnected',
            ], 503);
        }
    }
}

