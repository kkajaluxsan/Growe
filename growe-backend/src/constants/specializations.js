/** Allowed specialization values (must match frontend). */
export const SPECIALIZATION_CODES = ['IT', 'CS', 'SE', 'IS', 'Cyber Security', 'Data Science'];

export function isAllowedSpecialization(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  return SPECIALIZATION_CODES.includes(v);
}
