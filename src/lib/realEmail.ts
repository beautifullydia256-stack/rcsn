/**
 * Reject clearly internal / legacy placeholder addresses only.
 * School-branded domains like @rips.sch are allowed (manually entered).
 */
export function isBlockedSyntheticEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e.includes('@')) return true;
  return e.endsWith('@school.local') || e.endsWith('@school.parent');
}

export function isValidRealEmail(email: string): boolean {
  const t = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  if (isBlockedSyntheticEmail(t)) return false;
  return true;
}
