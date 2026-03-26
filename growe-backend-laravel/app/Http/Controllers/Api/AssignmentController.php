<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assignments\AssignmentCreateRequest;
use App\Http\Requests\Assignments\AssignmentListRequest;
use App\Http\Requests\Assignments\AssignmentUpdateRequest;
use App\Models\Assignment;
use App\Services\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function store(AssignmentCreateRequest $request, AssignmentService $service): JsonResponse
    {
        $a = $service->create($request->user()->id, $request->validated());
        return response()->json($service->enrich($a), 201);
    }

    public function index(AssignmentListRequest $request, AssignmentService $service): JsonResponse
    {
        return response()->json($service->list($request->user()->id, $request->validated()));
    }

    public function show(Request $request, string $id, AssignmentService $service): JsonResponse
    {
        $a = Assignment::where('id', $id)->first();
        if (!$a) return response()->json(['error' => 'Assignment not found'], 404);

        $isAdmin = ($request->user()->role?->name) === 'admin';
        if (!$isAdmin && $a->user_id !== $request->user()->id) {
            return response()->json(['error' => 'You can only access your own assignments'], 403);
        }

        return response()->json($service->enrich($a));
    }

    public function update(AssignmentUpdateRequest $request, string $id, AssignmentService $service): JsonResponse
    {
        $a = Assignment::where('id', $id)->first();
        if (!$a) return response()->json(['error' => 'Assignment not found'], 404);

        $roleName = $request->user()->role?->name;
        $isAdmin = $roleName === 'admin';
        if (!$isAdmin && $a->user_id !== $request->user()->id) {
            return response()->json(['error' => 'You can only update your own assignments'], 403);
        }

        $data = $request->validated();
        $adminOverrideCompleted = (bool) ($data['adminOverrideCompleted'] ?? false);
        unset($data['adminOverrideCompleted']);

        $updated = $service->update($a, $data, (string) $roleName, $adminOverrideCompleted);
        return response()->json($service->enrich($updated));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $a = Assignment::where('id', $id)->first();
        if (!$a) return response()->json(['error' => 'Assignment not found'], 404);

        $roleName = $request->user()->role?->name;
        $isAdmin = $roleName === 'admin';
        if (!$isAdmin && $a->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Only the assignment owner or an admin can delete this assignment'], 403);
        }

        $a->delete(); // sets deleted_at
        return response()->json(null, 204);
    }
}

