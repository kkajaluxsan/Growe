import sanitizeHtml from 'sanitize-html';

const plainTextOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

/**
 * Strip HTML/scripts for stored text fields (XSS mitigation).
 */
export function sanitizePlainText(input) {
  if (input === undefined || input === null) return input;
  if (typeof input !== 'string') return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  return sanitizeHtml(trimmed, plainTextOptions).trim();
}
