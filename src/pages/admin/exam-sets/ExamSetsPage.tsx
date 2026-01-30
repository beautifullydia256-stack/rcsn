import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

export default function ExamSetsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [examSets, setExamSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!data?.school_id) return;
      const { data: sets } = await supabase
        .from('exam_sets')
        .select('*')
        .eq('school_id', data.school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      setExamSets(sets || []);
      setLoading(false);
    };
    run();
  }, [user]);

  return (
    <AdminPageWrapper title="Exam Sets" subtitle="Manage exam sets and terms">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
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
          <div className="py-12 text-center text-white/70">No exam sets yet. Create one from your school settings or legacy admin.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/5 text-left">
                <th className="px-4 py-2 font-medium text-white/85">Name</th>
                <th className="px-4 py-2 font-medium text-white/85">Term</th>
                <th className="px-4 py-2 font-medium text-white/85">Year</th>
                <th className="px-4 py-2 font-medium text-white/85">Active</th>
                <th className="px-4 py-2 font-medium text-white/85">Created</th>
              </tr>
            </thead>
            <tbody>
              {examSets.map((es) => (
                <tr key={es.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-2 text-white">{es.name || '—'}</td>
                  <td className="px-4 py-2 text-white/90">{es.term}</td>
                  <td className="px-4 py-2 text-white/90">{es.year}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${es.is_active ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-white/10 text-white/70 border border-white/20'}`}>
                      {es.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-white/90">{es.created_at ? new Date(es.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageWrapper>
  );
}
