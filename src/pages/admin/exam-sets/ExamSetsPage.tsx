import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchExamSets(userId: string) {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [] as any[];
  const { data: sets } = await supabase
    .from('exam_sets')
    .select('id, name, term, year, is_active, created_at')
    .eq('school_id', data.school_id)
    .order('year', { ascending: false })
    .order('term', { ascending: false });
  return sets || [];
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
    <AdminPageWrapper title="Exam Sets" subtitle="Manage exam sets and terms">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} overflow-x-auto`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white" />
          </div>
        ) : examSets.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No exam sets yet. Create one from your school settings or legacy admin.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 font-medium text-gray-700">Term</th>
                <th className="px-4 py-2 font-medium text-gray-700">Year</th>
                <th className="px-4 py-2 font-medium text-gray-700">Active</th>
                <th className="px-4 py-2 font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {examSets.map((es) => (
                <tr key={es.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900 font-medium">{es.name || '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{es.term}</td>
                  <td className="px-4 py-2 text-gray-700">{es.year}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${es.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                      {es.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{es.created_at ? new Date(es.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageWrapper>
  );
}
