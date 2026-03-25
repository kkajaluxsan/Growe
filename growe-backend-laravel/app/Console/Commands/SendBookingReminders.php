<?php

namespace App\Console\Commands;

use App\Services\MailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendBookingReminders extends Command
{
    protected $signature = 'growe:booking-reminders';
    protected $description = 'Send upcoming booking reminder emails';

    public function handle(MailService $mail): int
    {
        $hours = (int) env('BOOKING_REMINDER_HOURS', 24);
        $windowMinutes = 30;

        $now = new \DateTimeImmutable('now');
        $windowStart = $now->modify('+' . ($hours * 60 - $windowMinutes) . ' minutes');
        $windowEnd = $now->modify('+' . ($hours * 60 + $windowMinutes) . ' minutes');

        $bookings = DB::select(
            "SELECT b.id, b.student_id, b.start_time, u.email as student_email, tu.email as tutor_email
             FROM bookings b
             JOIN users u ON b.student_id = u.id
             JOIN tutor_availability ta ON b.availability_id = ta.id
             JOIN tutor_profiles tp ON ta.tutor_id = tp.id
             JOIN users tu ON tp.user_id = tu.id
             WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL
               AND b.start_time >= ? AND b.start_time <= ?",
            [$windowStart->format('c'), $windowEnd->format('c')]
        );

        $processed = 0;
        foreach ($bookings as $b) {
            try {
                $mail->sendBookingReminder($b->student_email, $b->start_time, $b->tutor_email);
                DB::update("UPDATE bookings SET reminder_sent_at = NOW() WHERE id = ?", [$b->id]);
                $processed++;
            } catch (\Throwable $e) {
                $this->warn("Reminder failed for booking {$b->id}: " . $e->getMessage());
            }
        }

        $this->info("Processed {$processed} reminders");
        return 0;
    }
}

