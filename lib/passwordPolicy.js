/**
 * Shared rules for admin-created accounts (Supabase bcrypt max ~72 bytes).
 * One-time passwords are 8 characters by default (readable, not "digits only").
 */

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const ONE_TIME_PASSWORD_LENGTH = 8;

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateOneTimePassword(length = ONE_TIME_PASSWORD_LENGTH) {
  const n = Math.min(Math.max(length, MIN_PASSWORD_LENGTH), MAX_PASSWORD_LENGTH);
  let s = '';
  for (let i = 0; i < n; i += 1) {
    s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return s;
}

/** @returns {string | null} error message or null if ok */
function validatePasswordLength(password) {
  const p = String(password ?? '');
  if (p.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (p.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  ONE_TIME_PASSWORD_LENGTH,
  generateOneTimePassword,
  validatePasswordLength,
};
