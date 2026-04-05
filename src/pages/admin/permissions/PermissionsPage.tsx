import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { PERMISSION_CATALOG, PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions';
import { useToast } from '@/components/Toast';
import { refreshPermissionsForSession } from '@/lib/refreshPermissions';

const STALE_MS = 60 * 1000;

type SchoolUser = {
  user_id: string;
  email: string;
  name: string;
  role: string;
};

export async function fetchSchoolUsers(adminUserId: string): Promise<SchoolUser[]> {
  const { data: me } = await supabase.from('users').select('school_id, role').eq('user_id', adminUserId).single();
  if (!me?.school_id || !['admin', 'owner', 'head_teacher'].includes(me.role ?? '')) return [];
  const { data, error } = await supabase
    .from('users')
    .select('user_id, email, name, role')
    .eq('school_id', me.school_id)
    .order('name');
  if (error) throw error;
  return (data || []) as SchoolUser[];
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  owner: 'Owner',
  head_teacher: 'Head Teacher',
  accountant: 'Accountant',
  teacher: 'Teacher',
  librarian: 'Librarian',
  lab_technician: 'Lab technician',
  clinician: 'School clinician',
  student: 'Student',
  parent: 'Parent',
};

function labelRole(role: string) {
  return ROLE_LABEL[role] ?? role.replace(/_/g, ' ');
}

async function fetchPermissionsForUser(userId: string, schoolId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_school_permissions')
    .select('permission_key')
    .eq('user_id', userId)
    .eq('school_id', schoolId);
  if (error) throw error;
  return new Set((data || []).map((r: { permission_key: string }) => r.permission_key));
}

export default function PermissionsPage() {
  const authUser = useAuthStore((s) => s.user);
  const schoolIdStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);
  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdStore ?? null);
  /** False until store + DB have been checked (avoids flashing “No school linked” during hydration). */
  const [schoolResolved, setSchoolResolved] = useState(false);
  const setPermissions = useAuthStore((s) => s.setPermissions);

  useEffect(() => {
    if (schoolIdStore) {
      setSchoolId(schoolIdStore);
      setSchoolResolved(true);
      return;
    }
    const run = async () => {
      if (!authUser?.id) {
        setSchoolResolved(true);
        return;
      }
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      const sid = (data?.school_id as string | undefined) ?? null;
      setSchoolId(sid);
      if (sid) setSchoolIdStore(sid);
      setSchoolResolved(true);
    };
    void run();
  }, [authUser?.id, schoolIdStore, setSchoolIdStore]);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localKeys, setLocalKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'permissions-users', authUser?.id],
    queryFn: () => fetchSchoolUsers(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: STALE_MS,
  });

  const selectedUser = useMemo(() => users.find((u) => u.user_id === selectedId) ?? null, [users, selectedId]);

  const filteredPickerUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const rolePretty = labelRole(u.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || rolePretty.includes(q);
    });
  }, [users, userSearch]);

  const { data: serverKeys, isLoading: loadingPerms } = useQuery({
    queryKey: ['admin', 'user-permissions', selectedId, schoolId],
    queryFn: async () => {
      if (!selectedId || !schoolId) return new Set<string>();
      return fetchPermissionsForUser(selectedId, schoolId);
    },
    enabled: !!selectedId && !!schoolId,
    staleTime: STALE_MS,
  });

  useEffect(() => {
    setLocalKeys(new Set());
  }, [selectedId]);

  useEffect(() => {
    if (serverKeys) setLocalKeys(new Set(serverKeys));
  }, [serverKeys]);

  const toggleKey = (key: PermissionKey) => {
    setLocalKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedUser || !schoolId || !authUser?.id) return;
    if (['admin', 'owner'].includes(selectedUser.role)) {
      toast.info('Super roles already have full access; extra toggles are optional.');
    }
    setSaving(true);
    try {
      const want = new Set(localKeys);
      const had = serverKeys ?? new Set<string>();
      const toAdd = [...want].filter((k) => !had.has(k));
      const toRemove = [...had].filter((k) => !want.has(k));

      for (const key of toRemove) {
        const { error } = await supabase
          .from('user_school_permissions')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .eq('school_id', schoolId)
          .eq('permission_key', key);
        if (error) throw error;
      }

      for (const key of toAdd) {
        const { error } = await supabase.from('user_school_permissions').insert({
          user_id: selectedUser.user_id,
          school_id: schoolId,
          permission_key: key,
          granted_by: authUser.id,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions', selectedId, schoolId] });
      if (selectedUser.user_id === authUser.id) {
        await refreshPermissionsForSession(supabase, setPermissions);
      }
      toast.success('Permissions updated.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = useMemo(() => {
    if (!serverKeys) return false;
    if (localKeys.size !== serverKeys.size) return true;
    for (const k of localKeys) if (!serverKeys.has(k)) return true;
    for (const k of serverKeys) if (!localKeys.has(k)) return true;
    return false;
  }, [localKeys, serverKeys]);

  if (!schoolResolved) {
    return (
      <AdminPageWrapper title="Access & permissions">
        <div
          className={`${adminCardClass} mx-auto max-w-4xl px-4 py-10 text-center text-sm font-['Instrument_Sans',system-ui,sans-serif] text-[var(--ac-text-secondary)]`}
        >
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-emerald-500/20" aria-hidden />
          <p className="mt-4">Loading your school context…</p>
        </div>
      </AdminPageWrapper>
    );
  }

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Access & permissions">
        <div className="mx-auto max-w-4xl px-3 font-['Instrument_Sans',system-ui,sans-serif] sm:px-4">
          <div className="rounded-2xl border border-amber-400/35 bg-amber-50/90 p-5 text-[15px] leading-relaxed text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-50">
            <p className="font-semibold text-amber-900 dark:text-amber-100">No school linked</p>
            <p className="mt-2 text-sm opacity-90">
              If you are an admin, ask support to set your user&apos;s{' '}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">school_id</code>.
            </p>
          </div>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Access & permissions"
      subtitle="Grant extra capabilities (e.g. teacher can enrol students, or act as accountant). Primary role stays the same; this adds delegated access."
    >
      <div className="mx-auto max-w-4xl space-y-6 font-['Instrument_Sans',system-ui,sans-serif]">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <Shield className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="text-pretty text-[15px] leading-relaxed text-[var(--ac-text-secondary)] sm:pt-1 sm:text-base">
            Permission keys such as{' '}
            <code className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-xs font-medium dark:bg-white/10">
              {PERMISSION_KEYS.studentsManage}
            </code>{' '}
            and{' '}
            <code className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-xs font-medium dark:bg-white/10">
              {PERMISSION_KEYS.accountingFull}
            </code>{' '}
            layer on top of someone&apos;s main role. Admins and head teachers can adjust them for any user in the school.
          </p>
        </header>

        <div className={`${adminCardClass} space-y-6 p-4 shadow-[var(--ac-shadow-strong)] sm:p-6`}>
          {isLoading ? (
            <div className="ac-text-muted py-10 text-center text-sm">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--ac-border)] py-10 text-center text-sm text-[var(--ac-text-muted)]">
              No users loaded for this school. Check access or try again in a moment.
            </div>
          ) : (
            <div className="space-y-3">
              <label htmlFor="perm-user-search" className="block text-sm font-semibold text-[var(--ac-text-primary)]">
                Find a user
              </label>
              <p className="text-sm text-[var(--ac-text-secondary)]">
                Search by name, email, or role, then choose someone from the list below.
              </p>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ac-text-muted)]"
                  aria-hidden
                />
                <input
                  id="perm-user-search"
                  type="search"
                  autoComplete="off"
                  placeholder="e.g. Mary, @school.com, teacher…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="ac-input min-h-12 w-full rounded-xl py-3 pl-10 pr-10 text-[15px] outline-none transition focus:ring-2 focus:ring-emerald-500/35"
                />
                {userSearch.trim() ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--ac-text-muted)] hover:bg-black/[0.06] dark:hover:bg-white/10"
                    aria-label="Clear search"
                    onClick={() => setUserSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--ac-border)] bg-[var(--ac-card-bg-fallback)] shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--ac-border)] px-3 py-2 text-xs text-[var(--ac-text-muted)]">
                  <span>
                    {filteredPickerUsers.length === users.length
                      ? `${users.length} people`
                      : `${filteredPickerUsers.length} match${filteredPickerUsers.length === 1 ? '' : 'es'}`}
                  </span>
                  {selectedUser ? (
                    <button
                      type="button"
                      className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      onClick={() => setSelectedId(null)}
                    >
                      Clear selection
                    </button>
                  ) : null}
                </div>
                <ul
                  className="max-h-[min(60vh,22rem)] divide-y divide-[var(--ac-border)] overflow-y-auto overscroll-contain"
                  role="listbox"
                  aria-label="School users"
                >
                  {filteredPickerUsers.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-[var(--ac-text-muted)]">No names match that search.</li>
                  ) : (
                    filteredPickerUsers.map((u) => {
                      const active = u.user_id === selectedId;
                      return (
                        <li key={u.user_id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => setSelectedId(u.user_id)}
                            className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition sm:flex-row sm:items-center sm:gap-3 ${
                              active
                                ? 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30'
                                : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <span className="min-w-0 flex-1 font-medium text-gray-900 dark:text-white">
                              {u.name?.trim() || u.email || 'Unnamed'}
                            </span>
                            <span className="inline-flex w-fit shrink-0 rounded-md border border-[var(--ac-border)] bg-white px-2 py-0.5 text-xs font-medium text-gray-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                              {labelRole(u.role)}
                            </span>
                            <span className="min-w-0 break-all text-sm text-gray-600 dark:text-slate-300 sm:max-w-[40%] sm:truncate sm:text-right">
                              {u.email || '—'}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="space-y-5 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-4 sm:p-5">
              <div>
                <p className="font-['Cabinet_Grotesk',system-ui,sans-serif] text-lg font-semibold text-[var(--ac-text-primary)]">
                  {selectedUser.name || selectedUser.email}
                </p>
                <p className="mt-1 text-sm text-[var(--ac-text-secondary)]">
                  <span className="capitalize">{selectedUser.role}</span>
                  {selectedUser.email ? <span> · {selectedUser.email}</span> : null}
                </p>
              </div>

              {loadingPerms ? (
                <div className="ac-text-muted text-sm">Loading permissions…</div>
              ) : (
                <ul className="space-y-4">
                  {PERMISSION_CATALOG.map((item) => (
                    <li key={item.key} className="flex gap-3 items-start rounded-xl border border-[var(--ac-border)]/80 bg-white/[0.02] p-3 dark:bg-white/[0.03]">
                      <input
                        type="checkbox"
                        id={`perm-${item.key}`}
                        checked={localKeys.has(item.key)}
                        onChange={() => toggleKey(item.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--ac-border)] bg-transparent text-emerald-600 focus:ring-2 focus:ring-emerald-500/40"
                      />
                      <label htmlFor={`perm-${item.key}`} className="min-w-0 cursor-pointer">
                        <span className="font-medium text-[var(--ac-text-primary)]">{item.label}</span>
                        <span className="mt-0.5 block text-sm leading-snug text-[var(--ac-text-secondary)]">{item.description}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                disabled={saving || !dirty}
                onClick={() => void handleSave()}
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
