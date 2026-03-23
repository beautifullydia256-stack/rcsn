import { supabase } from '@/lib/supabase';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';

export type AddParentSchoolStudent = {
  student_id: string;
  name: string;
  current_class: string;
};

export type AddParentSchoolData = {
  schoolId: string | null;
  students: AddParentSchoolStudent[];
};

export function addParentSchoolQueryKey(userId: string) {
  return ['admin', 'add-parent', 'school', userId] as const;
}

export async function fetchAddParentSchoolContext(userId: string): Promise<AddParentSchoolData> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) {
    return { schoolId: null, students: [] };
  }

  const { data: students } = await supabase
    .from('students')
    .select('student_id, name, current_class')
    .eq('school_id', u.school_id)
    .eq('status', 'active')
    .order('name');

  return {
    schoolId: u.school_id,
    students: (students || []) as AddParentSchoolStudent[],
  };
}

export const addParentSchoolStaleOptions = {
  staleTime: ADMIN_STALE_TIME_MS,
  gcTime: ADMIN_GC_TIME_MS,
} as const;
