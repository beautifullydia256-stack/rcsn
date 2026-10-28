import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, GraduationCap, Users, Search, User, KeyRound, Shield, Trash2, Plus, ArrowRight, RefreshCw, X } from 'lucide-react';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '../../../lib/adminQueryDefaults';
import { supabase } from '../../../lib/supabase';
import { registerApiUrl } from '../../../lib/registerApiOrigin';
import { useAuthStore } from '../../../store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle, getAllAssignableRoles } from '@/lib/roleTerminology';
import { AddSchoolStaffForm } from '@/pages/admin/staff/AddSchoolStaffForm';
import NativeModal from '@/components/NativeModal';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

const PAGE_SIZE = 15;

interface UserAccount {
  user_id: string;
  email: string;
  name: string;
  role: string;
  extra_roles?: string[];
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
  const cols = 'user_id, email, name, role, extra_roles, phone, department, position, created_at, last_sign_in_at, is_active';
  const result = await supabase
    .from('users')
    .select(cols)
    .eq('school_id', userData.school_id)
    .order('created_at', { ascending: false });
  let rows: Record<string, unknown>[];
  if (result.error && result.error.message?.includes('is_active')) {
    const fallback = await supabase
      .from('users')
      .select('user_id, email, name, role, extra_roles, phone, department, position, created_at, last_sign_in_at')
      .eq('school_id', userData.school_id)
      .order('created_at', { ascending: false });
    rows = (fallback.data || []).map((r) => ({ ...r, is_active: true }));
  } else {
    rows = (result.data || []).map((r: Record<string, unknown>) => ({ ...r, is_active: r.is_active ?? true }));
  }
  return rows as unknown as UserAccount[];
}

