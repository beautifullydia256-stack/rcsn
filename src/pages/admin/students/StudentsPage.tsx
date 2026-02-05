import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchStudentsList(userId: string) {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolType: null as 'Nursery/Primary' | 'Secondary' | null, rows: [] as any[] };

  const [schoolRes, studentsRes] = await Promise.all([
    supabase.from('schools').select('type').eq('school_id', u.school_id).single(),
    supabase.from('students').select('student_id, name, current_class, status, created_at, admission_number').eq('school_id', u.school_id).order('created_at', { ascending: false }),
  ]);
  const schoolType = (schoolRes.data?.type as 'Nursery/Primary' | 'Secondary') || null;
  const rows = studentsRes.data || [];
  return { schoolType, rows };
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');
  const [klass, setKlass] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', user?.id ?? ''],
    queryFn: () => fetchStudentsList(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const rows = data?.rows ?? [];
  const schoolType = data?.schoolType ?? null;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t) out = out.filter((r) => (r.name || '').toLowerCase().includes(t) || (r.current_class || '').toLowerCase().includes(t));
    if (klass) out = out.filter((r) => (r.current_class || '') === klass);
    return out;
  }, [q, klass, rows]);

  const remove = async (id: string, admission_number: string) => {
    if (!confirm('Delete this student? This may require additional cleanup for login credentials.')) return;
    try {
      await supabase.from('students').delete().eq('student_id', id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  const loading = isLoading && !data;

  return (
    <AdminPageWrapper title="All Students">
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => navigate('/dashboard/admin')}
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Search by name or class"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="w-full md:w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={klass}
            onChange={(e) => setKlass(e.target.value)}
          >
            <option value="">All Classes</option>
            {schoolType === 'Nursery/Primary' && (
              <>
                <option value="Baby Class">Baby Class</option>
                <option value="Middle Class">Middle Class</option>
                <option value="Top Class">Top Class</option>
                {Array.from({ length: 7 }).map((_, i) => (
                  <option key={`P-${i}`} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                ))}
              </>
            )}
            {schoolType === 'Secondary' &&
              Array.from({ length: 6 }).map((_, i) => (
                <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
              ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 font-medium text-gray-700">Class</th>
                <th className="px-4 py-2 font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 font-medium text-gray-700">Enrolled</th>
                <th className="px-4 py-2 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-gray-100">
                    <td className="px-4 py-3"><div className="h-5 w-32 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-7 w-20 rounded bg-gray-200 animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No students found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <button type="button" className="text-green-600 hover:underline font-medium" onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.current_class}</td>
                    <td className="px-4 py-2 text-gray-700">{r.status}</td>
                    <td className="px-4 py-2 text-gray-700">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700" onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}>View</button>
                        <button type="button" className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700" onClick={() => remove(r.student_id, r.admission_number)}>Delete</button>
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
