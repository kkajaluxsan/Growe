<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessagingController extends Controller
{
    public function listConversations(Request $request, MessagingService $svc): JsonResponse
    {
        $list = $svc->listConversations(
            $request->user()->id,
            (int) ($request->query('limit', 50)),
            (int) ($request->query('offset', 0))
        );
        return response()->json($list);
    }

    public function eligibleUsers(Request $request, MessagingService $svc): JsonResponse
    {
        $isAdmin = ($request->user()->role?->name) === 'admin';
        $users = $svc->listEligibleUsers(
            $request->user()->id,
            $isAdmin,
            (string) ($request->query('q', '') ?? ''),
            (int) min(50, (int) ($request->query('limit', 30)))
        );
        return response()->json($users);
    }

    public function direct(Request $request, string $userId, MessagingService $svc): JsonResponse
    {
        $isAdmin = ($request->user()->role?->name) === 'admin';
        $res = $svc->getOrCreateDirectConversation($request->user()->id, $userId, $isAdmin);
        if (!$res['ok']) {
            $body = ['error' => $res['error']];
            if (!empty($res['code'])) $body['code'] = $res['code'];
            return response()->json($body, $res['status']);
        }
        return response()->json($res['conversation'], $res['created'] ? 201 : 200);
    }

    public function group(Request $request, string $groupId, MessagingService $svc): JsonResponse
    {
        $res = $svc->getOrCreateGroupConversation($request->user()->id, $groupId);
        if (!$res['ok']) return response()->json(['error' => $res['error']], $res['status']);
        $participants = $svc->getParticipants($res['conversation']->id);
        return response()->json(array_merge((array) $res['conversation'], ['participants' => $participants]), $res['created'] ? 201 : 200);
    }

    public function meeting(Request $request, string $meetingId, MessagingService $svc): JsonResponse
    {
        $res = $svc->getOrCreateMeetingConversation($request->user()->id, $meetingId);
        if (!$res['ok']) return response()->json(['error' => $res['error']], $res['status']);
        $participants = $svc->getParticipants($res['conversation']->id);
        return response()->json(array_merge((array) $res['conversation'], ['participants' => $participants]), $res['created'] ? 201 : 200);
    }

    public function conversation(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        $conversation = $svc->getConversationById($id);
        if (!$conversation) return response()->json(['error' => 'Conversation not found'], 404);
        if (!$svc->isParticipant($id, $request->user()->id)) return response()->json(['error' => 'Access denied'], 403);
        $participants = $svc->getParticipants($id);
        return response()->json(array_merge((array) $conversation, ['participants' => $participants]));
    }

    public function messages(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        if (!$svc->isParticipant($id, $request->user()->id)) return response()->json(['error' => 'Access denied'], 403);
        $page = (int) ($request->query('page', 1));
        $limit = (int) min(50, (int) ($request->query('limit', 20)));
        return response()->json($svc->listMessages($id, $page, $limit));
    }

    public function sendMessage(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        $content = $request->input('content');
        if (!is_string($content)) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Content is required']], 400);
        }
        $messageType = (string) ($request->input('messageType', 'TEXT'));
        $msg = $svc->sendMessage($id, $request->user()->id, $content, $messageType);
        return response()->json($msg, 201);
    }

    public function unreadCount(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        if (!$svc->isParticipant($id, $request->user()->id)) return response()->json(['error' => 'Access denied'], 403);
        return response()->json(['unreadCount' => $svc->getUnreadCount($id, $request->user()->id)]);
    }

    public function markRead(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        if (!$svc->isParticipant($id, $request->user()->id)) return response()->json(['error' => 'Access denied'], 403);
        $svc->markAsRead($id, $request->user()->id);
        return response()->json(null, 204);
    }

    public function editMessage(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        $content = $request->input('content');
        if (!is_string($content)) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Content is required']], 400);
        }
        $msg = $svc->editMessage($id, $request->user()->id, $content);
        if (!$msg) return response()->json(['error' => 'Message not found'], 404);
        return response()->json($msg);
    }

    public function deleteMessage(Request $request, string $id, MessagingService $svc): JsonResponse
    {
        $svc->deleteMessage($id, $request->user()->id);
        return response()->json(null, 204);
    }
}

