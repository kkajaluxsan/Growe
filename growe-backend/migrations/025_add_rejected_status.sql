-- Add 'rejected' to the allowed statuses for bookings
ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rejected', 'waiting_tutor_confirmation'));
