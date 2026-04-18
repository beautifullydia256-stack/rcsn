import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { sortExamSetsByTermProgression } from '../../../lib/teacherExamSetsInput';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

export async function fetchExamSets(userId: string) {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [] as any[];
  const todayStr = new Date().toISOString().slice(0, 10);
  const cur = await resolveCurrentSchoolTerm(supabase, data.school_id, todayStr);
  let q = supabase
    .from('exam_sets')
    .select('id, name, term, year, is_active, created_at')
    .eq('school_id', data.school_id);
  if (cur?.year != null && cur?.term != null) {
    q = q.eq('year', cur.year).eq('term', cur.term);
  }
  const { data: sets } = await q.order('year', { ascending: false }).order('term', { ascending: true });
  return sortExamSetsByTermProgression(sets || []);
}

export default function ExamSetsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: examSets = [], isLoading } = useQuery({
    queryKey: ['admin', 'exam-sets', user?.id ?? ''],
    queryFn: () => fetchExamSets(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const loading = isLoading;

  return (
    <AdminPageWrapper
      eyebrow="Exams"
      title="Exam Sets"
      subtitle="Exam sets for the current term only. Past and future terms are hidden so you only activate what applies now."
    >
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} overflow-x-auto`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--ac-border)] border-t-[var(--ac-text-primary)]" />
          </div>
        ) : examSets.length === 0 ? (
          <div className="py-12 text-center ac-text-muted">No exam sets yet. Create one from your school settings or legacy admin.</div>
        ) : (
          <div className="ac-table-wrap rounded-xl border border-[var(--ac-border)] overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left">
                  <th className="px-4 py-2 font-medium ac-text-muted">Name</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Term</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Year</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Active</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Created</th>
                </tr>
              </thead>
              <tbody>
                {examSets.map((es) => (
                  <tr key={es.id} className="border-b border-[var(--ac-border)] hover:bg-[var(--ac-sidebar-active-bg)]">
                    <td className="px-4 py-2 ac-text-primary font-medium">{es.name || '—'}</td>
                    <td className="px-4 py-2 ac-text-secondary">{es.term}</td>
                    <td className="px-4 py-2 ac-text-secondary">{es.year}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs border ${es.is_active ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40' : 'bg-[var(--ac-border)]/50 ac-text-muted border-[var(--ac-border)]'}`}>
                        {es.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2 ac-text-secondary">{es.created_at ? new Date(es.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
