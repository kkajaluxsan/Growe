-- Tutor ratings: students rate tutors 1-5 stars after a completed booking.
-- One rating per booking (enforced by UNIQUE on booking_id).

CREATE TABLE IF NOT EXISTS tutor_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_ratings_tutor_id ON tutor_ratings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_ratings_student_id ON tutor_ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_ratings_booking_id ON tutor_ratings(booking_id);
