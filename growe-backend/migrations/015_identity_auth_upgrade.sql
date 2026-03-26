-- Identity/Auth upgrade: provider fields, password reset tokens, refresh tokens.

-- Users: provider + provider_id for social login; make password_hash nullable for social accounts.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
  ALTER COLUMN password_hash DROP NOT NULL;

-- Optional "name" column (UI-friendly). Keep display_name as-is (added by 009_user_profile.sql).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
  ON users(provider, provider_id)
  WHERE provider_id IS NOT NULL;

-- Email verification tokens table already exists; ensure hashed token column and index exist.
ALTER TABLE email_verification_tokens
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
  ON email_verification_tokens(token_hash)
  WHERE token_hash IS NOT NULL;

-- Password reset tokens (hashed)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

-- Refresh tokens (hashed), supports rotation + revocation.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked
  ON refresh_tokens(revoked);

