<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\RealtimeBridgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    private function clientIp(Request $request): ?string
    {
        return $request->ip();
    }

    public function metrics(): JsonResponse
    {
        $totalUsers = (int) (DB::selectOne("SELECT COUNT(*)::int as count FROM users")->count ?? 0);
        $activeUsers = (int) (DB::selectOne("SELECT COUNT(*)::int as count FROM users WHERE is_active = true AND is_verified = true")->count ?? 0);
        $bookingsToday = (int) (DB::selectOne("SELECT COUNT(*)::int as count FROM bookings WHERE DATE(start_time AT TIME ZONE 'UTC') = CURRENT_DATE AND status NOT IN ('cancelled')")->count ?? 0);
        $activeMeetings = (int) (DB::selectOne("SELECT COUNT(*)::int as count FROM meetings WHERE ended_at IS NULL AND created_at > NOW() - INTERVAL '24 hours'")->count ?? 0);

        return response()->json([
            'totalUsers' => $totalUsers,
            'activeUsers' => $activeUsers,
            'bookingsToday' => $bookingsToday,
            'activeMeetings' => $activeMeetings,
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $roleName = $request->query('roleName');
        $isVerified = $request->query('isVerified');
        $isActive = $request->query('isActive');

        $sql = "
          SELECT u.id, u.email, u.role_id, u.is_verified, u.is_active,
                 u.display_name, u.avatar_url, u.created_at, u.updated_at, r.name as role_name
          FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE 1=1
        ";
        $params = [];
        $i = 1;
        if ($roleName) { $sql .= " AND r.name = \${$i}"; $params[] = $roleName; $i++; }
        if ($isVerified !== null) { $sql .= " AND u.is_verified = \${$i}"; $params[] = ($isVerified === 'true'); $i++; }
        if ($isActive !== null) { $sql .= " AND u.is_active = \${$i}"; $params[] = ($isActive === 'true'); $i++; }
        $sql .= " ORDER BY u.created_at DESC LIMIT \${$i} OFFSET \${$i+1}";
        $params[] = $limit; $params[] = $offset;

        $rows = DB::select($sql, $params);
        return response()->json($rows);
    }

    public function updateUser(Request $request, string $id): JsonResponse
    {
        $user = User::with('role')->find($id);
        if (!$user) return response()->json(['error' => 'User not found'], 404);

        $isActive = $request->input('isActive');
        $roleName = $request->input('roleName');

        if ($isActive !== null && !is_bool($isActive)) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['isActive must be a boolean']], 400);
        }
        if ($roleName !== null) {
            if (!in_array($roleName, ['admin','tutor','student'], true)) {
                return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Invalid role name']], 400);
            }
        }

        if ($isActive !== null) {
            $user->is_active = $isActive;
            $user->save();
            AuditLog::create([
                'actor_id' => $request->user()->id,
                'action' => $isActive ? 'user_reactivate' : 'user_deactivate',
                'resource_type' => 'user',
                'resource_id' => $user->id,
                'details' => ['email' => $user->email],
                'ip_address' => $this->clientIp($request),
                'created_at' => now(),
            ]);
        }

        if ($roleName) {
            $role = Role::where('name', $roleName)->first();
            if (!$role) return response()->json(['error' => 'Invalid role'], 400);
            $user->role_id = $role->id;
            $user->save();
            AuditLog::create([
                'actor_id' => $request->user()->id,
                'action' => 'user_role_change',
                'resource_type' => 'user',
                'resource_id' => $user->id,
                'details' => ['email' => $user->email, 'newRole' => $roleName],
                'ip_address' => $this->clientIp($request),
                'created_at' => now(),
            ]);
        }

        return response()->json(User::with('role')->find($id));
    }

    public function removeUser(Request $request, string $id): JsonResponse
    {
        if ($id === $request->user()->id) {
            return response()->json(['error' => 'You cannot remove your own account'], 400);
        }
        $user = User::find($id);
        if (!$user) return response()->json(['error' => 'User not found'], 404);
        $email = $user->email;
        $user->delete();

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'user_removed',
            'resource_type' => 'user',
            'resource_id' => $id,
            'details' => ['email' => $email],
            'ip_address' => $this->clientIp($request),
            'created_at' => now(),
        ]);

        return response()->json(null, 204);
    }

    public function suspendTutor(Request $request, string $id): JsonResponse
    {
        $profile = DB::selectOne("SELECT id FROM tutor_profiles WHERE user_id = $1", [$id]);
        if (!$profile) return response()->json(['error' => 'Tutor profile not found'], 404);
        $row = DB::selectOne("UPDATE tutor_profiles SET is_suspended = true, updated_at = NOW() WHERE user_id = $1 RETURNING *", [$id]);
        AuditLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'tutor_suspend',
            'resource_type' => 'tutor',
            'resource_id' => $profile->id,
            'details' => ['userId' => $id],
            'ip_address' => $this->clientIp($request),
            'created_at' => now(),
        ]);
        return response()->json($row);
    }

    public function unsuspendTutor(Request $request, string $id): JsonResponse
    {
        $profile = DB::selectOne("SELECT id FROM tutor_profiles WHERE user_id = $1", [$id]);
        if (!$profile) return response()->json(['error' => 'Tutor profile not found'], 404);
        $row = DB::selectOne("UPDATE tutor_profiles SET is_suspended = false, updated_at = NOW() WHERE user_id = $1 RETURNING *", [$id]);
        AuditLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'tutor_unsuspend',
            'resource_type' => 'tutor',
            'resource_id' => $profile->id,
            'details' => ['userId' => $id],
            'ip_address' => $this->clientIp($request),
            'created_at' => now(),
        ]);
        return response()->json($row);
    }

    public function terminateMeeting(Request $request, string $id, RealtimeBridgeService $bridge): JsonResponse
    {
        $meeting = DB::selectOne("SELECT id, group_id FROM meetings WHERE id = $1", [$id]);
        if (!$meeting) return response()->json(['error' => 'Meeting not found'], 404);

        $updated = DB::selectOne(
            "UPDATE meetings SET ended_at = NOW(), updated_at = NOW()
             WHERE id = $1
             RETURNING *",
            [$id]
        );

        // Bridge to Node Socket.io service (optional but preserves hook)
        $bridge->emitMeetingTerminated($id);

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'meeting_terminate',
            'resource_type' => 'meeting',
            'resource_id' => $id,
            'details' => ['groupId' => $meeting->group_id],
            'ip_address' => $this->clientIp($request),
            'created_at' => now(),
        ]);

        return response()->json($updated);
    }

    public function bookingLogs(Request $request): JsonResponse
    {
        $limit = min(100, max(1, (int) $request->query('limit', 100)));
        $offset = max(0, (int) $request->query('offset', 0));

        $rows = DB::select(
            "SELECT b.id, b.availability_id, b.student_id, b.start_time, b.end_time, b.status, b.reliability_score, b.created_at,
                    su.email as student_email, tu.email as tutor_email
             FROM bookings b
             JOIN users su ON b.student_id = su.id
             JOIN tutor_availability ta ON b.availability_id = ta.id
             JOIN tutor_profiles tp ON ta.tutor_id = tp.id
             JOIN users tu ON tp.user_id = tu.id
             ORDER BY b.created_at DESC
             LIMIT $1 OFFSET $2",
            [$limit, $offset]
        );
        return response()->json($rows);
    }

    public function reliabilityRanking(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 50)));
        $rows = DB::select(
            "SELECT u.id, u.email, u.display_name,
                    ROUND(AVG(b.reliability_score)::numeric, 2) as score,
                    COUNT(*)::int as total
             FROM users u
             JOIN bookings b ON b.student_id = u.id AND b.status IN ('completed', 'no_show') AND b.reliability_score IS NOT NULL
             GROUP BY u.id, u.email, u.display_name
             ORDER BY score DESC, total DESC
             LIMIT $1",
            [$limit]
        );
        return response()->json($rows);
    }

    public function auditLog(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $action = $request->query('action');

        $sql = "SELECT id, actor_id, action, resource_type, resource_id, details, ip_address, created_at FROM audit_log WHERE 1=1";
        $params = [];
        $i = 1;
        if ($action) { $sql .= " AND action = \${$i}"; $params[] = $action; $i++; }
        $sql .= " ORDER BY created_at DESC LIMIT \${$i} OFFSET \${$i+1}";
        $params[] = $limit; $params[] = $offset;

        return response()->json(DB::select($sql, $params));
    }

    public function activeMeetings(): JsonResponse
    {
        $rows = DB::select(
            "SELECT m.id, m.group_id, m.title, m.started_at, m.created_at, sg.name as group_name
             FROM meetings m
             JOIN study_groups sg ON m.group_id = sg.id
             WHERE m.ended_at IS NULL
             ORDER BY m.created_at DESC"
        );
        return response()->json($rows);
    }
}

