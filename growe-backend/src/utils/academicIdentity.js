/** Index: IT + 4–10 digits, uppercase IT prefix. */
export const INDEX_NUMBER_REGEX = /^IT[0-9]{4,10}$/;

/** NIC: Old format (9 digits + V) or new format (12 digits). */
export const NIC_REGEX = /^([0-9]{9}V|[0-9]{12})$/;

/**
 * Sri Lankan mobile: 07XXXXXXXX, +947XXXXXXXX, or 947XXXXXXXX (no spaces).
 * Normalizes to +947XXXXXXXX for storage.
 */
export const PHONE_INPUT_REGEX = /^(?:\+94|94|0)?7[0-9]{8}$/;

export function normalizeIndexNumber(input) {
  return String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isValidIndexNumber(input) {
  return INDEX_NUMBER_REGEX.test(normalizeIndexNumber(input));
}

export function normalizeNIC(input) {
  return String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isValidNIC(input) {
  return NIC_REGEX.test(normalizeNIC(input));
}

/**
 * @returns {string|null} E.164-style +947XXXXXXXX or null if invalid
 */
export function normalizePhoneToE164(input) {
  const t = String(input ?? '')
    .trim()
    .replace(/\s+/g, '');
  if (!PHONE_INPUT_REGEX.test(t)) return null;
  const m = t.match(/7[0-9]{8}$/);
  if (!m) return null;
  return `+94${m[0]}`;
}

export function isValidPhone(input) {
  return normalizePhoneToE164(input) !== null;
}
