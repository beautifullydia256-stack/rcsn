import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { UserPlus, Users } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

interface Parent {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  student_id: string;
  student_name?: string;
  student_class?: string;
  created_at: string;
}

async function fetchParentsList(userId: string): Promise<Parent[]> {
  const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!userData?.school_id) return [];

  const { data: parentsData, error: parentsError } = await supabase
    .from('parents')
    .select('id, user_id, name, email, phone, student_id, created_at')
    .eq('school_id', userData.school_id)
    .order('created_at', { ascending: false });

  if (parentsError) {
    console.warn('Parents fetch error:', parentsError);
    return [];
  }
  const parents = parentsData || [];
  if (parents.length === 0) return [];

  const studentIds = [...new Set(parents.map((p: any) => p.student_id).filter(Boolean))];
  const studentMap: Record<string, { name: string; current_class: string }> = {};
  if (studentIds.length > 0) {
    const { data: studentsData } = await supabase
      .from('students')
      .select('student_id, name, current_class')
      .in('student_id', studentIds);
    (studentsData || []).forEach((s: any) => {
      studentMap[s.student_id] = { name: s.name || 'Unknown', current_class: s.current_class || 'N/A' };
    });
  }

  return parents.map((p: any) => ({
    ...p,
    student_name: studentMap[p.student_id]?.name ?? 'Unknown',
    student_class: studentMap[p.student_id]?.current_class ?? 'N/A',
  })) as Parent[];
}

export default function ParentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: parents = [], isLoading } = useQuery({
    queryKey: ['admin', 'parents', user?.id ?? ''],
    queryFn: () => fetchParentsList(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents;
    const q = searchQuery.toLowerCase();
    return parents.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(searchQuery) ||
        p.student_name?.toLowerCase().includes(q)
    );
  }, [parents, searchQuery]);

  const handleDelete = async (parentId: string, parentName: string) => {
    if (!confirm(`Are you sure you want to remove ${parentName}? This will not delete their login if they have one.`)) return;
    setDeleting(parentId);
    try {
      const { error } = await supabase.from('parents').delete().eq('id', parentId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin', 'parents', user?.id] });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const loading = isLoading;

  return (
    <AdminPageWrapper
      title="Parents & Guardians"
      subtitle="Manage parent accounts and their linked students"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div />
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/parents?add=1')}
          className="ac-glass-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Add Parent
        </button>
      </div>

      <div className={`${adminCardClass} mb-6 flex items-center gap-3 ac-glass-card`}>
        <div className="ac-glass-icon ac-icon-blue p-2 rounded-lg">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <p className="ac-text-secondary text-sm">Total Parents</p>
          <p className="text-2xl font-bold ac-text-primary">{loading ? '—' : parents.length}</p>
        </div>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or student name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ac-input w-full rounded-xl px-3 py-2 text-sm min-h-0"
        />
        {!loading && filteredParents.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 ac-text-muted" />
            <h3 className="ac-text-primary font-medium mb-1">No parents found</h3>
            <p className="ac-text-muted text-sm mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first parent'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/parents?add=1')}
                className="ac-glass-btn rounded-xl px-4 py-2 text-sm font-medium"
              >
                Add Parent
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl overflow-hidden ac-glass-card border border-[var(--ac-border)]">
            <table className="min-w-full text-sm ac-table-wrap">
              <thead>
                <tr className="border-b border-[var(--ac-border)] ac-text-muted text-left">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium">Class</th>
                  <th className="px-4 py-2 font-medium">Enrolled</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-[var(--ac-border)]">
                      <td className="px-4 py-3"><div className="h-5 w-28 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-36 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-7 w-16 rounded ac-skeleton-block animate-pulse" /></td>
                    </tr>
                  ))
                ) : (
                  filteredParents.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--ac-border)]">
                      <td className="px-4 py-2 font-medium ac-text-primary">{p.name}</td>
                      <td className="px-4 py-2 ac-text-secondary">{p.email}</td>
                      <td className="px-4 py-2 ac-text-secondary">{p.phone || '-'}</td>
                      <td className="px-4 py-2 ac-text-secondary">{p.student_name}</td>
                      <td className="px-4 py-2 ac-text-secondary">{p.student_class}</td>
                      <td className="px-4 py-2 ac-text-secondary">{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deleting === p.id}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleting === p.id ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
