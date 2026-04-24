ALTER TABLE group_quiz_attempts ADD COLUMN answers JSONB DEFAULT '[]'::jsonb;
