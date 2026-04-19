/** Normalise students.date_of_birth / dob to YYYY-MM-DD for age math. */
export function normalizeStudentDobIsoFromRow(st: Record<string, unknown> | null | undefined): string | null {
  if (!st || typeof st !== 'object') return null;
  const raw = st.date_of_birth ?? st.dob;
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Whole years at reference date (report date), or null if DOB missing/invalid. */
export function studentAgeYearsAtReference(
  dobIso: string | null | undefined,
  refIso: string | null | undefined,
): number | null {
  const dobStr = dobIso != null && String(dobIso).trim() ? String(dobIso).trim().slice(0, 10) : '';
  const refStr = refIso != null && String(refIso).trim() ? String(refIso).trim().slice(0, 10) : '';
  if (!dobStr) return null;
  const dob = new Date(`${dobStr}T12:00:00`);
  const ref = refStr ? new Date(`${refStr}T12:00:00`) : new Date();
  if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - dob.getFullYear();
  const md = ref.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}
