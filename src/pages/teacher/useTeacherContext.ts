import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type ClassWithSubjects = { class_name: string; subjects: string[] };

export type TeacherContext = {
  schoolId: string | null;
  teacherId: string | null;
  classNames: string[];
  /** For sidebar: classes with their subjects (teacher_class_subjects + class_teachers) */
  classesWithSubjects: ClassWithSubjects[];
  isLoading: boolean;
};

async function fetchTeacherContext(
  schoolId: string | null,
  userEmail: string | undefined
): Promise<Omit<TeacherContext, 'isLoading'>> {
  if (!schoolId || !userEmail?.trim()) {
    return { schoolId, teacherId: null, classNames: [], classesWithSubjects: [] };
  }
  const email = userEmail.trim().toLowerCase();
  const { data: teacher } = await supabase
    .from('teachers')
    .select('teacher_id')
    .eq('school_id', schoolId)
    .ilike('email', email)
    .maybeSingle();
  const teacherId = (teacher as { teacher_id?: string } | null)?.teacher_id ?? null;
  if (!teacherId) return { schoolId, teacherId: null, classNames: [], classesWithSubjects: [] };

  const { data: classRows } = await supabase
    .from('class_teachers')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  const { data: tcsRows } = await supabase
    .from('teacher_class_subjects')
    .select('class_name, subject')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  const classSet = new Set<string>();
  (classRows || []).forEach((r: { class_name: string }) => classSet.add(r.class_name));
  const byClass = new Map<string, Set<string>>();
  (tcsRows || []).forEach((r: { class_name: string; subject: string }) => {
    classSet.add(r.class_name);
    if (!byClass.has(r.class_name)) byClass.set(r.class_name, new Set());
    byClass.get(r.class_name)!.add(r.subject);
  });
  const classNames = Array.from(classSet);
  const classesWithSubjects: ClassWithSubjects[] = classNames.map((class_name) => ({
    class_name,
    subjects: Array.from(byClass.get(class_name) ?? []).sort(),
  }));
  return { schoolId, teacherId, classNames, classesWithSubjects };
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
    classesWithSubjects: data?.classesWithSubjects ?? [],
    isLoading,
  };
}
