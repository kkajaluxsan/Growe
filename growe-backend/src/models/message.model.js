import { query } from '../config/db.js';

export const create = async ({ conversationId, senderId, content, messageType = 'TEXT' }) => {
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, content, message_type)
     VALUES ($1, $2, $3, $4)
     RETURNING id, conversation_id, sender_id, content, message_type, created_at, edited_at, deleted_at`,
    [conversationId, senderId, content, messageType]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.created_at, m.edited_at, m.deleted_at,
            u.email as sender_email, u.display_name as sender_display_name
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const listByConversation = async (conversationId, { limit = 20, offset = 0 } = {}) => {
  const { rows } = await query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.created_at, m.edited_at, m.deleted_at,
            u.email as sender_email, u.display_name as sender_display_name
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );
  return rows.reverse();
};

export const updateContent = async (id, senderId, content) => {
  const { rows } = await query(
    `UPDATE messages SET content = $1, edited_at = NOW()
     WHERE id = $2 AND sender_id = $3 AND deleted_at IS NULL
     RETURNING id, conversation_id, sender_id, content, message_type, created_at, edited_at, deleted_at`,
    [content, id, senderId]
  );
  return rows[0] || null;
};

export const softDelete = async (id, senderId) => {
  const { rows } = await query(
    `UPDATE messages SET deleted_at = NOW()
     WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL
     RETURNING id, conversation_id, sender_id, created_at`,
    [id, senderId]
  );
  return rows[0] || null;
};
