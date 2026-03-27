const PREFIX = '/uploads/messaging/';

/**
 * Ensures attachment URLs only reference files stored by our chat upload handler.
 */
export function isValidChatAttachmentUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(PREFIX)) return false;
  const rest = url.slice(PREFIX.length);
  if (!rest || rest.includes('..') || rest.includes('/') || rest.includes('\\')) return false;
  return /^[a-zA-Z0-9._-]+$/.test(rest);
}
