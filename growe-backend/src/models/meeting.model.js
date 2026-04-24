import { query } from '../config/db.js';

export const create = async ({ groupId, title, createdBy, scheduledAt = null, tutorId = null, bookingId = null }) => {
  const { rows } = await query(
    `INSERT INTO meetings (group_id, title, created_by, scheduled_at, tutor_id, booking_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, group_id, title, started_at, ended_at, created_by, created_at, updated_at, scheduled_at, tutor_id, booking_id`,
    [groupId || null, title || 'Meeting', createdBy, scheduledAt, tutorId, bookingId || null]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT m.id, m.group_id, m.title, m.started_at, m.ended_at, m.created_by,
            m.created_at, m.updated_at, m.scheduled_at, m.tutor_id, m.booking_id,
            sg.name as group_name,
            u.id as tutor_user_id,
            u.email as tutor_email,
            b.student_id as booking_student_id
     FROM meetings m
     LEFT JOIN study_groups sg ON m.group_id = sg.id
     LEFT JOIN tutor_profiles tp ON m.tutor_id = tp.id
     LEFT JOIN users u ON tp.user_id = u.id
     LEFT JOIN bookings b ON m.booking_id = b.id
     WHERE m.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const listByGroup = async (groupId) => {
  const { rows } = await query(
    `SELECT m.id, m.group_id, m.title, m.started_at, m.ended_at, m.created_by,
            m.created_at, u.email as creator_email
     FROM meetings m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.group_id = $1
     ORDER BY m.created_at DESC`,
    [groupId]
  );
  return rows;
};

export const listByUser = async (userId) => {
  const { rows } = await query(
    `SELECT m.id, m.group_id, m.title, m.started_at, m.ended_at,
            m.created_by, m.created_at, m.scheduled_at, sg.name as group_name
     FROM meetings m
     JOIN study_groups sg ON m.group_id = sg.id
     WHERE EXISTS (
       SELECT 1 FROM group_members gm
       WHERE gm.group_id = sg.id AND gm.user_id = $1 AND gm.status = 'approved'
     )
     ORDER BY COALESCE(m.scheduled_at, m.created_at) DESC`,
    [userId]
  );
  return rows;
};

export const listByUserInRange = async (userId, fromDate, toDate) => {
  const { rows } = await query(
    `SELECT m.id, m.group_id, m.title, m.started_at, m.ended_at,
            m.created_by, m.created_at, m.scheduled_at, sg.name as group_name
     FROM meetings m
     JOIN study_groups sg ON m.group_id = sg.id
     WHERE EXISTS (
       SELECT 1 FROM group_members gm
       WHERE gm.group_id = sg.id AND gm.user_id = $1 AND gm.status = 'approved'
     )
       AND (
         (m.scheduled_at IS NOT NULL AND m.scheduled_at >= $2::timestamptz AND m.scheduled_at < ($3::date + INTERVAL '1 day')::timestamptz)
         OR (m.scheduled_at IS NULL AND m.created_at::date >= $2::date AND m.created_at::date <= $3::date)
       )
     ORDER BY COALESCE(m.scheduled_at, m.created_at) ASC`,
    [userId, fromDate, toDate]
  );
  return rows;
};

export const addParticipant = async (meetingId, userId) => {
  const { rows } = await query(
    `INSERT INTO meeting_participants (meeting_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (meeting_id, user_id) DO UPDATE SET joined_at = NOW(), left_at = NULL
     RETURNING id, meeting_id, user_id, joined_at, left_at`,
    [meetingId, userId]
  );
  return rows[0];
};

export const hasUserParticipated = async (meetingId, userId) => {
  const { rows } = await query(
    `SELECT 1 FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2`,
    [meetingId, userId]
  );
  return rows.length > 0;
};

export const markStartedIfNeeded = async (meetingId) => {
  const { rowCount } = await query(
    `UPDATE meetings
     SET started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND ended_at IS NULL`,
    [meetingId]
  );
  return rowCount > 0;
};

export const setParticipantLeft = async (meetingId, userId) => {
  const { rows } = await query(
    `UPDATE meeting_participants SET left_at = NOW()
     WHERE meeting_id = $1 AND user_id = $2 AND left_at IS NULL
     RETURNING id, meeting_id, user_id, joined_at, left_at`,
    [meetingId, userId]
  );
  return rows[0] || null;
};

export const terminateMeeting = async (meetingId) => {
  const { rows } = await query(
    `UPDATE meetings SET ended_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id, group_id, title, started_at, ended_at, created_by, created_at, updated_at`,
    [meetingId]
  );
  return rows[0] || null;
};

export const listActiveForAdmin = async () => {
  const { rows } = await query(
    `SELECT m.id, m.group_id, m.title, m.started_at, m.created_at, sg.name as group_name
     FROM meetings m
     JOIN study_groups sg ON m.group_id = sg.id
     WHERE m.ended_at IS NULL
     ORDER BY m.created_at DESC`
  );
  return rows;
};
