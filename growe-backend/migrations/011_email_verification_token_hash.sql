-- Store hashed verification tokens instead of plain text (token kept nullable for backward compat)
ALTER TABLE email_verification_tokens ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
ALTER TABLE email_verification_tokens ALTER COLUMN token DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash) WHERE token_hash IS NOT NULL;
