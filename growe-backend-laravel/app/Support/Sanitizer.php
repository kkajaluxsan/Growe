<?php

namespace App\Support;

class Sanitizer
{
    public static function sanitizePlainText($input)
    {
        if ($input === null) {
            return $input;
        }
        if (!is_string($input)) {
            return $input;
        }
        $trimmed = trim($input);
        if ($trimmed === '') {
            return $trimmed;
        }
        // Similar intent to sanitize-html allowedTags=[]: strip tags, then trim.
        return trim(strip_tags($trimmed));
    }

    public static function sanitizeMessageContent($content): string
    {
        if (!is_string($content)) return '';
        // Match Express sanitize.js: escape HTML entities
        $escaped = htmlspecialchars($content, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return trim($escaped);
    }
}

