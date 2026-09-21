import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { resolveCurrentSchoolTerm, resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';
import { useTeacherContext } from '../useTeacherContext';

type StudentRow = { student_id: string; name: string; current_class: string; admission_number?: string };

export default function TeacherStudentsPage() {
  const navigate = useNavigate();
  const { schoolId, classNames, isLoading: ctxLoading } = useTeacherContext();

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher', 'students', schoolId ?? '', classNames.join(',')],
    queryFn: async (): Promise<StudentRow[]> => {
      if (!schoolId || classNames.length === 0) return [];
      const today = schoolCalendarTodayIso();
      const term = await resolveCurrentSchoolTerm(supabase, schoolId, today);
      if (term) {
        const activeIds = await resolveActiveStudentIdsForTerm(supabase, schoolId, term, today);
        if (activeIds.size > 0) {
          const { data } = await supabase
            .from('students')
            .select('student_id, name, current_class, admission_number')
            .eq('school_id', schoolId)
            .eq('status', 'active')
            .in('current_class', classNames)
            .in('student_id', Array.from(activeIds))
            .order('current_class')
            .order('name');
          return (data as StudentRow[]) ?? [];
        }
        return [];
      }
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class, admission_number')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('current_class', classNames)
        .order('current_class')
        .order('name');
      return (data as StudentRow[]) ?? [];
    },
    enabled: !!schoolId && classNames.length > 0,
  });

  const isLoading = ctxLoading || studentsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">My Students</h1>
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
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && classNames.length === 0 && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">No classes assigned yet. Ask your admin to assign you to classes.</p>
        </div>
      )}

      {!isLoading && classNames.length > 0 && students.length === 0 && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">No active students in your classes right now.</p>
        </div>
      )}

      {!isLoading && students.length > 0 && (
        <div className="ac-glass-card border border-[var(--ac-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--ac-border)] ac-text-muted text-sm">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Class</th>
                  <th className="p-3 font-medium">Admission No.</th>
                </tr>
              </thead>
              <tbody className="ac-text-primary">
                {students.map((s) => (
                  <tr key={s.student_id} className="border-b border-[var(--ac-border)] last:border-0">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.current_class}</td>
                    <td className="p-3">{s.admission_number ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
