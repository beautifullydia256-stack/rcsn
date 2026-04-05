import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '../../../lib/adminQueryDefaults';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { Key, Search, UserCheck, UserX, Users } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'head_teacher', label: 'Head Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'lab_technician', label: 'Lab technician' },
  { value: 'clinician', label: 'School clinician' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
];

const DASHBOARD_ROLE_KEYS = [
  'admin',
  'head_teacher',
  'accountant',
  'teacher',
  'librarian',
  'lab_technician',
  'clinician',
  'student',
  'parent',
] as const;

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

export async function fetchAccounts(userId: string): Promise<UserAccount[]> {
  const { data: userData } = await supabase.from('users').select('school_id, role').eq('user_id', userId).single();
  const MANAGER_ROLES = ['admin', 'owner', 'head_teacher'];
  if (!userData?.school_id || !MANAGER_ROLES.includes(String(userData.role ?? ''))) return [];
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
  return rows as unknown as UserAccount[];
}

export default function AccountsPage() {
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
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
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
      case 'lab_technician': return 'bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-700';
      case 'clinician': return 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700';
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

  const actionCell = (a: UserAccount) => (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={() => handleResetPassword(a.user_id, a.email)}
        disabled={resetting === a.user_id}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
        title="Reset password"
      >
        <Key className="w-3 h-3 shrink-0" />
        {resetting === a.user_id ? '…' : 'Reset'}
      </button>
      <button
        type="button"
        onClick={() => handleToggleActive(a.user_id, a.is_active !== false)}
        disabled={toggling === a.user_id}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
        title={a.is_active === false ? 'Activate' : 'Deactivate'}
      >
        {a.is_active === false ? <UserCheck className="w-3 h-3 shrink-0" /> : <UserX className="w-3 h-3 shrink-0" />}
        {toggling === a.user_id ? '…' : a.is_active === false ? 'Activate' : 'Deactivate'}
      </button>
      <button
        type="button"
        onClick={() => handleDelete(a.user_id, a.email)}
        disabled={deleting === a.user_id}
        className="min-h-9 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        title="Delete (prefer deactivate)"
      >
        {deleting === a.user_id ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );

  return (
    <AdminPageWrapper
      title="User Management"
      subtitle="View all users, filter by role, reset password, activate or deactivate."
    >
      <div className="space-y-6 font-['Instrument_Sans',system-ui,sans-serif]">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--ac-text-secondary)] sm:max-w-xl">
            Roster-wide overview of everyone with access to your school. For logins that still need email, use Send
            invitations.
          </p>
          <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap">
            <Link
              to="/dashboard/admin/accounts/invite"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--ac-border)] bg-white/50 px-4 py-2 text-sm font-semibold text-[var(--ac-text-primary)] shadow-sm backdrop-blur-sm transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Send invitations
            </Link>
            <Link
              to="/dashboard/admin/permissions"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--ac-border)] bg-white/50 px-4 py-2 text-sm font-semibold text-[var(--ac-text-primary)] shadow-sm backdrop-blur-sm transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Access &amp; permissions
            </Link>
          </div>
        </div>

        <section
          className="rounded-2xl border border-[var(--ac-border)] p-3 shadow-sm sm:p-4"
          style={{ background: 'var(--ac-sidebar-active-bg)' }}
          aria-label="People by role"
        >
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ac-text-muted)]">
            People by role
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {DASHBOARD_ROLE_KEYS.map((r) => {
              const n = accounts.filter((a) => a.role === r).length;
              return (
                <div
                  key={r}
                  className="flex min-h-[4.25rem] flex-col justify-center rounded-xl border border-[var(--ac-border)] px-3 py-2.5 shadow-sm"
                  style={{ backgroundColor: 'var(--ac-card-bg-fallback)' }}
                >
                  <span className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--ac-text-secondary)] sm:text-xs">
                    {getRoleLabel(r)}
                  </span>
                  <span
                    className={`mt-0.5 text-xl font-bold tabular-nums sm:text-2xl ${
                      n === 0 ? 'text-[var(--ac-text-muted)]' : 'text-[var(--ac-text-primary)]'
                    }`}
                  >
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div className={`${adminCardClass} space-y-4 p-4 sm:p-6`}>
          <div className="space-y-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ac-text-muted)]" />
              <input
                type="text"
                placeholder="Search by name, email, or department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ac-input min-h-11 w-full rounded-xl py-3 pl-10 pr-3 text-[15px] outline-none transition focus:ring-2 focus:ring-emerald-500/30 sm:text-sm"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--ac-text-muted)]">Filter by role</p>
              <div className="flex max-h-[9rem] flex-wrap gap-2 overflow-y-auto pr-0.5 sm:max-h-none">
                {ROLE_OPTIONS.map((o) => {
                  const active = roleFilter === o.value;
                  return (
                    <button
                      key={o.value || 'all'}
                      type="button"
                      onClick={() => setRoleFilter(o.value)}
                      className={`min-h-9 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition sm:text-[13px] ${
                        active
                          ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-800 shadow-sm dark:border-emerald-500/50 dark:text-emerald-300'
                          : 'border-[var(--ac-border)] text-[var(--ac-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--ac-border)] py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-[var(--ac-text-muted)] opacity-50" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 font-medium text-[var(--ac-text-primary)]">No users match</p>
              <p className="mt-1 text-sm text-[var(--ac-text-secondary)]">
                {searchQuery || roleFilter ? 'Try clearing search or setting the role filter to All roles.' : 'No accounts returned for this school yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-[var(--ac-border)] md:block ac-glass-card">
                <table className="min-w-full text-sm ac-table-wrap">
                  <thead>
                    <tr className="border-b border-[var(--ac-border)] ac-text-muted text-left">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Last sign-in</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((a) => (
                      <tr key={a.user_id} className="border-b border-[var(--ac-border)] last:border-b-0">
                        <td className="px-4 py-3 font-medium ac-text-primary">{a.name || '—'}</td>
                        <td className="px-4 py-3 ac-text-secondary">{a.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-md border text-xs ${getRoleBadgeClass(a.role)}`}>{getRoleLabel(a.role)}</span>
                        </td>
                        <td className="px-4 py-3 ac-text-secondary">{a.department || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={a.is_active === false ? 'font-medium text-red-600 dark:text-red-400' : 'ac-text-secondary'}>
                            {a.is_active === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 ac-text-secondary whitespace-nowrap">
                          {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">{actionCell(a)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredAccounts.map((a) => (
                  <div
                    key={a.user_id}
                    className="rounded-2xl border border-[var(--ac-border)] bg-white/[0.03] p-4 shadow-sm dark:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--ac-text-primary)]">{a.name || '—'}</p>
                        <p className="mt-0.5 break-all text-sm text-[var(--ac-text-secondary)]">{a.email}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-1 text-xs ${getRoleBadgeClass(a.role)} rounded-md border`}>{getRoleLabel(a.role)}</span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm text-[var(--ac-text-secondary)]">
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted">Department</dt>
                        <dd className="text-right font-medium text-[var(--ac-text-primary)]">{a.department || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted">Status</dt>
                        <dd className={a.is_active === false ? 'font-medium text-red-600 dark:text-red-400' : ''}>
                          {a.is_active === false ? 'Inactive' : 'Active'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted">Last sign-in</dt>
                        <dd className="text-right">{a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '—'}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 border-t border-[var(--ac-border)] pt-3">{actionCell(a)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
