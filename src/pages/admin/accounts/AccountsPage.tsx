import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, GraduationCap, Users, Search, User } from 'lucide-react';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '../../../lib/adminQueryDefaults';
import { supabase } from '../../../lib/supabase';
import { registerApiUrl } from '../../../lib/registerApiOrigin';
import { useAuthStore } from '../../../store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle, getAllAssignableRoles } from '@/lib/roleTerminology';
import PwParentsDirectoryShell from '@/components/admin/PwParentsDirectoryShell';
import PwDirectoryUserCard from '@/components/admin/PwDirectoryUserCard';
import { pwDirGrad, pwDirInitials, pwRoleToChipTone } from '@/components/admin/pwDirectoryUtils';
import { AddSchoolStaffForm } from '@/pages/admin/staff/AddSchoolStaffForm';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

const PAGE_SIZE = 12;

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
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingRolesUser, setEditingRolesUser] = useState<UserAccount | null>(null);
  const [editPrimaryRole, setEditPrimaryRole] = useState('');
  const [editExtraRoles, setEditExtraRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const roleOptions = useMemo(() => [
    { value: '', label: 'All roles' },
    { value: 'admin', label: getRoleTitle('admin', schoolType) },
    { value: 'head_teacher', label: getRoleTitle('head_teacher', schoolType) },
    { value: 'deputy_head_teacher', label: getRoleTitle('deputy_head_teacher', schoolType) },
    { value: 'dos', label: getRoleTitle('dos', schoolType) },
    { value: 'deputy_dos', label: getRoleTitle('deputy_dos', schoolType) },
    { value: 'accountant', label: getRoleTitle('accountant', schoolType) },
    { value: 'teacher', label: getRoleTitle('teacher', schoolType) },
    { value: 'secretary', label: getRoleTitle('secretary', schoolType) },
    { value: 'librarian', label: 'Librarian' },
    { value: 'lab_technician', label: getRoleTitle('lab_technician', schoolType) },
    { value: 'clinician', label: getRoleTitle('clinician', schoolType) },
    { value: 'student', label: getRoleTitle('student', schoolType) },
    { value: 'parent', label: getRoleTitle('parent', schoolType) },
  ], [schoolType]);

  const assignableRoles = useMemo(() => getAllAssignableRoles(schoolType), [schoolType]);

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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAccounts.slice(start, start + PAGE_SIZE);
  }, [filteredAccounts, safePage]);

  const startIdx = filteredAccounts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filteredAccounts.length);

  const kpiTeachers = useMemo(() => accounts.filter((a) => a.role === 'teacher').length, [accounts]);
  const kpiParents = useMemo(() => accounts.filter((a) => a.role === 'parent').length, [accounts]);
  const kpiActive = useMemo(() => accounts.filter((a) => a.is_active !== false).length, [accounts]);

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
      const res = await fetch(registerApiUrl('/api/admin/update-user'), {
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
      const res = await fetch(registerApiUrl('/api/admin/reset-user-password'), {
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

      // Send email notification (fire and forget — do not block UI)
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
        }).catch(() => { /* best-effort */ });
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

  const cardFooter = (a: UserAccount) => (
    <>
      <button
        type="button"
        className="par-crd-btn par-crd-primary"
        disabled={resetting === a.user_id}
        onClick={() => void handleResetPassword(a.user_id, a.email)}
      >
        {resetting === a.user_id ? '…' : 'Reset password'}
      </button>
      {a.role !== 'student' && (
        <button
          type="button"
          className="par-crd-btn par-crd-ghost"
          onClick={() => openEditRoles(a)}
        >
          Manage roles
        </button>
      )}
      <button
        type="button"
        className="par-crd-btn par-crd-ghost"
        disabled={toggling === a.user_id}
        onClick={() => void handleToggleActive(a.user_id, a.is_active !== false)}
      >
        {toggling === a.user_id ? '…' : a.is_active === false ? 'Activate' : 'Deactivate'}
      </button>
      <button
        type="button"
        className="par-crd-btn par-crd-ghost"
        style={{ color: 'var(--rose)' }}
        disabled={deleting === a.user_id}
        onClick={() => void handleDelete(a.user_id, a.email)}
      >
        {deleting === a.user_id ? '…' : 'Delete'}
      </button>
    </>
  );

  if (isLoading) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">Loading users…</div>
          <div className="par-empty-sub">Please wait</div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  return (
    <>
    <PwParentsDirectoryShell>
      <div className="par-header par-fu">
        <div>
          <div className="par-eyebrow">User Management</div>
          <h1 className="par-title">All users</h1>
          <p className="par-sub">
            Same card layout as Parents &amp; Guardians — search, filter by role, reset passwords, and manage access.
          </p>
        </div>
        <div className="par-actions">
          <button type="button" className="par-btn par-btn-ghost" onClick={() => setShowAddStaff(true)}>
            Add School Staff
          </button>
          <Link to="/dashboard/admin/accounts/invite" className="par-btn par-btn-ghost">
            Send invitations
          </Link>
          <Link to="/dashboard/admin/permissions" className="par-btn par-btn-violet">
            Access &amp; permissions
          </Link>
        </div>
      </div>

      <div className="par-kpi-strip par-fu par-d1">
        <div className="par-kpi cv">
          <div className="par-kpi-ic cv"><Users className="w-4 h-4 inline-block" /></div>
          <div>
            <div className="par-kpi-label">Total users</div>
            <div className="par-kpi-val cv">{accounts.length}</div>
            <div className="par-kpi-sub">All roles</div>
          </div>
        </div>
        <div className="par-kpi cg">
          <div className="par-kpi-ic cg"><Check className="w-4 h-4 inline-block" /></div>
          <div>
            <div className="par-kpi-label">Active</div>
            <div className="par-kpi-val cg">{kpiActive}</div>
            <div className="par-kpi-sub">Can sign in</div>
          </div>
        </div>
        <div className="par-kpi ct">
          <div className="par-kpi-ic ct"><GraduationCap className="w-4 h-4 inline-block" /></div>
          <div>
            <div className="par-kpi-label">{isTertiary ? 'Tutors' : 'Teachers'}</div>
            <div className="par-kpi-val ct">{kpiTeachers}</div>
            <div className="par-kpi-sub">{isTertiary ? 'Tutor role' : 'Teacher role'}</div>
          </div>
        </div>
        <div className="par-kpi ca">
          <div className="par-kpi-ic ca"><Users className="w-4 h-4 inline-block" /></div>
          <div>
            <div className="par-kpi-label">{isTertiary ? 'Parents & Sponsors' : 'Parents'}</div>
            <div className="par-kpi-val ca">{kpiParents}</div>
            <div className="par-kpi-sub">{isTertiary ? 'Sponsor role' : 'Parent role'}</div>
          </div>
        </div>
      </div>

      <div className="par-toolbar par-fu par-d2">
        <div className="par-search" style={{ flex: '1 1 260px', maxWidth: '520px' }}>
          <span style={{ opacity: 0.75, display: 'inline-flex', alignItems: 'center' }} aria-hidden>
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="search"
            placeholder="Search name, email, department…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="par-fu par-d2" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {roleOptions.map((o) => {
          const active = roleFilter === o.value;
          return (
            <button
              key={o.value || 'all'}
              type="button"
              className={active ? 'par-btn par-btn-sm par-btn-violet' : 'par-btn par-btn-sm par-btn-ghost'}
              onClick={() => setRoleFilter(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="par-empty par-fu par-d3">
          <div className="par-empty-icon"><User className="w-6 h-6 inline-block" /></div>
          <div className="par-empty-title">No users match</div>
          <div className="par-empty-sub">
            {searchQuery || roleFilter ? 'Try clearing search or choose All roles.' : 'No accounts returned for this school yet.'}
          </div>
        </div>
      ) : (
        <>
          <div className="par-card-grid par-fu par-d3">
            {pageSlice.map((a, i) => {
              const globalIdx = (safePage - 1) * PAGE_SIZE + i;
              const emailVal = a.email ? (
                <a href={`mailto:${a.email}`} className="par-contact-link email" onClick={(e) => e.stopPropagation()}>
                  {a.email}
                </a>
              ) : (
                <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>—</span>
              );
              const phone = String(a.phone ?? '').trim();
              const extraRoles = Array.isArray(a.extra_roles) ? a.extra_roles.filter(r => r && r !== a.role) : [];
              const rows = [
                { label: 'Email', value: emailVal },
                ...(phone
                  ? [{ label: 'Phone', value: <a href={`tel:${phone}`} className="par-contact-link phone" onClick={(e) => e.stopPropagation()}>{phone}</a> }]
                  : []),
                ...(extraRoles.length > 0
                  ? [{ label: 'Also', value: <span style={{ fontSize: 11 }}>{extraRoles.map(r => getRoleLabel(r)).join(', ')}</span> }]
                  : []),
                { label: 'Department', value: a.department || <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>—</span> },
                {
                  label: 'Status',
                  value:
                    a.is_active === false ? (
                      <span className="par-chip rose" style={{ fontSize: 11 }}>
                        Inactive
                      </span>
                    ) : (
                      <span className="par-chip green" style={{ fontSize: 11 }}>
                        Active
                      </span>
                    ),
                },
                {
                  label: 'Last sign-in',
                  value: a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '—',
                },
              ];
              return (
                <PwDirectoryUserCard
                  key={a.user_id}
                  name={a.name?.trim() || a.email || 'Unnamed'}
                  subtitle={getRoleLabel(a.role)}
                  cornerTone={pwRoleToChipTone(a.role)}
                  cornerLabel={getRoleLabel(a.role)}
                  initials={pwDirInitials(a.name || a.email || '?')}
                  avatarBackground={pwDirGrad(globalIdx)}
                  statusDotActive={a.is_active !== false}
                  rows={rows}
                  footer={cardFooter(a)}
                />
              );
            })}
          </div>

          <div className="par-pagination par-fu par-d4">
            <div className="par-page-info">
              {filteredAccounts.length === 0 ? (
                <>Showing <strong>0</strong></>
              ) : (
                <>
                  Showing <strong>{startIdx}</strong>–<strong>{endIdx}</strong> of <strong>{filteredAccounts.length}</strong> users
                </>
              )}
            </div>
            {totalPages > 1 ? (
              <div className="par-page-btns">
                <button
                  type="button"
                  className="par-pbtn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                <span
                  className="par-pbtn"
                  style={{ pointerEvents: 'none', border: 'none', background: 'transparent', minWidth: 'auto', padding: '0 8px' }}
                >
                  <strong>{safePage}</strong> / {totalPages}
                </span>
                <button
                  type="button"
                  className="par-pbtn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </PwParentsDirectoryShell>

    {schoolId && (
      <NativeModal isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} title="Add School Staff" size="lg">
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

    <NativeModal
      isOpen={!!editingRolesUser}
      onClose={() => setEditingRolesUser(null)}
      title={`Manage roles — ${editingRolesUser?.name || editingRolesUser?.email || ''}`}
      size="md"
    >
      {editingRolesUser && (
        <div className="space-y-4">
          <p className="text-xs text-white/70 leading-relaxed">
            Set a primary role and optionally assign up to 3 additional roles. The user will see a role picker on login when they have more than one role.
          </p>

          <div className="relative z-30">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Primary role
            </label>
            <LiquidGlassSelect
              value={editPrimaryRole}
              onChange={(val) => {
                setEditPrimaryRole(val);
                setEditExtraRoles((prev) => prev.filter((r) => r !== val));
              }}
              options={assignableRoles.map((r) => ({ value: r.value, label: r.label }))}
              placeholder="Select primary role"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-2">
              Additional roles (optional — select up to 3)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignableRoles.filter((r) => r.value !== editPrimaryRole).map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 cursor-pointer text-xs text-white/90 p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={editExtraRoles.includes(r.value)}
                    disabled={!editExtraRoles.includes(r.value) && editExtraRoles.length >= 3}
                    onChange={() => toggleExtraRole(r.value)}
                    className="accent-emerald-500 w-4 h-4 rounded"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            {editExtraRoles.length >= 3 && (
              <p className="mt-2 text-xs text-amber-300">
                Maximum of 3 additional roles reached.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={() => setEditingRolesUser(null)}
              className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!editPrimaryRole || savingRoles}
              onClick={() => void handleSaveRoles()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {savingRoles ? 'Saving...' : 'Save roles'}
            </button>
          </div>
        </div>
      )}
    </NativeModal>
    </>
  );
}
