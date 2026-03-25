<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function store(Request $request, BookingService $service): JsonResponse
    {
        $availabilityId = (string) $request->input('availabilityId');
        $startTime = (string) $request->input('startTime');
        $endTime = (string) $request->input('endTime');
        if ($availabilityId === '' || $startTime === '' || $endTime === '') {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Availability ID, startTime, endTime are required']], 400);
        }

        $res = $service->createBooking($availabilityId, $request->user()->id, $startTime, $endTime);
        if (!$res['ok']) {
            $body = ['error' => $res['error']];
            if (!empty($res['code'])) $body['code'] = $res['code'];
            return response()->json($body, $res['status']);
        }
        return response()->json($res['data'], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $limit = min(50, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $role = $request->user()->role?->name;

        if ($role === 'tutor') {
            $q = DB::table('bookings as b')
                ->join('tutor_availability as ta', 'b.availability_id', '=', 'ta.id')
                ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
                ->join('users as u', 'b.student_id', '=', 'u.id')
                ->select([
                    'b.id','b.availability_id','b.student_id','b.start_time','b.end_time','b.status','b.reliability_score','b.created_at',
                    'ta.tutor_id','ta.available_date','ta.session_duration',
                    'u.email as student_email',
                ])
                ->where('tp.user_id', $request->user()->id);
            if ($status) $q->where('b.status', $status);
            $rows = $q->orderByDesc('b.start_time')->limit($limit)->offset($offset)->get();
            return response()->json($rows);
        }

        $q = DB::table('bookings as b')
            ->join('tutor_availability as ta', 'b.availability_id', '=', 'ta.id')
            ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
            ->join('users as u', 'tp.user_id', '=', 'u.id')
            ->select([
                'b.id','b.availability_id','b.student_id','b.start_time','b.end_time','b.status','b.reliability_score','b.created_at',
                'ta.tutor_id','ta.available_date','ta.session_duration','tp.user_id as tutor_user_id',
                'u.email as tutor_email',
            ])
            ->where('b.student_id', $request->user()->id);
        if ($status) $q->where('b.status', $status);
        $rows = $q->orderByDesc('b.start_time')->limit($limit)->offset($offset)->get();
        return response()->json($rows);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $booking = DB::table('bookings as b')
            ->join('tutor_availability as ta', 'b.availability_id', '=', 'ta.id')
            ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
            ->select([
                'b.*',
                'ta.tutor_id','ta.available_date','ta.session_duration',
                'tp.user_id as tutor_user_id',
            ])
            ->where('b.id', $id)
            ->first();

        if (!$booking) return response()->json(['error' => 'Booking not found'], 404);

        $isStudent = $booking->student_id === $request->user()->id;
        $isTutor = $booking->tutor_user_id === $request->user()->id;
        if (!$isStudent && !$isTutor && ($request->user()->role?->name) !== 'admin') {
            return response()->json(['error' => 'Access denied'], 403);
        }

        return response()->json($booking);
    }

    public function cancel(Request $request, string $id, BookingService $service): JsonResponse
    {
        $booking = DB::table('bookings as b')
            ->join('tutor_availability as ta', 'b.availability_id', '=', 'ta.id')
            ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
            ->select(['b.id','b.student_id','tp.user_id as tutor_user_id'])
            ->where('b.id', $id)
            ->first();

        if (!$booking) return response()->json(['error' => 'Booking not found'], 404);
        $isStudent = $booking->student_id === $request->user()->id;
        $isTutor = $booking->tutor_user_id === $request->user()->id;
        if (!$isStudent && !$isTutor) return response()->json(['error' => 'Access denied'], 403);

        $res = $service->updateBookingStatus($id, 'cancelled');
        if (!$res['ok']) return response()->json(['error' => $res['error'], 'code' => $res['code'] ?? null], $res['status']);
        return response()->json($res['data']);
    }

    public function updateStatus(Request $request, string $id, BookingService $service): JsonResponse
    {
        $status = (string) $request->input('status');
        if (!in_array($status, ['confirmed','cancelled','completed','no_show'], true)) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Valid status (confirmed, cancelled, completed, no_show) is required']], 400);
        }

        $booking = DB::table('bookings as b')
            ->join('tutor_availability as ta', 'b.availability_id', '=', 'ta.id')
            ->join('tutor_profiles as tp', 'ta.tutor_id', '=', 'tp.id')
            ->select(['b.id','tp.user_id as tutor_user_id'])
            ->where('b.id', $id)
            ->first();

        if (!$booking) return response()->json(['error' => 'Booking not found'], 404);
        if ($booking->tutor_user_id !== $request->user()->id) {
            return response()->json(['error' => 'Only the tutor can update booking status'], 403);
        }

        $res = $service->updateBookingStatus($id, $status);
        if (!$res['ok']) return response()->json(['error' => $res['error'], 'code' => $res['code'] ?? null], $res['status']);
        return response()->json($res['data']);
    }
}

