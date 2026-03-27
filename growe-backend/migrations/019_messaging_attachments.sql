-- Chat file attachments (documents, images, etc.)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('TEXT', 'SYSTEM', 'FILE'));

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(512);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(127);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size BIGINT;
