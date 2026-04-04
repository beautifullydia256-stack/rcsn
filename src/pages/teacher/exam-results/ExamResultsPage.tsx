/**
 * Teacher Exam Results — step 1: select a class (same flow as before).
 * Clicking a class goes to /dashboard/teacher/exam-results/class/:className
 * where teacher selects Exam Set + Subject and enters marks one subject at a time.
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '../useTeacherContext';
import { getSecondaryExamEntryTrack } from '@/components/reports/templates/helpers';

type SchoolType = 'Nursery/Primary' | 'Secondary' | null;
type ClassInfo = { class_name: string; subjects: string[]; is_class_teacher: boolean };

async function fetchSchoolType(schoolId: string): Promise<SchoolType> {
  const { data } = await supabase.from('schools').select('type').eq('school_id', schoolId).single();
  const t = (data as { type?: string } | null)?.type;
  if (t === 'Nursery/Primary' || t === 'Secondary') return t;
  return null;
}

export default function TeacherExamResultsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { teacherId, isLoading: ctxLoading } = useTeacherContext();

  const { data: schoolType, isLoading: typeLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['teacher', 'exam-results', 'classes', schoolId ?? '', teacherId ?? ''],
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

  const isLoading = ctxLoading || typeLoading || classesLoading;

  const handleClassSelect = (className: string) => {
    navigate(`/dashboard/teacher/exam-results/class/${encodeURIComponent(className)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">Exam Results</h1>
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
          <div className="animate-pulse flex items-center justify-center py-8">
            <div className="h-6 w-48 rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && !schoolId && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Sign in and select a school to enter exam results.</p>
        </div>
      )}

      {!isLoading && schoolId && !schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Unable to determine school type. Contact your admin to set school type (Primary or Secondary).</p>
        </div>
      )}

      {!isLoading && schoolId && schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)] space-y-6">
          <h2 className="ac-text-primary font-medium">
            {schoolType === 'Nursery/Primary' ? 'Primary / Nursery' : 'Secondary'} exam results
          </h2>
          <p className="ac-text-muted text-sm">
            Select a class to input exam results. You can only input results for subjects you are assigned to teach.
          </p>

          {classes.length === 0 ? (
            <div className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-bg-muted)] p-8 text-center">
              <div className="ac-text-primary text-lg mb-2">No Classes Assigned</div>
              <div className="ac-text-muted text-sm">
                You haven&apos;t been assigned to any classes yet. Contact your administrator.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((c) => {
                const secTrack = schoolType === 'Secondary' ? getSecondaryExamEntryTrack(c.class_name) : null;
                return (
                <button
                  key={c.class_name}
                  type="button"
                  className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-bg)] p-6 text-left ac-text-primary hover:bg-[var(--ac-bg-muted)] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ac-focus)]"
                  onClick={() => handleClassSelect(c.class_name)}
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{c.class_name}</h3>
                      {secTrack && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
                            secTrack === 'alevel'
                              ? 'border-violet-500/50 bg-violet-500/15 text-violet-800 dark:text-violet-200'
                              : 'border-sky-500/50 bg-sky-500/15 text-sky-800 dark:text-sky-200'
                          }`}
                        >
                          {secTrack === 'alevel' ? 'A-Level' : 'O-Level'}
                        </span>
                      )}
                    </div>
                    <span className="text-[var(--ac-text-muted)] shrink-0" aria-hidden>→</span>
                  </div>
                  <div className="mb-4">
                    <div className="ac-text-muted text-sm mb-2">Subjects you teach:</div>
                    <div className="flex flex-wrap gap-2">
                      {c.subjects.length === 0 ? (
                        <span className="ac-text-muted text-sm">No subjects assigned</span>
                      ) : (
                        c.subjects.map((subject) => (
                          <span
                            key={subject}
                            className="px-2 py-1 rounded text-xs border bg-[var(--ac-bg-muted)] ac-text-primary border-[var(--ac-border)]"
                          >
                            {subject}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="ac-text-muted text-sm">
                    Click to input exam results for {c.class_name}
                  </div>
                </button>
              );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
