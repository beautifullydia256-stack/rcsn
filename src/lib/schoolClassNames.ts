/**
 * Standard class/grade names for a school type (used so admins can assign teachers
 * before any students are enrolled in a class).
 */
export function canonicalClassNamesForSchoolType(
  schoolType: 'Nursery/Primary' | 'Secondary' | null | undefined
): string[] {
  if (schoolType === 'Nursery/Primary') {
    const opts = ['Baby Class', 'Middle Class', 'Top Class'];
    for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    return opts;
  }
  if (schoolType === 'Secondary') {
    return Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);
  }
  return [];
}

/** Union of canonical names and names that appear on student records, sorted. */
export function mergeClassNamesWithCanonical(
  schoolType: 'Nursery/Primary' | 'Secondary' | null | undefined,
  classesFromStudents: string[]
): string[] {
  const canon = canonicalClassNamesForSchoolType(schoolType);
  if (canon.length === 0) {
    return [...classesFromStudents].sort((a, b) => a.localeCompare(b));
  }
  return Array.from(new Set([...canon, ...classesFromStudents])).sort((a, b) =>
    a.localeCompare(b)
  );
}
