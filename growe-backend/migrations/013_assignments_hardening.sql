-- Soft delete, required deadline & description, priority 1–3 (LOW/MEDIUM/HIGH), status without overdue

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Normalize legacy priority (4–5 → HIGH)
UPDATE assignments SET priority = 3 WHERE priority > 3;

-- Backfill description and deadline before NOT NULL
UPDATE assignments
SET description = '[No description]'
WHERE description IS NULL OR trim(description) = '';

UPDATE assignments
SET deadline = created_at + interval '7 days'
WHERE deadline IS NULL;

ALTER TABLE assignments ALTER COLUMN description SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN deadline SET NOT NULL;

-- Map legacy overdue status to in_progress (overdue is derived from deadline in the API)
UPDATE assignments SET status = 'in_progress' WHERE status = 'overdue';

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_priority_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_priority_check
  CHECK (priority >= 1 AND priority <= 3);

CREATE INDEX IF NOT EXISTS idx_assignments_deleted_at ON assignments (deleted_at) WHERE deleted_at IS NULL;
