-- Update tutor_ratings to allow multiple students to rate the same booking (for group sessions).
-- We remove the single-booking unique constraint and replace it with a unique constraint on (booking_id, student_id).

ALTER TABLE tutor_ratings DROP CONSTRAINT IF EXISTS tutor_ratings_booking_id_key;

-- In case it was created via a different name or as a unique index:
DROP INDEX IF EXISTS idx_tutor_ratings_booking_id;

ALTER TABLE tutor_ratings
ADD CONSTRAINT tutor_ratings_booking_student_unique UNIQUE (booking_id, student_id);

CREATE INDEX IF NOT EXISTS idx_tutor_ratings_booking_id ON tutor_ratings(booking_id);
