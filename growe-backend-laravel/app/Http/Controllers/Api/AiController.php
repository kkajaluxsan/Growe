<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\AiChatRequest;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;

class AiController extends Controller
{
    public function chat(AiChatRequest $request, AiService $ai): JsonResponse
    {
        try {
            $reply = $ai->generateReply((string) $request->input('message'));
            return response()->json(['reply' => $reply]);
        } catch (\Throwable $e) {
            $status = $e->statusCode ?? (str_contains((string) $e->getMessage(), 'not configured') ? 503 : 500);
            $code = $e->codeName ?? null;

            if ($status === 503 || $code === 'AI_NOT_CONFIGURED') {
                return response()->json([
                    'error' => 'AI assistant is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY on the server.',
                    'code' => 'AI_NOT_CONFIGURED',
                ], 503);
            }
            if ($status === 502 || $code === 'AI_UPSTREAM_ERROR') {
                return response()->json([
                    'error' => $e->getMessage() ?: 'The AI service could not complete your request. Try again shortly.',
                    'code' => 'AI_UPSTREAM_ERROR',
                ], 502);
            }
            throw $e;
        }
    }
}

