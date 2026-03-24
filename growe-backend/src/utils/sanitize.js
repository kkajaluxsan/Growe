/**
 * Basic XSS sanitization: escape HTML entities in message content.
 * Use for plain-text display; do not allow raw HTML in messages.
 */
export const sanitizeMessageContent = (content) => {
  if (typeof content !== 'string') return '';
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
};
