<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\RequestVerificationEmailRequest;
use App\Http\Requests\Auth\UpdateMeRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\EmailVerificationService;
use App\Services\MailService;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function register(
        RegisterRequest $request,
        EmailVerificationService $verification,
        MailService $mail
    ): JsonResponse {
        $email = strtolower(trim($request->input('email')));
        $password = (string) $request->input('password');
        $roleName = (string) $request->input('roleName');

        if (User::where('email', $email)->exists()) {
            return response()->json(['error' => 'Email already registered'], 409);
        }

        $role = Role::where('name', $roleName)->first();
        if (!$role) {
            return response()->json(['error' => 'Invalid role'], 400);
        }

        $user = new User();
        $user->email = $email;
        $user->password_hash = Hash::make($password);
        $user->role_id = $role->id;
        $user->is_verified = false;
        $user->is_active = true;
        $user->save();

        $token = $verification->generateToken();
        $expiresAt = now()->addMinutes($verification->verificationExpiryMinutes());
        $expiryLabel = $verification->verificationExpiryLabel();
        $verification->deleteByUserId($user->id);
        $verification->createTokenForUser($user, $token, $expiresAt);

        $skipEmailVerification =
            app()->environment('local', 'development') &&
            env('FORCE_EMAIL_VERIFICATION') !== '1' &&
            !$mail->smtpConfigured();

        $verificationUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/verify-email?token=' . urlencode($token);

        $isVerified = false;
        if ($skipEmailVerification) {
            $user->is_verified = true;
            $user->save();
            $verification->deleteByUserId($user->id);
            $isVerified = true;
        } else {
            try {
                $mail->sendVerificationEmail($user->email, $token, $expiryLabel);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Account created but we could not send the verification email. On the login page, use "Resend verification email" with your address, or configure SMTP.',
                ], 503);
            }
        }

        $payload = [
            'message' => $skipEmailVerification
                ? 'Registration successful. You can log in now (dev: email skip).'
                : 'Registration successful. Please verify your email by clicking the link we sent you.',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'roleName' => $roleName,
                'isVerified' => $isVerified,
            ],
        ];

        if (app()->environment('local', 'development')) {
            $payload['verificationLink'] = $verificationUrl;
        }

        return response()->json($payload, 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');

        $user = User::with('role')->where('email', $email)->first();
        if (!$user) {
            return response()->json(['error' => 'Invalid email or password'], 401);
        }

        if (!Hash::check($password, $user->password_hash)) {
            return response()->json(['error' => 'Invalid email or password'], 401);
        }

        if (!$user->is_verified) {
            return response()->json([
                'error' => 'Please verify your email before signing in. Check your inbox or request a new verification link.',
                'code' => 'EMAIL_NOT_VERIFIED',
                'email' => $user->email,
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json(['error' => 'Account is deactivated'], 403);
        }

        $token = JWTAuth::fromUser($user, ['userId' => $user->id, 'email' => $user->email]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'displayName' => $user->display_name,
                'avatarUrl' => $user->avatar_url,
                'roleName' => $user->role?->name,
                'isVerified' => (bool) $user->is_verified,
            ],
        ]);
    }

    public function verifyEmail(Request $request, EmailVerificationService $verification): JsonResponse
    {
        $token = trim((string) $request->query('token', ''));
        if ($token === '') {
            return response()->json([
                'success' => false,
                'error' => 'Verification token required',
                'code' => 'TOKEN_MISSING',
            ], 400);
        }

        $verification->deleteExpired();
        $record = $verification->findByToken($token);
        if (!$record) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid or expired verification link. Request a new one from the login page.',
                'code' => 'TOKEN_INVALID_OR_EXPIRED',
            ], 400);
        }

        $user = User::find($record->user_id);
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        $user->is_verified = true;
        $user->save();
        $verification->deleteByToken($token);

        return response()->json(['success' => true, 'message' => 'Email verified successfully']);
    }

    public function requestVerificationEmail(
        RequestVerificationEmailRequest $request,
        EmailVerificationService $verification,
        MailService $mail
    ): JsonResponse {
        $email = strtolower(trim((string) $request->input('email')));
        $genericSuccess = [
            'success' => true,
            'message' => 'If an account exists for this email and is not verified, we sent a verification link.',
        ];

        $user = User::where('email', $email)->first();
        if (!$user || $user->is_verified) {
            return response()->json($genericSuccess);
        }

        $existing = $verification->findValidByUserId($user->id);
        if ($existing) {
            $minsLeft = (int) round(($existing->expires_at->getTimestamp() - time()) / 60);
            if ($minsLeft > 20) {
                return response()->json([
                    'success' => false,
                    'error' => "Please wait before requesting another email. Try again in about {$minsLeft} minutes.",
                    'code' => 'RESEND_TOO_SOON',
                ], 429);
            }
        }

        $token = $verification->generateToken();
        $expiresAt = now()->addMinutes($verification->verificationExpiryMinutes());
        $expiryLabel = $verification->verificationExpiryLabel();
        $verification->deleteByUserId($user->id);
        $verification->createTokenForUser($user, $token, $expiresAt);

        try {
            $mail->sendVerificationEmail($user->email, $token, $expiryLabel);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => 'Could not send email. Check SMTP settings or try again later.'], 503);
        }

        return response()->json($genericSuccess);
    }

    public function resendVerification(
        Request $request,
        EmailVerificationService $verification,
        MailService $mail
    ): JsonResponse {
        /** @var \App\Models\User $user */
        $user = $request->user();
        if ($user->is_verified) {
            return response()->json(['success' => false, 'error' => 'Email is already verified'], 400);
        }

        $existing = $verification->findValidByUserId($user->id);
        if ($existing) {
            $minsLeft = (int) round(($existing->expires_at->getTimestamp() - time()) / 60);
            if ($minsLeft > 20) {
                return response()->json([
                    'success' => false,
                    'error' => "Please wait before requesting another email. Try again in {$minsLeft} minutes.",
                    'code' => 'RESEND_TOO_SOON',
                ], 429);
            }
        }

        $token = $verification->generateToken();
        $expiresAt = now()->addMinutes($verification->verificationExpiryMinutes());
        $expiryLabel = $verification->verificationExpiryLabel();
        $verification->deleteByUserId($user->id);
        $verification->createTokenForUser($user, $token, $expiresAt);

        try {
            $mail->sendVerificationEmail($user->email, $token, $expiryLabel);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => 'Failed to send verification email. Try again later.'], 503);
        }

        return response()->json(['success' => true, 'message' => 'Verification email sent. Check your inbox.']);
    }

    public function refreshToken(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        if (!$user || !$user->is_verified) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        $user->load('role');
        $token = JWTAuth::fromUser($user, ['userId' => $user->id, 'email' => $user->email]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'displayName' => $user->display_name,
                'avatarUrl' => $user->avatar_url,
                'roleName' => $user->role?->name,
                'isVerified' => (bool) $user->is_verified,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user()->load('role', 'profile');

        $bookingService = app(BookingService::class);
        $rel = $bookingService->getReliabilityForStudent($user->id);
        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'displayName' => $user->display_name,
            'avatarUrl' => $user->avatar_url,
            'roleName' => $user->role?->name,
            'isVerified' => (bool) $user->is_verified,
            'isActive' => (bool) $user->is_active,
            'createdAt' => optional($user->created_at)->toIso8601String(),
            'phone' => $user->profile?->phone,
            'bio' => $user->profile?->bio,
            'reliabilityScore' => (float) $rel['score'],
            'reliabilityTotal' => (int) $rel['total'],
        ]);
    }

    public function updateMe(UpdateMeRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $user->display_name = $request->input('displayName') !== null ? trim((string) $request->input('displayName')) : $user->display_name;
        $user->save();

        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'phone' => $request->input('phone') !== null ? trim((string) $request->input('phone')) : null,
                'bio' => $request->input('bio') !== null ? trim((string) $request->input('bio')) : null,
                'updated_at' => now(),
            ]
        );

        $user->load('role', 'profile');

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'displayName' => $user->display_name,
            'avatarUrl' => $user->avatar_url,
            'roleName' => $user->role?->name,
            'isVerified' => (bool) $user->is_verified,
            'isActive' => (bool) $user->is_active,
            'createdAt' => optional($user->created_at)->toIso8601String(),
            'phone' => $user->profile?->phone,
            'bio' => $user->profile?->bio,
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (!$request->hasFile('avatar')) {
            return response()->json(['error' => 'No image file uploaded'], 400);
        }

        $file = $request->file('avatar');
        if (!$file->isValid()) {
            return response()->json(['error' => 'Image upload failed'], 400);
        }

        $name = Str::uuid()->toString() . '.' . strtolower($file->getClientOriginalExtension() ?: 'png');
        $dest = public_path('uploads/avatars');
        if (!is_dir($dest)) {
            @mkdir($dest, 0775, true);
        }
        $file->move($dest, $name);

        $avatarUrl = '/uploads/avatars/' . $name;
        $user->avatar_url = $avatarUrl;
        $user->save();
        $user->load('role');

        return response()->json([
            'avatarUrl' => $avatarUrl,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'displayName' => $user->display_name,
                'avatarUrl' => $user->avatar_url,
                'roleName' => $user->role?->name,
                'isVerified' => (bool) $user->is_verified,
            ],
        ]);
    }
}

