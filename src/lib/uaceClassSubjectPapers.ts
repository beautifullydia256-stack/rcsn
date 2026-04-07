import { supabase } from './supabase';

export type SchoolUaceClassSubjectPaperRow = {
  id: string;
  school_id: string;
  class_name: string;
  subject_name: string;
  paper_code: string;
  paper_label: string | null;
  sort_order: number;
  teacher_id: string | null;
};

export async function fetchUacePapersForClassSubject(
  schoolId: string,
  className: string,
  subjectName: string
): Promise<SchoolUaceClassSubjectPaperRow[]> {
  const subject = (subjectName || '').trim();
  if (!schoolId || !className || !subject) return [];
  const { data, error } = await supabase
    .from('school_uace_class_subject_papers')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('subject_name', subject)
    .order('sort_order', { ascending: true })
    .order('paper_code', { ascending: true });
  if (error) throw error;
  return (data || []) as SchoolUaceClassSubjectPaperRow[];
}
