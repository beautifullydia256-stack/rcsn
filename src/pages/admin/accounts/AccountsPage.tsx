import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { UserPlus, Key, UserX, UserCheck } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'head_teacher', label: 'Head Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
];

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
  is_active?: boolean;
}

async function fetchAccounts(userId: string): Promise<UserAccount[]> {
  const { data: userData } = await supabase.from('users').select('school_id, role').eq('user_id', userId).single();
  if (!userData?.school_id || !['admin', 'owner'].includes(userData.role ?? '')) return [];
  const cols = 'user_id, email, name, role, phone, department, position, created_at, last_sign_in_at, is_active';
  const result = await supabase
    .from('users')
    .select(cols)
    .eq('school_id', userData.school_id)
    .order('created_at', { ascending: false });
  let rows: Record<string, unknown>[];
  if (result.error && result.error.message?.includes('is_active')) {
    const fallback = await supabase
      .from('users')
      .select('user_id, email, name, role, phone, department, position, created_at, last_sign_in_at')
      .eq('school_id', userData.school_id)
      .order('created_at', { ascending: false });
    rows = (fallback.data || []).map((r) => ({ ...r, is_active: true }));
  } else {
    rows = (result.data || []).map((r: Record<string, unknown>) => ({ ...r, is_active: r.is_active ?? true }));
  }
  return rows as UserAccount[];
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

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
    if (!confirm(`Are you sure you want to delete the account for ${email}? This action cannot be undone. Prefer deactivating instead.`)) return;
    setDeleting(userId);
    try {
      const { error } = await supabase.from('users').delete().eq('user_id', userId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : 'Delete failed'}. You may need to remove this user via Supabase dashboard or API.`);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setToggling(userId);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, is_active: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setToggling(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = window.prompt(`Set new password for ${email} (min 6 characters):`);
    if (newPassword == null || newPassword.length < 6) {
      if (newPassword != null) alert('Password must be at least 6 characters.');
      return;
    }
    setResetting(userId);
    try {
      const res = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      alert('Password reset successfully.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResetting(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
      case 'head_teacher': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700';
      case 'librarian': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'accountant': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700';
      case 'teacher': return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700';
      case 'student': return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700';
      case 'parent': return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getRoleLabel = (role: string) => {
    const r = ROLE_OPTIONS.find((o) => o.value === role);
    return r?.label || role;
  };

  const loading = isLoading;

  if (loading) {
    return (
      <AdminPageWrapper title="User Management">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ac-border)] border-t-emerald-500" />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="User Management"
      subtitle="View all users, filter by role, reset password, activate or deactivate. Create staff from Create Staff."
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div />
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/accounts/add')}
          className="ac-glass-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Create Staff
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {['admin', 'head_teacher', 'accountant', 'teacher', 'librarian', 'student', 'parent'].map((r) => (
          <div key={r} className="ac-glass-card flex items-center gap-2 rounded-[18px] p-4">
            <span className={`px-2 py-1 rounded border text-xs ${getRoleBadgeClass(r)}`}>{getRoleLabel(r)}</span>
            <span className="text-lg font-bold ac-text-primary">{accounts.filter((a) => a.role === r).length}</span>
          </div>
        ))}
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ac-input flex-1 rounded-xl px-3 py-2 text-sm min-h-0"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="ac-input w-full sm:w-48 rounded-xl px-3 py-2 text-sm min-h-0"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl overflow-hidden ac-glass-card border border-[var(--ac-border)]">
          <table className="min-w-full text-sm ac-table-wrap">
            <thead>
              <tr className="border-b border-[var(--ac-border)] ac-text-muted text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last Sign-in</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center ac-text-muted">No users found.</td>
                </tr>
              ) : (
                filteredAccounts.map((a) => (
                  <tr key={a.user_id} className="border-b border-[var(--ac-border)]">
                    <td className="px-4 py-2 font-medium ac-text-primary">{a.name || '-'}</td>
                    <td className="px-4 py-2 ac-text-secondary">{a.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded border text-xs ${getRoleBadgeClass(a.role)}`}>{getRoleLabel(a.role)}</span>
                    </td>
                    <td className="px-4 py-2 ac-text-secondary">{a.department || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={a.is_active === false ? 'text-red-600 dark:text-red-400' : 'ac-text-secondary'}>
                        {a.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-2 ac-text-secondary">
                      {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleResetPassword(a.user_id, a.email)}
                        disabled={resetting === a.user_id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                        title="Reset password"
                      >
                        <Key className="w-3 h-3" />
                        {resetting === a.user_id ? '…' : 'Reset'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(a.user_id, a.is_active !== false)}
                        disabled={toggling === a.user_id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        title={a.is_active === false ? 'Activate' : 'Deactivate'}
                      >
                        {a.is_active === false ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {toggling === a.user_id ? '…' : a.is_active === false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.user_id, a.email)}
                        disabled={deleting === a.user_id}
                        className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        title="Delete (prefer deactivate)"
                      >
                        {deleting === a.user_id ? 'Deleting…' : 'Delete'}
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
