<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MeetingController extends Controller
{
    public function store(Request $request, MeetingService $service): JsonResponse
    {
        // Express validateMeetingCreate behavior (light validation here; keep response shapes)
        $groupId = $request->input('groupId');
        if (!$groupId) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Group ID is required']], 400);
        }

        $res = $service->createMeeting($request->all(), $request->user()->id);
        if (!$res['ok']) {
            $body = ['error' => $res['error']];
            if (!empty($res['code'])) $body['code'] = $res['code'];
            return response()->json($body, $res['status']);
        }
        return response()->json($res['data'], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $from = $request->query('from');
        $to = $request->query('to');

        if ($from && $to) {
            $rows = DB::select(
                "SELECT DISTINCT m.id, m.group_id, m.title, m.started_at, m.ended_at,
                        m.created_by, m.created_at, m.scheduled_at, sg.name as group_name
                 FROM meetings m
                 JOIN study_groups sg ON m.group_id = sg.id
                 JOIN group_members gm ON sg.id = gm.group_id
                 WHERE gm.user_id = ? AND gm.status = 'approved'
                   AND (
                     (m.scheduled_at IS NOT NULL AND m.scheduled_at >= ?::timestamptz AND m.scheduled_at < (?::date + INTERVAL '1 day')::timestamptz)
                     OR (m.scheduled_at IS NULL AND m.created_at::date >= ?::date AND m.created_at::date <= ?::date)
                   )
                 ORDER BY COALESCE(m.scheduled_at, m.created_at) ASC",
                [$request->user()->id, $from, $to, $from, $to]
            );
            return response()->json($rows);
        }

        $rows = DB::select(
            "SELECT DISTINCT m.id, m.group_id, m.title, m.started_at, m.ended_at,
                    m.created_by, m.created_at, m.scheduled_at, sg.name as group_name
             FROM meetings m
             JOIN study_groups sg ON m.group_id = sg.id
             JOIN group_members gm ON sg.id = gm.group_id
             WHERE gm.user_id = ? AND gm.status = 'approved'
             ORDER BY COALESCE(m.scheduled_at, m.created_at) DESC",
            [$request->user()->id]
        );
        return response()->json($rows);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $meeting = DB::selectOne(
            "SELECT m.id, m.group_id, m.title, m.started_at, m.ended_at, m.created_by,
                    m.created_at, m.updated_at, m.scheduled_at, m.tutor_id, sg.name as group_name,
                    u.email as tutor_email
             FROM meetings m
             JOIN study_groups sg ON m.group_id = sg.id
             LEFT JOIN tutor_profiles tp ON m.tutor_id = tp.id
             LEFT JOIN users u ON tp.user_id = u.id
             WHERE m.id = ?",
            [$id]
        );
        if (!$meeting) return response()->json(['error' => 'Meeting not found'], 404);

        $member = DB::selectOne("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", [$meeting->group_id, $request->user()->id]);
        if (!$member || $member->status !== 'approved') {
            return response()->json(['error' => 'You must be a group member to view this meeting'], 403);
        }

        return response()->json($meeting);
    }
}

