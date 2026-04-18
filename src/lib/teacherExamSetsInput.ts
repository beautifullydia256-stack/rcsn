import type { SchoolTermBrief } from '@/lib/adminFinanceTerm';

/** Row shape from `exam_sets` (teacher entry list). */
export type ExamSetForTeacherRow = {
  id: string;
  year?: number | null;
  term?: number | null;
  is_active?: boolean | null;
  active_for_input?: boolean | null;
  target_classes?: string[] | null;
  name?: string | null;
};

/**
 * Teachers may only enter marks for exam sets that are flagged for input and belong to the
 * school's resolved current (calendar) term — same rules as `exam_set_teacher_entry_guard_message`.
 */
export function filterExamSetsForTeacherEntry(
  rows: ExamSetForTeacherRow[],
  currentTerm: SchoolTermBrief | null
): ExamSetForTeacherRow[] {
  if (!currentTerm || currentTerm.year == null || currentTerm.term == null) {
    return [];
  }
  const y = Number(currentTerm.year);
  const t = Number(currentTerm.term);
  if (Number.isNaN(y) || Number.isNaN(t)) {
    return [];
  }
  return rows.filter((es) => {
    if (!es.is_active || !es.active_for_input) return false;
    const ey = Number(es.year);
    const et = Number(es.term);
    if (Number.isNaN(ey) || Number.isNaN(et)) return false;
    return ey === y && et === t;
  });
}

export function formatSchoolTermLabel(term: SchoolTermBrief | null): string {
  if (!term || term.year == null || term.term == null) return 'current term';
  return `Term ${term.term} ${term.year}`;
}

/**
 * Order within a term: Beginning of Term → Mid Term → End of Term, then other names alphabetically.
 * Uses whole-word style checks so names like "Extended" are not treated as "End".
 */
export function examSetTermProgressionRank(name: string | null | undefined): number {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return 1000;
  if (/\bbeginning\b/.test(n)) return 0;
  if (/\bmid\b/.test(n)) return 1;
  if (/\bend\b/.test(n)) return 2;
  return 100;
}

export function sortExamSetsByTermProgression<
  T extends Pick<ExamSetForTeacherRow, 'year' | 'term' | 'name'>,
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ya = Number(a.year);
    const yb = Number(b.year);
    if (!Number.isNaN(ya) && !Number.isNaN(yb) && ya !== yb) return yb - ya;
    const ta = Number(a.term);
    const tb = Number(b.term);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    const ra = examSetTermProgressionRank(a.name);
    const rb = examSetTermProgressionRank(b.name);
    if (ra !== rb) return ra - rb;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' });
  });
}

/** `target_classes` empty or null ⇒ all classes; otherwise must include `className`. */
export function examSetAppliesToClass(
  examSet: Pick<ExamSetForTeacherRow, 'target_classes'>,
  className: string,
  normalizedClassName: string
): boolean {
  const tc = examSet.target_classes;
  const list = Array.isArray(tc) ? tc : [];
  if (list.length === 0) return true;
  return list.includes(normalizedClassName) || list.includes(className);
}
