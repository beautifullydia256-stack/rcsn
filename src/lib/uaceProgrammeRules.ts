/** UACE (Senior 5–6) programme rules: 3 principals + General Paper (automatic) + 1 elective subsidiary. */

export const UACE_MAX_PRINCIPALS = 3;
/** Subsidiaries chosen by the school/learner (General Paper is not counted here). */
export const UACE_MAX_ELECTIVE_SUBSIDIARIES = 1;

export function isGeneralPaperSubject(name: string): boolean {
  return /general\s*paper/i.test(String(name || '').trim());
}

export function uaceProfileIsComplete(principalNames: string[], subsidiaryNames: string[]): boolean {
  const principals = principalNames.filter(Boolean);
  const subs = subsidiaryNames.filter(Boolean);
  const hasGp = subs.some((s) => isGeneralPaperSubject(s));
  const electiveSubs = subs.filter((s) => !isGeneralPaperSubject(s));
  return (
    principals.length === UACE_MAX_PRINCIPALS &&
    hasGp &&
    electiveSubs.length === UACE_MAX_ELECTIVE_SUBSIDIARIES
  );
}