export default function AccountsPage() {
  const { schoolType, isTertiary } = useSchoolType();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingRolesUser, setEditingRolesUser] = useState<UserAccount | null>(null);
  const [editPrimaryRole, setEditPrimaryRole] = useState('');
  const [editExtraRoles, setEditExtraRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'accounts', authUser?.id ?? ''],
    queryFn: () => fetchAccounts(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
  });

  const kpiTeachers = useMemo(() => accounts.filter((a) => a.role === 'teacher').length, [accounts]);
  const kpiParents = useMemo(() => accounts.filter((a) => a.role === 'parent').length, [accounts]);
  const kpiActive = useMemo(() => accounts.filter((a) => a.is_active !== false).length, [accounts]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of accounts) {
      if (a.role) counts[a.role] = (counts[a.role] || 0) + 1;
    }
    return counts;
  }, [accounts]);

  const roleOptions = useMemo(() => [
    { value: '', label: `ALL ROLES (${accounts.length})` },
    { value: 'admin', label: `${getRoleTitle('admin', schoolType).toUpperCase()}${roleCounts.admin ? ` (${roleCounts.admin})` : ''}` },
    { value: 'head_teacher', label: `${getRoleTitle('head_teacher', schoolType).toUpperCase()}${roleCounts.head_teacher ? ` (${roleCounts.head_teacher})` : ''}` },
    { value: 'deputy_head_teacher', label: `${getRoleTitle('deputy_head_teacher', schoolType).toUpperCase()}${roleCounts.deputy_head_teacher ? ` (${roleCounts.deputy_head_teacher})` : ''}` },
    { value: 'teacher', label: `${getRoleTitle('teacher', schoolType).toUpperCase()}${roleCounts.teacher ? ` (${roleCounts.teacher})` : ''}` },
    { value: 'bursar', label: `${getRoleTitle('bursar', schoolType).toUpperCase()}${roleCounts.bursar ? ` (${roleCounts.bursar})` : ''}` },
    { value: 'dos', label: `${getRoleTitle('dos', schoolType).toUpperCase()}${roleCounts.dos ? ` (${roleCounts.dos})` : ''}` },
    { value: 'parent', label: `${getRoleTitle('parent', schoolType).toUpperCase()}${roleCounts.parent ? ` (${roleCounts.parent})` : ''}` },
    { value: 'student', label: `STUDENT / TRAINEE${roleCounts.student ? ` (${roleCounts.student})` : ''}` },
  ], [accounts.length, roleCounts, schoolType]);

  const assignableRoles = useMemo(() => {
    return getAllAssignableRoles(schoolType);
  }, [schoolType]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (statusFilter === 'active' && a.is_active === false) return false;
      if (statusFilter === 'inactive' && a.is_active !== false) return false;
      if (roleFilter && a.role !== roleFilter && !a.extra_roles?.includes(roleFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = (a.name || '').toLowerCase().includes(q);
        const mEmail = (a.email || '').toLowerCase().includes(q);
        const mPhone = (a.phone || '').toLowerCase().includes(q);
        const mDept = (a.department || '').toLowerCase().includes(q);
        const mRole = (a.role || '').toLowerCase().includes(q);
        if (!mName && !mEmail && !mPhone && !mDept && !mRole) return false;
      }
      return true;
    });
  }, [accounts, statusFilter, roleFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, filteredAccounts.length);
  const pageSlice = filteredAccounts.slice(startIdx, endIdx);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete user account "${email}"? This action cannot be undone.`)) return;
    setDeleting(userId);
    try {
      const res = await fetch(registerApiUrl('/api/admin/delete-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setToggling(userId);
    try {
      const nextActive = !currentActive;
      const { error } = await supabase
        .from('users')
        .update({ is_active: nextActive })
        .eq('user_id', userId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to toggle status');
    } finally {
      setToggling(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = window.prompt(`Enter a new temporary password for ${email}:`);
    if (!newPassword || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    setResetting(userId);
    try {
      const res = await fetch(registerApiUrl('/api/admin/reset-password'), {
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

  const openEditRoles = (a: UserAccount) => {
    setEditingRolesUser(a);
    setEditPrimaryRole(a.role || '');
    setEditExtraRoles(Array.isArray(a.extra_roles) ? a.extra_roles.filter(r => r !== a.role) : []);
  };

  const toggleExtraRole = (role: string) => {
    setEditExtraRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!editingRolesUser || !editPrimaryRole) return;
    setSavingRoles(true);
    try {
      const extras = editExtraRoles.filter(r => r !== editPrimaryRole);
      const newAllRoles = [editPrimaryRole, ...extras];
      const oldAllRoles = [editingRolesUser.role, ...(editingRolesUser.extra_roles?.filter(r => r !== editingRolesUser.role) ?? [])];
      const { error } = await supabase
        .from('users')
        .update({ role: editPrimaryRole, extra_roles: extras })
        .eq('user_id', editingRolesUser.user_id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
      setEditingRolesUser(null);

      // Send email notification (fire and forget)
      const addedRoles = newAllRoles.filter(r => !oldAllRoles.includes(r));
      const removedRoles = oldAllRoles.filter(r => !newAllRoles.includes(r));
      if ((addedRoles.length > 0 || removedRoles.length > 0) && editingRolesUser.email) {
        void fetch(registerApiUrl('/api/admin/notify-role-change'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: editingRolesUser.email,
            name: editingRolesUser.name,
            schoolId,
            addedRoles,
            removedRoles,
          }),
        }).catch(() => {});
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setSavingRoles(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return getRoleTitle(role, schoolType);
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <GovPageLoader message="LOADING SYSTEM USER ACCOUNTS & CREDENTIALS..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-5 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            SYSTEM USER ACCOUNTS &amp; CREDENTIALS REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            AUTHENTICATION ROSTER, ROLE DELEGATION &amp; ACCESS PRIVILEGES • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {schoolId && (
            <button
              type="button"
              onClick={() => setShowAddStaff(true)}
              className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD STAFF ACCOUNT</span>
            </button>
          )}
          <Link
            to="/dashboard/admin/accounts/invite"
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <span>SEND INVITATIONS</span>
          </Link>
          <Link
            to="/dashboard/admin/permissions"
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <span>PERMISSIONS MATRIX</span>
          </Link>
          <button
            type="button"
            onClick={() => void refetch()}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL REGISTERED USERS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {accounts.length.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ALL ROLES &amp; TIERS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACTIVE CREDENTIALS
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {kpiActive.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            SIGN-IN AUTHORIZED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            {isTertiary ? 'TEACHING TUTORS' : 'TEACHERS'}
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {kpiTeachers.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACADEMIC FACULTY
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            {isTertiary ? 'PARENTS & SPONSORS' : 'PARENTS'}
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {kpiParents.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            SPONSOR PORTALS
          </div>
        </div>
      </div>

      {/* ── 3. HIGH-DENSITY CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#777777]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, email, phone, department…"
            className="gov-input text-xs font-mono w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-[#F3F4F6] text-[#555555]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="gov-input text-xs font-mono"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="gov-input text-xs font-mono"
          >
            <option value="all">STATUS: ALL</option>
            <option value="active">STATUS: ACTIVE</option>
            <option value="inactive">STATUS: INACTIVE</option>
          </select>

          {(roleFilter || statusFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setRoleFilter('');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="gov-btn gov-btn-secondary gov-btn-xs font-mono"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* ── 4. HIGH DENSITY DATA GRID ── */}
      <div className="gov-table-container border border-[#CCCCCC] bg-white">
        <table className="gov-table w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#EAEAEA] border-b border-[#CCCCCC]">
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">#</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">NAME / IDENTITY</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">EMAIL / USERNAME</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">CONTACT</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">ASSIGNED ROLES</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">DEPARTMENT</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-center">STATUS</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">LAST SIGN-IN</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-right">CREDENTIAL ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((a, idx) => {
              const globalIdx = startIdx + idx + 1;
              const extraRoles = Array.isArray(a.extra_roles) ? a.extra_roles.filter(r => r && r !== a.role) : [];
              const isActive = a.is_active !== false;

              return (
                <tr
                  key={a.user_id}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9F9FB] transition-colors"
                >
                  <td className="py-2.5 px-3 text-xs font-mono text-[#777777]">{globalIdx}</td>
                  <td className="py-2.5 px-3 text-xs font-mono font-bold text-[#111111]">
                    {a.name?.trim() || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-[#111111]">
                    {a.email}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-[#555555]">
                    {a.phone || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono">
                    <span className="font-bold text-[#111111] bg-[#F1F3F5] px-1.5 py-0.5 border border-[#CCCCCC] text-[10px] uppercase">
                      {getRoleLabel(a.role)}
                    </span>
                    {extraRoles.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {extraRoles.map((r) => (
                          <span
                            key={r}
                            className="text-[9px] font-mono text-[#555555] bg-white px-1 py-0.2 border border-[#E5E7EB] uppercase"
                          >
                            +{getRoleLabel(r)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-[#555555]">
                    {a.department || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-[#555555]">
                    {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString() : 'NEVER'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void handleResetPassword(a.user_id, a.email)}
                        disabled={resetting === a.user_id}
                        className="gov-btn gov-btn-secondary gov-btn-xs font-mono"
                        title="Reset temporary password"
                      >
                        {resetting === a.user_id ? '…' : 'RESET PW'}
                      </button>

                      {a.role !== 'student' && (
                        <button
                          type="button"
                          onClick={() => openEditRoles(a)}
                          className="gov-btn gov-btn-secondary gov-btn-xs font-mono"
                          title="Modify system roles"
                        >
                          ROLES
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleToggleActive(a.user_id, isActive)}
                        disabled={toggling === a.user_id}
                        className="gov-btn gov-btn-secondary gov-btn-xs font-mono"
                        title={isActive ? 'Deactivate user' : 'Reactivate user'}
                      >
                        {toggling === a.user_id ? '…' : isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(a.user_id, a.email)}
                        disabled={deleting === a.user_id}
                        className="gov-btn gov-btn-secondary gov-btn-xs text-rose-700 font-mono hover:bg-rose-50 hover:border-rose-300"
                        title="Permanently remove user account"
                      >
                        {deleting === a.user_id ? '…' : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAccounts.length === 0 && (
          <div className="p-8 text-center text-xs font-mono text-[#777777]">
            NO USER ACCOUNTS MATCH THE APPLIED CRITERIA.
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-[#CCCCCC] bg-[#F9F9FB] font-mono text-xs">
            <span className="text-[#555555]">
              SHOWING CANDIDATES {startIdx + 1}–{endIdx} OF {filteredAccounts.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="gov-btn gov-btn-secondary gov-btn-xs disabled:opacity-50"
              >
                PREVIOUS
              </button>
              <span className="px-2 py-0.5 border border-[#CCCCCC] bg-white font-bold">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="gov-btn gov-btn-secondary gov-btn-xs disabled:opacity-50"
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. MODALS ── */}
      {schoolId && (
        <NativeModal isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} title="REGISTER INSTITUTIONAL STAFF ACCOUNT" size="lg">
          <AddSchoolStaffForm
            schoolId={schoolId}
            onCompleted={() => {
              setShowAddStaff(false);
              void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', authUser?.id] });
            }}
            onCancel={() => setShowAddStaff(false)}
          />
        </NativeModal>
      )}

      {editingRolesUser && (
        <NativeModal
          isOpen={!!editingRolesUser}
          onClose={() => setEditingRolesUser(null)}
          title={`ROLE DELEGATION: ${editingRolesUser.name || editingRolesUser.email}`}
          size="md"
        >
          <div className="space-y-4 font-mono text-xs text-[#111111]">
            <p className="text-[#555555] leading-relaxed">
              Designate the primary administrative identity and up to 3 subordinate secondary roles. Upon sign-in, multi-role users can toggle between authorized workstations.
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                PRIMARY INSTITUTIONAL ROLE
              </label>
              <select
                value={editPrimaryRole}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditPrimaryRole(val);
                  setEditExtraRoles((prev) => prev.filter((r) => r !== val));
                }}
                className="gov-input w-full text-xs font-mono"
              >
                {assignableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                ADDITIONAL PRIVILEGES (MAX 3)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-[#CCCCCC] p-2 bg-[#F9F9FB] max-h-48 overflow-y-auto">
                {assignableRoles.filter((r) => r.value !== editPrimaryRole).map((r) => (
                  <label
                    key={r.value}
                    className="flex items-center gap-2 cursor-pointer p-1.5 border border-[#E5E7EB] bg-white hover:bg-[#F0F0F2]"
                  >
                    <input
                      type="checkbox"
                      checked={editExtraRoles.includes(r.value)}
                      disabled={!editExtraRoles.includes(r.value) && editExtraRoles.length >= 3}
                      onChange={() => toggleExtraRole(r.value)}
                      className="rounded-none border-[#000000] text-[#111111] focus:ring-0"
                    />
                    <span className="text-[11px]">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CCCCCC]">
              <button
                type="button"
                onClick={() => setEditingRolesUser(null)}
                className="gov-btn gov-btn-secondary gov-btn-sm"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={!editPrimaryRole || savingRoles}
                onClick={() => void handleSaveRoles()}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                {savingRoles ? <GovRollingBox size="xs" /> : null}
                <span>SAVE ROLE ASSIGNMENT</span>
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </div>
  );
}
