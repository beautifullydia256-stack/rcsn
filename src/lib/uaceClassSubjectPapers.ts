import { supabase } from './supabase';
import { isALevelClass } from '../components/reports/templates/helpers';

export type SchoolUaceClassSubjectPaperRow = {
  id: string;
  school_id: string;
  class_name: string;
  subject_name: string;
  paper_code: string | null;
  paper_label: string | null;
  sort_order: number;
  teacher_id: string | null;
};

/** `<select>` value: real UNEB code, or `:${row.id}` when code is absent (unique per row). */
export function uacePaperSelectOptionValue(p: SchoolUaceClassSubjectPaperRow): string {
  const c = (p.paper_code ?? '').trim();
  return c ? c : `:${p.id}`;
}

/** Single bucket for configured UACE papers (Senior 5 & 6 share subjects). Legacy rows may use Senior 5 / Senior 6. */
export const UACE_PAPERS_STORAGE_CLASS = 'A-Level';

/** Class names to query for papers when the UI is on an A-Level class (includes legacy storage). */
export function uacePaperQueryClassNames(forRequestedClass: string): string[] {
  const t = (forRequestedClass || '').trim();
  if (!t) return [];
  if (t === UACE_PAPERS_STORAGE_CLASS || isALevelClass(t)) {
    return [...new Set([UACE_PAPERS_STORAGE_CLASS, 'Senior 5', 'Senior 6', t])];
  }
  return [t];
}

export async function fetchUacePapersForClassSubject(
  schoolId: string,
  className: string,
  subjectName: string
): Promise<SchoolUaceClassSubjectPaperRow[]> {
  const subject = (subjectName || '').trim();
  if (!schoolId || !subject) return [];
  const classNames = uacePaperQueryClassNames(className);
  if (classNames.length === 0) return [];

  const { data, error } = await supabase
    .from('school_uace_class_subject_papers')
    .select('*')
    .eq('school_id', schoolId)
    .eq('subject_name', subject)
    .in('class_name', classNames)
    .order('sort_order', { ascending: true })
    .order('paper_code', { ascending: true });
  if (error) throw error;
  const rows = (data || []) as SchoolUaceClassSubjectPaperRow[];

  const rank = (cn: string) => {
    if (cn === UACE_PAPERS_STORAGE_CLASS) return 0;
    if (cn === 'Senior 5') return 1;
    if (cn === 'Senior 6') return 2;
    return 3;
  };
  const codeKey = (r: SchoolUaceClassSubjectPaperRow) => (r.paper_code ?? '').trim();
  const sorted = [...rows].sort((a, b) => {
    const dr = rank(a.class_name) - rank(b.class_name);
    if (dr !== 0) return dr;
    return codeKey(a).localeCompare(codeKey(b));
  });
  const byDedupe = new Map<string, SchoolUaceClassSubjectPaperRow>();
  for (const r of sorted) {
    const ck = codeKey(r);
    const key = ck ? `code:${ck}` : `id:${r.id}`;
    if (!byDedupe.has(key)) byDedupe.set(key, r);
  }
  return Array.from(byDedupe.values()).sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      codeKey(a).localeCompare(codeKey(b)) ||
      (a.paper_label ?? '').localeCompare(b.paper_label ?? ''),
  );
}
