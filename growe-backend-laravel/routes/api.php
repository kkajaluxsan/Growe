<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\CsrfController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\TutorController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\MessagingController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AiController;

/*
|--------------------------------------------------------------------------
| API Routes (contract-compatible with Express)
|--------------------------------------------------------------------------
|
| Base prefix is /api (Laravel RouteServiceProvider).
| Keep paths identical to existing Express backend.
|
*/

Route::get('/csrf-token', [CsrfController::class, 'issue']);
Route::get('/health', [HealthController::class, 'health']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware(['throttle:20,15']);
    Route::post('/login', [AuthController::class, 'login'])->middleware(['throttle:20,15']);
    Route::get('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/request-verification-email', [AuthController::class, 'requestVerificationEmail'])->middleware(['throttle:5,60']);

    Route::post('/resend-verification', [AuthController::class, 'resendVerification'])->middleware(['jwt', 'throttle:5,60']);
    Route::post('/refresh-token', [AuthController::class, 'refreshToken'])->middleware(['jwt']);

    Route::get('/me', [AuthController::class, 'me'])->middleware(['jwt', 'verified']);
    Route::patch('/me', [AuthController::class, 'updateMe'])->middleware(['jwt', 'verified']);
    Route::post('/me/avatar', [AuthController::class, 'uploadAvatar'])->middleware(['jwt', 'verified']);
});

Route::middleware(['jwt', 'verified', 'growe.csrf'])->group(function () {
    // Assignments
    Route::post('/assignments', [AssignmentController::class, 'store']);
    Route::get('/assignments', [AssignmentController::class, 'index']);
    Route::get('/assignments/{id}', [AssignmentController::class, 'show']);
    Route::patch('/assignments/{id}', [AssignmentController::class, 'update']);
    Route::delete('/assignments/{id}', [AssignmentController::class, 'destroy']);

    // Groups + membership
    Route::post('/groups', [GroupController::class, 'store'])->middleware(['role:student,tutor']);
    Route::get('/groups', [GroupController::class, 'index']);
    Route::get('/groups/{id}', [GroupController::class, 'show']);
    Route::patch('/groups/{id}', [GroupController::class, 'update']);
    Route::delete('/groups/{id}', [GroupController::class, 'destroy']);
    Route::post('/groups/{id}/join-request', [GroupController::class, 'requestJoin'])->middleware(['role:student,tutor']);
    Route::post('/groups/{id}/approve/{userId}', [GroupController::class, 'approveJoin']);
    Route::get('/groups/{id}/members', [GroupController::class, 'members']);

    // Tutors + availability + slots
    Route::get('/tutors/list', [TutorController::class, 'listTutors']);
    Route::get('/tutors/slots', [TutorController::class, 'availableSlots']);

    Route::prefix('tutors')->middleware(['role:tutor'])->group(function () {
        Route::post('/profile', [TutorController::class, 'createProfile']);
        Route::get('/profile', [TutorController::class, 'getProfile']);
        Route::patch('/profile', [TutorController::class, 'updateProfile']);
        Route::post('/availability', [TutorController::class, 'addAvailability']);
        Route::get('/availability', [TutorController::class, 'listAvailability']);
        Route::delete('/availability/{id}', [TutorController::class, 'deleteAvailability']);
    });

    // Bookings
    Route::post('/bookings', [BookingController::class, 'store'])->middleware(['role:student']);
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus'])->middleware(['role:tutor']);

    // Meetings
    Route::post('/meetings', [MeetingController::class, 'store']);
    Route::get('/meetings', [MeetingController::class, 'index']);
    Route::get('/meetings/{id}', [MeetingController::class, 'show']);

    // Messaging REST endpoints (Socket.io handles realtime)
    Route::get('/conversations', [MessagingController::class, 'listConversations']);
    Route::get('/conversations/eligible-users', [MessagingController::class, 'eligibleUsers']);
    Route::post('/conversations/direct/{userId}', [MessagingController::class, 'direct']);
    Route::post('/conversations/group/{groupId}', [MessagingController::class, 'group']);
    Route::get('/conversations/meeting/{meetingId}', [MessagingController::class, 'meeting']);
    Route::get('/conversations/{id}', [MessagingController::class, 'conversation']);
    Route::get('/conversations/{id}/messages', [MessagingController::class, 'messages']);
    Route::post('/conversations/{id}/messages', [MessagingController::class, 'sendMessage'])->middleware(['throttle:60,1']);
    Route::get('/conversations/{id}/unread-count', [MessagingController::class, 'unreadCount']);
    Route::post('/conversations/{id}/read', [MessagingController::class, 'markRead']);
    Route::put('/messages/{id}', [MessagingController::class, 'editMessage'])->middleware(['throttle:60,1']);
    Route::delete('/messages/{id}', [MessagingController::class, 'deleteMessage']);

    // AI
    Route::post('/ai/chat', [AiController::class, 'chat'])->middleware(['throttle:20,1']);
});

Route::prefix('admin')->middleware(['jwt', 'admin', 'growe.csrf'])->group(function () {
    Route::get('/metrics', [AdminController::class, 'metrics']);
    Route::get('/meetings', [AdminController::class, 'activeMeetings']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{id}', [AdminController::class, 'removeUser']);
    Route::post('/tutors/{id}/suspend', [AdminController::class, 'suspendTutor']);
    Route::post('/tutors/{id}/unsuspend', [AdminController::class, 'unsuspendTutor']);
    Route::post('/meetings/{id}/terminate', [AdminController::class, 'terminateMeeting']);
    Route::get('/bookings/logs', [AdminController::class, 'bookingLogs']);
    Route::get('/reliability-ranking', [AdminController::class, 'reliabilityRanking']);
    Route::get('/audit-log', [AdminController::class, 'auditLog']);
});

