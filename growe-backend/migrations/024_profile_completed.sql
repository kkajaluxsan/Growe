ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

-- Existing rows that already have full academic identity
UPDATE users
SET profile_completed = true
WHERE profile_completed = false
  AND index_number IS NOT NULL
  AND TRIM(index_number) <> ''
  AND specialization IS NOT NULL
  AND TRIM(specialization) <> ''
  AND academic_year IS NOT NULL
  AND semester IS NOT NULL
  AND phone_number IS NOT NULL
  AND TRIM(phone_number) <> '';

CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users (profile_completed);
