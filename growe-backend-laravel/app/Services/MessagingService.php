<?php

namespace App\Services;

use App\Support\Sanitizer;
use Illuminate\Support\Facades\DB;

class MessagingService
{
    private const MAX_MESSAGE_LENGTH = 4000;
    private const MIN_MESSAGE_LENGTH = 1;

    public function listEligibleUsers(string $userId, bool $isAdmin, string $search = '', int $limit = 30): array
    {
        $limit = min(50, max(1, $limit));
        $searchTerm = trim(strtolower($search)) !== '' ? '%' . trim(strtolower($search)) . '%' : null;

        if ($isAdmin) {
            $params = [$userId];
            $sql = "
                SELECT u.id, u.email, u.display_name, u.avatar_url, r.name as role_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.is_active = true AND u.id != $1
            ";
            if ($searchTerm) {
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $sql .= " AND (LOWER(u.email) LIKE $2 OR LOWER(COALESCE(u.display_name, '')) LIKE $3)";
            }
            $params[] = $limit;
            $sql .= " ORDER BY COALESCE(u.display_name, u.email) ASC LIMIT $" . count($params);
            return DB::select($sql, $params);
        }

        $params = [$userId];
        $idx = 2;
        $conditions = [
            "u.is_active = true",
            "u.id != $1",
            "(
                EXISTS (
                    SELECT 1 FROM group_members g1
                    JOIN group_members g2 ON g1.group_id = g2.group_id AND g2.user_id = u.id AND g2.status = 'approved'
                    WHERE g1.user_id = $1 AND g1.status = 'approved'
                )
                OR EXISTS (
                    SELECT 1 FROM bookings b
                    JOIN tutor_availability ta ON b.availability_id = ta.id
                    JOIN tutor_profiles tp ON ta.tutor_id = tp.id
                    WHERE b.status IN ('confirmed', 'completed')
                      AND ((b.student_id = $1 AND tp.user_id = u.id) OR (b.student_id = u.id AND tp.user_id = $1))
                )
            )",
        ];
        if ($searchTerm) {
            $conditions[] = "(LOWER(u.email) LIKE $" . $idx . " OR LOWER(COALESCE(u.display_name, '')) LIKE $" . ($idx + 1) . ")";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $idx += 2;
        }
        $params[] = $limit;

