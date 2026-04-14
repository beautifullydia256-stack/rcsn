import { supabase } from './supabase';
import { isALevelClass } from '../components/reports/templates/helpers';

export type SchoolUaceClassSubjectPaperRow = {
  id: string;
  school_id: string;
  class_name: string;
  subject_name: string;
  paper_code: string | null;
  paper_label: string | null;
  paper_slot: number;
  weight_percent: number;
  sort_order: number;
  teacher_id: string | null;
};

/** `<select>` option value — row id (line key uses `paper_label` in `exam_results.paper_number`). */
export function uacePaperSelectOptionValue(p: SchoolUaceClassSubjectPaperRow): string {
  return p.id;
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
    .order('paper_slot', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const rows = (data || []).map((raw: Record<string, unknown>) => {
    const r = raw as unknown as SchoolUaceClassSubjectPaperRow;
    return {
      ...r,
      paper_slot: Number(raw.paper_slot) > 0 ? Number(raw.paper_slot) : 1,
      weight_percent:
        raw.weight_percent != null && raw.weight_percent !== ''
          ? Number(raw.weight_percent)
          : 100,
    };
  });

  const rank = (cn: string) => {
    if (cn === UACE_PAPERS_STORAGE_CLASS) return 0;
    if (cn === 'Senior 5') return 1;
    if (cn === 'Senior 6') return 2;
    return 3;
  };
  const sorted = [...rows].sort((a, b) => {
    const dr = rank(a.class_name) - rank(b.class_name);
    if (dr !== 0) return dr;
    return (a.paper_slot ?? 0) - (b.paper_slot ?? 0);
  });
  const bySlot = new Map<number, SchoolUaceClassSubjectPaperRow>();
  for (const r of sorted) {
    const slot = r.paper_slot ?? 0;
    if (slot > 0 && !bySlot.has(slot)) bySlot.set(slot, r);
  }
  return Array.from(bySlot.values()).sort((a, b) => a.paper_slot - b.paper_slot);
}
