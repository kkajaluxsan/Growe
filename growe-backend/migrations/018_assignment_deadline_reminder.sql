-- One 24h deadline reminder per assignment (dedupe for scheduler)

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS deadline_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_assignments_deadline_reminder
  ON assignments (deadline)
  WHERE deleted_at IS NULL
    AND deadline_reminder_sent_at IS NULL
    AND status <> 'completed';
