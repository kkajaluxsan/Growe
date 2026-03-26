<?php

namespace App\Services;

use App\Models\Meeting;
use Illuminate\Support\Facades\DB;

class MeetingService
{
    public function createMeeting(array $data, string $createdByUserId): array
    {
        $groupId = (string) ($data['groupId'] ?? '');
        if ($groupId === '') {
            return ['ok' => false, 'status' => 400, 'error' => 'Group ID is required'];
        }

        $member = DB::table('group_members')
            ->where('group_id', $groupId)
            ->where('user_id', $createdByUserId)
            ->first();

        if (!$member || $member->status !== 'approved') {
            return ['ok' => false, 'status' => 403, 'error' => 'You must be an approved member of the group to create a meeting'];
        }

        // If tutorId + slot provided, create a booking (mirrors Express meeting.service.js)
        $tutorId = $data['tutorId'] ?? null; // tutor_profiles.id
        $slot = $data['slot'] ?? null;
        if ($tutorId && is_array($slot) && !empty($slot['availabilityId']) && !empty($slot['startTime']) && !empty($slot['endTime'])) {
            $bookingService = app(BookingService::class);
            $res = $bookingService->createBooking((string) $slot['availabilityId'], $createdByUserId, (string) $slot['startTime'], (string) $slot['endTime']);
            if (!$res['ok']) {
                return ['ok' => false, 'status' => $res['status'], 'error' => $res['error'], 'code' => $res['code'] ?? null];
            }
        }

        $meeting = Meeting::create([
            'group_id' => $groupId,
            'title' => (string) ($data['title'] ?? 'Group Meeting') ?: 'Group Meeting',
            'created_by' => $createdByUserId,
            'scheduled_at' => $data['scheduledAt'] ?? null,
            'tutor_id' => $tutorId ?: null,
        ]);

        return ['ok' => true, 'data' => $meeting->fresh()->toArray()];
    }
}

