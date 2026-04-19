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

type ReportStudentLike = {
  age_years?: unknown;
  date_of_birth?: unknown;
  dob?: unknown;
  summary?: { reportDate?: unknown } | null;
};

/**
 * Label for report UI: prefer `students.age_years` (maintained in Postgres), else compute from DOB
 * and report/exam date (legacy rows / old snapshots without frozen age).
 */
export function studentAgeLabelForReport(student: ReportStudentLike | null | undefined, examSet?: { date?: unknown } | null): string {
  if (!student) return '—';
  const cached = student.age_years;
  if (cached != null && cached !== '') {
    const n = Number(cached);
    if (!Number.isNaN(n) && n >= 0 && n <= 120) return String(n);
  }
  const dob = normalizeStudentDobIsoFromRow(student as Record<string, unknown>);
  const refRaw =
    student.summary && typeof student.summary === 'object' && student.summary !== null
      ? (student.summary as { reportDate?: unknown }).reportDate
      : undefined;
  const ref =
    refRaw != null && String(refRaw).trim()
      ? String(refRaw).slice(0, 10)
      : examSet?.date != null && String(examSet.date).trim()
        ? String(examSet.date).slice(0, 10)
        : undefined;
  const a = studentAgeYearsAtReference(dob, ref ?? null);
  return a != null ? String(a) : '—';
}
