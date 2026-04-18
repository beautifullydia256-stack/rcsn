/** Strip to digits for phone comparison (handles +256… vs 07…). */
export function digitsOnly(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\D/g, '');
}

/** Last 9 digits — Uganda local number without country code. */
export function phoneLast9(s: string | null | undefined): string | null {
  const d = digitsOnly(s);
  if (d.length < 9) return null;
  return d.slice(-9);
}

export function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (da === db) return true;
  const tail = (x: string) => x.slice(-9);
  return tail(da) === tail(db) && tail(da).length >= 9;
}

/**
 * Prefer E.164 for Uganda when we have 9 local digits after 256.
 */
export function toUgandaE164FromDigits(digits: string): string {
  const d = digitsOnly(digits);
  if (d.startsWith('256') && d.length >= 12) return `+${d}`;
  if (d.length >= 9) return `+256${d.slice(-9)}`;
  return d.startsWith('+') ? d : `+${d}`;
}
