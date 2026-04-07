/**
 * Guards so secondary O-Level/A-Level built-in HTML templates are not used when
 * the school record explicitly indicates a non-secondary level.
 */

export type SecondaryBuiltinGuardContext = 'preview' | 'pdf' | 'renderTemplateHTML';

function normalizeSchoolLevel(school: Record<string, unknown> | null | undefined): string {
  if (!school) return '';
  const raw =
    school.school_level ??
    school.level ??
    (school as { school_type?: unknown }).school_type ??
    '';
  return String(raw).trim().toLowerCase();
}

/**
 * When school_level (or level / school_type) is set to a nursery/pre-primary value,
 * block built-in secondary card layouts — they must not show nursery-oriented structures
 * or vice versa.
 */
export function assertSecondaryBuiltinTemplatesAllowed(
  school: Record<string, unknown> | null | undefined,
  context: SecondaryBuiltinGuardContext
): void {
  const v = normalizeSchoolLevel(school);
  if (!v) return;

  const allowed = new Set(['secondary', 'mixed', 'o-level', 'olevel', 'a-level', 'alevel', 'senior']);

  const blocked = new Set([
    'nursery',
    'pre-primary',
    'pre_primary',
    'preprimary',
    'baby',
    'daycare',
    'infant',
  ]);

  if (allowed.has(v)) return;

  if (blocked.has(v) || v.includes('nursery') || v.includes('pre-primary') || v.includes('preprimary')) {
    const msg = `[reports:${context}] Refusing secondary built-in templates: school level is "${school?.school_level ?? school?.level ?? (school as { school_type?: string }).school_type}". Expected secondary/mixed or unset.`;
    console.error(msg);
    throw new Error(msg);
  }

  if (v === 'primary' || v === 'elementary') {
    const msg = `[reports:${context}] Refusing secondary built-in templates: school level is "${v}". Use primary report layouts for this school.`;
    console.error(msg);
    throw new Error(msg);
  }
}
