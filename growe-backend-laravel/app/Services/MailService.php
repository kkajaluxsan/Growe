<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class MailService
{
    public function smtpConfigured(): bool
    {
        return (string) env('SMTP_USER', '') !== '';
    }

    public function frontendUrl(): string
    {
        return rtrim((string) config('growe.frontend_url', 'http://localhost:5173'), '/');
    }

    public function sendVerificationEmail(string $email, string $token, string $expiresInLabel): void
    {
        $verificationUrl = $this->frontendUrl() . '/verify-email?token=' . urlencode($token);

        Mail::raw(
            "Verify your GROWE account by visiting: {$verificationUrl}\n\nThis link expires in {$expiresInLabel}.",
            function ($message) use ($email) {
                $message->to($email)->subject('Verify your GROWE account');
            }
        );
    }

    public function sendBookingReminder(string $email, string $startTimeIso, ?string $tutorEmail): void
    {
        $start = new \DateTimeImmutable($startTimeIso);
        $formatted = $start->format('Y-m-d H:i');
        $text = "GROWE – Booking reminder: Your session is scheduled for {$formatted}."
            . ($tutorEmail ? " Tutor: {$tutorEmail}." : "");

        Mail::raw($text, function ($message) use ($email) {
            $message->to($email)->subject('GROWE – Booking reminder');
        });
    }
}

