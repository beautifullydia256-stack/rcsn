export type SchoolTypeValue =
  | 'Nursery/Primary'
  | 'Secondary'
  | 'Tertiary / Nursing & Midwifery'
  | 'Tertiary'
  | 'Health Training / Nursing'
  | string;

export function isTertiarySchool(type?: string | null): boolean {
  if (!type) return false;
  const s = type.toLowerCase();
  return (
    s.includes('tertiary') ||
    s.includes('nursing') ||
    s.includes('midwifery') ||
    s.includes('health training') ||
    s.includes('college') ||
    s.includes('institute') ||
    s.includes('polytechnic')
  );
}

export function isSecondarySchool(type?: string | null): boolean {
  if (!type) return false;
  if (isTertiarySchool(type)) return false;
  const s = type.toLowerCase();
  return s.includes('secondary') || s.includes('high') || s.includes('o-level') || s.includes('a-level');
}

export function isPrimarySchool(type?: string | null): boolean {
  if (!type) return false;
  if (isTertiarySchool(type) || isSecondarySchool(type)) return false;
  const s = type.toLowerCase();
  return s.includes('primary') || s.includes('nursery') || s.includes('kindergarten') || s.includes('pre-primary');
}

export function useSchoolType() {
  const schoolType = 'Nursing & Midwifery Institution';
  const isTertiary = true;
  const isSecondary = false;
  const isPrimary = false;

  return {
    data: schoolType,
    schoolType,
    isTertiary,
    isSecondary,
    isPrimary,
    isLoading: false,
    isSuccess: true,
  };
}
