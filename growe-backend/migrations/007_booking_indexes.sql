-- Composite index for overlap queries (availability_id + time range)
CREATE INDEX IF NOT EXISTS idx_bookings_availability_status_time
  ON bookings(availability_id, status) WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_student_status_time
  ON bookings(student_id, status) WHERE status != 'cancelled';
