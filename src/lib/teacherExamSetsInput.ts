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
