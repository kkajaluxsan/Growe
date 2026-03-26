<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\TutorAvailability;
use App\Models\TutorProfile;
use App\Support\SlotGenerator;
use Illuminate\Support\Facades\DB;

class BookingService
{
    private const VALID_STATUS_TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['completed', 'cancelled', 'no_show'],
        'completed' => [],
        'cancelled' => [],
        'no_show' => [],
    ];

    private const CANCELLATION_WINDOW_HOURS = 24;
    private const MAX_CANCELLATIONS_PER_DAYS = 30;
    private const MAX_CANCELLATIONS_IN_PERIOD = 3;

    public function createBooking(string $availabilityId, string $studentId, string $startTimeIso, string $endTimeIso): array
    {
        $availability = DB::table('tutor_availability as ta')
            ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
            ->select([
                'ta.*',
                'tp.user_id as tutor_user_id',
                'tp.is_suspended',
            ])
            ->where('ta.id', $availabilityId)
            ->first();

        if (!$availability) {
            return $this->error(404, 'Availability not found');
        }
        if ($availability->is_suspended) {
            return $this->error(403, 'Tutor is suspended');
        }

        $start = new \DateTimeImmutable($startTimeIso);
        if ($start->getTimestamp() < time()) {
            return $this->error(400, 'Cannot book past time slots');
        }

        $dateStr = substr((string) $availability->available_date, 0, 10);
        $st = substr((string) $availability->start_time, 0, 8);
        $et = substr((string) $availability->end_time, 0, 8);

        $validSlots = SlotGenerator::generateSlots($dateStr, $st, $et, (int) $availability->session_duration);
        $slotValid = false;
        foreach ($validSlots as $s) {
            if ($s['start'] === $startTimeIso && $s['end'] === $endTimeIso) { $slotValid = true; break; }
        }
        if (!$slotValid) {
            return $this->error(400, 'Invalid or unavailable time slot');
        }

        try {
            $booking = DB::transaction(function () use ($availabilityId, $studentId, $startTimeIso, $endTimeIso, $availability) {
                // Lock overlapping bookings for tutor slot
                $overlapTutor = DB::select(
                    "SELECT id FROM bookings WHERE availability_id = ? AND status NOT IN ('cancelled') AND start_time < ? AND end_time > ? FOR UPDATE",
                    [$availabilityId, $endTimeIso, $startTimeIso]
                );
                if (count($overlapTutor) > 0) {
                    throw $this->exception(409, 'Time slot is no longer available');
                }

                $overlapStudent = DB::select(
                    "SELECT id FROM bookings WHERE student_id = ? AND status NOT IN ('cancelled') AND start_time < ? AND end_time > ? FOR UPDATE",
                    [$studentId, $endTimeIso, $startTimeIso]
                );
                if (count($overlapStudent) > 0) {
                    throw $this->exception(409, 'You have an overlapping booking');
                }

                $count = (int) DB::table('bookings')
                    ->where('availability_id', $availabilityId)
                    ->whereNotIn('status', ['cancelled'])
                    ->where('start_time', '<', $endTimeIso)
                    ->where('end_time', '>', $startTimeIso)
                    ->count();

                if ($count >= (int) $availability->max_students_per_slot) {
                    throw $this->exception(409, 'Slot is full');
                }

                $b = Booking::create([
                    'availability_id' => $availabilityId,
                    'student_id' => $studentId,
                    'start_time' => $startTimeIso,
                    'end_time' => $endTimeIso,
                    'status' => 'pending',
                ]);

                return $b->fresh();
            });
        } catch (\Throwable $e) {
            $status = $e->statusCode ?? 500;
            return $this->error($status, $e->getMessage(), $e->codeName ?? null);
        }

        return ['ok' => true, 'data' => $booking->toArray()];
    }

    public function updateBookingStatus(string $bookingId, string $newStatus): array
    {
        $booking = Booking::find($bookingId);
        if (!$booking) return $this->error(404, 'Booking not found');

        $allowed = self::VALID_STATUS_TRANSITIONS[$booking->status] ?? [];
        if (!in_array($newStatus, $allowed, true)) {
            return $this->error(400, "Cannot transition from {$booking->status} to {$newStatus}");
        }

        if ($newStatus === 'cancelled') {
            $start = new \DateTimeImmutable($booking->start_time);
            $hoursUntil = ($start->getTimestamp() - time()) / 3600.0;
            if ($hoursUntil < self::CANCELLATION_WINDOW_HOURS) {
                return $this->error(400, 'Cancellation is not allowed within 24 hours of the session start.', 'CANCELLATION_WINDOW');
            }

            $since = (new \DateTimeImmutable('now'))->modify('-' . self::MAX_CANCELLATIONS_PER_DAYS . ' days')->format('c');
            $cancelCount = (int) DB::table('bookings')
                ->where('student_id', $booking->student_id)
                ->where('status', 'cancelled')
                ->where('updated_at', '>=', $since)
                ->count();

            if ($cancelCount >= self::MAX_CANCELLATIONS_IN_PERIOD) {
                return $this->error(400, 'You have reached the maximum of 3 cancellations per 30 days.', 'MAX_CANCELLATIONS');
            }
        }

        $reliability = null;
        if ($newStatus === 'completed') $reliability = 1.0;
        if ($newStatus === 'no_show') $reliability = 0.0;

        $booking->status = $newStatus;
        if ($reliability !== null) $booking->reliability_score = $reliability;
        $booking->save();

        return ['ok' => true, 'data' => $booking->fresh()->toArray()];
    }

    public function getReliabilityForStudent(string $studentId): array
    {
        $row = DB::selectOne(
            "SELECT COALESCE(ROUND(AVG(reliability_score)::numeric, 2), 0) as score,
                    COUNT(*)::int as total
             FROM bookings
             WHERE student_id = ? AND status IN ('completed','no_show') AND reliability_score IS NOT NULL",
            [$studentId]
        );
        return [
            'score' => (float) ($row->score ?? 0),
            'total' => (int) ($row->total ?? 0),
        ];
    }

    private function error(int $status, string $message, ?string $code = null): array
    {
        return ['ok' => false, 'status' => $status, 'error' => $message, 'code' => $code];
    }

    private function exception(int $status, string $message, ?string $code = null): \Exception
    {
        $e = new \RuntimeException($message);
        $e->statusCode = $status;
        if ($code) $e->codeName = $code;
        return $e;
    }
}

