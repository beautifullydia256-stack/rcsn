import type { User } from '@supabase/supabase-js';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { resolveTeacherIdForSchool } from '@/lib/resolveTeacherId';
import { useTeacherPersonaStore } from '@/store/teacherPersonaStore';

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
  user: User | null,
  overrideTeacherId?: string | null
): Promise<Omit<TeacherContext, 'isLoading'>> {
  if (!schoolId) {
    return { schoolId, teacherId: null, classNames: [], classesWithSubjects: [] };
  }
  const teacherId = overrideTeacherId || (user ? await resolveTeacherIdForSchool(schoolId, user) : null);
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
  const simulatedTeacher = useTeacherPersonaStore((s) => s.simulatedTeacher);
  const schoolId =
    schoolIdFromStore ??
    (user?.user_metadata?.school_id as string | undefined) ??
    null;
  const activeTeacherId = simulatedTeacher?.id ?? null;

  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: ['teacher', 'context', schoolId ?? '', user?.id ?? '', activeTeacherId ?? ''],
    queryFn: () => fetchTeacherContext(schoolId, user ?? null, activeTeacherId),
    enabled: !!schoolId && (!!user || !!activeTeacherId),
    staleTime: 3 * 60 * 1000,
    /** Slower background poll so it does not fight the dashboard query */
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  /** True only before the first successful context — not on background refetch */
  const isLoading = isPending && !data && !isPlaceholderData;

  return {
    schoolId: data?.schoolId ?? schoolId,
    teacherId: data?.teacherId ?? null,
    classNames: data?.classNames ?? [],
    classesWithSubjects: data?.classesWithSubjects ?? [],
    isLoading,
  };
}

