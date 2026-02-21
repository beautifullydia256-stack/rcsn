import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type TeacherContext = {
  schoolId: string | null;
  teacherId: string | null;
  classNames: string[];
  isLoading: boolean;
};

async function fetchTeacherContext(
  schoolId: string | null,
  userEmail: string | undefined
): Promise<Omit<TeacherContext, 'isLoading'>> {
  if (!schoolId || !userEmail?.trim()) {
    return { schoolId, teacherId: null, classNames: [] };
  }
  const email = userEmail.trim().toLowerCase();
  const { data: teacher } = await supabase
    .from('teachers')
    .select('teacher_id')
    .eq('school_id', schoolId)
    .ilike('email', email)
    .maybeSingle();
  const teacherId = (teacher as { teacher_id?: string } | null)?.teacher_id ?? null;
  if (!teacherId) return { schoolId, teacherId: null, classNames: [] };

  const { data: classRows } = await supabase
    .from('class_teachers')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  const { data: tcsRows } = await supabase
    .from('teacher_class_subjects')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  const classSet = new Set<string>();
  (classRows || []).forEach((r: { class_name: string }) => classSet.add(r.class_name));
  (tcsRows || []).forEach((r: { class_name: string }) => classSet.add(r.class_name));
  const classNames = Array.from(classSet);
  return { schoolId, teacherId, classNames };
}

export function useTeacherContext(): TeacherContext {
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const schoolId =
    schoolIdFromStore ??
    (user?.user_metadata?.school_id as string | undefined) ??
    null;
  const userEmail = user?.email;

  const { data, isLoading } = useQuery({
    queryKey: ['teacher', 'context', schoolId ?? '', userEmail ?? ''],
    queryFn: () => fetchTeacherContext(schoolId, userEmail),
    enabled: !!schoolId && !!userEmail,
  });

  return {
    schoolId: data?.schoolId ?? schoolId,
    teacherId: data?.teacherId ?? null,
    classNames: data?.classNames ?? [],
    isLoading,
  };
}
