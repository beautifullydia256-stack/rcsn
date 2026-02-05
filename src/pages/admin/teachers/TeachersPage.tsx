import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchTeachersList(userId: string) {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [] as any[];
  const { data: tchs } = await supabase.from('teachers').select('teacher_id, name, phone, email, created_at').eq('school_id', data.school_id).order('created_at', { ascending: false });
  return tchs || [];
}

export default function TeachersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'teachers', user?.id ?? ''],
    queryFn: () => fetchTeachersList(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => (r.name || '').toLowerCase().includes(t) || (r.email || '').toLowerCase().includes(t));
  }, [q, rows]);

  const remove = async (id: string) => {
    if (!confirm('Delete this teacher? This cannot be undone.')) return;
    try {
      await supabase.from('teachers').delete().eq('teacher_id', id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'teachers', user?.id] });
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  const loading = isLoading;

  return (
    <AdminPageWrapper title="All Teachers">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => navigate('/dashboard/admin/teachers/add')}
        >
          Add Teacher
        </button>
        <button
          type="button"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => navigate('/dashboard/admin')}
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          className="w-full md:max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 font-medium text-gray-700">Phone</th>
                <th className="px-4 py-2 font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 font-medium text-gray-700">Hired</th>
                <th className="px-4 py-2 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-gray-100">
                    <td className="px-4 py-3"><div className="h-5 w-32 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-40 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-7 w-20 rounded bg-gray-200 animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No teachers found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.teacher_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <button type="button" className="text-green-600 hover:underline font-medium" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.phone || '-'}</td>
                    <td className="px-4 py-2 text-gray-700">{r.email}</td>
                    <td className="px-4 py-2 text-gray-700">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>View</button>
                        <button type="button" className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700" onClick={() => remove(r.teacher_id)}>Delete</button>
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
