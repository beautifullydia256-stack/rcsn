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

  const { data: parentsData } = await supabase
    .from('parents')
    .select(`
      id, user_id, name, email, phone, student_id, created_at,
      students ( name, current_class )
    `)
    .eq('school_id', userData.school_id)
    .order('created_at', { ascending: false });

  return (parentsData || []).map((p: any) => ({
    ...p,
    student_name: p.students?.name || 'Unknown',
    student_class: p.students?.current_class || 'N/A',
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
          onClick={() => navigate('/dashboard/admin/parents/add')}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          <UserPlus className="w-5 h-5" />
          Add Parent
        </button>
      </div>

      <div className={`${adminCardClass} mb-6 flex items-center gap-3`} style={{ background: 'linear-gradient(135deg, rgba(77, 171, 255, 0.2) 0%, rgba(77, 171, 255, 0.1) 100%)' }}>
        <div className="p-2 rounded-lg bg-blue-500/20">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-white/70 text-sm">Total Parents</p>
          <p className="text-2xl font-bold text-white">{loading ? '—' : parents.length}</p>
        </div>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or student name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {!loading && filteredParents.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <h3 className="text-white/70 font-medium mb-1">No parents found</h3>
            <p className="text-white/50 text-sm mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first parent'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/parents/add')}
                className="rounded-xl border border-blue-500/50 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Parent
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/5 text-left">
                  <th className="px-4 py-2 font-medium text-white/85">Name</th>
                  <th className="px-4 py-2 font-medium text-white/85">Email</th>
                  <th className="px-4 py-2 font-medium text-white/85">Phone</th>
                  <th className="px-4 py-2 font-medium text-white/85">Student</th>
                  <th className="px-4 py-2 font-medium text-white/85">Class</th>
                  <th className="px-4 py-2 font-medium text-white/85">Enrolled</th>
                  <th className="px-4 py-2 font-medium text-white/85">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-white/10">
                      <td className="px-4 py-3"><div className="h-5 w-28 rounded bg-white/15 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-36 rounded bg-white/15 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-white/15 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-white/15 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 rounded bg-white/15 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-24 rounded bg-white/15 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-7 w-16 rounded bg-white/15 animate-pulse" /></td>
                    </tr>
                  ))
                ) : (
                  filteredParents.map((p) => (
                    <tr key={p.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-2 text-white">{p.name}</td>
                      <td className="px-4 py-2 text-white/90">{p.email}</td>
                      <td className="px-4 py-2 text-white/90">{p.phone || '-'}</td>
                      <td className="px-4 py-2 text-white/90">{p.student_name}</td>
                      <td className="px-4 py-2 text-white/90">{p.student_class}</td>
                      <td className="px-4 py-2 text-white/90">{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deleting === p.id}
                          className="rounded bg-red-600/90 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
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
