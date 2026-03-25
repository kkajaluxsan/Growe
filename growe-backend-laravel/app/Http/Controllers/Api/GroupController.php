<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudyGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $name = $request->input('name');
        if (!is_string($name) || trim($name) === '' || strlen($name) > 255) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Group name is required']], 400);
        }

        $description = $request->input('description');
        $maxMembers = $request->input('maxMembers', 10);
        $maxMembers = (int) $maxMembers;
        if ($maxMembers < 2 || $maxMembers > 100) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Max members must be between 2 and 100']], 400);
        }

        $group = StudyGroup::create([
            'name' => trim($name),
            'description' => is_string($description) ? trim($description) : null,
            'creator_id' => $request->user()->id,
            'max_members' => $maxMembers,
        ]);

        // creator becomes approved member
        DB::table('group_members')->insert([
            'id' => DB::raw('gen_random_uuid()'),
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'status' => 'approved',
            'joined_at' => now(),
            'created_at' => now(),
        ]);

        return response()->json($group->fresh()->toArray(), 201);
    }

    public function index(Request $request): JsonResponse
    {
        // Mirrors group.model.js listForUser: approved memberships only
        $rows = DB::select(
            "SELECT sg.id, sg.name, sg.description, sg.creator_id, sg.max_members, sg.created_at, gm.status as membership_status
             FROM study_groups sg
             JOIN group_members gm ON sg.id = gm.group_id
             WHERE gm.user_id = ? AND gm.status = 'approved'
             ORDER BY sg.created_at DESC",
            [$request->user()->id]
        );
        return response()->json($rows);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $group = DB::selectOne(
            "SELECT sg.id, sg.name, sg.description, sg.creator_id, sg.max_members, sg.created_at, sg.updated_at, u.email as creator_email
             FROM study_groups sg
             LEFT JOIN users u ON sg.creator_id = u.id
             WHERE sg.id = ?",
            [$id]
        );
        if (!$group) return response()->json(['error' => 'Group not found'], 404);

        $member = DB::selectOne("SELECT id, status FROM group_members WHERE group_id = ? AND user_id = ?", [$id, $request->user()->id]);
        if (!$member || $member->status !== 'approved') {
            return response()->json(['error' => 'You must be a member to view this group'], 403);
        }

        return response()->json($group);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $group = StudyGroup::find($id);
        if (!$group) return response()->json(['error' => 'Group not found'], 404);
        if ($group->creator_id !== $request->user()->id) {
            return response()->json(['error' => 'Only the group creator can perform this action'], 403);
        }

        if ($request->has('name')) {
            $name = $request->input('name');
            if (!is_string($name) || trim($name) === '' || strlen($name) > 255) {
                return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Group name cannot be empty']], 400);
            }
            $group->name = trim($name);
        }
        if ($request->has('description')) {
            $desc = $request->input('description');
            $group->description = ($desc === null) ? null : (is_string($desc) ? trim($desc) : $group->description);
        }
        if ($request->has('maxMembers')) {
            $max = (int) $request->input('maxMembers');
            if ($max < 2 || $max > 100) {
                return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Max members must be between 2 and 100']], 400);
            }
            $group->max_members = $max;
        }

        $group->save();
        return response()->json($group->fresh()->toArray());
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $group = StudyGroup::find($id);
        if (!$group) return response()->json(['error' => 'Group not found'], 404);
        if ($group->creator_id !== $request->user()->id) {
            return response()->json(['error' => 'Only the group creator can perform this action'], 403);
        }
        $group->delete();
        return response()->json(null, 204);
    }

    public function requestJoin(Request $request, string $id): JsonResponse
    {
        $group = StudyGroup::find($id);
        if (!$group) return response()->json(['error' => 'Group not found'], 404);

        $existing = DB::selectOne("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?", [$id, $request->user()->id]);
        if ($existing) return response()->json(['error' => 'Already a member or pending'], 409);

        $count = (int) (DB::selectOne("SELECT COUNT(*)::int as count FROM group_members WHERE group_id = ? AND status = 'approved'", [$id])->count ?? 0);
        if ($count >= (int) $group->max_members) return response()->json(['error' => 'Group is full'], 400);

        DB::table('group_members')->insert([
            'id' => DB::raw('gen_random_uuid()'),
            'group_id' => $id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'joined_at' => null,
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Join request sent'], 201);
    }

    public function approveJoin(Request $request, string $id, string $userId): JsonResponse
    {
        $group = StudyGroup::find($id);
        if (!$group) return response()->json(['error' => 'Group not found'], 404);
        if ($group->creator_id !== $request->user()->id) {
            return response()->json(['error' => 'Only the group creator can perform this action'], 403);
        }

        $row = DB::selectOne(
            "UPDATE group_members SET status = 'approved', joined_at = NOW()
             WHERE group_id = ? AND user_id = ? AND status = 'pending'
             RETURNING id, group_id, user_id, status, joined_at, created_at",
            [$id, $userId]
        );
        if (!$row) return response()->json(['error' => 'Pending request not found'], 404);
        return response()->json($row);
    }

    public function members(Request $request, string $id): JsonResponse
    {
        $member = DB::selectOne("SELECT status FROM group_members WHERE group_id = ? AND user_id = ?", [$id, $request->user()->id]);
        if (!$member || $member->status !== 'approved') {
            return response()->json(['error' => 'You must be a member to view members'], 403);
        }

        $rows = DB::select(
            "SELECT gm.id, gm.group_id, gm.user_id, gm.status, gm.joined_at, u.email
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?
             ORDER BY gm.status, gm.joined_at",
            [$id]
        );
        return response()->json($rows);
    }
}

