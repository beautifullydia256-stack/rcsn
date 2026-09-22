import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchTeachersList(userId: string) {
  let schoolId = useAuthStore.getState().schoolId || (useAuthStore.getState().user as any)?.school_id;
  if (!schoolId) {
    try {
      const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).maybeSingle();
      schoolId = data?.school_id;
    } catch {
      // fallback
    }
  }
  if (!schoolId) return [] as any[];
  const { data: tchs } = await supabase
    .from('teachers')
    .select('teacher_id, name, phone, email, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(registerApiUrl('/api/admin/delete-teacher'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ teacher_id: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Delete failed');
      }
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
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/admin/teachers?add=1')}
        >
          Add Teacher
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/admin')}
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          className="ac-input w-full md:max-w-md rounded-xl px-3 py-2 text-sm min-h-0"
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto rounded-xl overflow-hidden ac-glass-card border border-[var(--ac-border)]">
          <table className="min-w-full text-sm ac-table-wrap">
            <thead>
              <tr className="border-b border-[var(--ac-border)] ac-text-muted text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Hired</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-[var(--ac-border)]">
                    <td className="px-4 py-3"><div className="h-5 w-32 rounded ac-skeleton-block animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-40 rounded ac-skeleton-block animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-7 w-20 rounded ac-skeleton-block animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center ac-text-muted">No teachers found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.teacher_id} className="border-b border-[var(--ac-border)]">
                    <td className="px-4 py-2">
                      <button type="button" className="text-emerald-500 hover:underline font-medium ac-text-primary" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 ac-text-secondary">{r.phone || '-'}</td>
                    <td className="px-4 py-2 ac-text-secondary">{r.email}</td>
                    <td className="px-4 py-2 ac-text-secondary">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
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
