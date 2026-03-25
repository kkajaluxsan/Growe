<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TutorProfile;
use App\Models\TutorAvailability;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TutorController extends Controller
{
    public function listTutors(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));

        $rows = TutorProfile::query()
            ->with('user:id,email')
            ->where('is_suspended', false)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->offset($offset)
            ->get()
            ->map(function ($tp) {
                return [
                    'id' => $tp->id,
                    'user_id' => $tp->user_id,
                    'bio' => $tp->bio,
                    'subjects' => $tp->subjects ?? [],
                    'is_suspended' => (bool) $tp->is_suspended,
                    'email' => $tp->user?->email,
                ];
            })
            ->values()
            ->all();

        return response()->json($rows);
    }

    public function availableSlots(Request $request, AvailabilityService $service): JsonResponse
    {
        $slots = $service->getAvailableSlots(
            $request->query('tutorId') ?: null,
            $request->query('fromDate') ?: null,
            $request->query('toDate') ?: null
        );
        return response()->json($slots);
    }

    public function createProfile(Request $request): JsonResponse
    {
        $existing = TutorProfile::where('user_id', $request->user()->id)->first();
        if ($existing) return response()->json(['error' => 'Tutor profile already exists'], 409);

        $bio = $request->input('bio');
        $subjects = $request->input('subjects', []);
        if ($subjects !== null && !is_array($subjects)) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Subjects must be an array']], 400);
        }

        $tp = new TutorProfile();
        $tp->user_id = $request->user()->id;
        $tp->bio = $bio !== null ? trim((string) $bio) : null;
        $tp->subjects = array_values(array_filter((array) $subjects, fn ($s) => is_string($s)));
        $tp->save();

        return response()->json($tp, 201);
    }

    public function getProfile(Request $request): JsonResponse
    {
        $tp = TutorProfile::where('user_id', $request->user()->id)->first();
        if (!$tp) return response()->json(['error' => 'Tutor profile not found'], 404);
        return response()->json($tp);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $tp = TutorProfile::where('user_id', $request->user()->id)->first();
        if (!$tp) return response()->json(['error' => 'Tutor profile not found'], 404);

        if ($request->has('bio')) $tp->bio = $request->input('bio') !== null ? trim((string) $request->input('bio')) : null;
        if ($request->has('subjects')) {
            $subjects = $request->input('subjects');
            if ($subjects !== null && !is_array($subjects)) {
                return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Subjects must be an array']], 400);
            }
            $tp->subjects = array_values(array_filter((array) ($subjects ?? []), fn ($s) => is_string($s)));
        }
        $tp->save();
        return response()->json($tp);
    }

    public function addAvailability(Request $request): JsonResponse
    {
        $tp = TutorProfile::where('user_id', $request->user()->id)->first();
        if (!$tp) return response()->json(['error' => 'Tutor profile required. Create a profile first.'], 404);

        $data = $request->only(['availableDate','startTime','endTime','sessionDuration','isRecurring','maxStudentsPerSlot']);
        foreach (['availableDate','startTime','endTime','sessionDuration'] as $k) {
            if (empty($data[$k])) {
                return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ["{$k} is required"]], 400);
            }
        }

        $av = new TutorAvailability();
        $av->tutor_id = $tp->id;
        $av->available_date = $data['availableDate'];
        $av->start_time = $data['startTime'];
        $av->end_time = $data['endTime'];
        $av->session_duration = (int) $data['sessionDuration'];
        $av->is_recurring = (bool) ($data['isRecurring'] ?? false);
        $av->max_students_per_slot = (int) ($data['maxStudentsPerSlot'] ?? 1);
        $av->save();

        return response()->json($av, 201);
    }

    public function listAvailability(Request $request): JsonResponse
    {
        $tp = TutorProfile::where('user_id', $request->user()->id)->first();
        if (!$tp) return response()->json(['error' => 'Tutor profile not found'], 404);

        $from = $request->query('fromDate');
        $to = $request->query('toDate');

        $q = TutorAvailability::query()->where('tutor_id', $tp->id);
        if ($from) $q->where('available_date', '>=', $from);
        if ($to) $q->where('available_date', '<=', $to);
        $rows = $q->orderBy('available_date')->orderBy('start_time')->get();
        return response()->json($rows);
    }

    public function deleteAvailability(Request $request, string $id): JsonResponse
    {
        $tp = TutorProfile::where('user_id', $request->user()->id)->first();
        if (!$tp) return response()->json(['error' => 'Tutor profile not found'], 404);

        $deleted = TutorAvailability::where('id', $id)->where('tutor_id', $tp->id)->delete();
        if (!$deleted) return response()->json(['error' => 'Availability not found'], 404);
        return response()->json(null, 204);
    }
}

