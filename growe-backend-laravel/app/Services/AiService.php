<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AiService
{
    private const SYSTEM_PROMPT = "You are a helpful academic assistant for students and tutors using GROWE, a study collaboration platform.\nHelp with study tips, time management, explaining concepts at a high level, and using the app (groups, messages, bookings, meetings).\nKeep answers concise (under about 500 words unless the user asks for detail). Do not invent features the app may not have.\nIf asked for medical, legal, or professional advice beyond general study help, suggest consulting a qualified professional.";

    private const MAX_REPLY_CHARS = 8000;

    public function generateReply(string $message): string
    {
        $message = trim($message);
        if ($message === '') {
            throw $this->httpError(400, 'Message is required');
        }

        $geminiKey = (string) config('growe.ai.gemini_api_key');
        $openaiKey = (string) config('growe.ai.openai_api_key');
        if ($geminiKey === '' && $openaiKey === '') {
            $e = $this->httpError(503, 'AI service is not configured', 'AI_NOT_CONFIGURED');
            throw $e;
        }

        $lastErr = null;
        $reply = null;

        if ($geminiKey !== '') {
            try {
                $reply = $this->chatWithGemini($geminiKey, $message);
            } catch (\Throwable $e) {
                $lastErr = $e;
            }
        }

        if (!$reply && $openaiKey !== '') {
            try {
                $reply = $this->chatWithOpenAI($openaiKey, $message);
            } catch (\Throwable $e) {
                $lastErr = $e;
            }
        }

        if (!$reply) {
            throw $this->httpError(502, $lastErr?->getMessage() ?: 'Could not generate a reply', 'AI_UPSTREAM_ERROR');
        }

        if (mb_strlen($reply) > self::MAX_REPLY_CHARS) {
            $reply = mb_substr($reply, 0, self::MAX_REPLY_CHARS) . '…';
        }

        return $reply;
    }

    private function chatWithGemini(string $key, string $userMessage): ?string
    {
        $model = (string) config('growe.ai.gemini_model', 'gemini-1.5-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $res = Http::timeout(30)->post($url, [
            'key' => $key, // also supported in query; keeping simple
            'systemInstruction' => ['parts' => [['text' => self::SYSTEM_PROMPT]]],
            'contents' => [['role' => 'user', 'parts' => [['text' => $userMessage]]]],
            'generationConfig' => ['maxOutputTokens' => 2048, 'temperature' => 0.7],
        ]);

        if (!$res->ok()) {
            throw new \RuntimeException($res->json('error.message') ?: $res->reason());
        }

        $parts = $res->json('candidates.0.content.parts', []);
        $text = '';
        foreach ($parts as $p) {
            $text .= (string) ($p['text'] ?? '');
        }
        $text = trim($text);
        return $text !== '' ? $text : null;
    }

    private function chatWithOpenAI(string $key, string $userMessage): ?string
    {
        $model = (string) config('growe.ai.openai_model', 'gpt-4o-mini');
        $res = Http::timeout(30)
            ->withToken($key)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                    ['role' => 'user', 'content' => $userMessage],
                ],
                'max_tokens' => 2048,
                'temperature' => 0.7,
            ]);

        if (!$res->ok()) {
            throw new \RuntimeException($res->json('error.message') ?: $res->reason());
        }

        $text = trim((string) $res->json('choices.0.message.content', ''));
        return $text !== '' ? $text : null;
    }

    private function httpError(int $status, string $message, ?string $code = null): \Exception
    {
        $e = new \RuntimeException($message);
        $e->statusCode = $status;
        if ($code) $e->codeName = $code;
        return $e;
    }
}

