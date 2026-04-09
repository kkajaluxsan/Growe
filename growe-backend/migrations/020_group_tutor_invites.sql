-- Tutor invite workflow for study groups (request → accept/reject → join + meeting)
CREATE TABLE IF NOT EXISTS group_tutor_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  tutor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  subject TEXT,
  availability_id UUID NOT NULL REFERENCES tutor_availability(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_tutor_invites_slot_order CHECK (slot_end > slot_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_tutor_invites_one_pending_per_group_tutor
  ON group_tutor_invites (group_id, tutor_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_group_tutor_invites_group_id ON group_tutor_invites (group_id);
CREATE INDEX IF NOT EXISTS idx_group_tutor_invites_tutor_user ON group_tutor_invites (tutor_user_id);
CREATE INDEX IF NOT EXISTS idx_group_tutor_invites_status ON group_tutor_invites (status);
