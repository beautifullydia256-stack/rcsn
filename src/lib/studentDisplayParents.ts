/**
 * Students list joins `parents` for portal-linked guardians. When the link API fails
 * (CORS, etc.), guardian_* columns on `students` still hold the enrollment data — use
 * this helper so the UI shows the same contact info.
 */
export type ParentLite = { name: string; email?: string; phone?: string; parent_id?: string | null };

type GuardianRow = {
  guardian_name?: string | null;
  guardian_email?: string | null;
  guardian_phone?: string | null;
};

/** Enrich linked parent rows with student.guardian_* when the portal row is blank. */
export function displayParentsForStudent(
  studentId: string,
  row: GuardianRow,
  parentsByStudent: Record<string, ParentLite[]>
): ParentLite[] {
  const linked = parentsByStudent[studentId] || [];
  if (linked.length > 0) {
    return linked.map((p, i) => {
      const name =
        (p.name?.trim() || (i === 0 ? row.guardian_name?.trim() : '') || '').trim() ||
        (i === 0 && (row.guardian_phone?.trim() || row.guardian_email?.trim()) ? 'Guardian' : '');
      return {
        name,
        // Prefer portal row; for the first linked parent fall back to enrollment guardian_* on the student row.
        email: (p.email?.trim() || (i === 0 ? row.guardian_email?.trim() : '')) || undefined,
        phone: (p.phone?.trim() || (i === 0 ? row.guardian_phone?.trim() : '')) || undefined,
        parent_id: p.parent_id ?? null,
      };
    });
  }
  const gn = row.guardian_name?.trim();
  const gp = row.guardian_phone?.trim();
  const ge = row.guardian_email?.trim();
  if (gn || gp || ge) {
    return [
      {
        name: gn || 'Guardian',
        email: ge || undefined,
        phone: gp || undefined,
        parent_id: null,
      },
    ];
  }
  return [];
}
