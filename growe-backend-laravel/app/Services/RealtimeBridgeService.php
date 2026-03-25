<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Socket.io remains in Node, but Laravel admin termination should still trigger the realtime event.
 * This bridge is optional: configure SOCKET_IO_BRIDGE_URL to enable.
 *
 * Expected Node endpoint (you add on the Socket.io service):
 * POST /internal/emit-meeting-terminated  { meetingId: "<uuid>" }
 */
class RealtimeBridgeService
{
    public function emitMeetingTerminated(string $meetingId): void
    {
        $base = rtrim((string) env('SOCKET_IO_BRIDGE_URL', ''), '/');
        if ($base === '') return;

        Http::timeout(3)->post($base . '/internal/emit-meeting-terminated', [
            'meetingId' => $meetingId,
        ]);
    }
}

