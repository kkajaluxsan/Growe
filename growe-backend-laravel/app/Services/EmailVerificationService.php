<?php

namespace App\Services;

use App\Models\EmailVerificationToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EmailVerificationService
{
    public function verificationExpiryMinutes(): int
    {
        $mins = (int) env('VERIFICATION_TOKEN_EXPIRY_MINUTES', 60);
        $mins = max(15, min($mins, 24 * 60));
        return $mins;
    }

    public function verificationExpiryLabel(): string
    {
        $mins = $this->verificationExpiryMinutes();
        if ($mins < 120) return "{$mins} minutes";
        if ($mins < 1440) return (string) round($mins / 60) . " hours";
        return "24 hours";
    }

    public function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function createTokenForUser(User $user, string $plainToken, \DateTimeInterface $expiresAt): EmailVerificationToken
    {
        // Mirror Express: store token_hash; keep token nullable
        return EmailVerificationToken::create([
            'user_id' => $user->id,
            'token' => null,
            'token_hash' => $this->hashToken($plainToken),
            'expires_at' => $expiresAt,
            'created_at' => now(),
        ]);
    }

    public function deleteExpired(): int
    {
        return EmailVerificationToken::where('expires_at', '<', now())->delete();
    }

    public function findByToken(string $plainToken): ?EmailVerificationToken
    {
        $hash = $this->hashToken($plainToken);
        return EmailVerificationToken::query()
            ->where('expires_at', '>', now())
            ->where(function ($q) use ($hash, $plainToken) {
                $q->where('token_hash', $hash)->orWhere(function ($q2) use ($plainToken) {
                    $q2->whereNull('token_hash')->where('token', $plainToken);
                });
            })
            ->first();
    }

    public function findValidByUserId(string $userId): ?EmailVerificationToken
    {
        return EmailVerificationToken::query()
            ->where('user_id', $userId)
            ->where('expires_at', '>', now())
            ->orderByDesc('expires_at')
            ->first();
    }

    public function deleteByUserId(string $userId): int
    {
        return EmailVerificationToken::where('user_id', $userId)->delete();
    }

    public function deleteByToken(string $plainToken): int
    {
        $hash = $this->hashToken($plainToken);
        return EmailVerificationToken::where('token_hash', $hash)->orWhere('token', $plainToken)->delete();
    }
}

