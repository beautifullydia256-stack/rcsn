import { ALL_TERTIARY_COHORTS } from './tertiaryCurriculum';
import { isTertiarySchool, isSecondarySchool, isPrimarySchool } from '@/hooks/useSchoolType';

/**
 * Standard class/grade names for a school type (used so admins can assign teachers/tutors
 * before any students are enrolled in a class/cohort).
 */
export function canonicalClassNamesForSchoolType(
  schoolType: string | null | undefined
): string[] {
  if (isTertiarySchool(schoolType)) {
    return ALL_TERTIARY_COHORTS;
  }
  if (isSecondarySchool(schoolType)) {
    return Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);
  }
  if (isPrimarySchool(schoolType) || schoolType === 'Nursery/Primary') {
    const opts = ['Baby Class', 'Middle Class', 'Top Class'];
    for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    return opts;
  }
  return [];
}

function dedupeClassesCaseInsensitive(classes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of classes) {
    const t = String(c || '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Canonical curriculum order first, then any extra class names from students
 * (not in the canonical list), alphabetically. Case-insensitive dedupe.
 */
export function mergeClassNamesWithCanonical(
  schoolType: string | null | undefined,
  classesFromStudents: string[]
): string[] {
  const canon = canonicalClassNamesForSchoolType(schoolType);
  const canonLower = new Set(canon.map((c) => c.toLowerCase()));
  const studentDeduped = dedupeClassesCaseInsensitive(classesFromStudents);

  if (canon.length === 0) {
    return studentDeduped.sort((a, b) => a.localeCompare(b));
  }

  const extras = studentDeduped
    .filter((c) => !canonLower.has(c.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return [...canon, ...extras];
}
