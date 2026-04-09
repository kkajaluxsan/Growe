import { query } from '../config/db.js';

export const create = async ({
  groupId,
  tutorUserId,
  requestedBy,
  subject,
  availabilityId,
  slotStart,
  slotEnd,
}) => {
  const { rows } = await query(
    `INSERT INTO group_tutor_invites (
       group_id, tutor_user_id, requested_by, subject, availability_id, slot_start, slot_end, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING id, group_id, tutor_user_id, requested_by, status, subject, availability_id,
               slot_start, slot_end, meeting_id, booking_id, created_at, updated_at`,
    [groupId, tutorUserId, requestedBy, subject || null, availabilityId, slotStart, slotEnd]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT gti.*, sg.name as group_name
     FROM group_tutor_invites gti
     JOIN study_groups sg ON gti.group_id = sg.id
     WHERE gti.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const findPendingByGroupId = async (groupId) => {
  const { rows } = await query(
    `SELECT gti.*,
            tu.email as tutor_email, tu.display_name as tutor_display_name,
            ru.email as requester_email, ru.display_name as requester_display_name
     FROM group_tutor_invites gti
     JOIN users tu ON gti.tutor_user_id = tu.id
     JOIN users ru ON gti.requested_by = ru.id
     WHERE gti.group_id = $1 AND gti.status = 'pending'
     ORDER BY gti.created_at DESC
     LIMIT 1`,
    [groupId]
  );
  return rows[0] || null;
};

export const listPendingForTutor = async (tutorUserId, { limit = 20 } = {}) => {
  const { rows } = await query(
    `SELECT gti.*, sg.name as group_name, sg.description as group_description,
            ru.display_name as requester_display_name, ru.email as requester_email
     FROM group_tutor_invites gti
     JOIN study_groups sg ON gti.group_id = sg.id
     JOIN users ru ON gti.requested_by = ru.id
     WHERE gti.tutor_user_id = $1 AND gti.status = 'pending'
     ORDER BY gti.slot_start ASC
     LIMIT $2`,
    [tutorUserId, limit]
  );
  return rows;
};

export const findPendingForTutorByInviteId = async (inviteId, tutorUserId) => {
  const { rows } = await query(
    `SELECT gti.*, sg.name as group_name, sg.max_members,
            ru.id as requester_id, ru.display_name as requester_display_name, ru.email as requester_email
     FROM group_tutor_invites gti
     JOIN study_groups sg ON gti.group_id = sg.id
     JOIN users ru ON gti.requested_by = ru.id
     WHERE gti.id = $1 AND gti.tutor_user_id = $2 AND gti.status = 'pending'`,
    [inviteId, tutorUserId]
  );
  return rows[0] || null;
};

export const updateStatus = async (id, status, { meetingId, bookingId } = {}) => {
  const { rows } = await query(
    `UPDATE group_tutor_invites
     SET status = $2,
         updated_at = NOW(),
         meeting_id = COALESCE($3, meeting_id),
         booking_id = COALESCE($4, booking_id)
     WHERE id = $1
     RETURNING id, group_id, tutor_user_id, requested_by, status, subject, availability_id,
               slot_start, slot_end, meeting_id, booking_id, created_at, updated_at`,
    [id, status, meetingId ?? null, bookingId ?? null]
  );
  return rows[0] || null;
};
