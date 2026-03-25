<?php

namespace App\Services;

use App\Models\Assignment;
use App\Support\Sanitizer;

class AssignmentService
{
    public const PRIORITY_TO_DB = ['LOW' => 1, 'MEDIUM' => 2, 'HIGH' => 3];
    public const DB_TO_PRIORITY_LABEL = [1 => 'LOW', 2 => 'MEDIUM', 3 => 'HIGH'];
    public const STATUS_TO_DB = ['PENDING' => 'pending', 'IN_PROGRESS' => 'in_progress', 'COMPLETED' => 'completed'];

    public function enrich(Assignment $a): array
    {
        $deadline = $a->deadline ? $a->deadline->getTimestamp() * 1000 : null;
        $isOverdue = $a->deadline && $a->deadline->isPast() && $a->status !== 'completed';

        return array_merge($a->toArray(), [
            'priorityLabel' => self::DB_TO_PRIORITY_LABEL[$a->priority] ?? 'MEDIUM',
            'isOverdue' => (bool) $isOverdue,
        ]);
    }

    private function normalizeStatus(?string $api): ?string
    {
        if ($api === null) return null;
        $key = strtoupper((string) $api);
        return self::STATUS_TO_DB[$key] ?? null;
    }

    private function normalizePriority(?string $api): ?int
    {
        if ($api === null) return null;
        $key = strtoupper((string) $api);
        return self::PRIORITY_TO_DB[$key] ?? null;
    }

    public function create(string $userId, array $data): Assignment
    {
        $a = new Assignment();
        $a->user_id = $userId;
        $a->title = Sanitizer::sanitizePlainText($data['title']);
        $a->description = Sanitizer::sanitizePlainText($data['description']);
        $a->status = $this->normalizeStatus($data['status'] ?? 'PENDING') ?? 'pending';
        $a->priority = $this->normalizePriority($data['priority'] ?? 'MEDIUM') ?? 2;
        $a->deadline = $data['deadline'];
        $a->save();
        return $a;
    }

    public function list(string $userId, array $query): array
    {
        $status = $query['status'] ?? null;
        $priorityDb = isset($query['priority']) ? $this->normalizePriority($query['priority']) : null;
        $sortBy = $query['sortBy'] ?? 'deadline';
        $sortOrder = ($query['sortOrder'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
        $limit = (int) ($query['limit'] ?? 20);
        $offset = (int) ($query['offset'] ?? 0);

        $q = Assignment::query()->where('user_id', $userId);
        if ($status) $q->where('status', $status);
        if ($priorityDb !== null) $q->where('priority', $priorityDb);
        if (!empty($query['deadlineAfter'])) $q->where('deadline', '>=', $query['deadlineAfter']);
        if (!empty($query['deadlineBefore'])) $q->where('deadline', '<=', $query['deadlineBefore']);

        $validSort = ['deadline', 'created_at', 'priority', 'title'];
        if (!in_array($sortBy, $validSort, true)) $sortBy = 'deadline';

        $total = (clone $q)->count();
        $rows = $q->orderBy($sortBy, $sortOrder)->limit($limit)->offset($offset)->get();

        return [
            'assignments' => $rows->map(fn ($a) => $this->enrich($a))->values()->all(),
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }

    private function assertStatusTransition(string $prevDb, string $nextDb, bool $isAdmin, bool $adminOverrideCompleted): void
    {
        if ($prevDb === $nextDb) return;
        if ($prevDb === 'completed' && (!$isAdmin || !$adminOverrideCompleted)) {
            abort(response()->json([
                'success' => false,
                'error' => 'Cannot change status of a completed assignment without admin override',
                'details' => [
                    'Completed assignments stay completed unless an admin sends adminOverrideCompleted: true and a new status.',
                ],
            ], 403));
        }

        $allowed = [
            'pending' => ['in_progress', 'completed', 'pending'],
            'in_progress' => ['pending', 'in_progress', 'completed'],
            'completed' => ['completed'],
        ];
        $set = $allowed[$prevDb] ?? [];
        if (!in_array($nextDb, $set, true)) {
            abort(response()->json([
                'success' => false,
                'error' => 'Invalid status transition',
                'details' => ["Cannot move from {$prevDb} to {$nextDb}. Allowed: " . implode(', ', $set)],
            ], 400));
        }
    }

    public function update(Assignment $assignment, array $patch, string $requesterRoleName, bool $adminOverrideCompleted): Assignment
    {
        $isAdmin = $requesterRoleName === 'admin';

        if ($assignment->status === 'completed' && (!$isAdmin || !$adminOverrideCompleted)) {
            abort(response()->json([
                'success' => false,
                'error' => 'Completed assignments cannot be modified without admin override',
                'details' => [
                    'Admins must send adminOverrideCompleted: true to edit fields or regress status on a completed assignment.',
                ],
            ], 403));
        }

        if (array_key_exists('status', $patch)) {
            $next = $this->normalizeStatus($patch['status']);
            if ($next === null) {
                abort(response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Status must be PENDING, IN_PROGRESS, or COMPLETED']], 400));
            }
            $this->assertStatusTransition($assignment->status, $next, $isAdmin, $adminOverrideCompleted);
            $assignment->status = $next;
        }

        if (array_key_exists('priority', $patch)) {
            $p = $this->normalizePriority($patch['priority']);
            if ($p === null) {
                abort(response()->json(['success' => false, 'error' => 'Validation failed', 'details' => ['Priority must be LOW, MEDIUM, or HIGH']], 400));
            }
            $assignment->priority = $p;
        }

        if (array_key_exists('title', $patch)) {
            $assignment->title = Sanitizer::sanitizePlainText($patch['title']);
        }
        if (array_key_exists('description', $patch)) {
            $assignment->description = Sanitizer::sanitizePlainText($patch['description']);
        }
        if (array_key_exists('deadline', $patch)) {
            $newDeadline = new \DateTimeImmutable((string) $patch['deadline']);
            $prevMs = $assignment->deadline ? $assignment->deadline->getTimestamp() : null;
            $unchanged = $prevMs !== null && abs(($newDeadline->getTimestamp()) - $prevMs) < 2;
            if (!$unchanged && $newDeadline->getTimestamp() <= time()) {
                abort(response()->json(['success' => false, 'error' => 'Invalid deadline', 'details' => ['Deadline must be after the current date and time when changing the due date']], 400));
            }
            if (!$unchanged) {
                $assignment->deadline = $newDeadline->format('c');
            }
        }

        $assignment->save();
        return $assignment;
    }
}

