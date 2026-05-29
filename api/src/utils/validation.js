export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function isEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cleanString(value = '') {
  return String(value).trim();
}

export function parseBoolean(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

export function asNullableId(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function asId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
