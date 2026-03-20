/**
 * Reject clearly internal / legacy placeholder addresses only.
 * School-branded domains like @rips.sch are allowed (manually entered).
 */

function isBlockedSyntheticEmail(email) {
  const e = String(email).trim().toLowerCase();
  if (!e.includes('@')) return true;
  return e.endsWith('@school.local') || e.endsWith('@school.parent');
}

/** Basic shape check + block list (not deliverability). */
function isValidRealEmail(email) {
  const t = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  if (isBlockedSyntheticEmail(t)) return false;
  return true;
}

module.exports = { isValidRealEmail, isBlockedSyntheticEmail };
