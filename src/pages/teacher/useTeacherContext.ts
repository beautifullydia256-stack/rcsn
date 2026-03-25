import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { resolveTeacherIdForSchool } from '@/lib/resolveTeacherId';

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
  user: User | null
): Promise<Omit<TeacherContext, 'isLoading'>> {
  if (!schoolId || !user) {
    return { schoolId, teacherId: null, classNames: [], classesWithSubjects: [] };
  }
  const teacherId = await resolveTeacherIdForSchool(schoolId, user);
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
  const { data, isLoading } = useQuery({
    queryKey: ['teacher', 'context', schoolId ?? '', user?.id ?? ''],
    queryFn: () => fetchTeacherContext(schoolId, user ?? null),
    enabled: !!schoolId && !!user,
    staleTime: 30 * 1000,
    refetchInterval: 45 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    schoolId: data?.schoolId ?? schoolId,
    teacherId: data?.teacherId ?? null,
    classNames: data?.classNames ?? [],
    classesWithSubjects: data?.classesWithSubjects ?? [],
    isLoading,
  };
}
