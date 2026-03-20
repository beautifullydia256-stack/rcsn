/**
 * Students list joins `parents` for portal-linked guardians. When the link API fails
 * (CORS, etc.), guardian_* columns on `students` still hold the enrollment data — use
 * this helper so the UI shows the same contact info.
 */
export type ParentLite = { name: string; email?: string; phone?: string };

type GuardianRow = {
  guardian_name?: string | null;
  guardian_email?: string | null;
  guardian_phone?: string | null;
};

export function displayParentsForStudent(
  studentId: string,
  row: GuardianRow,
  parentsByStudent: Record<string, ParentLite[]>
): ParentLite[] {
  const linked = parentsByStudent[studentId] || [];
  if (linked.length > 0) return linked;
  const gn = row.guardian_name?.trim();
  if (gn) {
    return [
      {
        name: gn,
        email: row.guardian_email?.trim() || undefined,
        phone: row.guardian_phone?.trim() || undefined,
      },
    ];
  }
  return [];
}