        $sql = "
            SELECT DISTINCT u.id, u.email, u.display_name, u.avatar_url, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE " . implode(' AND ', $conditions) . "
            ORDER BY COALESCE(u.display_name, u.email) ASC
            LIMIT $" . count($params) . "
        ";
        return DB::select($sql, $params);
    }

    public function canMessageUser(string $userId, string $otherUserId, bool $isAdmin): bool
    {
        if ($userId === $otherUserId) return false;
        if ($isAdmin) return true;
        $rows = DB::select(
            "SELECT 1
             FROM users u
             WHERE u.id = $2 AND u.is_active = true
               AND (
                 EXISTS (
                   SELECT 1 FROM group_members g1
                   JOIN group_members g2 ON g1.group_id = g2.group_id AND g2.user_id = u.id AND g2.status = 'approved'
                   WHERE g1.user_id = $1 AND g1.status = 'approved'
                 )
                 OR EXISTS (
                   SELECT 1 FROM bookings b
                   JOIN tutor_availability ta ON b.availability_id = ta.id
                   JOIN tutor_profiles tp ON ta.tutor_id = tp.id
                   WHERE b.status IN ('confirmed', 'completed')
                     AND ((b.student_id = $1 AND tp.user_id = u.id) OR (b.student_id = u.id AND tp.user_id = $1))
                 )
               )",
            [$userId, $otherUserId]
        );
        return count($rows) > 0;
    }

    public function findDirectBetween(string $userId1, string $userId2): ?string
    {
        $row = DB::selectOne(
            "SELECT c.id FROM conversations c
             WHERE c.type = 'DIRECT'
               AND c.id IN (
                 SELECT conversation_id FROM conversation_participants
                 WHERE user_id IN ($1, $2)
                 GROUP BY conversation_id
                 HAVING COUNT(DISTINCT user_id) = 2
               )
             LIMIT 1",
            [$userId1, $userId2]
        );
        return $row?->id ?: null;
    }

    public function createConversation(string $type, ?string $groupId = null, ?string $meetingId = null): string
    {
        $row = DB::selectOne(
            "INSERT INTO conversations (type, group_id, meeting_id)
             VALUES ($1, $2, $3)
             RETURNING id",
            [$type, $groupId, $meetingId]
        );
        return (string) $row->id;
    }

    public function addParticipant(string $conversationId, string $userId): void
    {
        DB::selectOne(
            "INSERT INTO conversation_participants (conversation_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (conversation_id, user_id) DO UPDATE SET joined_at = NOW()
             RETURNING id",
            [$conversationId, $userId]
        );
    }

    public function getConversationById(string $conversationId): ?object
    {
        return DB::selectOne(
            "SELECT c.id, c.type, c.group_id, c.meeting_id, c.created_at,
                    sg.name as group_name
             FROM conversations c
             LEFT JOIN study_groups sg ON c.group_id = sg.id
             WHERE c.id = $1",
            [$conversationId]
        );
    }

    public function isParticipant(string $conversationId, string $userId): bool
    {
        return (bool) DB::selectOne(
            "SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2",
            [$conversationId, $userId]
        );
    }

    public function listConversations(string $userId, int $limit = 50, int $offset = 0): array
    {
        $limit = min(50, max(1, $limit));
        $offset = max(0, $offset);

        $rows = DB::select(
            "SELECT c.id, c.type, c.group_id, c.meeting_id, c.created_at,
                    cp.last_read_at, sg.name as group_name,
                    (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
                    (SELECT created_at FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
                    (SELECT u.display_name FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id WHERE cp2.conversation_id = c.id AND cp2.user_id != $1 LIMIT 1) as direct_other_display_name,
                    (SELECT u.email FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id WHERE cp2.conversation_id = c.id AND cp2.user_id != $1 LIMIT 1) as direct_other_email
             FROM conversation_participants cp
             JOIN conversations c ON cp.conversation_id = c.id
             LEFT JOIN study_groups sg ON c.group_id = sg.id
             WHERE cp.user_id = $1
             ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
             LIMIT $2 OFFSET $3",
            [$userId, $limit, $offset]
        );

        $withUnread = [];
        foreach ($rows as $c) {
            $unread = $this->getUnreadCount($c->id, $userId);
            $withUnread[] = array_merge((array) $c, ['unreadCount' => $unread]);
        }
        return $withUnread;
    }

    public function getUnreadCount(string $conversationId, string $userId): int
    {
        $row = DB::selectOne(
            "SELECT cp.last_read_at FROM conversation_participants cp
             WHERE cp.conversation_id = $1 AND cp.user_id = $2",
            [$conversationId, $userId]
        );
        $lastRead = $row?->last_read_at;
        if (!$lastRead) {
            $countRow = DB::selectOne(
                "SELECT COUNT(*)::int as c FROM messages m
                 WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND m.sender_id != $2",
                [$conversationId, $userId]
            );
            return (int) ($countRow->c ?? 0);
        }
        $countRow = DB::selectOne(
            "SELECT COUNT(*)::int as c FROM messages m
             WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND m.sender_id != $2 AND m.created_at > $3",
            [$conversationId, $userId, $lastRead]
        );
        return (int) ($countRow->c ?? 0);
    }

    public function markAsRead(string $conversationId, string $userId): void
    {
        DB::selectOne(
            "UPDATE conversation_participants SET last_read_at = NOW()
             WHERE conversation_id = $1 AND user_id = $2
             RETURNING id",
            [$conversationId, $userId]
        );
    }

    public function getParticipants(string $conversationId): array
    {
        return DB::select(
            "SELECT cp.user_id, u.email, u.display_name
             FROM conversation_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.conversation_id = $1",
            [$conversationId]
        );
    }

    public function listMessages(string $conversationId, int $page = 1, int $limit = 20): array
    {
        $limit = min(50, max(1, $limit));
        $offset = (max(1, $page) - 1) * $limit;

        $rows = DB::select(
            "SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.created_at, m.edited_at, m.deleted_at,
                    u.email as sender_email, u.display_name as sender_display_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
             ORDER BY m.created_at DESC
             LIMIT $2 OFFSET $3",
            [$conversationId, $limit, $offset]
        );
        return array_reverse($rows);
    }

    public function sendMessage(string $conversationId, string $userId, string $content, string $messageType = 'TEXT'): object
    {
        if (!$this->isParticipant($conversationId, $userId)) {
            abort(response()->json(['error' => 'Access denied'], 403));
        }

        $user = DB::selectOne("SELECT id, is_active FROM users WHERE id = $1", [$userId]);
        if (!$user || !$user->is_active) {
            abort(response()->json(['error' => 'Account is deactivated'], 403));
        }

        $tp = DB::selectOne("SELECT is_suspended FROM tutor_profiles WHERE user_id = $1", [$userId]);
        if ($tp && $tp->is_suspended) {
            abort(response()->json(['error' => 'Your tutor account is suspended'], 403));
        }

        $san = Sanitizer::sanitizeMessageContent($content);
        if (strlen($san) < self::MIN_MESSAGE_LENGTH) {
            abort(response()->json(['error' => 'Message content is required'], 400));
        }
        if (strlen($san) > self::MAX_MESSAGE_LENGTH) {
            abort(response()->json(['error' => "Message must be at most " . self::MAX_MESSAGE_LENGTH . " characters"], 400));
        }

        $mt = ($messageType === 'SYSTEM') ? 'SYSTEM' : 'TEXT';
        $row = DB::selectOne(
            "INSERT INTO messages (conversation_id, sender_id, content, message_type)
             VALUES ($1, $2, $3, $4)
             RETURNING id",
            [$conversationId, $userId, $san, $mt]
        );

        return DB::selectOne(
            "SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.created_at, m.edited_at, m.deleted_at,
                    u.email as sender_email, u.display_name as sender_display_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = $1",
            [$row->id]
        );
    }

    public function editMessage(string $messageId, string $userId, string $content): ?object
    {
        $existing = DB::selectOne("SELECT id, sender_id, conversation_id FROM messages WHERE id = $1", [$messageId]);
        if (!$existing) abort(response()->json(['error' => 'Message not found'], 404));
        if ($existing->sender_id !== $userId) abort(response()->json(['error' => 'You can only edit your own messages'], 403));
        if (!$this->isParticipant($existing->conversation_id, $userId)) abort(response()->json(['error' => 'Access denied'], 403));

        $san = Sanitizer::sanitizeMessageContent($content);
        if (strlen($san) < self::MIN_MESSAGE_LENGTH || strlen($san) > self::MAX_MESSAGE_LENGTH) {
            abort(response()->json(['error' => "Message must be between " . self::MIN_MESSAGE_LENGTH . " and " . self::MAX_MESSAGE_LENGTH . " characters"], 400));
        }

        $updated = DB::selectOne(
            "UPDATE messages SET content = $1, edited_at = NOW()
             WHERE id = $2 AND sender_id = $3 AND deleted_at IS NULL
             RETURNING id",
            [$san, $messageId, $userId]
        );
        if (!$updated) return null;

        return DB::selectOne(
            "SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.created_at, m.edited_at, m.deleted_at,
                    u.email as sender_email, u.display_name as sender_display_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = $1",
            [$messageId]
        );
    }

    public function deleteMessage(string $messageId, string $userId): void
    {
        $existing = DB::selectOne("SELECT id, sender_id FROM messages WHERE id = $1", [$messageId]);
        if (!$existing) abort(response()->json(['error' => 'Message not found'], 404));
        if ($existing->sender_id !== $userId) abort(response()->json(['error' => 'You can only delete your own messages'], 403));

        DB::selectOne(
            "UPDATE messages SET deleted_at = NOW()
             WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL
             RETURNING id",
            [$messageId, $userId]
        );
    }

    public function getOrCreateGroupConversation(string $userId, string $groupId): array
    {
        $member = DB::selectOne("SELECT status FROM group_members WHERE group_id = $1 AND user_id = $2", [$groupId, $userId]);
        if (!$member || $member->status !== 'approved') {
            return ['ok' => false, 'status' => 403, 'error' => 'You must be an approved group member'];
        }

        $conv = DB::selectOne("SELECT id FROM conversations WHERE type = 'GROUP' AND group_id = $1", [$groupId]);
        if ($conv) {
            return ['ok' => true, 'created' => false, 'conversation' => $this->getConversationById($conv->id)];
        }

        $cid = $this->createConversation('GROUP', $groupId, null);
        $members = DB::select("SELECT user_id, status FROM group_members WHERE group_id = $1", [$groupId]);
        foreach ($members as $m) {
            if ($m->status === 'approved') $this->addParticipant($cid, $m->user_id);
        }
        return ['ok' => true, 'created' => true, 'conversation' => $this->getConversationById($cid)];
    }

    public function getOrCreateMeetingConversation(string $userId, string $meetingId): array
    {
        $meeting = DB::selectOne("SELECT id, group_id FROM meetings WHERE id = $1", [$meetingId]);
        if (!$meeting) return ['ok' => false, 'status' => 404, 'error' => 'Meeting not found'];

        $member = DB::selectOne("SELECT status FROM group_members WHERE group_id = $1 AND user_id = $2", [$meeting->group_id, $userId]);
        if (!$member || $member->status !== 'approved') {
            return ['ok' => false, 'status' => 403, 'error' => 'You must be a group member to access this meeting chat'];
        }

        $conv = DB::selectOne("SELECT id FROM conversations WHERE type = 'MEETING' AND meeting_id = $1", [$meetingId]);
        if ($conv) {
            $this->addParticipant($conv->id, $userId);
            return ['ok' => true, 'created' => false, 'conversation' => $this->getConversationById($conv->id)];
        }

        $cid = $this->createConversation('MEETING', null, $meetingId);
        $this->addParticipant($cid, $userId);
        return ['ok' => true, 'created' => true, 'conversation' => $this->getConversationById($cid)];
    }

    public function getOrCreateDirectConversation(string $userId, string $otherUserId, bool $isAdmin): array
    {
        if ($userId === $otherUserId) {
            return ['ok' => false, 'status' => 400, 'error' => 'Cannot create conversation with yourself'];
        }

        $other = DB::selectOne("SELECT id, is_active FROM users WHERE id = $1", [$otherUserId]);
        if (!$other || !$other->is_active) {
            return ['ok' => false, 'status' => 404, 'error' => 'User not found or inactive'];
        }

        if (!$this->canMessageUser($userId, $otherUserId, $isAdmin)) {
            return [
                'ok' => false,
                'status' => 403,
                'error' => 'You can only message users in your study groups, or tutors/students you have a confirmed booking with.',
                'code' => 'MESSAGING_NOT_ALLOWED',
            ];
        }

        $existingId = $this->findDirectBetween($userId, $otherUserId);
        if ($existingId) {
            return ['ok' => true, 'created' => false, 'conversation' => $this->getConversationById($existingId)];
        }

        $cid = $this->createConversation('DIRECT');
        $this->addParticipant($cid, $userId);
        $this->addParticipant($cid, $otherUserId);
        return ['ok' => true, 'created' => true, 'conversation' => $this->getConversationById($cid)];
    }
}

