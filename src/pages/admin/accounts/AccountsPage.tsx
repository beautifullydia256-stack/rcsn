import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { UserPlus, Shield, BookOpen, Calculator } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

interface UserAccount {
  user_id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  department?: string;
  position?: string;
  created_at: string;
  last_sign_in_at?: string;
}

async function fetchAccounts(userId: string): Promise<UserAccount[]> {
  const { data: userData } = await supabase.from('users').select('school_id, role').eq('user_id', userId).single();
  if (!userData?.school_id || userData.role !== 'admin') return [];
  const { data } = await supabase
    .from('users')
    .select('user_id, email, name, role, phone, department, position, created_at, last_sign_in_at')
    .eq('school_id', userData.school_id)
    .in('role', ['admin', 'librarian', 'accountant'])
    .order('created_at', { ascending: false });
  return (data || []) as UserAccount[];
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['admin', 'accounts', authUser?.id ?? ''],
    queryFn: () => fetchAccounts(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: STALE_TIME_MS,
  });

  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.department?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) result = result.filter((a) => a.role === roleFilter);
    return result;
  }, [accounts, searchQuery, roleFilter]);

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the account for ${email}? This action cannot be undone.`)) return;
    setDeleting(userId);
    try {
      const { error } = await supabase.from('users').delete().eq('user_id', userId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
    } catch (err: any) {
      alert(`Error: ${err.message}. You may need to remove this user via Supabase dashboard or API.`);
    } finally {
      setDeleting(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'librarian': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accountant': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const loading = isLoading;

  if (loading) {
    return (
      <AdminPageWrapper title="Staff Accounts">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-green-600" />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Staff Accounts"
      subtitle="Manage admin, librarian, and accountant accounts"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div />
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/accounts/add')}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <UserPlus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${adminCardClass} flex items-center gap-3 bg-purple-50 border-purple-100`}>
          <div className="p-2 rounded-lg bg-purple-100">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Admins</p>
            <p className="text-xl font-bold text-gray-900">{accounts.filter((a) => a.role === 'admin').length}</p>
          </div>
        </div>
        <div className={`${adminCardClass} flex items-center gap-3 bg-blue-50 border-blue-100`}>
          <div className="p-2 rounded-lg bg-blue-100">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Librarians</p>
            <p className="text-xl font-bold text-gray-900">{accounts.filter((a) => a.role === 'librarian').length}</p>
          </div>
        </div>
        <div className={`${adminCardClass} flex items-center gap-3 bg-emerald-50 border-emerald-100`}>
          <div className="p-2 rounded-lg bg-emerald-100">
            <Calculator className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Accountants</p>
            <p className="text-xl font-bold text-gray-900">{accounts.filter((a) => a.role === 'accountant').length}</p>
          </div>
        </div>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="librarian">Librarian</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 font-medium text-gray-700">Role</th>
                <th className="px-4 py-2 font-medium text-gray-700">Department</th>
                <th className="px-4 py-2 font-medium text-gray-700">Last Sign-in</th>
                <th className="px-4 py-2 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No accounts found.</td>
                </tr>
              ) : (
                filteredAccounts.map((a) => (
                  <tr key={a.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900 font-medium">{a.name || '-'}</td>
                    <td className="px-4 py-2 text-gray-700">{a.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded border text-xs ${getRoleBadgeClass(a.role)}`}>{a.role}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{a.department || '-'}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(a.user_id, a.email)}
                        disabled={deleting === a.user_id}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting === a.user_id ? 'Deleting...' : 'Delete'}
                      </button>
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
