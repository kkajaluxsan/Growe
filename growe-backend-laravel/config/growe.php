<?php

return [
    // Express: CSRF_SECRET || JWT_SECRET || 'csrf-secret'
    'csrf_secret' => env('CSRF_SECRET') ?: env('JWT_SECRET', 'csrf-secret'),

    'frontend_url' => env('FRONTEND_URL', '*'),

    'ai' => [
        'gemini_api_key' => env('GEMINI_API_KEY'),
        'gemini_model' => env('GEMINI_MODEL', 'gemini-1.5-flash'),
        'openai_api_key' => env('OPENAI_API_KEY'),
        'openai_model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
    ],
];

