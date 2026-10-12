/**
 * Official institutional email generation utility for Rakai Community School of Nursing.
 * Standard format: firstname.lastname@rcsn.ac.ug
 */

export const RCSN_EMAIL_DOMAIN = 'rcsn.ac.ug';

export function generateOfficialSchoolEmail(name: string, domain: string = RCSN_EMAIL_DOMAIN): string {
  if (!name || typeof name !== 'string') return `trainee@${domain}`;

  // Clean titles (Dr, Mr, Mrs, Ms, Prof, Rev, Sr, Br, etc.)
  const clean = name
    .replace(/\b(dr|mr|mrs|ms|prof|rev|sr|br|hon)\.?\b/gi, '')
    .trim();

  const parts = clean
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return `member@${domain}`;
  if (parts.length === 1) return `${parts[0]}@${domain}`;

  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}@${domain}`;
}
