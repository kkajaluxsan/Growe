-- Optional scheduled time and tutor for group meetings
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_tutor_id ON meetings(tutor_id);
