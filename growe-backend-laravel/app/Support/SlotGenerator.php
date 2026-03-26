<?php

namespace App\Support;

class SlotGenerator
{
    /**
     * @return array<int,array{start:string,end:string}>
     */
    public static function generateSlots(string $dateStr, string $startTime, string $endTime, int $sessionDurationMinutes): array
    {
        $dateStr = substr($dateStr, 0, 10);
        $startTime = substr($startTime, 0, 8);
        $endTime = substr($endTime, 0, 8);

        $start = new \DateTimeImmutable($dateStr . 'T' . $startTime . 'Z');
        $end = new \DateTimeImmutable($dateStr . 'T' . $endTime . 'Z');
        $slots = [];

        if ($sessionDurationMinutes <= 0) return $slots;

        $cur = $start;
        while (true) {
            $next = $cur->modify('+' . $sessionDurationMinutes . ' minutes');
            if ($next > $end) break;
            $slots[] = ['start' => $cur->format('c'), 'end' => $next->format('c')];
            $cur = $next;
        }
        return $slots;
    }
}

