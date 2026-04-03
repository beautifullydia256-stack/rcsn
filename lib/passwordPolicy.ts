/**
 * Shared rules for admin-created accounts (Supabase bcrypt max ~72 bytes).
 * Used by Next.js app routes (ESM). Legacy CJS handlers still use passwordPolicy.js.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const ONE_TIME_PASSWORD_LENGTH = 8;

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateOneTimePassword(length = ONE_TIME_PASSWORD_LENGTH): string {
  const n = Math.min(Math.max(length, MIN_PASSWORD_LENGTH), MAX_PASSWORD_LENGTH);
  let s = '';
  for (let i = 0; i < n; i += 1) {
    s += CHARSET[Math.floor(Math.random() * CHARSET.length)]!;
  }
  return s;
}

/** @returns error message or null if ok */
export function validatePasswordLength(password: unknown): string | null {
  const p = String(password ?? '');
  if (p.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (p.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
