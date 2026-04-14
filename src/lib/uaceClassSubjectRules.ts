/**
 * Mirrors `public.uace_subject_catalog` rows where subject_type = 'subsidiary'.
 * Keep in sync with supabase/migrations/*_uace_subject_catalog.sql
 */
export const UACE_SUBSIDIARY_SUBJECT_NAMES = [
  'General Paper',
  'Subsidiary Mathematics',
  'Subsidiary ICT',
  'Subsidiary Economics',
] as const;

/** Senior 5–6 UACE subsidiary subjects cannot be removed from class_subjects (DB + UI). */
export function isNonRemovableUaceSubsidiary(className: string, subject: string): boolean {
  const c = className.trim();
  if (c !== 'Senior 5' && c !== 'Senior 6') return false;
  const s = subject.trim();
  return (UACE_SUBSIDIARY_SUBJECT_NAMES as readonly string[]).includes(s);
}
