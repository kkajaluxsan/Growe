ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(start_time) WHERE status = 'confirmed' AND reminder_sent_at IS NULL;
