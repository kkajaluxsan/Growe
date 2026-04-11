-- Academic identity: year, semester, specialization, index number, Sri Lankan mobile.
-- Nullable columns preserve existing accounts; new registrations require these via application validation.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS academic_year INTEGER,
  ADD COLUMN IF NOT EXISTS semester INTEGER,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS index_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_academic_year;
ALTER TABLE users ADD CONSTRAINT chk_users_academic_year
  CHECK (academic_year IS NULL OR (academic_year >= 1 AND academic_year <= 4));

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_semester;
ALTER TABLE users ADD CONSTRAINT chk_users_semester
  CHECK (semester IS NULL OR semester IN (1, 2));

DROP INDEX IF EXISTS idx_users_index_number_unique;
CREATE UNIQUE INDEX idx_users_index_number_unique ON users (index_number) WHERE index_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_specialization ON users (specialization);

-- Prefer canonical mobile on users; copy from legacy user_profiles when present
UPDATE users u
SET phone_number = TRIM(up.phone)
FROM user_profiles up
WHERE up.user_id = u.id
  AND (u.phone_number IS NULL OR TRIM(COALESCE(u.phone_number, '')) = '')
  AND up.phone IS NOT NULL
  AND TRIM(up.phone) <> '';
