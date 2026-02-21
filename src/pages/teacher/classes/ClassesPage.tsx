import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';

type ClassInfo = { class_name: string; subjects: string[]; is_class_teacher: boolean };

export default function TeacherClassesPage() {
  const navigate = useNavigate();
  const { schoolId, teacherId, isLoading: ctxLoading } = useTeacherContext();

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['teacher', 'classes', schoolId ?? '', teacherId ?? ''],
    queryFn: async (): Promise<ClassInfo[]> => {
      if (!schoolId || !teacherId) return [];
      const [ctRes, tcsRes] = await Promise.all([
        supabase.from('class_teachers').select('class_name').eq('school_id', schoolId).eq('teacher_id', teacherId),
        supabase.from('teacher_class_subjects').select('class_name, subject').eq('school_id', schoolId).eq('teacher_id', teacherId),
      ]);
      const classTeacherSet = new Set((ctRes.data ?? []).map((r: { class_name: string }) => r.class_name));
      const byClass = new Map<string, Set<string>>();
      (tcsRes.data ?? []).forEach((r: { class_name: string; subject: string }) => {
        if (!byClass.has(r.class_name)) byClass.set(r.class_name, new Set());
        byClass.get(r.class_name)!.add(r.subject);
      });
      const allClasses = new Set([...classTeacherSet, ...byClass.keys()]);
      return Array.from(allClasses).map((class_name) => ({
        class_name,
        subjects: Array.from(byClass.get(class_name) ?? []).sort(),
        is_class_teacher: classTeacherSet.has(class_name),
      }));
    },
    enabled: !!schoolId && !!teacherId,
  });

  const isLoading = ctxLoading || classesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">My Classes</h1>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher')}
        >
          Back
        </button>
      </div>

      {isLoading && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-full rounded ac-skeleton-block" />
            <div className="h-20 w-full rounded ac-skeleton-block" />
            <div className="h-20 w-full rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && classes.length === 0 && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">No classes assigned yet. Ask your admin to assign you to classes or subjects.</p>
        </div>
      )}

      {!isLoading && classes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div
              key={c.class_name}
              className="ac-glass-card p-4 border border-[var(--ac-border)]"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium ac-text-primary">{c.class_name}</h3>
                {c.is_class_teacher && (
                  <span className="rounded bg-[var(--ac-bg-muted)] px-2 py-0.5 text-xs ac-text-muted">Class teacher</span>
                )}
              </div>
              {c.subjects.length > 0 && (
                <p className="mt-2 text-sm ac-text-muted">
                  {c.subjects.slice(0, 4).join(', ')}
                  {c.subjects.length > 4 ? ` +${c.subjects.length - 4} more` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
