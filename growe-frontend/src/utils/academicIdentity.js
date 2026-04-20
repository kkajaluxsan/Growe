export const INDEX_NUMBER_REGEX = /^IT[0-9]{4,10}$/;
export const NIC_REGEX = /^([0-9]{9}V|[0-9]{12})$/;
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

/** Display-friendly formatting while typing (non-destructive). */
export function formatPhoneDisplay(input) {
  const raw = String(input ?? '').replace(/[^\d+]/g, '');
  return raw;
}
