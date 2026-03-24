-- Profile fields for all users (tutor + student)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);

-- Extended profile (optional bio, phone for students; tutors already have tutor_profiles)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50),
  bio TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
