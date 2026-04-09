-- Schoolwide assignments: when true, all verified users see the row (admin-created).
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS visible_to_all BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN assignments.visible_to_all IS 'Admin-only: visible to all students/tutors on the platform.';

CREATE INDEX IF NOT EXISTS idx_assignments_visible_to_all
  ON assignments (visible_to_all)
  WHERE visible_to_all = TRUE AND deleted_at IS NULL;
