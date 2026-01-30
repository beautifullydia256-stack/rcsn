import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

export default function TeachersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!data?.school_id) {
        navigate('/login');
        return;
      }
      const { data: tchs } = await supabase.from('teachers').select('*').eq('school_id', data.school_id).order('created_at', { ascending: false });
      setRows(tchs || []);
      setLoading(false);
    };
    run();
  }, [navigate]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => (r.name || '').toLowerCase().includes(t) || (r.email || '').toLowerCase().includes(t));
  }, [q, rows]);

  const remove = async (id: string) => {
    if (!confirm('Delete this teacher? This cannot be undone.')) return;
    try {
      await supabase.from('teachers').delete().eq('teacher_id', id);
      setRows((prev) => prev.filter((r) => r.teacher_id !== id));
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  return (
    <AdminPageWrapper title="All Teachers">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
          onClick={() => navigate('/dashboard/admin/teachers/add')}
        >
          Add Teacher
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
          onClick={() => navigate('/dashboard/admin')}
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          className="w-full md:max-w-md rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/5 text-left">
                <th className="px-4 py-2 font-medium text-white/85">Name</th>
                <th className="px-4 py-2 font-medium text-white/85">Phone</th>
                <th className="px-4 py-2 font-medium text-white/85">Email</th>
                <th className="px-4 py-2 font-medium text-white/85">Hired</th>
                <th className="px-4 py-2 font-medium text-white/85">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-white/70">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-white/70">No teachers found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.teacher_id} className="border-b border-white/20 hover:bg-white/5">
                    <td className="px-4 py-2">
                      <button type="button" className="text-blue-400 hover:underline" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-white/70">{r.phone || '-'}</td>
                    <td className="px-4 py-2 text-white/70">{r.email}</td>
                    <td className="px-4 py-2 text-white/70">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:opacity-90" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>View</button>
                        <button type="button" className="rounded bg-red-600/90 px-2 py-1 text-xs text-white hover:bg-red-600" onClick={() => remove(r.teacher_id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
