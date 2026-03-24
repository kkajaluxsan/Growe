import { query } from '../config/db.js';

export const create = async ({ type, groupId = null, meetingId = null }) => {
  const { rows } = await query(
    `INSERT INTO conversations (type, group_id, meeting_id)
     VALUES ($1, $2, $3)
     RETURNING id, type, group_id, meeting_id, created_at`,
    [type, groupId, meetingId]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT c.id, c.type, c.group_id, c.meeting_id, c.created_at,
            sg.name as group_name
     FROM conversations c
     LEFT JOIN study_groups sg ON c.group_id = sg.id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const findByGroupId = async (groupId) => {
  const { rows } = await query(
    'SELECT id, type, group_id, meeting_id, created_at FROM conversations WHERE type = $1 AND group_id = $2',
    ['GROUP', groupId]
  );
  return rows[0] || null;
};

export const findByMeetingId = async (meetingId) => {
  const { rows } = await query(
    'SELECT id, type, group_id, meeting_id, created_at FROM conversations WHERE type = $1 AND meeting_id = $2',
    ['MEETING', meetingId]
  );
  return rows[0] || null;
};

export const findDirectBetween = async (userId1, userId2) => {
  const { rows } = await query(
    `SELECT c.id FROM conversations c
     WHERE c.type = 'DIRECT'
     AND c.id IN (
       SELECT conversation_id FROM conversation_participants
       WHERE user_id IN ($1, $2)
       GROUP BY conversation_id
       HAVING COUNT(DISTINCT user_id) = 2
     )
     LIMIT 1`,
    [userId1, userId2]
  );
  return rows[0] || null;
};

export const listForUser = async (userId, { limit = 50, offset = 0 } = {}) => {
  const { rows } = await query(
    `SELECT c.id, c.type, c.group_id, c.meeting_id, c.created_at,
            cp.last_read_at, sg.name as group_name,
            (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
            (SELECT created_at FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
            (SELECT u.display_name FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id WHERE cp2.conversation_id = c.id AND cp2.user_id != $1 LIMIT 1) as direct_other_display_name,
            (SELECT u.email FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id WHERE cp2.conversation_id = c.id AND cp2.user_id != $1 LIMIT 1) as direct_other_email
     FROM conversation_participants cp
     JOIN conversations c ON cp.conversation_id = c.id
     LEFT JOIN study_groups sg ON c.group_id = sg.id
     WHERE cp.user_id = $1
     ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
};

export const addParticipant = async (conversationId, userId) => {
  const { rows } = await query(
    `INSERT INTO conversation_participants (conversation_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (conversation_id, user_id) DO UPDATE SET joined_at = NOW()
     RETURNING id, conversation_id, user_id, last_read_at, joined_at`,
    [conversationId, userId]
  );
  return rows[0];
};

export const getParticipants = async (conversationId) => {
  const { rows } = await query(
    `SELECT cp.user_id, u.email, u.display_name
     FROM conversation_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.conversation_id = $1`,
    [conversationId]
  );
  return rows;
};

export const isParticipant = async (conversationId, userId) => {
  const { rows } = await query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return rows.length > 0;
};

export const updateLastRead = async (conversationId, userId) => {
  const { rows } = await query(
    `UPDATE conversation_participants SET last_read_at = NOW()
     WHERE conversation_id = $1 AND user_id = $2
     RETURNING id, last_read_at`,
    [conversationId, userId]
  );
  return rows[0] || null;
};

export const getUnreadCount = async (conversationId, userId) => {
  const { rows } = await query(
    `SELECT cp.last_read_at FROM conversation_participants cp
     WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
    [conversationId, userId]
  );
  const lastRead = rows[0]?.last_read_at;
  if (!lastRead) {
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int as c FROM messages m
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND m.sender_id != $2`,
      [conversationId, userId]
    );
    return countRows[0].c;
  }
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int as c FROM messages m
     WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND m.sender_id != $2 AND m.created_at > $3`,
    [conversationId, userId, lastRead]
  );
  return countRows[0].c;
};
