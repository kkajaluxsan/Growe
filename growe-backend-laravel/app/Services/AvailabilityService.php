<?php

namespace App\Services;

use App\Models\TutorAvailability;
use App\Support\SlotGenerator;
use App\Support\TimeUtils;
use Illuminate\Support\Facades\DB;

class AvailabilityService
{
    public function getAvailableSlots(?string $tutorId, ?string $fromDate, ?string $toDate): array
    {
        $today = (new \DateTimeImmutable('now'))->format('Y-m-d');
        $toDefault = (new \DateTimeImmutable('now'))->modify('+14 days')->format('Y-m-d');

        $from = $this->toDateString($fromDate) ?: $today;
        $to = $this->toDateString($toDate) ?: $toDefault;

        $q = DB::table('tutor_availability as ta')
            ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
            ->join('users as u', 'tp.user_id', '=', 'u.id')
            ->select([
                'ta.id',
                'ta.tutor_id',
                'ta.available_date',
                'ta.start_time',
                'ta.end_time',
                'ta.session_duration',
                'ta.max_students_per_slot',
                'tp.user_id as tutor_user_id',
                'u.email as tutor_email',
            ])
            ->where('tp.is_suspended', '=', false)
            ->where('ta.available_date', '>=', $from)
            ->where('ta.available_date', '<=', $to)
            ->orderBy('ta.available_date')
            ->orderBy('ta.start_time');

        if ($tutorId) {
            $q->where('ta.tutor_id', '=', $tutorId);
        }

        $availabilities = $q->get();
        $result = [];

        foreach ($availabilities as $av) {
            $dateStr = substr((string) $av->available_date, 0, 10);
            $startTime = substr((string) $av->start_time, 0, 8);
            $endTime = substr((string) $av->end_time, 0, 8);

            $slots = SlotGenerator::generateSlots($dateStr, $startTime, $endTime, (int) $av->session_duration);
            foreach ($slots as $slot) {
                if (TimeUtils::isPast($slot['start'])) continue;

                $count = DB::table('bookings')
                    ->where('availability_id', $av->id)
                    ->whereNotIn('status', ['cancelled'])
                    ->where('start_time', '<', $slot['end'])
                    ->where('end_time', '>', $slot['start'])
                    ->count();

                if ($count < (int) $av->max_students_per_slot) {
                    $result[] = [
                        'availabilityId' => $av->id,
                        'tutorId' => $av->tutor_id,
                        'tutorEmail' => $av->tutor_email,
                        'start' => $slot['start'],
                        'end' => $slot['end'],
                        'date' => $dateStr,
                    ];
                }
            }
        }

        usort($result, fn ($a, $b) => strcmp($a['start'], $b['start']));
        return $result;
    }

    private function toDateString(?string $val): ?string
    {
        if (!$val) return null;
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $val)) return substr($val, 0, 10);
        try {
            return (new \DateTimeImmutable($val))->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }
}

