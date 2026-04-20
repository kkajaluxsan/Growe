-- Add NIC number column for tutors and admins
-- Format: Sri Lankan NIC is 9 digits followed by V (e.g., 123456789V)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nic_number TEXT;

-- Add unique constraint for nic_number when present
DROP INDEX IF EXISTS idx_users_nic_number_unique;
CREATE UNIQUE INDEX idx_users_nic_number_unique ON users (nic_number) WHERE nic_number IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_nic_number ON users (nic_number);
