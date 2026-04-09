-- One "starting soon" in-app reminder per booking (Teams-style), separate from 24h reminder.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS imminent_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_imminent_reminder
  ON bookings (start_time)
  WHERE status = 'confirmed' AND imminent_reminder_sent_at IS NULL;
